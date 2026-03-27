import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from builtins import bytes
from app.config import settings

def _get_master_key() -> bytes:
    return bytes.fromhex(settings.MASTER_ENCRYPTION_KEY)

def encrypt_field(plaintext: str) -> bytes:
    master_key = _get_master_key()
    aesgcm = AESGCM(master_key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    return nonce + ciphertext

def decrypt_field(encrypted_data: bytes) -> str:
    master_key = _get_master_key()
    aesgcm = AESGCM(master_key)
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode('utf-8')
