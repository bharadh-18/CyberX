from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    roles: List[str]
    created_at: datetime
