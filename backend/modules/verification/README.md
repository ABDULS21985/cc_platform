# Verification Module

Complete BVN/NIN verification system with real identity verification and automatic wallet creation.

## 🎯 Overview

This module handles:
1. **Real BVN/NIN verification** with Paystack Identity API
2. **Secure encryption** of sensitive data (AES-256)
3. **Duplicate prevention** using SHA-256 hashing
4. **Automatic wallet creation** with Bell MFB
5. **Async processing** with Celery

---

## 📊 Flow Diagram

```
User Submits BVN/NIN
       ↓
Validate Request Schema
       ↓
Check Duplicates (SHA-256 hash)
       ↓
✨ Verify with Paystack/IDCheck (REAL verification)
   - Check name matches
   - Check DOB matches
   - Check not blacklisted
       ↓
Encrypt BVN/NIN (AES-256)
       ↓
Create Bell MFB Account (20-30s)
       ↓
Create Wallet Record
       ↓
Update User Status
       ↓
Send Push Notification
```

---

## 🏗️ Architecture

### Providers (External APIs)
```
providers/
├── base_provider.py           # Abstract base class
├── paystack_provider.py       # Paystack Identity (Primary)
└── provider_factory.py        # Factory with fallback support
```

**Adding New Provider:**
```python
# 1. Create new provider
class NewProvider(VerificationProvider):
    def verify_bvn(self, ...):
        # Implementation
        pass

# 2. Add to factory
# modules/verification/providers/provider_factory.py
if os.getenv('NEW_PROVIDER_API_KEY'):
    providers.append(('NewProvider', NewProvider()))
```

### Services
```
services/
├── verification_service.py    # Main orchestration
├── encryption_service.py      # AES-256 encryption
└── notification_service.py    # Push notifications
```

### Resources
```
resources/
└── verification_resource.py  # Verification endpoints and docs
```

### Schemas
```
schemas/
└── verification_schema.py    # Request/response validation and serialization
```

### Active Rule

- Active verification work belongs only in `modules/verification/`.
- The active flow is `resource -> schema -> service -> repository -> model/provider`.
- Root `routes/` is legacy and not part of current verification development.

---

## 🔑 Environment Variables

```bash
# Required: Paystack Identity
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx

# Required: Encryption
ENCRYPTION_KEY=your_fernet_encryption_key

# Required: Bell MFB (for wallet creation)
BELL_MFB_CLIENT_ID=your_client_id
BELL_MFB_CLIENT_SECRET=your_client_secret
BELL_MFB_BASE_URL=http://sandbox-baas-api.bellmfb.com

# Optional: IDCheck.ng (fallback)
IDCHECK_API_KEY=your_idcheck_key
IDCHECK_BASE_URL=https://api.idcheck.ng/v1
```

### Get Paystack API Key

1. Go to https://dashboard.paystack.com/settings/api-keys
2. Copy **Test Secret Key** (`sk_test_xxx`) for development
3. Use **Live Secret Key** (`sk_live_xxx`) for production

### Generate Encryption Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 📡 API Endpoints

### 1. Verify BVN

**Endpoint:** `POST /api/v2/verification/bvn`

**Authentication:** Required (session)

**Rate Limit:** 10 requests per hour

**Request:**
```json
{
  "bvn": "22500636592",
  "date_of_birth": "1990-01-15"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Verification in progress. We'll notify you when complete.",
  "data": {
    "verification_id": 123,
    "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "processing",
    "estimated_time": "1-2 minutes"
  }
}
```

**What Happens:**
1. BVN format validated (11 digits, numeric)
2. User age checked (18+ years)
3. Duplicate BVN checked
4. Celery task queued
5. Response returned immediately

**Background Task:**
1. ✨ **Verify BVN with Paystack** (name/DOB matching)
2. Encrypt BVN with AES-256
3. Create Bell MFB virtual account (20-30s)
4. Create wallet record
5. Update user verification status
6. Send push notification

---

### 2. Check Verification Status

**Endpoint:** `GET /api/v2/verification/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "status": "verified",
    "verification_type": "bvn",
    "verified_at": "2025-12-09T10:30:00Z",
    "has_wallet": true
  }
}
```

---

### 3. Check Task Status

**Endpoint:** `GET /api/v2/tasks/{task_id}`

**Response:**
```json
{
  "success": true,
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "SUCCESS",
  "result": {
    "success": true,
    "verification_id": 123,
    "wallet": {
      "account_number": "9876543210",
      "account_name": "John Doe",
      "balance": "0.00"
    }
  }
}
```

**Status Values:**
- `PENDING` - Task queued
- `STARTED` - Processing
- `SUCCESS` - Completed
- `FAILURE` - Failed
- `RETRY` - Retrying

---

## ✨ Paystack Identity Integration

### What Paystack Verifies

1. ✅ **BVN exists** in Nigerian banking system
2. ✅ **Name matches** (firstname + lastname)
3. ✅ **Date of birth matches**
4. ✅ **Not blacklisted** by financial institutions

### Pricing

- **Test Mode** (`sk_test_xxx`): **FREE** ✅
- **Live Mode** (`sk_live_xxx`): ₦150 per verification

### Test Mode

```bash
# Use test secret key
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

**Test mode benefits:**
- Free unlimited verifications
- Same API endpoints
- Same response format
- Perfect for development

### Switching to Production

```bash
# Change to live secret key
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
```

That's it! No code changes needed.

---

## 🔒 Security Features

### 1. Encryption (AES-256)

```python
# BVN encrypted before storage
encrypted_bvn = "gAAAAABh3x9..."  # Fernet encrypted
bvn_hash = "a3c5e8f2..."          # SHA-256 for duplicates

# Never store plaintext BVN in database
```

### 2. Duplicate Prevention

```python
# Hash BVN to check duplicates without decrypting all records
bvn_hash = SHA256(bvn)
existing = db.query(hash=bvn_hash)
if existing:
    raise ValueError("BVN already registered")
```

### 3. Rate Limiting

```python
@rate_limit(max_requests=10, window_minutes=60)
def verify_bvn():
    # Only 10 BVN verification attempts per hour per user
    pass
```

### 4. HTTPS Only

All API calls to Paystack use HTTPS with certificate verification.

---

## 🧪 Testing

### Unit Tests

```bash
# Test encryption
pytest tests/test_encryption_service.py -v

# Test request/response schema validation
pytest tests/test_validators.py -v

# Test verification service (mocked)
pytest tests/test_verification_service.py -v

# Test Paystack provider (mocked)
pytest tests/test_paystack_provider.py -v
```

### Manual Testing

#### 1. Test Paystack Provider Directly

```bash
# From project root
python modules/verification/providers/paystack_provider.py
```

#### 2. Test BVN Verification Flow

```bash
# Start Celery worker
celery -A modules.tasks.celery_app worker --loglevel=info

# Start Flask app
python app.py

# Make API request
curl -X POST http://localhost:8080/api/v2/verification/bvn \
  -H "Content-Type: application/json" \
  -d '{
    "bvn": "22500636592",
    "date_of_birth": "1990-01-15"
  }'
```

---

## 🐛 Troubleshooting

### Error: "PAYSTACK_SECRET_KEY not set"

**Solution:** Add to `.env`:
```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

### Error: "ENCRYPTION_KEY not found"

**Solution:** Generate and add to `.env`:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Error: "BVN verification failed - name/DOB do not match"

**Causes:**
1. ❌ Name spelling mismatch (user: "John", BVN: "JOHN DOE")
2. ❌ Date of birth incorrect
3. ❌ BVN doesn't exist

**Solution:** Ask user to verify their BVN details match exactly.

### Error: "Verification service unavailable"

**Causes:**
1. ❌ Paystack API down
2. ❌ Network timeout
3. ❌ Invalid API key

**Solution:** Check Paystack status at https://status.paystack.com

### Celery Task Stuck in PENDING

**Causes:**
1. ❌ Celery worker not running
2. ❌ Redis connection failed

**Solution:**
```bash
# Check Redis
redis-cli ping  # Should return PONG

# Start Celery worker
celery -A modules.tasks.celery_app worker --loglevel=info
```

---

## 📊 Database Schema

### user_verifications

```sql
CREATE TABLE user_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    verification_type VARCHAR(10) NOT NULL,  -- 'bvn' or 'nin'
    verification_number_encrypted TEXT NOT NULL,  -- Fernet encrypted
    verification_number_hash VARCHAR(64) NOT NULL,  -- SHA-256
    status VARCHAR(20) DEFAULT 'pending',  -- pending/processing/verified/failed
    bell_mfb_client_id VARCHAR(100) UNIQUE,
    error_message TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_hash ON user_verifications(verification_number_hash);
CREATE INDEX idx_user_verifications_status ON user_verifications(status);
```

---

## 🚀 Production Checklist

- [ ] Use **live** Paystack key (`sk_live_xxx`)
- [ ] Generate strong **encryption key** (not the example one)
- [ ] Enable **rate limiting** (currently 10/hour)
- [ ] Set up **monitoring** (Sentry, New Relic)
- [ ] Configure **Celery workers** (at least 2 workers)
- [ ] Set up **Redis persistence** (AOF or RDB)
- [ ] Enable **HTTPS** for all endpoints
- [ ] Add **audit logging** for BVN access
- [ ] Test **failure scenarios** (Paystack down, Bell MFB down)
- [ ] Set up **alerts** for verification failures

---

## 📈 Metrics to Monitor

1. **Verification Success Rate** - Should be > 90%
2. **Average Processing Time** - Should be < 2 minutes
3. **Paystack API Errors** - Should be < 5%
4. **Celery Task Failures** - Should be < 2%
5. **Rate Limit Hits** - Monitor for abuse

---

## 🤝 Support

**Paystack Support:**
- Email: support@paystack.com
- Docs: https://paystack.com/docs/identity-verification/

**Bell MFB Support:**
- Check their documentation for sandbox issues

**CCP Backend Issues:**
- Check logs: `logs/flask_debug.log`
- Celery logs: Console output of worker
