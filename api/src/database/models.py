from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from src.database.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(36), nullable=True, index=True)
    customer_id = Column(String(36), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    is_outlier = Column(Boolean, nullable=False, server_default='false')
    cluster_label = Column(String(32), nullable=True, default=None)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Transaction(id={self.id}, customer_id={self.customer_id}, amount={self.amount})>"


class User(Base):
    """
    Registered users for the SegmentIQ auth system.
    Passwords are stored as bcrypt hashes — never plain-text.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
