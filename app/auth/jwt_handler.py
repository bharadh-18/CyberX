import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from app.config import settings

# Load or generate RSA key pair for JWT signing
PRIVATE_KEY_FILE = "keys/private_key.pem"
PUBLIC_KEY_FILE = "keys/public_key.pem"

def generate_keys():
    if not os.path.exists("keys"):
        os.makedirs("keys")
    if not os.path.exists(PRIVATE_KEY_FILE):
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(PRIVATE_KEY_FILE, "wb") as f:
            f.write(private_pem)

        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        with open(PUBLIC_KEY_FILE, "wb") as f:
            f.write(public_pem)

def get_private_key():
    with open(PRIVATE_KEY_FILE, "rb") as f:
        return f.read()

def get_public_key():
    with open(PUBLIC_KEY_FILE, "rb") as f:
        return f.read()

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iss": "zero-trust-api"})
    return jwt.encode(to_encode, get_private_key(), algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"type": "refresh", "exp": expire, "iss": "zero-trust-api"})
    return jwt.encode(to_encode, get_private_key(), algorithm=settings.JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, get_public_key(), algorithms=[settings.JWT_ALGORITHM], issuer="zero-trust-api")
        return payload
    except JWTError:
        return None
