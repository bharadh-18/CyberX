from sqlalchemy import Column, String, Boolean, DateTime, JSON, LargeBinary, ForeignKey
from datetime import datetime
import uuid
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    device_fingerprint = Column(String(64), nullable=False)
    ip_address_encrypted = Column(LargeBinary, nullable=False)
    user_agent_encrypted = Column(LargeBinary, nullable=False)
    geolocation = Column(JSON, nullable=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
