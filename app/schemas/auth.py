from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    mfa_required: bool = False

class MFAVerifyRequest(BaseModel):
    token: str   # The temporary token from login
    code: str

class MFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str
