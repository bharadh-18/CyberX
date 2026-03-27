from pydantic import BaseModel, Field

class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)

class CommentResponse(BaseModel):
    analysis_id: str
    status: str
    message: str

class CommentStatusResponse(BaseModel):
    analysis_id: str
    decision: str
