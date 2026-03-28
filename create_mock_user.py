import sys
import os

# Ensure the backend app module path is accessible
sys.path.insert(0, os.path.dirname(__file__))

from app.firebase_config import firebase_auth, db as firestore_db, firestore
from app.services.encryption import encrypt_field
import hashlib

def create_mock_user():
    email = "vedhan@gmail.com".lower()
    password = "123456" # 6 character minimum
    
    email_hash = hashlib.sha256(email.encode()).hexdigest()
    encrypted_email = encrypt_field(email)
    
    roles = ["user", "admin"] # granting admin access for demo
    
    try:
        # Try to get user, if exists we delete to reset or just catch
        try:
            old_user = firebase_auth.get_user_by_email(email)
            firebase_auth.delete_user(old_user.uid)
            print("Deleted old mock user.")
        except Exception:
            pass

        fb_user = firebase_auth.create_user(email=email, password=password)
        print(f"Created Firebase Auth User: {fb_user.uid}")
        
        # Add to Firestore
        user_doc_ref = firestore_db.collection("users").document(fb_user.uid)
        user_doc_ref.set({
            "email_encrypted": encrypted_email,
            "email_hash": email_hash,
            "mfa_enabled": False,
            "mfa_secret_encrypted": None,
            "roles": roles,
            "account_status": "active",
            "failed_attempts": 0,
            "device_fingerprints": [],
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        print(f"Successfully provisioned mock data in Firestore for: {email} with pwd {password}")
    except Exception as e:
        print(f"Failed to create user: {e}")

if __name__ == "__main__":
    create_mock_user()
