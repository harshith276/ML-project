"""
backend/main.py — SegmentIQ FastAPI service.

Run with:
    uvicorn backend.main:app --reload --port 8000

Endpoints
---------
GET  /health             — Liveness probe.
GET  /segments           — Live KPI summary + cluster data.
GET  /transactions       — Paginated transaction rows.
POST /chat               — Ollama chatbot.
POST /auth/register      — Create account (bcrypt + JWT).
POST /auth/login         — Sign in (bcrypt verify + JWT).
GET  /auth/me            — Validate JWT, return user info.
"""

import logging
import os
import textwrap
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text

# ---------------------------------------------------------------------------
# Auth configuration
# ---------------------------------------------------------------------------
# WARNING: Change JWT_SECRET_KEY via environment variable in production.
# Default is for local dev only — never commit a real secret here.
JWT_SECRET: str = os.getenv("JWT_SECRET_KEY", "segmentiq-dev-secret-CHANGE-IN-PROD")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(tz=timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

from backend.src.agent.playbook_generator import generate_insight

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ollama settings (reused for /chat)
# ---------------------------------------------------------------------------
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:1.5b")

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SegmentIQ API",
    description=(
        "Privacy-first customer segmentation backend. "
        "All LLM inference is local via Ollama — zero data egress."
    ),
    version="2.0.0",
)

# CORS — allow Streamlit (8501) and Vite dev server (5173) and any localhost origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    """Payload for POST /ask-ai (legacy Streamlit endpoint)."""
    query: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Natural-language question about the customer segments.",
        examples=["How many Champions customers do we have?"],
    )


class AskResponse(BaseModel):
    """Structured response returned by POST /ask-ai."""
    question: str = Field(description="The original question echoed back.")
    insight: str = Field(description="Raw SQL query result translated to plain English.")
    tactic: str = Field(description="Recommended marketing action for the detected segment.")
    segment_detected: str | None = Field(
        default=None,
        description="The RFM segment keyword found in the result, if any.",
    )


class HealthResponse(BaseModel):
    status: str
    database: str
    message: str


class SegmentStat(BaseModel):
    name: str
    count: int
    avg_recency: float
    avg_frequency: float
    avg_monetary: float


class RfmPoint(BaseModel):
    customer_id: str
    recency: float
    frequency: float
    monetary: float
    segment: str


class SegmentsResponse(BaseModel):
    total_customers: int
    avg_monetary: float
    avg_recency: float
    outlier_count: int
    segments: list[SegmentStat]
    rfm_points: list[RfmPoint]


class TransactionRow(BaseModel):
    transaction_id: str | None
    customer_id: str | None
    amount: float | None
    date: str | None
    segment: str | None
    is_outlier: bool


class TransactionsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: list[TransactionRow]


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(
        ...,
        description="Full conversation history. Last item is the new user message.",
    )


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
    tags=["ops"],
)
def health_check() -> HealthResponse:
    """
    Verify that the API can reach PostgreSQL.
    Returns HTTP 200 if healthy, HTTP 503 if the database is unreachable.
    """
    try:
        from backend.src.database.database import engine
        with engine.connect():
            pass
        return HealthResponse(
            status="ok",
            database="connected",
            message="SegmentIQ API is healthy.",
        )
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Database unreachable: {exc}",
        )


@app.post(
    "/ask-ai",
    response_model=AskResponse,
    summary="Run the AI Analyst (legacy SQL agent)",
    tags=["agent"],
)
def ask_ai(body: AskRequest) -> AskResponse:
    """
    Legacy endpoint used by the Streamlit frontend.
    Accepts a natural-language question, executes the LangChain SQL chain
    against PostgreSQL via a local Ollama model, and returns a structured
    insight + marketing tactic.
    """
    logger.info("POST /ask-ai — question: %r", body.query)

    try:
        agent_response = generate_insight(body.query)
    except RuntimeError as exc:
        logger.error("Agent runtime error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "AI Analyst is unavailable. "
                "Ensure Ollama is running: `ollama serve` "
                f"and the model is pulled. Detail: {exc}"
            ),
        )
    except Exception as exc:
        logger.error("Unexpected agent error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error from the AI agent: {exc}",
        )

    return AskResponse(
        question=agent_response.question,
        insight=agent_response.sql_result,
        tactic=agent_response.tactic,
        segment_detected=agent_response.segment_detected,
    )


@app.get(
    "/segments",
    response_model=SegmentsResponse,
    summary="Live KPI summary + cluster stats",
    tags=["data"],
)
def get_segments() -> SegmentsResponse:
    """
    Returns aggregate KPI metrics (total customers, avg monetary, avg recency,
    outlier count) plus per-segment breakdowns and a sampled set of RFM points
    for the 3D scatter plot.

    All customers with is_outlier = TRUE are excluded from segment stats.
    """
    from backend.src.database.database import engine
    import pandas as pd
    from datetime import timezone
    import datetime

    try:
        with engine.connect() as conn:
            # ── 1. Per-customer RFM aggregation ──────────────────────────────
            rfm_sql = text("""
                SELECT
                    customer_id,
                    cluster_label,
                    COUNT(transaction_id)                       AS frequency,
                    SUM(amount)                                 AS monetary,
                    MAX(date)                                   AS last_date
                FROM transactions
                WHERE is_outlier = FALSE
                  AND cluster_label IS NOT NULL
                  AND customer_id IS NOT NULL
                GROUP BY customer_id, cluster_label
            """)
            rfm_rows = conn.execute(rfm_sql).fetchall()

            # ── 2. Outlier count ──────────────────────────────────────────────
            outlier_sql = text("""
                SELECT COUNT(DISTINCT customer_id) AS cnt
                FROM transactions
                WHERE is_outlier = TRUE
            """)
            outlier_count = conn.execute(outlier_sql).scalar() or 0

        if not rfm_rows:
            return SegmentsResponse(
                total_customers=0,
                avg_monetary=0.0,
                avg_recency=0.0,
                outlier_count=int(outlier_count),
                segments=[],
                rfm_points=[],
            )

        # Build a DataFrame for easy aggregation
        df = pd.DataFrame(rfm_rows, columns=["customer_id", "cluster_label", "frequency", "monetary", "last_date"])
        df["frequency"] = pd.to_numeric(df["frequency"], errors="coerce").fillna(0)
        df["monetary"] = pd.to_numeric(df["monetary"], errors="coerce").fillna(0)

        # Recency = days since last purchase
        now = datetime.datetime.now(tz=timezone.utc)

        def to_days(ts):
            if ts is None:
                return 0
            if hasattr(ts, "tzinfo") and ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return max(0, (now - ts).days)

        df["recency"] = df["last_date"].apply(to_days)

        # ── Global KPIs ───────────────────────────────────────────────────────
        total_customers = int(df["customer_id"].nunique())
        avg_monetary = float(df["monetary"].mean())
        avg_recency = float(df["recency"].mean())

        # ── Per-segment stats ─────────────────────────────────────────────────
        grp = df.groupby("cluster_label").agg(
            count=("customer_id", "nunique"),
            avg_recency=("recency", "mean"),
            avg_frequency=("frequency", "mean"),
            avg_monetary=("monetary", "mean"),
        ).reset_index()

        segments = [
            SegmentStat(
                name=row["cluster_label"],
                count=int(row["count"]),
                avg_recency=round(float(row["avg_recency"]), 1),
                avg_frequency=round(float(row["avg_frequency"]), 1),
                avg_monetary=round(float(row["avg_monetary"]), 2),
            )
            for _, row in grp.iterrows()
        ]

        # ── Sampled RFM points for 3D scatter (max 400 per segment) ───────────
        rfm_points = []
        for label in df["cluster_label"].unique():
            subset = df[df["cluster_label"] == label].sample(
                n=min(400, len(df[df["cluster_label"] == label])),
                random_state=42,
            )
            for _, r in subset.iterrows():
                rfm_points.append(RfmPoint(
                    customer_id=str(r["customer_id"]),
                    recency=round(float(r["recency"]), 1),
                    frequency=round(float(r["frequency"]), 1),
                    monetary=round(float(r["monetary"]), 2),
                    segment=str(r["cluster_label"]),
                ))

        return SegmentsResponse(
            total_customers=total_customers,
            avg_monetary=round(avg_monetary, 2),
            avg_recency=round(avg_recency, 1),
            outlier_count=int(outlier_count),
            segments=segments,
            rfm_points=rfm_points,
        )

    except Exception as exc:
        logger.error("GET /segments error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Segment query failed: {exc}")


@app.get(
    "/transactions",
    response_model=TransactionsResponse,
    summary="Paginated transaction rows",
    tags=["data"],
)
def get_transactions(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(10, ge=1, le=100, description="Rows per page"),
    search: Optional[str] = Query(None, description="Search on transaction_id or customer_id"),
    segment: Optional[str] = Query(None, description="Filter by cluster_label"),
    show_outliers: bool = Query(False, description="Include outlier rows"),
) -> TransactionsResponse:
    """
    Returns a paginated, searchable, filterable view of the transactions table.
    Default excludes outlier rows. Search applies ILIKE on transaction_id and customer_id.
    """
    from backend.src.database.database import engine

    try:
        with engine.connect() as conn:
            # ── Build WHERE clauses ──────────────────────────────────────────
            conditions = []
            params: dict = {}

            if not show_outliers:
                conditions.append("is_outlier = FALSE")

            if search and search.strip():
                conditions.append(
                    "(CAST(transaction_id AS TEXT) ILIKE :search OR CAST(customer_id AS TEXT) ILIKE :search)"
                )
                params["search"] = f"%{search.strip()}%"

            if segment and segment.strip():
                conditions.append("cluster_label = :segment")
                params["segment"] = segment.strip()

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            # ── Total count ──────────────────────────────────────────────────
            count_sql = text(f"SELECT COUNT(*) FROM transactions {where_clause}")
            total = conn.execute(count_sql, params).scalar() or 0

            # ── Page of rows ─────────────────────────────────────────────────
            offset = (page - 1) * page_size
            data_sql = text(f"""
                SELECT
                    transaction_id,
                    customer_id,
                    amount,
                    date,
                    cluster_label,
                    is_outlier
                FROM transactions
                {where_clause}
                ORDER BY date DESC NULLS LAST
                LIMIT :limit OFFSET :offset
            """)
            params["limit"] = page_size
            params["offset"] = offset
            rows = conn.execute(data_sql, params).fetchall()

        data = [
            TransactionRow(
                transaction_id=row[0],
                customer_id=row[1],
                amount=float(row[2]) if row[2] is not None else None,
                date=row[3].isoformat() if row[3] is not None else None,
                segment=row[4],
                is_outlier=bool(row[5]),
            )
            for row in rows
        ]

        return TransactionsResponse(
            total=int(total),
            page=page,
            page_size=page_size,
            data=data,
        )

    except Exception as exc:
        logger.error("GET /transactions error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transaction query failed: {exc}")


@app.post(
    "/chat",
    response_model=ChatResponse,
    summary="Context-aware Ollama chatbot",
    tags=["chat"],
)
def chat(body: ChatRequest) -> ChatResponse:
    """
    Conversational AI endpoint powered by the local Ollama model.

    On each request:
      1. Fetches a live data snapshot from PostgreSQL (segment counts, KPIs).
      2. Injects this snapshot as a system context so the LLM knows real numbers.
      3. Sends the full conversation history to Ollama and returns the reply.

    The LLM does NOT write SQL — it only reads the pre-fetched data summary
    and answers in natural language. This makes responses fast and reliable.
    """
    from backend.src.database.database import engine
    from langchain_ollama import OllamaLLM

    if not body.messages:
        raise HTTPException(status_code=422, detail="messages list cannot be empty.")

    # ── Step 1: Fetch a live data snapshot from PostgreSQL ───────────────────
    try:
        with engine.connect() as conn:
            seg_sql = text("""
                SELECT
                    cluster_label,
                    COUNT(DISTINCT customer_id)  AS customers,
                    ROUND(AVG(amount)::numeric, 2)            AS avg_amount,
                    COUNT(transaction_id)        AS transactions
                FROM transactions
                WHERE is_outlier = FALSE
                  AND cluster_label IS NOT NULL
                GROUP BY cluster_label
                ORDER BY customers DESC
            """)
            seg_rows = conn.execute(seg_sql).fetchall()

            total_sql = text("""
                SELECT
                    COUNT(DISTINCT customer_id) FILTER (WHERE is_outlier = FALSE) AS total_customers,
                    COUNT(DISTINCT customer_id) FILTER (WHERE is_outlier = TRUE)  AS outliers,
                    ROUND(SUM(amount)::numeric, 2)                                 AS total_revenue,
                    COUNT(transaction_id)                                           AS total_transactions
                FROM transactions
            """)
            totals = conn.execute(total_sql).fetchone()

        # Build a compact data summary string
        segment_lines = "\n".join(
            f"  - {r[0]}: {r[1]} customers, avg transaction ₹{r[2]}, {r[3]} total transactions"
            for r in seg_rows
        ) or "  (No segment data available yet)"

        data_context = textwrap.dedent(f"""
            === LIVE DATABASE SNAPSHOT ===
            Total non-outlier customers : {totals[0] if totals else 'N/A'}
            Outlier customers           : {totals[1] if totals else 'N/A'}
            Total revenue               : ₹{totals[2] if totals else 'N/A'}
            Total transactions          : {totals[3] if totals else 'N/A'}

            Segment Breakdown:
            {segment_lines}

            Segment Definitions:
              - Champions   : High recency, high frequency, high spend. Best customers.
              - Loyal       : Reliable frequent buyers, mid-high spend.
              - At-Risk     : Previously active, now declining engagement.
              - Hibernating : Near-lost, low on all RFM dimensions.
        """).strip()

    except Exception as exc:
        logger.warning("Could not fetch DB snapshot for /chat: %s", exc)
        data_context = "Database snapshot unavailable. Answer based on general RFM segmentation knowledge."

    # ── Step 2: Build the system prompt ─────────────────────────────────────
    system_prompt = textwrap.dedent(f"""
        You are SegmentIQ AI, a friendly and knowledgeable customer analytics assistant.
        You help marketing and data teams understand their customer segments and take action.

        You have access to the following live data from the SegmentIQ database:

        {data_context}

        Guidelines:
        - Answer questions conversationally and concisely (2-4 sentences max unless detail is asked).
        - Use the real numbers above when answering questions about counts, revenue, or segments.
        - When asked for marketing advice, tailor it to the specific segment(s) mentioned.
        - Never mention SQL, databases, or technical implementation details.
        - If asked something outside your data scope, be honest and helpful.
        - Use ₹ for currency amounts.
    """).strip()

    # ── Step 3: Build conversation string for the 1.5b model ────────────────
    # qwen2.5-coder:1.5b does not support a chat API natively via OllamaLLM,
    # so we format the conversation as a plain text prompt.
    conversation_parts = [system_prompt, ""]
    for msg in body.messages:
        role_label = "User" if msg.role == "user" else "SegmentIQ AI"
        conversation_parts.append(f"{role_label}: {msg.content}")
    conversation_parts.append("SegmentIQ AI:")

    full_prompt = "\n".join(conversation_parts)

    # ── Step 4: Call Ollama ──────────────────────────────────────────────────
    try:
        llm = OllamaLLM(
            base_url=OLLAMA_BASE_URL,
            model=OLLAMA_MODEL,
            temperature=0.7,   # slightly creative for conversational replies
        )
        reply = llm.invoke(full_prompt)

        # Clean up: strip any accidental role prefix the model might echo back
        reply = reply.strip()
        for prefix in ("SegmentIQ AI:", "Assistant:", "AI:"):
            if reply.lower().startswith(prefix.lower()):
                reply = reply[len(prefix):].strip()

        logger.info("POST /chat — replied (%d chars)", len(reply))
        return ChatResponse(reply=reply)

    except Exception as exc:
        logger.error("POST /chat Ollama error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=(
                f"Ollama model is unavailable. "
                f"Ensure `ollama serve` is running and model '{OLLAMA_MODEL}' is pulled. "
                f"Detail: {exc}"
            ),
        )


# ---------------------------------------------------------------------------
# Startup — auto-create any missing tables (including `users`)
# ---------------------------------------------------------------------------

@app.on_event("startup")
def _on_startup() -> None:
    """Create all ORM-mapped tables that don't yet exist in the DB."""
    from backend.src.database.database import engine
    from backend.src.database import models  # noqa: F401 — imports register models
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created on startup.")


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128,
                          description="Minimum 8 characters.")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.post(
    "/auth/register",
    response_model=AuthResponse,
    summary="Create a new account",
    tags=["auth"],
)
def register(body: RegisterRequest) -> AuthResponse:
    """
    Register a new user. Password is hashed with bcrypt before storage.
    Returns a signed JWT (24 h expiry) on success.
    Raises HTTP 409 if the email is already taken.
    """
    from backend.src.database.database import SessionLocal
    from backend.src.database.models import User

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == body.email).first():
            raise HTTPException(status_code=409, detail="Email already registered.")
        user = User(
            name=body.name,
            email=body.email,
            hashed_password=_hash_password(body.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = _create_token({"sub": str(user.id), "email": user.email})
        logger.info("New user registered: %s (id=%s)", user.email, user.id)
        return AuthResponse(
            access_token=token,
            user={"id": user.id, "name": user.name, "email": user.email},
        )
    finally:
        db.close()


@app.post(
    "/auth/login",
    response_model=AuthResponse,
    summary="Sign in with email + password",
    tags=["auth"],
)
def login(body: LoginRequest) -> AuthResponse:
    """
    Authenticate with email + password. Returns JWT on success.
    Uses bcrypt.verify — timing-safe comparison prevents user enumeration.
    Raises HTTP 401 for any credential mismatch (intentionally vague).
    """
    from backend.src.database.database import SessionLocal
    from backend.src.database.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == body.email).first()
        # Always call verify_password even if user is None to prevent
        # timing-based user enumeration attacks.
        dummy_hash = "$2b$12$KIXnM.dummy.hash.for.timing.safety.only..........."
        if not user or not _verify_password(body.password, user.hashed_password if user else dummy_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        token = _create_token({"sub": str(user.id), "email": user.email})
        logger.info("User logged in: %s (id=%s)", user.email, user.id)
        return AuthResponse(
            access_token=token,
            user={"id": user.id, "name": user.name, "email": user.email},
        )
    finally:
        db.close()


@app.get(
    "/auth/me",
    summary="Validate token and return current user",
    tags=["auth"],
)
def me(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Accepts a Bearer JWT, validates it, and returns the current user's info.
    Used by ProtectedRoute on the frontend to confirm the session is active.
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = _decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalid or expired.")

    from backend.src.database.database import SessionLocal
    from backend.src.database.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User account not found.")
        return {"id": user.id, "name": user.name, "email": user.email}
    finally:
        db.close()
