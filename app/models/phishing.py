from sqlalchemy import Column, String, Float, DateTime, JSON, LargeBinary, ForeignKey
from datetime import datetime
import uuid
from app.database import Base

class PhishingAnalysis(Base):
    __tablename__ = "phishing_analysis"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comment_text_encrypted = Column(LargeBinary, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    ml_score = Column(Float, nullable=False)
    url_reputation_score = Column(Float, nullable=False)
    regex_score = Column(Float, nullable=False)
    final_score = Column(Float, nullable=False)
    decision = Column(String(20), nullable=False) # allowed, quarantined, blocked
    extracted_urls = Column(JSON, default=[])
    threat_indicators = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
