import logging
import pandas as pd
from sqlalchemy import Engine

# Configure logging to INFO level
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def fetch_transactions(engine: Engine) -> pd.DataFrame:
    """
    Fetch raw data from Postgres.
    
    Reads the full transactions table into a Pandas DataFrame.
    
    Args:
        engine (Engine): SQLAlchemy database engine.
        
    Returns:
        pd.DataFrame: Raw transactions DataFrame directly from the database.
    """
    df = pd.read_sql_table("transactions", con=engine)
    return df

def drop_anonymous(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop all rows where customer_id is null.
    
    Args:
        df (pd.DataFrame): Raw transactions DataFrame.
        
    Returns:
        pd.DataFrame: Cleaned DataFrame with anonymous transactions removed.
    """
    initial_rows = len(df)
    # axis=0 operates across the index (row axis), which is what we want here
    # to drop the actual observation rows where customer_id is missing, not the column.
    cleaned_df = df.dropna(subset=['customer_id'], axis=0)
    final_rows = len(cleaned_df)
    logger.info(f"Dropped {initial_rows - final_rows} anonymous rows. {final_rows} remain.")
    return cleaned_df

def compute_rfm(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate the cleaned transaction-level DataFrame into one row per customer
    containing Recency, Frequency, and Monetary features.
    
    Args:
        df (pd.DataFrame): Cleaned transaction DataFrame.
        
    Returns:
        pd.DataFrame: Aggregated RFM DataFrame with index name "customer_id".
    """
    # Use UTC for snapshot to align with timezone-aware database output.
    snapshot_date = pd.Timestamp.now(tz=df['date'].dt.tz if pd.api.types.is_datetime64tz_dtype(df['date']) else 'UTC')
    
    # Recency: Number of days between the customer's most recent transaction date 
    # and the snapshot date. Lower is better - a customer who bought yesterday is more recent.
    # Note: date column may contain NaT values — handled with dropna() on the grouped date series.
    recency = (snapshot_date - df.dropna(subset=['date']).groupby("customer_id")["date"].max()).dt.days
    recency.name = "recency"
    
    # Frequency: Total count of transactions per customer.
    # Higher is better - frequent buyers are more engaged.
    frequency = df.groupby("customer_id")["transaction_id"].count()
    frequency.name = "frequency"
    
    # Monetary: Sum of all transaction amounts per customer.
    # Higher is better - but note: negatives (returns) are intentionally included.
    # A customer with net negative spend is a valid signal.
    monetary = df.groupby("customer_id")["amount"].sum()
    monetary.name = "monetary"
    
    rfm = pd.concat([recency, frequency, monetary], axis=1)
    
    # Drop any customer whose recency is NaT (they had only null dates)
    rfm = rfm.dropna(subset=['recency'])
    rfm.index.name = "customer_id"
    
    logger.info(f"Computed RFM DataFrame. Shape: {rfm.shape}")
    return rfm
