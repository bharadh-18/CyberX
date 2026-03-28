import asyncio
import httpx
import uuid
import time
from datetime import datetime

# We'll assume the backend is NOT running, so we'll test the logic by 
# directly calling the internal functions if possible, or just start a 
# temporary server if we really want to.
# However, for a quick check, I'll just verify the models and database 
# logic by creating a user and logging in using the logic from auth.py.

from app.database import async_session_factory
from app.models.models import User
from sqlalchemy import select
from argon2 import PasswordHasher

ph = PasswordHasher()

async def verify_logic():
    print("Testing Register/Login logic on Neon...")
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "testpassword123"
    
    async with async_session_factory() as session:
        # 1. Register
        print(f"Registering user: {email}")
        import hashlib
        from app.services.encryption import encrypt_field
        
        email_hash = hashlib.sha256(email.lower().encode()).hexdigest()
        hashed_pw = ph.hash(password)
        
        new_user = User(
            email_encrypted=encrypt_field(email.lower()),
            email_hash=email_hash,
            password_hash=hashed_pw,
            roles=["user"],
        )
        session.add(new_user)
        await session.commit()
        print("Registration successful.")
        
        # 2. Login
        print("Verifying login...")
        result = await session.execute(select(User).where(User.email_hash == email_hash))
        user = result.scalars().first()
        
        try:
            ph.verify(user.password_hash, password)
            print("Login verification successful (Argon2 matched).")
        except Exception as e:
            print(f"Login failed: {e}")
            return
            
    print("Logic verification complete.")

if __name__ == "__main__":
    asyncio.run(verify_logic())
