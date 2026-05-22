import logging
import pandas as pd
from sqlalchemy import func

from backend.src.database.database import Base, SessionLocal, engine
from backend.src.database.models import Transaction

# Configure logging to use INFO level, no print statements
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def load_data(csv_path: str = 'backend/data/raw_transactions.csv'):
    # 1. Initialization: ensure the schema exists
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # 2. Read CSV: dtype=str to prevent silent coercion of malformed values
    logger.info(f"Reading CSV data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path, dtype=str)
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return

    # 3. Cleaning Pipeline
    logger.info("Applying cleaning pipeline...")

    # Strip leading/trailing whitespace from all string columns
    for col in df.select_dtypes(['object']).columns:
        df[col] = df[col].str.strip()

    # Coerce the "date" column
    df['date'] = pd.to_datetime(df['date'], errors='coerce')

    # Coerce the "amount" column
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')

    # Log a cleaning summary
    null_customers = df['customer_id'].isna().sum()
    null_dates = df['date'].isna().sum()
    null_or_neg_amounts = df['amount'].isna().sum() + (df['amount'] < 0).sum()

    logger.info("Cleaning Summary:")
    logger.info(f"  Rows with null customer_id: {null_customers}")
    logger.info(f"  Rows with null/malformed date: {null_dates}")
    logger.info(f"  Rows with null/negative amount: {null_or_neg_amounts}")

    # Note: No rows are dropped here. Nulls/negatives are valid for Phase 3.

    # 4. Bulk Insert
    logger.info("Preparing data for bulk insert...")
    # Replace pd.NaT and np.nan with None so SQLAlchemy handles NULLs correctly
    records = df.where(pd.notnull(df), None).to_dict(orient='records')

    logger.info("Executing bulk insert...")
    db = SessionLocal()
    try:
        db.bulk_insert_mappings(Transaction, records)
        db.commit()
        logger.info("Bulk insert committed successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk insert failed. Transaction rolled back. Error: {e}")
        return
    finally:
        db.close()

    # 5. Verification
    db = SessionLocal()
    try:
        row_count = db.query(func.count(Transaction.id)).scalar()
        logger.info(f"Verification: {row_count} rows successfully loaded in the 'transactions' table.")
    finally:
        db.close()

if __name__ == "__main__":
    load_data()
