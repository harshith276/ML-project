import os
import pandas as pd
import requests
import streamlit as st
import plotly.express as px
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
import sqlalchemy.exc

st.set_page_config(
    page_title="SegmentIQ",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# This port is defined in docker-compose.yml host mapping and must
# match exactly. A wrong port is the most common "silent failure" in local dev.
# The default string is for dev-only — production must inject DATABASE_URL via environment.
DEFAULT_DATABASE_URL = "postgresql://segmentiq_user:segmentiq_pass@127.0.0.1:5433/segmentiq"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# FastAPI backend — overridable via env var for staging/prod deployments.
FASTAPI_URL: str = os.getenv("FASTAPI_URL", "http://localhost:8000")

SEGMENT_COLOURS: dict[str, str] = {
    "Champions":   "#1D9E75",   # green  — best customers
    "Loyal":       "#378ADD",   # blue   — reliable base
    "At-Risk":     "#EF9F27",   # amber  — declining engagement
    "Hibernating": "#D85A30",   # red    — near-lost
}

# cache_resource  — for shared objects like DB connections, ML models.
#                   One instance reused across all user sessions.
# cache_data      — for DataFrames and serialisable return values.
#                   Cached per unique set of input arguments.
@st.cache_resource
def get_engine() -> Engine:
    engine = create_engine("postgresql://segmentiq_user:segmentiq_pass@127.0.0.1:5433/segmentiq", pool_pre_ping=True)
    return engine

# ttl=300 means cached data expires after 5 minutes.
# This lets the dashboard reflect new ML pipeline runs
# without requiring a manual page refresh or server restart.
@st.cache_data(ttl=300)
def load_raw_transactions(_engine) -> pd.DataFrame:
    df = pd.read_sql_table("transactions", con=_engine)
    return df

@st.cache_data
def build_rfm_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # RFM logic mirrors backend/src/ml/cleaner.py:compute_rfm() — keep in sync if ML changes.
    
    # 1. Drop rows where customer_id is null (axis=0, explicit).
    df = df.dropna(subset=["customer_id"], axis=0)
    
    # 2. Drop rows where is_outlier == True so outliers do not contaminate
    #    the visual cluster positions.
    # Keep a separate outlier_df for the outlier metric card.
    df_clean = df[df["is_outlier"] == False].copy()
    
    # 3. Coerce the date column: pd.to_datetime(df["date"], errors="coerce")
    df_clean["date"] = pd.to_datetime(df_clean["date"], errors="coerce")
    
    # 4. Compute snapshot_date = pd.Timestamp.now(tz="UTC").
    #    Normalise df["date"] to UTC if it is timezone-aware.
    snapshot_date = pd.Timestamp.now(tz="UTC")
    if df_clean["date"].dt.tz is None:
        df_clean["date"] = df_clean["date"].dt.tz_localize("UTC")
    else:
        df_clean["date"] = df_clean["date"].dt.tz_convert("UTC")
        
    # 5. Group by customer_id and compute
    grouped = df_clean.groupby("customer_id")

    rfm_df = pd.DataFrame({
        "recency": (snapshot_date - grouped["date"].max()).dt.days.fillna(0).astype(int),
        "frequency": grouped["transaction_id"].count(),
        "monetary": grouped["amount"].sum(),
        # .first() is safe here because the ML pipeline
        # writes the same label to every row for a given customer_id.
        "cluster_label": grouped["cluster_label"].first()
    }).reset_index()
    
    return rfm_df

# ERROR HANDLING — DATABASE UNAVAILABLE
try:
    engine = get_engine()
    raw_df = load_raw_transactions(engine)
    rfm_df = build_rfm_dataframe(raw_df)
except Exception as e:
    st.error(f"❌ Actual Error: {e}")
    st.stop()

# SIDEBAR
st.sidebar.title("SegmentIQ")
st.sidebar.caption("Privacy-first customer segmentation")
st.sidebar.markdown("---")

st.sidebar.subheader("🔎 Filters")
selected_segments = st.sidebar.multiselect(
    label="Show segments",
    options=["Champions", "Loyal", "At-Risk", "Hibernating"],
    default=["Champions", "Loyal", "At-Risk", "Hibernating"]
)

show_outliers: bool = st.sidebar.checkbox(
    "Include outlier rows in raw table",
    value=False
)
# Outliers are excluded from clustering visuals always.
# This checkbox only affects the raw data expander at the bottom.

st.sidebar.markdown("---")

st.sidebar.button("🔄 Re-run ML Pipeline")
# Phase 6 could wire this to subprocess.run().
st.sidebar.info("To re-run: python -m src.ml.pipeline")

try:
    with engine.connect() as conn:
        pass
    st.sidebar.success("✅ Database connected")
except sqlalchemy.exc.OperationalError:
    st.sidebar.error("❌ Database unreachable")

# AI ANALYST SIDEBAR
st.sidebar.markdown("---")
st.sidebar.subheader("🤖 AI Analyst")
st.sidebar.caption("Ask questions about your segments in plain English.")

# Maintain chat history in session state so it persists across
# Streamlit re-runs triggered by widget interactions.
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

user_question = st.sidebar.text_input(
    label="Ask about your data",
    placeholder="e.g. Which segment has the highest churn risk?",
    key="agent_input",
)

if st.sidebar.button("Ask SegmentIQ", key="agent_submit"):
    if not user_question.strip():
        st.sidebar.warning("Please enter a question.")
    else:
        with st.sidebar.spinner("Analyzing data..."):
            try:
                resp = requests.post(
                    f"{FASTAPI_URL}/ask-ai",
                    json={"query": user_question},
                    timeout=120,  # LLM inference can be slow on small hardware
                )
                resp.raise_for_status()  # surfaces 4xx / 5xx as HTTPError
                data = resp.json()
                st.session_state.chat_history.append({
                    "question": data["question"],
                    "insight": data["insight"],
                    "tactic": data["tactic"],
                    "segment": data.get("segment_detected"),
                    "error": None,
                })
            except requests.exceptions.ConnectionError:
                # FastAPI server not running
                st.session_state.chat_history.append({
                    "question": user_question,
                    "insight": "",
                    "tactic": "",
                    "segment": None,
                    "error": (
                        "❌ Cannot reach the SegmentIQ API. "
                        "Start it with: `uvicorn backend.main:app --reload --port 8000`"
                    ),
                })
            except requests.exceptions.Timeout:
                st.session_state.chat_history.append({
                    "question": user_question,
                    "insight": "",
                    "tactic": "",
                    "segment": None,
                    "error": (
                        "⏱️ The AI Analyst timed out (>120 s). "
                        "The LLM may be overloaded — try a simpler question."
                    ),
                })
            except requests.exceptions.HTTPError as exc:
                # 503 = Ollama down, 422 = validation error, 500 = agent crash
                detail = exc.response.json().get("detail", str(exc))
                st.session_state.chat_history.append({
                    "question": user_question,
                    "insight": "",
                    "tactic": "",
                    "segment": None,
                    "error": f"⚠️ API error ({exc.response.status_code}): {detail}",
                })

if st.sidebar.button("🗑️ Clear Chat History"):
    st.session_state.chat_history = []
    st.rerun()

# Render chat history newest-first.
for turn in reversed(st.session_state.chat_history):
    st.sidebar.markdown(f"**Q:** {turn['question']}")
    if turn["error"]:
        # Surface API / connectivity errors clearly
        st.sidebar.error(turn["error"])
    else:
        if turn["segment"]:
            # Segment badge — styled inline code so it stands out
            st.sidebar.markdown(f"**Segment detected:** `{turn['segment']}`")
        st.sidebar.markdown(f"**Insight:**\n\n{turn['insight']}")
        st.sidebar.info(turn["tactic"])
    st.sidebar.markdown("---")

# MAIN PANEL — SECTION 1: PAGE HEADER
st.title("📊 SegmentIQ — Customer Intelligence Dashboard")
st.caption(
    "RFM segmentation powered by K-Means · "
    "Outlier detection via Local Outlier Factor · "
    "100% local inference"
)
st.markdown("---")

# Filter RFM dataframe based on sidebar
filtered_rfm = rfm_df[rfm_df["cluster_label"].isin(selected_segments)]

# MAIN PANEL — SECTION 2: TOP-LEVEL METRIC CARDS
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        label="Total Customers",
        value=filtered_rfm["customer_id"].nunique(),
        delta=None
    )

with col2:
    st.metric(
        label="Avg. Monetary Value",
        value=f"₹{filtered_rfm['monetary'].mean():,.0f}" if not filtered_rfm.empty else "₹0",
        delta=None
    )

with col3:
    st.metric(
        label="Avg. Recency",
        value=f"{filtered_rfm['recency'].mean():.0f} days" if not filtered_rfm.empty else "0 days",
        help="Lower is better — fewer days since last purchase."
    )

with col4:
    # delta_color="off" renders the delta in grey — it is informational,
    # not a directional metric.
    st.metric(
        label="Outliers Detected",
        value=raw_df[raw_df["is_outlier"] == True]["customer_id"].nunique(),
        delta="excluded from clusters",
        delta_color="off"
    )

st.markdown("---")

# MAIN PANEL — SECTION 3: 3D CLUSTER EXPLORER
st.subheader("🌐 3D Cluster Explorer")
st.caption(
    "Each point is a customer. Axes represent RFM dimensions. "
    "Colour represents the K-Means segment assigned by the ML engine."
)

fig = px.scatter_3d(
    filtered_rfm,
    x="recency",
    y="frequency",
    z="monetary",
    color="cluster_label",
    color_discrete_map=SEGMENT_COLOURS,
    hover_data=["customer_id", "recency", "frequency", "monetary"],
    title="Customer Segments — RFM Space",
    labels={
        "recency": "Recency (days since last purchase)",
        "frequency": "Frequency (total transactions)",
        "monetary": "Monetary (total spend ₹)",
    },
    opacity=0.8,
)

fig.update_traces(marker=dict(size=4))
# size=4: small enough to show density, large enough to hover.
# Do not go below 3 — sub-pixel points are invisible on high-DPI.

fig.update_layout(
    height=650,
    margin=dict(l=0, r=0, t=40, b=0),
    legend_title="Segment",
    scene=dict(
        xaxis_title="Recency →",
        yaxis_title="Frequency →",
        zaxis_title="Monetary ₹ →",
    ),
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
)
# Transparent backgrounds let Streamlit's own theme show through.
# Do not hardcode white — it breaks dark mode.

st.plotly_chart(fig, use_container_width=True)

# MAIN PANEL — SECTION 4: TWO-COLUMN LAYOUT
left_col, right_col = st.columns([1.2, 1])

with left_col:
    st.subheader("📋 Segment Summary")
    
    summary = (
        filtered_rfm
        .groupby("cluster_label")
        .agg(
            Customers=("customer_id", "nunique"),
            Avg_Recency=("recency", "mean"),
            Avg_Frequency=("frequency", "mean"),
            Avg_Monetary=("monetary", "mean"),
        )
        .round(1)
        .reset_index()
        .rename(columns={"cluster_label": "Segment"})
        .sort_values("Avg_Monetary", ascending=False)
    )
    # Sort by Avg_Monetary descending so Champions always appears first —
    # the same centroid-rank logic used in the ML engine.
    
    summary["Avg_Monetary"] = summary["Avg_Monetary"].apply(
        lambda x: f"₹{x:,.0f}"
    )

    st.dataframe(
        summary,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Segment": st.column_config.TextColumn("Segment"),
            "Customers": st.column_config.NumberColumn("Customers", format="%d"),
            "Avg_Recency": st.column_config.NumberColumn("Avg Recency (days)", format="%.1f"),
            "Avg_Frequency": st.column_config.NumberColumn("Avg Frequency", format="%.1f"),
            "Avg_Monetary": st.column_config.TextColumn("Avg Monetary"),
        }
    )

with right_col:
    st.subheader("📊 Segment Distribution")
    
    bar_data = (
        filtered_rfm
        .groupby("cluster_label")["customer_id"]
        .nunique()
        .reset_index()
        .rename(columns={"customer_id": "Customers", "cluster_label": "Segment"})
        .sort_values("Customers", ascending=True)
        # ascending=True so the longest bar (Champions) is at top
        # in a horizontal bar chart — natural reading order.
    )

    bar_fig = px.bar(
        bar_data,
        x="Customers",
        y="Segment",
        orientation="h",
        color="Segment",
        color_discrete_map=SEGMENT_COLOURS,
        text="Customers",
        title="Customers per Segment",
    )
    bar_fig.update_traces(textposition="outside")
    bar_fig.update_layout(
        height=320,
        showlegend=False,
        margin=dict(l=0, r=40, t=40, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis_title="Number of Customers",
        yaxis_title="",
    )

    st.plotly_chart(bar_fig, use_container_width=True)

# MAIN PANEL — SECTION 5: RAW DATA EXPANDER
st.markdown("---")

with st.expander("🗄️ Raw Transaction Data", expanded=False):
    st.caption(
        "Showing the full transactions table as loaded from PostgreSQL. "
        "Toggle 'Include outlier rows' in the sidebar to show/hide "
        "LOF-flagged anomalies."
    )

    display_df = raw_df.copy()
    if not show_outliers:
        display_df = display_df[display_df["is_outlier"] == False]

    # Apply segment filter to raw table too — consistent UX.
    display_df = display_df[
        display_df["cluster_label"].isin(selected_segments)
        | display_df["cluster_label"].isna()
    ]

    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "id": st.column_config.NumberColumn("ID"),
            "transaction_id": st.column_config.TextColumn("Transaction ID"),
            "customer_id": st.column_config.TextColumn("Customer ID"),
            "date": st.column_config.DatetimeColumn("Date", format="DD/MM/YYYY HH:mm"),
            "amount": st.column_config.NumberColumn("Amount (₹)", format="₹%.2f"),
            "is_outlier": st.column_config.CheckboxColumn("Outlier?"),
            "cluster_label": st.column_config.TextColumn("Segment"),
            "created_at": st.column_config.DatetimeColumn("Loaded At", format="DD/MM/YYYY HH:mm"),
        }
    )

    st.caption(f"Showing {len(display_df):,} rows.")
