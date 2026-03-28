import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=True)
    
    # Event metadata (aligned with MITRE ATT&CK categories)
    category = Column(String, index=True, nullable=False) # e.g. "AUTHENTICATION", "DATA_ACCESS"
    severity = Column(String, default="INFO", index=True) # DEBUG, INFO, WARNING, ERROR, CRITICAL
    action = Column(String, nullable=False) # e.g. "user_login", "password_change"
    
    # Forensic data
    source_ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(JSON, nullable=True) # JSON store for event-specific details
    
    # Integrity protection
    signature = Column(String, nullable=True) # HMAC for tamper detection
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AuditLog(action={self.action}, user_id={self.user_id})>"
