"""
SQLAlchemy ORM models for the CyberX Zero-Trust platform.
Replaces the previous Firestore document collections with relational Postgres tables on Neon.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, Text, JSON,
    ForeignKey, LargeBinary, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_encrypted = Column(LargeBinary, nullable=False)
    email_hash = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret_encrypted = Column(LargeBinary, nullable=True)
    roles = Column(JSON, default=["user"])
    account_status = Column(String(20), default="active")
    failed_attempts = Column(Integer, default=0)
    device_fingerprints = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    login_locations = relationship("LoginLocation", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("PhishingAnalysis", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_fingerprint = Column(String(256))
    ip_address_encrypted = Column(LargeBinary)
    user_agent_encrypted = Column(LargeBinary)
    refresh_token_hash = Column(String(64))
    is_active = Column(Boolean, default=True)
    geolocation = Column(JSON, nullable=True)
    travel_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="sessions")


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    ip = Column(String(45))
    user_id = Column(String(128), nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    details = Column(JSON, default={})
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class LoginLocation(Base):
    __tablename__ = "login_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    city = Column(String(100), default="Unknown")
    country = Column(String(100), default="Unknown")
    ip = Column(String(45))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="login_locations")


class PhishingAnalysis(Base):
    __tablename__ = "phishing_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_text_encrypted = Column(LargeBinary)
    ml_score = Column(Float)
    url_reputation_score = Column(Float)
    regex_score = Column(Float)
    final_score = Column(Float)
    decision = Column(String(20))
    extracted_urls = Column(JSON, default=[])
    threat_indicators = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analyses")
