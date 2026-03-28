from typing import Optional, List, Dict
from pydantic import BaseModel, HttpUrl

class PhishingAnalysisRequest(BaseModel):
    text: str
    url: Optional[HttpUrl] = None
    email_headers: Optional[Dict[str, str]] = None

class PhishingAnalysisResponse(BaseModel):
    score: float # 0.0 to 1.0
    verdict: str # ALLOW, WARNING, QUARANTINE, BLOCK
    features: Dict[str, float]
    explanation: List[str]
