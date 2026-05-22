"""
sql_agent.py - LangChain SQL agent + Ollama integration.

Privacy Guarantee: No API keys, no cloud endpoints, no data egress.
The only outbound network call is to localhost:11434 (Ollama).
All reasoning and data access remain strictly on the local machine.

Note: langchain_community is used for the SQL toolkit because these
integrations live in the community package to keep the core langchain 
dependency-light.
"""

import logging
import os
import re
from sqlalchemy.engine import Engine

from langchain_ollama import OllamaLLM
from langchain_community.utilities import SQLDatabase
from langchain_classic.chains import create_sql_query_chain
from langchain_community.tools.sql_database.tool import QuerySQLDataBaseTool
from langchain_core.prompts import PromptTemplate

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Constants (overridable via environment variables)
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:1.5b")
# Temperature 0.0 is mandatory for SQL generation — we need
# deterministic, reproducible queries, not creative variation.
OLLAMA_TEMPERATURE: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.0"))

# ---------------------------------------------------------------------------
# SQL generation prompt — injected directly into create_sql_query_chain.
#
# WHY A PromptTemplate AND NOT A PLAIN STRING:
#   create_sql_query_chain requires three specific input variables:
#     {input}      — the user's natural-language question
#     {table_info} — the DDL + sample rows from SQLDatabase (auto-filled)
#     {top_k}      — the row-limit hint (auto-filled, default 5)
#   Passing a plain string here is silently ignored — the LLM falls back
#   to LangChain's generic default prompt which has NO knowledge of our
#   schema and freely hallucinates table names like 'segments'.
# ---------------------------------------------------------------------------

# Guard: the set of table names the LLM is permitted to query.
# Any SQL referencing a name outside this set is rejected before DB execution.
_ALLOWED_TABLES: frozenset[str] = frozenset({"transactions"})

SEGMENTIQ_SQL_PROMPT = PromptTemplate(
    input_variables=["input", "table_info", "top_k"],
    template="""You are SegmentIQ, an expert PostgreSQL analyst specialising in
RFM (Recency, Frequency, Monetary) customer segmentation.

=== DATABASE — ONE TABLE ONLY ===
The database contains EXACTLY ONE table: transactions.
Do NOT reference, JOIN, or query any other table name (e.g. do NOT use
'segments', 'customers', 'rfm', 'cluster', 'labels', or anything else).
If you think you need another table, you are wrong — all the data you
need is in the transactions table described below.

=== LIVE SCHEMA (auto-populated) ===
{table_info}

=== COLUMN REFERENCE ===
  id               INTEGER  — surrogate primary key (ignore in business queries)
  transaction_id   VARCHAR  — UUID per transaction row
  customer_id      VARCHAR  — UUID per customer; one customer has MANY rows
  date             TIMESTAMPTZ — purchase timestamp
  amount           NUMERIC  — transaction value; can be NEGATIVE (product returns)
  is_outlier       BOOLEAN  — TRUE = flagged by Local Outlier Factor; exclude with
                              WHERE is_outlier = FALSE unless outliers are requested
  cluster_label    VARCHAR  — K-Means segment name for this customer's rows:
                              'Champions' | 'Loyal' | 'At-Risk' | 'Hibernating'
                              NULL means the customer is an outlier
  created_at       TIMESTAMPTZ — row load timestamp (not the purchase date)

=== SEGMENT DEFINITIONS ===
  Champions   : high recency, high frequency, high spend
  Loyal       : reliable frequent buyers, mid-high spend
  At-Risk     : previously active, now showing declining engagement
  Hibernating : near-lost, low on all RFM dimensions

=== STRICT RULES ===
  1. Generate ONLY a SELECT statement. Never write INSERT, UPDATE, DELETE,
     DROP, ALTER, CREATE, TRUNCATE, or any other DDL/DML.
  2. The ONLY valid table name is 'transactions'. Never invent other tables.
  3. Exclude outliers by default: WHERE is_outlier = FALSE
     (omit this filter only when the user explicitly asks about outliers).
  4. Count DISTINCT customer_id — not COUNT(*) — when counting customers.
  5. Negative amounts are valid data (returns); handle them correctly in
     SUM/AVG calculations.
  6. Always alias computed columns with descriptive names.
  7. Limit to {top_k} rows unless the user specifies a different limit.
  8. If the schema cannot answer the question, return:
     SELECT 'Cannot answer: <reason>' AS error;

Question: {input}
SQLQuery:""",
)

def build_llm() -> OllamaLLM:
    """
    Instantiate and return the local Ollama LLM.
    
    Temperature 0.0: deterministic SQL generation prevents the agent from 
    hallucinating different column names across repeated identical queries.
    
    Returns:
        OllamaLLM: The local LLM instance.
        
    Raises:
        RuntimeError: If instantiation or connection logic fails.
    """
    try:
        llm = OllamaLLM(
            base_url=OLLAMA_BASE_URL,
            model=OLLAMA_MODEL,
            temperature=OLLAMA_TEMPERATURE
        )
        return llm
    except Exception as e:
        raise RuntimeError(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Is 'ollama serve'\n"
            f"running? Run: ollama pull {OLLAMA_MODEL}\nError: {e}"
        )

def build_database(engine: Engine) -> SQLDatabase:
    """
    Wrap the SQLAlchemy engine in a LangChain SQLDatabase object.
    
    Args:
        engine (Engine): The SQLAlchemy engine.
        
    Returns:
        SQLDatabase: The instantiated SQLDatabase.
    """
    # include_tables=["transactions"] is a security boundary.
    # It prevents the agent from discovering or querying any other table
    # that may exist in the database now or in the future. This is an
    # intentional least-privilege constraint.
    #
    # sample_rows_in_table_info=3 gives the agent 3 example rows as context
    # during schema introspection. Trade-off: too many sample rows = more
    # tokens + privacy risk; too few = agent may misunderstand sparse columns.
    db = SQLDatabase(
        engine=engine,
        include_tables=["transactions"],
        sample_rows_in_table_info=3
    )
    return db

def query(question: str, engine: Engine) -> str:
    """
    A thin convenience wrapper for a single-pass SQL Query Chain.
    Translates the question to SQL, executes it, and returns the raw results.
    
    Args:
        question (str): The natural language question.
        engine (Engine): The SQLAlchemy engine.
        
    Returns:
        str: The raw database result.
    """
    logger.info(f"Incoming question: {question}")
    
    try:
        llm = build_llm()
        db = build_database(engine)
        
        # Step A: Translate the user's question into SQL using our
        # custom prompt so the LLM knows the exact schema and rules.
        # SEGMENTIQ_SQL_PROMPT is passed explicitly — without this argument
        # LangChain silently falls back to its own generic prompt which
        # knows nothing about our schema and hallucinates table names.
        chain = create_sql_query_chain(llm, db, prompt=SEGMENTIQ_SQL_PROMPT)
        sql_query = chain.invoke({"question": question})

        # Log at INFO (not DEBUG) so hallucination bugs surface immediately
        # in the terminal without needing to change log level.
        logger.info(f"Generated SQL: {sql_query}")

        # Clean up markdown fences the LLM may wrap around the query.
        sql_query_clean = sql_query
        match = re.search(r"```(?:sql)?(.*?)```", sql_query, re.DOTALL | re.IGNORECASE)
        if match:
            sql_query_clean = match.group(1).strip()
        else:
            sql_query_clean = sql_query.replace("```sql", "").replace("```", "").strip()
            if sql_query_clean.lower().startswith("sqlquery:"):
                sql_query_clean = sql_query_clean[9:].strip()

        # ---------------------------------------------------------------
        # Step B: Pre-execution table-name guard.
        # Parse every word that follows FROM or JOIN in the generated SQL
        # and reject the query immediately if it references any table
        # outside _ALLOWED_TABLES. This is a defence-in-depth measure —
        # the PromptTemplate should prevent hallucination, but this guard
        # ensures a rogue query never reaches the database even if it does.
        # ---------------------------------------------------------------
        referenced_tables = set(
            re.findall(
                r"(?:FROM|JOIN)\s+([\w]+)",
                sql_query_clean,
                re.IGNORECASE,
            )
        )
        disallowed = referenced_tables - _ALLOWED_TABLES
        if disallowed:
            raise ValueError(
                f"Hallucinated table(s) detected and blocked before DB execution: "
                f"{disallowed}. Only the 'transactions' table exists."
            )

        # Step C: Execute the validated SQL string against the database.
        execute_query = QuerySQLDataBaseTool(db=db)
        raw_result = db.run(sql_query_clean)
        
        logger.info(f"Raw database result: {raw_result}")
        return str(raw_result)
        
    except Exception as e:
        error_msg = f"SegmentIQ could not answer that question: {str(e)}"
        logger.error(error_msg)
        return error_msg
