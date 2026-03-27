from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, LargeBinary
import uuid
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_encrypted = Column(LargeBinary, nullable=False)
    email_hash = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    mfa_secret_encrypted = Column(LargeBinary, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    roles = Column(JSON, default=["user"])
    account_status = Column(String(50), default="pending_verification") # pending_verification, active, locked, suspended
    failed_attempts = Column(Integer, default=0)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(50), nullable=True)
    last_login_location = Column(JSON, nullable=True)
    device_fingerprints = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
