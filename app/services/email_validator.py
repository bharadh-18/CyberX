from email_validator import validate_email, EmailNotValidError

DISPOSABLE_DOMAINS = {"mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com"}

def is_valid_email(email: str) -> bool:
    try:
        valid = validate_email(email, check_deliverability=False)
        domain = valid.domain
        if domain in DISPOSABLE_DOMAINS:
            return False
        return True
    except EmailNotValidError:
        return False
