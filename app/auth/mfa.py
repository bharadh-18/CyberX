import pyotp

def generate_totp_secret() -> str:
    return pyotp.random_base32()

def get_provisioning_uri(secret: str, email: str, issuer_name: str = "Zero-Trust API") -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer_name)

def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    # verify with +-1 window
    return totp.verify(code, valid_window=1)
