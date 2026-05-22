from dataclasses import dataclass
import logging
from sqlalchemy.engine import Engine

from backend.src.agent import sql_agent

logger = logging.getLogger(__name__)

@dataclass
class AgentResponse:
    """
    Dataclass wrapping the agent's natural-language SQL result and tactic.
    """
    question: str
    sql_result: str
    tactic: str
    segment_detected: str | None

    def __str__(self) -> str:
        return (
            f"**Question:** {self.question}\n"
            f"**Insight:** {self.sql_result}\n"
            f"**Recommended tactic:** {self.tactic}"
        )

TACTIC_TEMPLATES: dict[str, str] = {
    "Champions": (
        "🏆 Champions identified — launch an exclusive VIP loyalty "
        "programme or referral incentive. These customers have the "
        "highest lifetime value and the strongest word-of-mouth potential."
    ),
    "Loyal": (
        "💛 Loyal customers engaged — offer early access to new products "
        "or a tier-upgrade incentive. Prevent churn by making them feel "
        "recognised before a competitor does."
    ),
    "At-Risk": (
        "⚠️ At-Risk segment detected — deploy a time-limited win-back "
        "campaign (20% discount, free shipping, or a personalised email). "
        "Act within 7 days — recency is declining."
    ),
    "Hibernating": (
        "🔴 Hibernating customers found — run a last-chance reactivation "
        "email with a bold incentive. If no response within 14 days, "
        "consider sunsetting to reduce marketing spend on low-ROI contacts."
    ),
    "outlier": (
        "📊 Outlier customers surfaced — these are statistical anomalies "
        "(extreme spenders or returners). Review manually before including "
        "in any campaign; bulk tactics may not apply."
    ),
    "default": (
        "📈 Analysis complete — review the insight above and tailor your "
        "next campaign to the segment behaviour described. Consider A/B "
        "testing any discount or incentive before full rollout."
    ),
}

def detect_segment(text: str) -> str | None:
    """
    Scan the agent response string for segment keywords using
    case-insensitive substring matching.
    
    Check priority order: Champions -> Loyal -> At-Risk -> Hibernating -> outlier.
    
    Note: Regex adds complexity with no benefit for a closed vocabulary of 5 terms.
    Simple str.lower() + keyword in text suffices and is easier to audit.
    
    Args:
        text (str): The text to scan.
        
    Returns:
        str | None: The matched segment or None if not found.
    """
    text_lower = text.lower()
    
    if "champions" in text_lower:
        return "Champions"
    if "loyal" in text_lower:
        return "Loyal"
    if "at-risk" in text_lower:
        return "At-Risk"
    if "hibernating" in text_lower:
        return "Hibernating"
    if "outlier" in text_lower:
        return "outlier"
        
    return None

def generate_playbook(question: str, sql_result: str) -> AgentResponse:
    """
    Orchestrate the full playbook synthesis without calling the LLM again.
    
    Args:
        question (str): The user's natural language question.
        sql_result (str): The raw answer string from the SQL agent.
        
    Returns:
        AgentResponse: The synthesised action plan.
    """
    segment_detected = detect_segment(sql_result)
    
    if segment_detected is None:
        tactic = TACTIC_TEMPLATES["default"]
    else:
        tactic = TACTIC_TEMPLATES[segment_detected]
        
    response = AgentResponse(
        question=question,
        sql_result=sql_result,
        tactic=tactic,
        segment_detected=segment_detected
    )
    
    logger.info(f"Playbook generated for segment: {segment_detected}")
    return response

def run_full_query(question: str, engine: Engine) -> AgentResponse:
    """
    Primary entry point for Phase 5.
    Streamlit should import and call only this function.
    
    Wires sql_agent and playbook_generator together into a single call.
    
    Args:
        question (str): The user query.
        engine (Engine): The SQLAlchemy engine.
        
    Returns:
        AgentResponse: The complete synthesized response.
    """
    sql_result = sql_agent.query(question, engine)
    response = generate_playbook(question, sql_result)
    return response


def generate_insight(user_query: str) -> AgentResponse:
    """
    Self-contained FastAPI-facing entry point.

    Creates its own SQLAlchemy engine internally so the HTTP layer never
    has to import or pass SQLAlchemy objects. This keeps the API boundary
    clean: in = plain string, out = AgentResponse dataclass.

    Args:
        user_query (str): The natural-language question from the API consumer.

    Returns:
        AgentResponse: The complete synthesised response including sql_result,
                       tactic, and segment_detected.

    Raises:
        RuntimeError: Propagated from sql_agent if Ollama is unreachable or
                      from SQLAlchemy if the database is unavailable.
    """
    from backend.src.database.database import engine as _engine
    return run_full_query(user_query, _engine)

if __name__ == "__main__":
    from backend.src.database.database import engine
    
    # Configure logging for standard execution view
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
    
    TEST_QUESTIONS = [
        "How many customers are in each cluster segment?",
        "Which segment has the highest average transaction amount?",
        "Show me the top 5 At-Risk customers by total spend.",
    ]

    for q in TEST_QUESTIONS:
        print(f"\n{'='*60}")
        print(f"QUESTION: {q}")
        resp = run_full_query(q, engine)
        print(resp)
