from fastapi import APIRouter, Depends, status, Request, HTTPException
from app.schemas.comment import CommentCreate, CommentResponse, CommentStatusResponse
from app.authorization.rbac import RequirePermission
from app.auth.dependencies import get_current_active_user
from app.services.phishing_detector import phishing_detector
from app.services.encryption import encrypt_field
from app.routes.auth import log_security_event
from app.firebase_config import db as firestore_db
from firebase_admin import firestore
import uuid

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=CommentResponse)
async def create_comment(
    request: Request,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_active_user),
    _=Depends(RequirePermission("comment:create"))
):
    analysis_result = phishing_detector.analyze(payload.text)
    
    if analysis_result["decision"] == "blocked":
        log_security_event(request, "PHISHING_DETECTED", "HIGH", analysis_result)
        
    analysis_id = str(uuid.uuid4())
    doc_ref = firestore_db.collection("users").document(current_user["id"]).collection("analyses").document(analysis_id)
    doc_ref.set({
        "comment_text_encrypted": encrypt_field(payload.text),
        "ml_score": analysis_result["ml_score"],
        "url_reputation_score": analysis_result["url_reputation_score"],
        "regex_score": analysis_result["regex_score"],
        "final_score": analysis_result["final_score"],
        "decision": analysis_result["decision"],
        "extracted_urls": analysis_result["extracted_urls"],
        "threat_indicators": analysis_result["threat_indicators"],
        "created_at": firestore.SERVER_TIMESTAMP
    })
    
    return CommentResponse(
        analysis_id=analysis_id,
        status="processing" if analysis_result["decision"] == "warning" else analysis_result["decision"],
        message="Comment accepted for analysis",
        ml_score=analysis_result["ml_score"],
        url_reputation_score=analysis_result["url_reputation_score"],
        regex_score=analysis_result["regex_score"],
        final_score=analysis_result["final_score"],
        threat_indicators=analysis_result["threat_indicators"],
        trust_factors=analysis_result.get("trust_factors", [])
    )

@router.get("/{analysis_id}/status", response_model=CommentStatusResponse)
async def get_comment_status(
    analysis_id: str,
    current_user: dict = Depends(get_current_active_user),
    _=Depends(RequirePermission("comment:read"))
):
    doc_ref = firestore_db.collection("users").document(current_user["id"]).collection("analyses").document(analysis_id)
    record = doc_ref.get()
    
    if not record.exists:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    data = record.to_dict()
    return CommentStatusResponse(analysis_id=analysis_id, decision=data.get("decision"))
