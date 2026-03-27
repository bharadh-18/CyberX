import hashlib
from firebase_functions import identity_fn
from firebase_admin import firestore

# Before User Creation Trigger (Blocking Function)
# Requires Firebase Authentication with Identity Platform upgraded.
@identity_fn.before_user_created()
def create_firestore_user_doc(event: identity_fn.AuthBlockingEvent) -> identity_fn.BeforeCreateResponse:
    """
    Triggers automatically when a new user signs up via Firebase Auth.
    Ensures their corresponding Firestore doc is dynamically initialized
    before they are granted access.
    """
    db = firestore.client()
    uid = event.data.uid
    email = event.data.email
    
    email_hash = hashlib.sha256(email.encode()).hexdigest() if email else ""
    
    # Pre-configure profile security parameters
    db.collection('users').document(uid).set({
        'email_hash': email_hash,
        'roles': ['user'],
        'account_status': 'active',
        'failed_attempts': 0,
        'device_fingerprints': [],
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP
    })
    
    return identity_fn.BeforeCreateResponse()
