import logging
from sqlalchemy import func

from src.database.database import engine, SessionLocal
from src.database.models import Transaction
from src.ml import cleaner, clustering

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def run_pipeline() -> None:
    """
    Execute the ML pipeline end-to-end.
    
    Idempotency is achieved by using UPDATE semantics rather than INSERTs.
    Running the pipeline multiple times simply overwrites the is_outlier and
    cluster_label fields in-place for existing transaction rows. Duplicate
    records are not accumulated.
    """
    try:
        # Step 1 — connect
        logger.info("Pipeline starting. Connecting to database.")
        
        # Step 2 — fetch
        df = cleaner.fetch_transactions(engine)
        logger.info(f"Fetched {len(df)} raw rows from transactions table.")
        
        # Step 3 — drop anonymous
        df_clean = cleaner.drop_anonymous(df)
        
        # Step 4 — compute RFM
        rfm = cleaner.compute_rfm(df_clean)
        
        # Step 5 — detect outliers
        inliers, outliers = clustering.detect_outliers(rfm)
        
        # Step 6 — run K-Means
        labelled = clustering.run_kmeans(inliers)
        
        # Step 7 — summarise
        summary = clustering.compute_cluster_summary(labelled)
        
        # Step 8 — write back to PostgreSQL
        logger.info("Starting write-back to PostgreSQL...")
        outlier_ids = outliers.index.tolist()
        labelled_records = labelled['cluster_label'].to_dict() # {customer_id: cluster_label}
        
        db = SessionLocal()
        try:
            # 8a. Mark outliers
            if outlier_ids:
                db.query(Transaction).filter(
                    Transaction.customer_id.in_(outlier_ids)
                ).update({"is_outlier": True, "cluster_label": None}, synchronize_session=False)
            
            # 8b. Write cluster labels
            # We use a loop over unique customer_ids with individual .filter().update() calls
            # NOT bulk_update_mappings, because we are updating by customer_id (not by surrogate PK id),
            # and we need SQLAlchemy to generate safe parameterised queries.
            for cust_id, label in labelled_records.items():
                db.query(Transaction).filter(
                    Transaction.customer_id == cust_id
                ).update({"cluster_label": label, "is_outlier": False}, synchronize_session=False)
                
            db.commit()
            logger.info("Write-back complete.")
        except Exception as e:
            db.rollback()
            logger.error("Write-back failed. Rolling back transaction.")
            raise e
        finally:
            db.close()
            
        # Step 9 — verify
        db = SessionLocal()
        try:
            counts = db.query(
                Transaction.cluster_label, 
                func.count(Transaction.id)
            ).group_by(Transaction.cluster_label).all()
            
            logger.info("Verification of cluster_label distribution:")
            for label, count in counts:
                logger.info(f"  {label if label is not None else 'NULL'}: {count} rows")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise e

if __name__ == "__main__":
    run_pipeline()
