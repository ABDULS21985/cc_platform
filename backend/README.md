# CCP-Backend

Community Circle Payment Platform - Backend API

## Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL (You have Neon database)
- Redis (Docker or cloud)
- Docker & Docker Compose (optional but recommended)

### Setup (30 minutes)

```bash
# 1. Clone repository (if not already)
cd CCP-Backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create and configure .env file
# Copy from .env.example and fill in:
# - DB_HOST, DB_USER, DB_PASSWORD (use local PostgreSQL)
# - REDIS_URL, JWT_SECRET_KEY
# - Cloudinary, Firebase, Gmail credentials

# 5. Start Redis (Docker)
docker-compose up -d redis

# 6. Start application
flask run --debug --reload
# Alternative: python app.py
```

## Database Migrations

### Production Database Status

- All required tables created (users, wallets, user_verifications, wallet_transactions)
- All required columns present (bvn_verified, nin_verified, verification_status, task_id)
- Production database schema is complete and verified  

The database is now **ready for login and BVN verification**!

### Flask-Migrate Commands (Recommended Way)

When you add a new model or modify an existing one:

```bash
# Create migration (auto-detects model changes)
flask db migrate -m "Add new_model table"

# Apply migrations to database
flask db upgrade

# View current state
flask db current
flask db heads
flask db history

# Rollback last migration (if needed)
flask db downgrade
```

### Adding a New Model (Step-by-Step)

1. **Create model file**
   ```python
   # modules/auth_v2/models/user_preferences.py
   from modules.auth_v2.extensions import db
   
   class UserPreferences(db.Model):
       __tablename__ = 'user_preferences'
       id = db.Column(db.Integer, primary_key=True)
       user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
       theme = db.Column(db.String(50), default='light')
   ```

2. **Import model in app.py** (around line 295):
   ```python
   from modules.auth_v2.models.user_preferences import UserPreferences
   ```

3. **Create migration**:
   ```bash
   flask db migrate -m "Add UserPreferences model"
   ```

4. **Review migration file** in `flask_migrations/versions/`

5. **Apply to database**:
   ```bash
   flask db upgrade
   ```

6. **Test and commit** to git

### Fallback: Manual Schema Script

If Flask CLI has issues, use the idempotent schema script:

```bash
# This adds any missing tables/columns directly to PostgreSQL
python migrations/ensure_schema.py
```

**Note:** This is a safety net. Use Flask-Migrate as your primary migration tool.

### Test It Works

```bash
# Should return: {"status":"healthy"}
curl http://localhost:8080/healthcheck
```

---

## Current Architecture

### Tech Stack
- **Framework**: Flask 3.1.0
- **ORM**: SQLAlchemy 2.0.44 with Flask-SQLAlchemy
- **Migrations**: Flask-Migrate (Alembic) with Flask-Script
- **Database**: PostgreSQL 15+ via Neon Cloud (production) / Local Postgres (development)
- **Cache/Sessions**: Redis
- **Search**: Typesense
- **Storage**: Cloudinary
- **Push Notifications**: Firebase
- **Real-time**: Socket.IO (eventlet)
- **API Docs**: Swagger/Flasgger

### Project Structure (Current)

```
CCP-Backend/
├── modules/                 # Modular architecture
│   ├── auth_v2/            # Authentication (Google, Facebook, Apple, Manual)
│   │   ├── models/        # User model
│   │   ├── resources/     # Auth/profile Smorest resources
│   │   ├── schemas/       # Request/response schemas
│   │   └── extensions.py  # SQLAlchemy instance
│   ├── verification/       # BVN/NIN verification
│   │   ├── models/        # UserVerification model
│   │   ├── resources/     # Verification resources
│   │   └── schemas/       # Verification schemas
│   ├── wallet/            # Wallet & payments
│   │   ├── models/        # Wallet, WalletTransaction models
│   │   ├── resources/     # Wallet resources
│   │   └── schemas/       # Wallet schemas
│   ├── community/         # Community billing and memberships
│   │   ├── models/
│   │   ├── resources/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── repositories/
│   └── tasks/             # Background jobs
├── auth/                   # Legacy auth modules
├── database/              # Database connection management
├── routes/                # API endpoints (legacy)
├── extension/             # Extensions (Redis, Cloudinary, Socket.IO)
├── flask_migrations/      # Alembic migration files
│   └── versions/         # Migration history
├── migrations/           # Migration scripts
│   └── ensure_schema.py  # Fallback schema fixer
├── utils/                # Utility functions
├── tests/                # Test suite
├── app.py                # Flask app factory
├── manage.py             # Flask-Script manager
├── MIGRATION_WORKFLOW.md # Migration guide
└── MIGRATIONS_GUIDE.md   # Flask-Migrate documentation
```

---

## Configuration

### Environment Variables

Required variables (copy from `.env.example`):

```bash
# Flask
SECRET_KEY=your-secret-key
FLASK_ENV=development

# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=ccp_db
DB_PORT=5432
DB_SSLMODE=require  # For Neon cloud

# Redis
REDIS_URL=rediss://user:password@your-redis-host:6379

# JWT
JWT_SECRET_KEY=your-jwt-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Firebase
FIREBASE_CREDENTIALS=/path/to/firebase_credentials.json

# Payment Providers
BELL_MFB_CLIENT_ID=your-client-id
BELL_MFB_CLIENT_SECRET=your-client-secret
PAYSTACK_SECRET_KEY=your-paystack-key

# Database Migrations
RUN_MIGRATIONS=true  # Enable auto-migration on startup
```

---

## Testing

### Quick Start (5 minutes)

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-mock

# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ -v --cov=modules --cov-report=html

# View coverage report
start htmlcov/index.html          # Windows
open htmlcov/index.html           # macOS
xdg-open htmlcov/index.html       # Linux
```

### Test Coverage

- Encryption Service: 12 tests
- Validators (BVN/NIN): 14 tests
- Verification Service: 10 tests
- Wallet Service: 11 tests
- Bell MFB Service: 13 tests

**Target:** 85%+ coverage for all modules

---

## API Documentation

Once the server is running:
- **Swagger UI**: http://localhost:8080/docs/
- **Health Check**: http://localhost:8080/healthcheck

### Key Endpoints

#### Authentication
- `POST /api/v2/auth/signup` - User registration
- `POST /api/v2/auth/login` - User login
- `POST /api/v2/auth/verify-email` - Email verification

#### Verification
- `POST /api/v2/verification/bvn` - BVN verification
- `POST /api/v2/verification/nin` - NIN verification
- `GET /api/v2/verification/status/<user_id>` - Check verification status

#### Wallet
- `GET /api/v2/wallet/balance` - Get wallet balance
- `POST /api/v2/wallet/deposit` - Deposit funds
- `POST /api/v2/wallet/transfer` - Transfer funds

#### User Profile
- `GET /api/v2/user/profile` - Get user profile
- `PUT /api/v2/user/profile` - Update profile
- `POST /api/v2/user/profile/upload-image` - Upload profile image

#### Community
- `GET /api/community` - List communities
- `POST /api/community` - Create community
- `GET /api/community/<id>/posts` - Get community posts

---

## Security Notes

### Important Security Reminders

1. **Never commit** `.env` files or credentials
2. **Always use** environment variables for secrets
3. **Rotate secrets** regularly in production
4. **Enable HTTPS** in production
5. **Review** the [Critical Security Issues](README_RESTRUCTURING.md#-critical-issues-fix-immediately)

---

## Contributing

### Before Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Write code following the modular architecture (see Project Structure)
3. Add tests for new features (minimum 80% coverage for new code)
4. Ensure all tests pass: `pytest tests/ -v`
5. Submit PR with clear description of changes

### Code Standards

- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for functions and classes
- Keep functions small and focused
- Use SQLAlchemy ORM (not raw SQL)
- Always import models in app.py for migration detection

### Adding Features

**When adding a new feature:**

1. Create or extend the owning module under `modules/<feature>/`
2. Add `models/`, `repositories/`, `services/`, `schemas/`, and `resources/` as needed
3. Import model in `app.py` for migration detection if the model is new
4. Register the module resource in `modules/core/api_registry.py`
5. Add or update tests for the module behavior in `tests/`
6. Run migrations: `flask db migrate -m "Add feature"`
7. Test locally before submitting PR

**Important:** Do not add new feature work in root `routes/`. That tree is legacy and scheduled for removal.

---

## Development Roadmap

### Phase 1: Critical Fixes (COMPLETE)
- [x] Remove hardcoded credentials
- [x] Fix PostgreSQL cursor syntax
- [x] Migrate to SQLAlchemy ORM
- [x] Set up Flask-Migrate with Alembic
- [x] Fix database schema (all tables & columns present)
- [x] Enable proper connection pooling

### Phase 2: Infrastructure (Complete)
- [x] Flask-Migrate setup with auto-detection
- [x] Database schema verified in production
- [x] Migrations on Docker startup
- [x] Test infrastructure in place

### Phase 3: Enhancement (Current)
- [ ] Implement service layer pattern across all modules
- [ ] Complete migration of all modules to new architecture
- [ ] Achieve 85%+ test coverage
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Performance optimization & load testing

### Phase 4: Production Hardening
- [ ] Security audit & penetration testing
- [ ] Rate limiting & DDoS protection
- [ ] Enhanced logging & monitoring
- [ ] Documentation finalization


