# Vaultly — production-ready frontend foundation

This is the **frontend only**. It is intentionally built without fake credentials, fake authentication, fake users, or fake audit data.

## Stack
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Reusable UI components
- API abstraction with `credentials: "include"` for HttpOnly cookie sessions

## Reusable component structure

`components/ui`
- Button
- Input
- Select
- Textarea
- Card
- Badge
- Modal

`components/layout`
- AppShell
- AuthShell

`components/auth`
- LoginForm
- RegisterForm
- MfaVerifyForm

`components/vault`
- VaultPage
- CredentialForm

`components/activity`
- AuditLogPage

`components/security`
- SecurityPage

`components/admin`
- AdminPage

`components/settings`
- SettingsPage

## Backend contract expected

Set:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

The frontend expects these API groups:

### Auth
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`
- POST `/auth/mfa/verify`
- POST `/auth/mfa/setup`
- POST `/auth/mfa/enable`
- GET `/auth/sessions`
- DELETE `/auth/sessions/:id`

### Credentials
- GET `/credentials`
- GET `/credentials/:id`
- POST `/credentials`
- PATCH `/credentials/:id`
- DELETE `/credentials/:id`
- POST `/credentials/:id/reveal`
- POST `/credentials/generate-password`

### Audit
- GET `/audit-logs`

### Notifications
- GET `/notifications`
- POST `/notifications/:id/read`

### Super Admin
- GET `/admin/users`
- PATCH `/admin/users/:id/role`
- POST `/admin/users/:id/disable`

## Security boundary

The frontend does NOT implement or pretend to implement cryptographic storage.

For the real product, the backend should provide:
- Argon2id password hashing for the master password
- MFA/TOTP verification
- HttpOnly Secure SameSite session cookies
- RBAC enforcement server-side
- Encryption-at-rest for vault secrets
- Per-credential authorization checks
- Audit logging for reveal/copy/create/update/delete/login/session events
- Session/device tracking
- Rate limiting and lockout controls
- CSRF protection where applicable
- Key management separate from MongoDB data
- Never log plaintext passwords or decrypted secrets

The frontend's "reveal" action deliberately calls an authenticated backend endpoint rather than storing a plaintext password in application state from the initial list response.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Important

This frontend is **backend-integration ready**, not a substitute for the backend. MongoDB Atlas, encryption, authentication, MFA, RBAC, audit persistence, device tracking, APIs and notifications become real when the NestJS backend implements the documented endpoints and security controls.


## UI update

The frontend UI has been visually redesigned around a responsive premium glassmorphic system with light/dark themes, refined typography, neutral/soft accent styling, floating sidebar navigation, polished controls, and global toast feedback. Existing API contracts and application flows are preserved.
