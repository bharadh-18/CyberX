import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    BOTH = "both"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True) # Null for Google-only users
    provider = Column(SQLAlchemyEnum(AuthProvider), default=AuthProvider.EMAIL)
    google_id = Column(String, unique=True, nullable=True, index=True)
    totp_secret = Column(String, nullable=True) # Encrypted
    avatar_url = Column(String, nullable=True)
    
    # Security tracking
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(email={self.email}, provider={self.provider})>"
