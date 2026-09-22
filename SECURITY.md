# STAT-GAP AI — Security Architecture & Hardening Guide

## 1. Statutory Civil Service Security Baseline

STAT-GAP AI is designed for deployment across Indian statistical bodies (such as the Ministry of Statistics and Programme Implementation — MoSPI) and administrative training institutes. As a competency intelligence platform processing official personnel capabilities and evaluation records, strict security boundaries are enforced across all layers.

---

## 2. Authentication & Credential Hygiene

### 2.1 Password Security
- **Algorithm**: Argon2id (`argon2-cffi`) with cryptographically secure parameter tuning:
  - Memory cost: 65,536 KiB (64 MiB)
  - Time cost: 3 iterations
  - Parallelism: 4 threads
- Passwords must be at least 8 characters and are verified in constant time.
- Plaintext passwords or intermediate hash outputs are never logged or stored.

### 2.2 JWT Access Tokens
- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Enforcement**:
  - `JWT_SECRET_KEY` must be explicitly configured in the environment.
  - Startup guards immediately reject empty keys, keys shorter than 32 characters, and common development placeholders (`"change-me"`, `"secret"`, `"default"`, `"admin"`).
  - Signed tokens embed subject (`igot_id`), roles, issued-at, and standard 8-hour expiration claims.
- **Header Format**: Standard `Authorization: Bearer <token>`.

### 2.3 Role-Based Access Control (RBAC)
- All analytical, adaptive assessment, verification, and iGOT integration endpoints require authenticated civil service officer credentials.
- Multi-tenancy isolation: An officer can only query and mutate their own competency evidence, test sessions, retention metrics, and audit history (`current_user.profile.id == resource.officer_id`). Cross-officer unauthorized access returns 404 (or 403 where applicable) to prevent information enumeration.

---

## 3. Threat Modeling & Attack Surface Defenses

### 3.1 SQL Injection Prevention
- All database queries are constructed using SQLAlchemy ORM and parameterized expressions.
- Raw SQL string interpolations or concatenated statements are forbidden throughout the codebase.

### 3.2 Cross-Site Scripting (XSS) & Content Injection
- React 19 JSX context-aware encoding automatically neutralizes rendered strings.
- Dangerous methods (`dangerouslySetInnerHTML`) are strictly avoided across all presentation components.

### 3.3 Prompt Injection & Hallucination Mitigation (RAG / LLM Layer)
- **Grounding Gate**: All statistical explanations are mediated through high-dimensional cosine similarity checks against official reference chunks (e.g., MOSPI manuals, National Accounts standards).
  - Grounding Threshold: $\ge 0.65 \rightarrow$ grounded, $[0.48, 0.65) \rightarrow$ weak grounding (flagged), $< 0.48 \rightarrow$ insufficient grounding (refusal with statutory fallback).
- **Strict Anti-Hallucination Framing**: System prompts instruct the model never to extrapolate beyond retrieved context or fabricate statistical guidance.

### 3.4 Rate Limiting & Denial of Service (DoS) Defense
- **Architecture**: In-memory token bucket rate limiter (`RateLimitMiddleware`).
- **Default Baseline**: Configurable via `RATE_LIMIT_PER_MINUTE` (default: 120 req/min/IP).
- **Behavior**: Deterministic burst rejection returning HTTP 429 Too Many Requests with descriptive headers (`Retry-After: 60`).
- **Testing Safety**: The limiter provides a `.reset()` hook and is completely disabled in CI/test environments (`RATE_LIMIT_ENABLED=false`) to eliminate test flakiness.
- **Production Boundary**: In-memory rate limiting provides single-node and demonstration-tier protection. For distributed multi-node production clusters, a distributed reverse proxy or Redis-backed rate limiter is recommended.

### 3.5 Global Error Masking & Traceability
- **Unhandled Exceptions**: Caught by `safe_exception_handler`. Unhandled 500 exceptions are masked with standard JSON payloads:
  ```json
  {
    "detail": "An internal server error occurred. Please contact system administrator.",
    "code": "INTERNAL_SERVER_ERROR",
    "request_id": "req-xxxx-xxxx"
  }
  ```
  Internal stack traces, database schema details, and credentials are never exposed in API responses.
- **Request Tracing**: `CorrelationIdMiddleware` assigns or propagates `X-Request-ID` across every HTTP exchange, allowing secure log auditing.

---

## 4. Operational Environment Variables

| Variable | Required | Default | Security Purpose |
|---|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | *None* | Cryptographic signing key for access tokens (min 32 chars). |
| `ENVIRONMENT` | No | `development` | Enables/disables debug verbosity and mock adapters. |
| `DATABASE_URL` | No | SQLite / Postgres | Database connectivity string. Never embed credentials in git. |
| `GEMINI_API_KEY` | No | *None* | API key for Google Gemini RAG explanations. |
| `RATE_LIMIT_ENABLED` | No | `true` | Toggles API rate limiting. |
| `RATE_LIMIT_PER_MINUTE` | No | `120` | Max requests per minute per IP. |
| `IGOT_MODE` | No | `mock` | Switches between `mock` and `authorized` iGOT integration. |

---

## 5. Security Incident Response
To report potential vulnerabilities or security flaws in STAT-GAP AI, please contact the designated platform security officer or the MoSPI IT cell. All reports will receive acknowledgment within 48 hours.
