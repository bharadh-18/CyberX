from fastapi import APIRouter, Depends
from src.models.user import User
from src.dependencies import get_current_user
from src.schemas.phishing import PhishingAnalysisRequest, PhishingAnalysisResponse
from src.ml.inference import analyze_phishing

router = APIRouter(prefix="/api/phishing", tags=["Threat Detection"])

@router.post("/analyze", response_model=PhishingAnalysisResponse)
async def analyze_content(
    request: PhishingAnalysisRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes text and optional URLs for phishing indicators using the ML ensemble model.
    Requires an active authenticated session.
    """
    # In a full async ML pipeline, this might be sent to Celery. 
    # For now, we run it directly (it's a fast TF-IDF + Logistic Regression).
    
    # We pass the url as a string if it exists
    url_str = str(request.url) if request.url else None
    
    result = analyze_phishing(request.text, url=url_str)
    
    return PhishingAnalysisResponse(
        score=result["score"],
        verdict=result["verdict"],
        features=result["features"],
        explanation=result["explanation"]
    )
