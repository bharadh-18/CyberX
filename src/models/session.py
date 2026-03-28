import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    refresh_token_hash = Column(String, index=True, nullable=False)
    
    # Forensic context
    device_fingerprint = Column(String, nullable=True) # Browser/Hardware Fingerprint
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    geo_country = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Session(user_id={self.user_id}, ip={self.ip_address})>"
