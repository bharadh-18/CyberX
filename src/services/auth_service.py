import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import pyotp
from src.config import settings
from src.models.user import User, AuthProvider
from src.services.crypto_service import crypto_service

# Initialize Argon2id hasher with OWASP recommended parameters
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456, # 19 MiB
    parallelism=1,
    hash_len=32,
    salt_len=16
)

class AuthService:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM

    def hash_password(self, password: str) -> str:
        """Hash a password using Argon2id."""
        return ph.hash(password)

    def verify_password(self, password: str, hash_password: str) -> bool:
        """Verify a password against an Argon2id hash."""
        try:
            return ph.verify(hash_password, password)
        except VerifyMismatchError:
            return False

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a short-lived JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a longer-lived refresh token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh", "sid": str(uuid.uuid4())})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> dict:
        """Verify and decode a JWT."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None

    def generate_totp_secret(self) -> Tuple[str, str]:
        """Generate a new TOTP secret and provisioning URI."""
        secret = pyotp.random_base32()
        # In practice, encryption happens before database storage
        return secret

    def get_totp_uri(self, secret: str, user_email: str) -> str:
        """Create a provisioning URI for QR code generators."""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=settings.PROJECT_NAME
        )

    def verify_totp(self, secret: str, code: str) -> bool:
        """Verify a 6-digit TOTP code."""
        if not secret:
            return False
        totp = pyotp.totp.TOTP(secret)
        return totp.verify(code)

    def check_account_lockout(self, user: User) -> bool:
        """Check if an account is currently locked due to failed attempts."""
        if user.locked_until and user.locked_until > datetime.utcnow():
            return True
        return False

    def record_failed_attempt(self, user: User) -> Optional[datetime]:
        """Increment failed attempts and lock account if threshold (5) reached."""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            # Exponential backoff or fixed 15min lockout
            lock_duration = 15 # minutes
            user.locked_until = datetime.utcnow() + timedelta(minutes=lock_duration)
            return user.locked_until
        return None

    def reset_failed_attempts(self, user: User):
        """Reset failed attempts after a successful login."""
        user.failed_login_attempts = 0
        user.locked_until = None

auth_service = AuthService()
