from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Recommendations from REFERENCE: t=2, m=19456, p=1
ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1, hash_len=32, salt_len=16)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password_hash: str, password: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
