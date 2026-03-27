from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.models.phishing import PhishingAnalysis
from app.schemas.comment import CommentCreate, CommentResponse, CommentStatusResponse
from app.authorization.rbac import RequirePermission
from app.auth.dependencies import get_current_active_user
from app.services.phishing_detector import phishing_detector
from app.services.encryption import encrypt_field
from app.routes.auth import log_security_event

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=CommentResponse)
async def create_comment(
    request: Request,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _=Depends(RequirePermission("comment:create"))
):
    analysis_result = phishing_detector.analyze(payload.text)
    
    if analysis_result["decision"] == "blocked":
        log_security_event(request, "PHISHING_DETECTED", "HIGH", analysis_result)
        
    analysis_record = PhishingAnalysis(
        comment_text_encrypted=encrypt_field(payload.text),
        user_id=current_user.id,
        ml_score=analysis_result["ml_score"],
        url_reputation_score=analysis_result["url_reputation_score"],
        regex_score=analysis_result["regex_score"],
        final_score=analysis_result["final_score"],
        decision=analysis_result["decision"],
        extracted_urls=analysis_result["extracted_urls"],
        threat_indicators=analysis_result["threat_indicators"]
    )
    db.add(analysis_record)
    await db.commit()
    await db.refresh(analysis_record)
    
    return CommentResponse(
        analysis_id=analysis_record.id,
        status="processing" if analysis_result["decision"] == "quarantined" else analysis_result["decision"],
        message="Comment accepted for analysis"
    )

@router.get("/{analysis_id}/status", response_model=CommentStatusResponse)
async def get_comment_status(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(RequirePermission("comment:read"))
):
    result = await db.execute(select(PhishingAnalysis).filter(PhishingAnalysis.id == analysis_id))
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return CommentStatusResponse(analysis_id=record.id, decision=record.decision)
