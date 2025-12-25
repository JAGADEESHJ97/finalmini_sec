# CipherShare - Requirements & Architecture

## Original Problem Statement
Create a full-stack web application called "CipherShare" that allows users to securely share sensitive text (passwords, notes, PINs) using end-to-end encryption and one-time access.

## User Choices
- No AI features
- Include PIN protection
- QR code generation for share links
- Dark/Light mode toggle (dark default)
- Modern security-themed design

## Architecture

### Frontend (React + Tailwind)
- **Pages:**
  - `/` - CreateSecret: Form to enter secret, set expiry, PIN, one-time view
  - `/share` - ShareResult: Shows generated link and QR code
  - `/view/:secretId` - ViewSecret: PIN entry and decrypted secret display

- **Security:**
  - Client-side AES-256-CBC encryption using CryptoJS
  - Encryption key generated locally (32 bytes/256 bits)
  - Key passed in URL hash (never sent to server)
  - PIN hashed with SHA-256 before transmission

### Backend (FastAPI + MongoDB)
- **Endpoints:**
  - `POST /api/secrets` - Create encrypted secret
  - `GET /api/secrets/{id}` - Check if secret exists, requires PIN
  - `POST /api/secrets/{id}/view` - Retrieve encrypted data with PIN verification
  - `DELETE /api/secrets/{id}` - Delete secret

- **Security:**
  - Stores only encrypted data (never plaintext)
  - Rate limiting (10 req/min for info, 5 req/min for view)
  - Secure 64-character hex tokens for IDs
  - Auto-cleanup for expired secrets

### Database Schema (MongoDB)
```javascript
{
  id: String (64 hex chars),
  encrypted_data: String (Base64),
  iv: String (hex),
  pin_hash: String | null (SHA256),
  expiry_minutes: Number,
  one_time_view: Boolean,
  created_at: ISO Date String,
  expires_at: ISO Date String,
  viewed: Boolean
}
```

## Tasks Completed
1. ✅ Backend API with rate limiting and secure token generation
2. ✅ Client-side AES-256 encryption/decryption
3. ✅ Create secret form with expiry, one-time view, PIN options
4. ✅ Share page with link and QR code
5. ✅ View secret page with PIN entry
6. ✅ Dark/Light theme toggle
7. ✅ Glassmorphism UI with Unbounded + Manrope + JetBrains Mono fonts
8. ✅ Sonner toast notifications
9. ✅ Copy to clipboard functionality
10. ✅ One-time view auto-deletion

## Next Tasks
1. Add periodic cleanup job for expired secrets
2. Add basic audit logging (access timestamps)
3. Add burn-after-reading countdown animation
4. Add password strength indicator for PINs
5. Add multiple secrets batch creation
6. Add secret viewing statistics (for non-one-time secrets)

## Environment Variables
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `CORS_ORIGINS` - Allowed CORS origins
- `REACT_APP_BACKEND_URL` - Backend API URL for frontend

## Running Locally
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```
