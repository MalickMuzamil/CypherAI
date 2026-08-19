# Vaultly Backend — NestJS + MongoDB Atlas

This backend implements the server-side foundation for the Vaultly password manager frontend.

## Included end-to-end

- MongoDB Atlas / Mongoose persistence
- User registration
- Argon2id password hashing
- HttpOnly Secure/SameSite authentication cookies
- Short-lived access JWT + refresh session
- MFA/TOTP setup and verification
- Role-based access control: USER / ADMIN / SUPER_ADMIN
- Credential CRUD
- AES-256-GCM encryption for stored credential passwords and notes
- Secure credential reveal endpoint
- Cryptographically secure password generation
- Audit logging
- Login/session tracking
- Device/session listing and revocation
- Super Admin user/role management
- User disable action
- Notifications persistence
- Health endpoint
- Rate-limit/Helmet-ready production structure
- Validation and CORS
- TTL session expiry in MongoDB

## Important security model

The master password is **hashed with Argon2id** and is never stored in plaintext.

Credential passwords and notes are encrypted with **AES-256-GCM** before MongoDB persistence.

The encryption key is loaded from `VAULT_ENCRYPTION_KEY` and is NOT stored in MongoDB.

For production, keep this key in AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or another dedicated KMS/secret manager. Do not commit it to Git.

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Set:

```env
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
VAULT_ENCRYPTION_KEY=...
SUPERADMIN_EMAIL=...
SUPERADMIN_PASSWORD=...
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate strong JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Create Super Admin

```bash
npm run seed
```

### 4. Start

```bash
npm run start:dev
```

API:

```text
http://localhost:4000/api
```

Health:

```text
http://localhost:4000/api/health
```

## Frontend

Set the frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

The frontend is designed around the API endpoints in this backend.

## Main endpoints

### Auth

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me

POST   /api/auth/mfa/setup
POST   /api/auth/mfa/enable
POST   /api/auth/mfa/verify

GET    /api/auth/sessions
DELETE /api/auth/sessions/:id
```

### Credentials

```text
GET    /api/credentials
GET    /api/credentials/:id
POST   /api/credentials
PATCH  /api/credentials/:id
DELETE /api/credentials/:id
POST   /api/credentials/:id/reveal
POST   /api/credentials/generate-password
```

### Audit

```text
GET /api/audit-logs
```

### Notifications

```text
GET  /api/notifications
POST /api/notifications/:id/read
```

### Super Admin

```text
GET   /api/admin/users
PATCH /api/admin/users/:id/role
POST  /api/admin/users/:id/disable
```

## Frontend MFA integration note

The setup endpoint returns an `otpauth://` URL. For a production QR-code screen, render that URL with a frontend QR library.

The enable endpoint expects the setup secret in the `x-mfa-setup-secret` header. In production, prefer keeping the temporary setup secret in a short-lived server-side MFA setup transaction rather than trusting a browser-held secret. This scaffold keeps the contract explicit so the backend can be hardened further without changing the overall architecture.

## Production hardening before exposing publicly

1. Put the backend behind HTTPS.
2. Set `COOKIE_SECURE=true`.
3. Use a dedicated secret manager/KMS.
4. Rotate JWT and encryption keys using a planned key-versioning strategy.
5. Add Redis-backed distributed rate limiting for multiple backend instances.
6. Add email verification and password reset flow.
7. Add account lockout / suspicious-login detection.
8. Add CSRF protection if frontend/API are deployed in a cross-site configuration.
9. Add structured logging and centralized monitoring.
10. Never log request bodies containing passwords or decrypted credentials.
11. Enable MongoDB Atlas network restrictions, TLS, least-privilege DB user and backups.
12. Add automated security tests and dependency scanning.
13. Consider envelope encryption with KMS for stronger operational key management.
14. Add password-breach checking using a privacy-preserving k-anonymity service if desired.
15. Add a formal incident/audit retention policy.

## Architecture

```text
Next.js Frontend
       |
       | HttpOnly Cookie Session
       v
NestJS API
       |
       +-- Auth / MFA / Sessions
       +-- RBAC / Super Admin
       +-- Credential Service
       +-- AES-256-GCM Crypto Service
       +-- Audit Service
       +-- Notifications
       |
       v
MongoDB Atlas
       ^
       |
Encrypted vault fields only

Secrets:
NestJS -> Secret Manager / KMS
             |
             +-- JWT secrets
             +-- Vault encryption key
             +-- MongoDB credentials
```

The API is stateless apart from persisted sessions, so it can be horizontally scaled behind a load balancer. Session data is in MongoDB; for very high traffic, move session/rate-limit hot paths to Redis without changing the vault domain model.


## Deployment topology

For the simplest secure deployment, serve the frontend and API under the same site, for example:

```text
https://vault.example.com
https://vault.example.com/api
```

If frontend and API use different sites/domains, review SameSite cookie and CSRF requirements before production. Do not simply switch cookies to `SameSite=None` without implementing a CSRF strategy.
