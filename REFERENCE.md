# Zero-Trust Backend API — Complete Reference

> **Project**: Zero-Trust Backend API with AI Phishing Detection  
> **Stack**: FastAPI · Python 3.11+ · SQLAlchemy · Redis · Argon2 · JWT RS256  
> **Date**: March 27, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Security Layers (0–7)](#2-security-layers)
3. [API Endpoints](#3-api-endpoints)
4. [Database Schema](#4-database-schema)
5. [Workflow 1: User Registration](#5-workflow-1-user-registration)
6. [Workflow 2: User Login (MFA)](#6-workflow-2-user-login-mfa)
7. [Workflow 3: Comment + Phishing Detection](#7-workflow-3-comment--phishing-detection)
8. [Workflow 4: Data Retrieval](#8-workflow-4-data-retrieval)
9. [Workflow 5: Brute-Force Detection](#9-workflow-5-brute-force-detection)
10. [Encryption & Hashing](#10-encryption--hashing)
11. [Observability](#11-observability)
12. [Project Structure](#12-project-structure)
13. [Configuration](#13-configuration)
14. [Security Checklist](#14-security-checklist)

---

## 1. Architecture Overview

```
Client → TLS 1.3 → WAF/Gateway → Security Headers → Request Logging
  → Rate Limiting → Input Validation → [Auth → RBAC] → Business Logic
  → Encryption Layer → Response → Audit Log → Monitoring
```

**Request lifecycle** (14 checkpoints):

| # | Checkpoint | Purpose |
|---|-----------|---------|
| 1 | TLS Handshake | Encrypted channel (AES-256-GCM, ECDHE) |
| 2 | WAF/Gateway | DDoS, global rate limit, IP reputation, bot detection |
| 3 | Security Headers | CSP, HSTS, CORS, X-Frame-Options |
| 4 | Request Logging | UUID request ID, IP, UA, timing |
| 5 | Rate Limiting | Per-IP, per-user, per-endpoint limits via Redis |
| 6 | Input Validation | SQLi, XSS, path traversal, command injection detection |
| 7 | Authentication | JWT verification, blacklist check, device fingerprint |
| 8 | Authorization | RBAC permission check, resource ownership |
| 9 | Business Logic | Endpoint-specific processing |
| 10 | Encryption | Decrypt on read, encrypt on write (AES-256-GCM) |
| 11 | AI Analysis | Async phishing detection pipeline |
| 12 | Response | Filtered, sanitized response to client |
| 13 | Audit Log | Record all actions as structured JSON |
| 14 | Monitoring | Prometheus metrics, ELK-compatible logs |

---

## 2. Security Layers

### Layer 0: TLS/SSL
- TLS 1.3 with AES-256-GCM cipher
- Perfect Forward Secrecy via ECDHE
- Certificate validation enforced

### Layer 1: WAF / API Gateway
- Global rate limit: 10,000 req/min
- IP reputation check (blocklist)
- Request size validation (max 1MB body)

### Layer 2: Security Headers & CORS
Headers injected on every response:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

CORS: origin whitelist validation, preflight `OPTIONS` handling.

### Layer 3: Request Logging
- Generate `X-Request-ID` (UUID v4) per request
- Log: IP, User-Agent, timestamp, method, path
- `time.perf_counter()` start/stop for latency measurement
- JSON structured output (ELK-compatible)

### Layer 4: Rate Limiting (Redis)

| Scope | Limit | Window | Key Pattern |
|-------|-------|--------|-------------|
| Per-IP | 100 requests | 1 minute | `rl:ip:{ip}` |
| Per-User | 1000 requests | 1 hour | `rl:user:{user_id}` |
| Login endpoint | 5 attempts | 15 minutes | `rl:login:{ip}` |
| Register endpoint | 3 attempts | 1 hour | `rl:register:{ip}` |

Exceeded → `429 Too Many Requests` + `Retry-After` header.

### Layer 5: Input Validation & Sanitization
Patterns detected and blocked (→ `400 Bad Request`):

| Attack Type | Detection Patterns |
|------------|-------------------|
| SQL Injection | `' OR 1=1`, `UNION SELECT`, `DROP TABLE`, `; --` |
| XSS | `<script>`, `javascript:`, `onerror=`, `onload=` |
| Path Traversal | `../`, `..\\`, `%2e%2e` |
| Command Injection | `` ` ``, `$(`, `; rm`, `| cat` |

Content-Type must be `application/json` for POST/PUT/PATCH.

### Layer 6: Authentication (JWT)
- Extract `Bearer` token from `Authorization` header
- Verify RS256 signature with public key
- Validate claims: `exp`, `iss`, `sub`, `iat`
- Check token not in Redis blacklist
- Load user session and device fingerprint
- Access token: **15 min** expiry | Refresh token: **7 days** expiry

### Layer 7: Authorization (RBAC)
Role → Permission mapping:

| Role | Permissions |
|------|------------|
| `user` | `profile:read`, `comment:create`, `comment:read` |
| `moderator` | All `user` + `comment:moderate`, `analysis:read` |
| `admin` | All permissions |

---

## 3. API Endpoints

### Public Routes (No Auth)

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `POST` | `/api/v1/auth/register` | User registration | `201 Created` |
| `POST` | `/api/v1/auth/login` | Login (step 1) | `200 OK` or `202 MFA Required` |
| `POST` | `/api/v1/auth/mfa/verify` | MFA TOTP verification | `200 OK` + tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | `200 OK` |
| `GET` | `/api/v1/health` | Health check | `200 OK` |

### Protected Routes (Auth Required)

| Method | Path | Permission | Description | Response |
|--------|------|-----------|-------------|----------|
| `GET` | `/api/v1/users/profile` | `profile:read` | Get user profile | `200 OK` |
| `POST` | `/api/v1/comments` | `comment:create` | Submit comment | `202 Accepted` |
| `GET` | `/api/v1/comments/{id}/status` | `comment:read` | Analysis status | `200 OK` |
| `POST` | `/api/v1/auth/mfa/setup` | `profile:read` | Enable MFA | `200 OK` |
| `POST` | `/api/v1/auth/logout` | authenticated | Logout / blacklist | `200 OK` |

---

## 4. Database Schema

### `users` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | UUIDv4 |
| `email_encrypted` | BLOB | AES-256-GCM ciphertext |
| `email_hash` | VARCHAR(64) | SHA-256 hash (indexed, for lookup) |
| `password_hash` | VARCHAR(255) | Argon2id hash |
| `mfa_secret_encrypted` | BLOB | Encrypted TOTP secret (nullable) |
| `mfa_enabled` | BOOLEAN | Default `false` |
| `roles` | JSON | `["user"]` default |
| `account_status` | ENUM | `pending_verification`, `active`, `locked`, `suspended` |
| `failed_attempts` | INTEGER | Default `0` |
| `last_login_at` | DATETIME | Nullable |
| `last_login_ip` | VARCHAR | Nullable |
| `last_login_location` | JSON | `{country, city}` |
| `device_fingerprints` | JSON | List of known device hashes |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-updated |

### `sessions` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Session ID |
| `user_id` | UUID (FK) | References `users.id` |
| `device_fingerprint` | VARCHAR(64) | SHA-256 hash |
| `ip_address_encrypted` | BLOB | AES-256-GCM |
| `user_agent_encrypted` | BLOB | AES-256-GCM |
| `geolocation` | JSON | `{country, city}` |
| `refresh_token_hash` | VARCHAR(64) | SHA-256 of refresh token |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | DATETIME | |
| `expires_at` | DATETIME | |

### `phishing_analysis` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Analysis ID |
| `comment_text_encrypted` | BLOB | AES-256-GCM |
| `user_id` | UUID (FK) | References `users.id` |
| `ml_score` | FLOAT | 0.0 – 1.0 |
| `url_reputation_score` | FLOAT | 0.0 – 1.0 |
| `regex_score` | FLOAT | 0.0 – 1.0 |
| `final_score` | FLOAT | Weighted ensemble |
| `decision` | ENUM | `allowed`, `quarantined`, `blocked` |
| `extracted_urls` | JSON | List of URLs found |
| `threat_indicators` | JSON | Feature details |
| `created_at` | DATETIME | |

---

## 5. Workflow 1: User Registration

**Endpoint**: `POST /api/v1/auth/register`  
**Input**: `{ "email": "...", "password": "..." }`

| Step | Action | Failure |
|------|--------|---------|
| 1 | Email validation (RFC 5322 + disposable blocklist) | `400` invalid email |
| 2 | Password strength (≥12 chars, upper+lower+digit+special) | `400` weak password |
| 3 | Uniqueness check via `email_hash` (SHA-256) | `409` conflict |
| 4 | Hash password (Argon2id: t=2, m=19456, p=1) | — |
| 5 | Encrypt email (AES-256-GCM envelope encryption) | — |
| 6 | Create DB record (status: `pending_verification`) | `500` DB error |
| 7 | Generate verification JWT (RS256, 24h expiry) | — |
| 8 | Queue verification email (async) | — |
| 9 | Log `USER_REGISTRATION` security event | — |

**Success**: `201 Created` → `{ "message": "...", "user_id": "uuid" }`

---

## 6. Workflow 2: User Login (MFA)

**Endpoint**: `POST /api/v1/auth/login`  
**Input**: `{ "email": "...", "password": "..." }`

| Step | Action | Failure |
|------|--------|---------|
| 1 | Login-specific rate limit (5/15min) | `429` |
| 2 | User lookup via `email_hash` | Generic `401` (no enumeration) |
| 3 | Account status check | `403` if locked/suspended/pending |
| 4 | Password verify (Argon2, constant-time) | Generic `401` + increment failures |
| 5 | Check failed attempts (≥5 → lock account) | `403` locked |
| 6 | Device fingerprinting | Flag new devices |
| 7 | Geolocation check (impossible travel) | Flag suspicious |
| 8 | MFA check: if enabled → `202` + `mfa_required: true` | — |

**If MFA not enabled**: skip to token generation (step 10).

**MFA Verification** (`POST /api/v1/auth/mfa/verify`):

| Step | Action | Failure |
|------|--------|---------|
| 9 | Verify TOTP code (±1 window, constant-time) | `401` + increment MFA failures |
| 10 | Generate access token (JWT RS256, 15min) + refresh token (7d) | — |
| 11 | Create session record | — |
| 12 | Update user metadata (last_login, reset failures) | — |
| 13 | Log `SUCCESSFUL_LOGIN` event | — |

**Success**: `200 OK` → access token + `Set-Cookie: refresh_token` (HttpOnly, Secure, SameSite=Strict)

---

## 7. Workflow 3: Comment + Phishing Detection

**Endpoint**: `POST /api/v1/comments`  
**Auth**: Required (`comment:create` permission)  
**Input**: `{ "text": "..." }`

| Step | Action |
|------|--------|
| 1 | Input validation (1–5000 chars, UTF-8, XSS check) |
| 2 | Generate `analysis_id`, return `202 Accepted` immediately |
| 3A | **Preprocessing**: normalize whitespace, extract URLs, tokenize |
| 3B | **Feature extraction**: urgency keywords, suspicious phrases, shortened URLs, credential indicators |
| 3C | **Scoring**: weighted keyword/pattern matching (ML model placeholder) |
| 3D | **URL reputation**: check against known malicious URL patterns |
| 3E | **Ensemble scoring**: combine all scores with weights |
| 4 | **Decision**: >0.85 → `blocked` · 0.70–0.85 → `quarantined` · <0.70 → `allowed` |
| 5 | Trigger security alert if blocked (log critical event) |
| 6 | Store analysis results in `phishing_analysis` table (encrypted) |
| 7 | Log to structured JSON (ELK-compatible) |

**Phishing Feature Weights**:

| Feature | Weight | Examples |
|---------|--------|---------|
| Urgency keywords | 0.25 | "urgent", "immediately", "verify now" |
| Credential requests | 0.25 | "confirm password", "enter SSN" |
| Shortened URLs | 0.20 | bit.ly, tinyurl.com, t.co |
| Suspicious phrases | 0.15 | "click here", "act now", "limited time" |
| Regex patterns | 0.15 | Email/phone extraction, fake domains |

---

## 8. Workflow 4: Data Retrieval

**Endpoint**: `GET /api/v1/users/profile`  
**Auth**: Required (`profile:read` permission)

| Step | Action |
|------|--------|
| 1 | Query user by `id` (from JWT claims) |
| 2 | Decrypt PII fields (AES-256-GCM: email, etc.) |
| 3 | Filter sensitive data (remove password_hash, mfa_secret) |
| 4 | Log `DATA_ACCESS` event with fields accessed |

**Response**: `200 OK` → `{ id, email, name, roles, created_at }`

---

## 9. Workflow 5: Brute-Force Detection

**Trigger**: Excessive failed login attempts from single IP

| Attempt Count | Automated Response |
|--------------|-------------------|
| 1–5 | Normal rate limiting |
| 6 | Trigger CAPTCHA flag |
| 10 | Temporary IP block (5 min TTL in Redis) |
| 15 | Extended block (1 hour) |
| 20+ | Add to persistent blocklist (24h) |

**Security event logged**:
```json
{
  "event": "BRUTE_FORCE_ATTACK",
  "severity": "HIGH",
  "source_ip": "1.2.3.4",
  "attempt_count": 50,
  "action_taken": "IP_BLOCKED"
}
```

---

## 10. Encryption & Hashing

### Password Hashing — Argon2id
| Parameter | Value |
|-----------|-------|
| Algorithm | Argon2id |
| Time cost | 2 iterations |
| Memory cost | 19,456 KiB |
| Parallelism | 1 |
| Salt | 16 bytes random |

### Field Encryption — AES-256-GCM (Envelope Encryption)
```
1. Generate DEK (Data Encryption Key) — 256-bit random
2. Encrypt field: AES-256-GCM(plaintext, DEK, random_IV)
3. Store: IV (12 bytes) + ciphertext + auth_tag (16 bytes)
4. Encrypt DEK with Master Key (envelope encryption)
5. Store encrypted_DEK alongside ciphertext
```

### Hashing for Lookups — SHA-256
- Email → `SHA-256(normalized_email)` → stored as `email_hash` for indexed lookups
- Device fingerprint → `SHA-256(User-Agent + Accept-Language + Accept-Encoding)`
- Refresh tokens → `SHA-256(token)` stored in sessions table

### JWT Tokens — RS256
| Token Type | Expiry | Algorithm | Claims |
|-----------|--------|-----------|--------|
| Access | 15 min | RS256 | `sub`, `roles`, `permissions`, `iss`, `exp`, `iat`, `jti` |
| Refresh | 7 days | RS256 | `sub`, `type: refresh`, `exp`, `jti` |
| Verification | 24 hours | RS256 | `sub`, `purpose: verify`, `exp` |

---

## 11. Observability

### Structured Logging (ELK-compatible)
Every security event is logged as JSON:
```json
{
  "timestamp": "2026-03-27T10:30:00Z",
  "request_id": "uuid",
  "event": "EVENT_NAME",
  "severity": "INFO|WARNING|HIGH|CRITICAL",
  "user_id": "uuid",
  "ip": "1.2.3.4",
  "details": { ... }
}
```

**Event types**: `USER_REGISTRATION`, `SUCCESSFUL_LOGIN`, `FAILED_LOGIN`, `ACCOUNT_LOCKED`, `PHISHING_DETECTED`, `DATA_ACCESS`, `BRUTE_FORCE_ATTACK`, `RATE_LIMIT_EXCEEDED`, `MALICIOUS_INPUT_BLOCKED`

### Metrics (Prometheus)
- `http_requests_total` (counter, labels: method, endpoint, status)
- `http_request_duration_seconds` (histogram)
- `auth_failures_total` (counter)
- `phishing_detections_total` (counter, labels: decision)
- `rate_limit_hits_total` (counter)
- `active_sessions_count` (gauge)

### Health Check
`GET /api/v1/health` → `{ "status": "healthy", "database": "connected", "redis": "connected", "uptime": "..." }`

---

## 12. Project Structure

```
d:\RIT_HACKATHON\
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app + middleware registration
│   ├── config.py                   # Pydantic BaseSettings
│   ├── database.py                 # SQLAlchemy engine + session
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                 # User model
│   │   ├── session.py              # Session model
│   │   └── phishing.py             # PhishingAnalysis model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                 # Registration/login request/response
│   │   ├── comment.py              # Comment request/response
│   │   └── user.py                 # Profile response
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── security_headers.py     # Layer 2
│   │   ├── request_logging.py      # Layer 3
│   │   ├── rate_limiter.py         # Layer 4
│   │   └── input_validation.py     # Layer 5
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt_handler.py          # Layer 6 — token create/verify
│   │   ├── dependencies.py         # get_current_user dependency
│   │   └── mfa.py                  # TOTP generation/verification
│   ├── authorization/
│   │   ├── __init__.py
│   │   └── rbac.py                 # Layer 7 — role-based access
│   ├── services/
│   │   ├── __init__.py
│   │   ├── encryption.py           # AES-256-GCM envelope encryption
│   │   ├── password.py             # Argon2id hashing
│   │   ├── email_validator.py      # RFC 5322 + disposable check
│   │   ├── phishing_detector.py    # AI phishing pipeline
│   │   ├── device_fingerprint.py   # Device fingerprinting
│   │   └── security_logger.py      # Structured JSON logging
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py                 # /auth/* endpoints
│   │   ├── comments.py             # /comments endpoints
│   │   ├── users.py                # /users/* endpoints
│   │   └── health.py               # /health + /metrics
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_comments.py
│   ├── test_middleware.py
│   └── test_encryption.py
├── keys/                           # Auto-generated RSA keypair
├── requirements.txt
├── .env.example
├── REFERENCE.md                    # This file
└── README.md
```

---

## 13. Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | App secret key |
| `DATABASE_URL` | `sqlite:///./zero_trust.db` | Database connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `MASTER_ENCRYPTION_KEY` | (required) | 256-bit hex key for envelope encryption |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `JWT_ALGORITHM` | `RS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `RATE_LIMIT_PER_IP` | `100` | Requests per minute per IP |
| `RATE_LIMIT_PER_USER` | `1000` | Requests per hour per user |
| `LOG_LEVEL` | `INFO` | Logging level |

---

## 14. Security Checklist

| # | Control | Implementation |
|---|---------|---------------|
| ✅ | TLS 1.3 in transit | HTTPS enforced via HSTS header |
| ✅ | AES-256-GCM at rest | Envelope encryption for all PII |
| ✅ | Argon2id password hashing | t=2, m=19456, p=1 |
| ✅ | JWT RS256 signing | RSA 2048-bit keypair |
| ✅ | TOTP MFA | pyotp, ±1 window, constant-time verify |
| ✅ | Multi-tier rate limiting | Redis sliding window (IP/user/endpoint) |
| ✅ | Input validation | Whitelist approach, regex pattern detection |
| ✅ | SQL injection prevention | Parameterized queries via SQLAlchemy ORM |
| ✅ | XSS protection | CSP headers + payload detection |
| ✅ | CSRF protection | SameSite=Strict cookies |
| ✅ | Device fingerprinting | SHA-256(UA + headers) |
| ✅ | Geolocation anomaly detection | IP-based location tracking |
| ✅ | AI phishing detection | Weighted ensemble scoring pipeline |
| ✅ | Comprehensive audit logging | Structured JSON, every action logged |
| ✅ | Real-time alerting | Critical event logging with severity levels |
| ✅ | Token blacklisting | Redis set for revoked JWTs |
| ✅ | Brute-force protection | Escalating blocks (5min → 1hr → 24hr) |
| ✅ | User enumeration prevention | Generic error messages on login failure |
| ✅ | Constant-time comparison | Password + TOTP verification |
| ✅ | Refresh token rotation | New token issued on each refresh |

---

*This document serves as the complete reference for the Zero-Trust Backend API implementation. All code, architecture decisions, and security controls described here will be implemented in the project.*
