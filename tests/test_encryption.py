import pytest
from app.services.encryption import encrypt_field, decrypt_field
from app.services.password import hash_password, verify_password

def test_encryption_roundtrip():
    plaintext = "this_is_a_secret_555!!!"
    ciphertext = encrypt_field(plaintext)
    
    assert ciphertext != plaintext.encode()
    assert len(ciphertext) > 12 # nonce + tag
    
    decrypted = decrypt_field(ciphertext)
    assert decrypted == plaintext
    
def test_password_hashing():
    pwd = "SuperSecurePassword123!"
    hashed = hash_password(pwd)
    
    assert hashed != pwd
    assert verify_password(hashed, pwd) is True
    assert verify_password(hashed, "wrongPassword") is False
