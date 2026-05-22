import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Define the default connection string matching the docker-compose config
DEFAULT_DATABASE_URL = "postgresql://segmentiq_user:segmentiq_pass@127.0.0.1:5433/segmentiq"

# Read from environment variable, falling back to the default
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# Establish the engine with connection recycling (pool_pre_ping)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
)

# Configure the session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Expose the declarative base for ORM models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    Generator that yields a database session.
    Rolls back the session if an exception occurs and always closes it.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
