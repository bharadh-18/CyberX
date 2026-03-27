from pydantic import BaseModel, Field
from typing import Optional, List

class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)

class CommentResponse(BaseModel):
    analysis_id: str
    status: str
    message: str
    ml_score: Optional[float] = None
    url_reputation_score: Optional[float] = None
    regex_score: Optional[float] = None
    final_score: Optional[float] = None
    threat_indicators: Optional[List[str]] = None
    trust_factors: Optional[List[str]] = None

class CommentStatusResponse(BaseModel):
    analysis_id: str
    decision: str
