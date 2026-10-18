# WaouFund Security Policy & Threat Model

## 1. Authentication & Token Scoping
* **Token Verification:** All private endpoints enforce verification via Firebase Admin SDK (`auth.verifyIdToken(token)`).
* **IDOR Prevention:** Client-supplied IDs in request bodies (`id`, `founder_id`) are unconditionally overwritten by `req.userId`.
* **Zero Privilege Escalation:** Admin rights cannot be derived from client headers or frontend state.

## 2. Secrets Management
* **Zero Client Secrets:** The frontend production bundle contains zero Gemini API keys (`AIzaSy`) or private credentials.
* **Server-Side Secret Store:** `GEMINI_API_KEY` is injected via Google Cloud Secret Manager.

## 3. Rate Limiting & Denial-of-Service Defense
* **Edge IP Limiter:** 100 requests per 15 minutes per IP (`ipAiLimiter`).
* **Authenticated User Limiter:** 60 AI operations per 15 minutes per token UID (`userAiLimiter`).
* **Request Guardrails:** 1MB maximum JSON body size; 30-second execution timeout.

## 4. Content Security Policy & Security Headers
* `script-src 'self' https://apis.google.com https://*.firebaseio.com;` (No `'unsafe-inline'` permitted for script execution).
* `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
* `X-Frame-Options: DENY`
* `X-Content-Type-Options: nosniff`
