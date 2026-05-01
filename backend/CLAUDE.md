# CLAUDE.md - AI Development Context

> **Purpose:** This file provides context for AI assistants (Claude, Copilot, etc.) working on this codebase. It documents architecture, patterns, and guidelines.

---

## 📋 Project Overview

**CCP-Backend** is a Community Payment Platform backend built with:
- **Framework:** Flask (synchronous Python with eventlet for async I/O)
- **ORM:** Flask-SQLAlchemy
- **Database:** PostgreSQL (Neon cloud / local)
- **Auth:** JWT + Email OTP verification + Flask-Login sessions
- **Payments:** Bell MFB (wallets) + SafeHaven MFB (community wallets)
- **Cache/Sessions:** Redis (Upstash) or filesystem (dev)
- **Search:** Typesense
- **Notifications:** Firebase Cloud Messaging

**Key Features:**
- User authentication with email OTP
- BVN/NIN identity verification (Paystack)
- Personal wallets (Bell MFB virtual accounts)
- Community peer-to-peer billing
- Real-time notifications (Socket.IO)

---

## 🏗️ Architecture Pattern

This project follows a **Module-First Clean Layered Architecture** with separation of concerns:

```
Request → Resource → Schema → Service → Repository → Model → Database/Provider
```

### Active Development Rule

- All active backend work belongs in `modules/*`.
- Root-level `routes/*` is legacy and scheduled for removal.
- Do not add new feature work outside `modules/*` unless it is true app-wide infrastructure.

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Resources** | `modules/*/resources/*.py` | HTTP handling, request/response, decorators, docs |
| **Schemas** | `modules/*/schemas/*.py` | Request and response validation/serialization |
| **Services** | `modules/*/services/*.py` | Business logic, orchestration |
| **Repositories** | `modules/*/repositories/*.py` | Database queries, CRUD operations |
| **Models** | `modules/*/models/*.py` | SQLAlchemy table definitions |
| **Providers** | `modules/*/providers/*.py` | External API integrations |
| **Utils** | `modules/*/utils/*.py` | Module-specific utilities |
| **Core** | `modules/core/` | Shared registration and cross-module helpers |

---

## 📁 Project Structure

```
CCP-Backend/
├── app.py                    # Application factory (create_app)
├── config.py                 # Configuration class (env-based)
├── manage.py                 # Flask CLI commands
├── socket_events.py          # Socket.IO event handlers
├── requirements.txt          # Python dependencies
│
├── database/
│   └── connection.py         # Legacy direct database access
│
├── modules/
│   ├── core/                 # Shared utilities
│   │   ├── api_registry.py         # Active Smorest resource registration
│   │   ├── response_formatter.py   # Shared response helpers
│   │
│   ├── auth_v2/              # Authentication module
│   │   ├── models/           # User model
│   │   ├── resources/        # Auth and profile API resources
│   │   ├── schemas/          # Request/response schemas
│   │   ├── services/         # Auth, password, token services
│   │   ├── repositories/     # User repository
│   │   ├── utils/            # Auth-specific helpers
│   │   └── extensions.py     # db, login_manager, mail instances
│   │
│   ├── wallet/               # Personal wallet module
│   │   ├── models/           # Wallet, WalletTransaction
│   │   ├── resources/        # Wallet and webhook resources
│   │   ├── schemas/          # Wallet request/response schemas
│   │   ├── services/         # Wallet, deposit, Bell MFB services
│   │   ├── repositories/     # Wallet, transaction repositories
│   │   ├── providers/        # Bell MFB API client
│   │   └── token_management/ # Provider token concerns
│   │
│   ├── verification/         # BVN/NIN verification
│   │   ├── models/           # Verification records
│   │   ├── resources/        # Verification resources
│   │   ├── schemas/          # Verification schemas
│   │   ├── services/         # Verification orchestration
│   │   ├── repositories/     # Verification repository
│   │   └── providers/        # Paystack, IDCheck clients
│   │
│   ├── community/            # Community billing module
│   │   ├── models/           # Community, Member, Bill, Payment
│   │   ├── resources/        # Community, member, bill, payment resources
│   │   ├── schemas/          # Community request/response schemas
│   │   ├── services/         # Community business logic
│   │   ├── repositories/     # Entity repositories
│   │   └── utils/            # Community-specific helpers
│   │
│   └── config/               # App configuration helpers
│       └── swagger_config.py # Swagger/Flasgger configuration
│
├── routes/                   # Legacy routes slated for removal
├── tests/                    # Unit and integration tests
├── flask_migrations/         # Alembic migrations
└── docs/                     # Documentation
```

---

## 📁 Module Structure Template

Every feature module should follow this structure:

```
modules/{module_name}/
├── __init__.py              # Export public interfaces
├── resources/
│   ├── __init__.py          # Export API resources
│   └── {feature}_resource.py # HTTP endpoints and OpenAPI docs
├── schemas/
│   ├── __init__.py          # Export request/response schemas
│   └── {feature}_schema.py  # Marshmallow/Pydantic schema layer
├── models/
│   ├── __init__.py          # Export all models
│   └── {model}.py           # SQLAlchemy model (~50-150 lines)
├── services/
│   ├── __init__.py          # Export services
│   └── {model}_service.py   # Business logic (~200-400 lines)
├── repositories/
│   ├── __init__.py          # Export repositories
│   └── {model}_repository.py # Database queries (~100-200 lines)
├── providers/               # (Optional) External API clients
│   └── {api}_client.py      # Third-party integrations
└── utils/                   # (Optional) Module utilities
    └── {helper}.py          # Helper functions
```

### Module Rules

- Build new product code only inside `modules/*`.
- Prefer `resources/ + schemas/ + services/ + repositories/ + models` as the standard structure.
- Use `validators` only where legacy module internals still need them during transition.
- Do not create new feature endpoints in root `routes/*`.

---

## 🔧 Code Patterns & Templates

### 1. SQLAlchemy Model Template

```python
"""
{Model} Model

Database model for {description}.
"""
from datetime import datetime
from typing import Optional
from modules.auth_v2.extensions import db
from sqlalchemy import func


class {Model}(db.Model):
    """
    {Model} database model.
    
    Attributes:
        id: Primary key
        name: Display name
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = '{table_name}'
    
    # Primary key
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Fields
    name = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Foreign Keys
    user_id = db.Column(
        db.Integer, 
        db.ForeignKey('users.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    # Timestamps (auto-managed)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = db.relationship('User', backref=db.backref('{table_name}', lazy='dynamic'))

    def __repr__(self) -> str:
        return f"<{Model}(id={self.id}, name='{self.name}')>"
    
    def to_dict(self) -> dict:
        """Convert model to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
```

**Rules:**
- ✅ Keep models lean - only field definitions and relationships
- ✅ Use proper indexes on frequently queried fields
- ✅ Always include `created_at` and `updated_at`
- ✅ Provide `to_dict()` method for serialization
- ✅ Import `db` from `modules.auth_v2.extensions`
- ❌ NO business logic in models
- ❌ NO complex queries in models

---

### 2. Schema Template

```python
"""
{Model} Schemas

Request and response schemas for validation and serialization.
"""
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional
import re


class {Model}CreateSchema(BaseModel):
    """Validates {model} creation request."""
    name: str = Field(..., min_length=2, max_length=255, description="Display name")
    description: Optional[str] = Field(None, max_length=1000)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Ensure name is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()


class {Model}UpdateSchema(BaseModel):
    """Validates {model} update request. All fields optional."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate name if provided."""
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v
```

**Rules:**
- ✅ Separate create and update schemas when needed
- ✅ Use `Field()` with constraints (min_length, max_length, ge, le)
- ✅ Add `@field_validator` for complex validation
- ✅ Schemas live in `modules/{module}/schemas/`
- ✅ Use schemas in resources and services where appropriate

---

### 3. Repository Template

```python
"""
{Model} Repository - Data Access Layer

Database operations for {model}.
"""
from typing import Optional, List
from modules.{module}.models.{model} import {Model}
from modules.auth_v2.extensions import db


class {Model}Repository:
    """
    Repository for {model} database operations.
    
    Handles all database queries - no business logic here.
    """
    
    def create(self, **kwargs) -> {Model}:
        """Create a new {model}."""
        instance = {Model}(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance

    def find_by_id(self, id: int) -> Optional[{Model}]:
        """Find {model} by ID."""
        return {Model}.query.filter_by(id=id).first()

    def find_by_user_id(self, user_id: int) -> List[{Model}]:
        """Find all {models} for a user."""
        return {Model}.query.filter_by(user_id=user_id).all()

    def find_all(
        self, 
        limit: int = 100, 
        offset: int = 0,
        **filters
    ) -> List[{Model}]:
        """Find all {models} with pagination and filters."""
        query = {Model}.query
        
        for key, value in filters.items():
            if value is not None and hasattr({Model}, key):
                query = query.filter(getattr({Model}, key) == value)
        
        return query.offset(offset).limit(limit).all()

    def count(self, **filters) -> int:
        """Count {models} with optional filters."""
        query = {Model}.query
        
        for key, value in filters.items():
            if value is not None and hasattr({Model}, key):
                query = query.filter(getattr({Model}, key) == value)
        
        return query.count()

    def update(self, id: int, **kwargs) -> Optional[{Model}]:
        """Update a {model}."""
        instance = self.find_by_id(id)
        if not instance:
            return None
        
        for key, value in kwargs.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        db.session.commit()
        db.session.refresh(instance)
        return instance

    def delete(self, id: int) -> bool:
        """Delete a {model}."""
        instance = self.find_by_id(id)
        if not instance:
            return False
        
        db.session.delete(instance)
        db.session.commit()
        return True

    def exists(self, **kwargs) -> bool:
        """Check if {model} exists with given criteria."""
        query = {Model}.query
        for key, value in kwargs.items():
            if hasattr({Model}, key):
                query = query.filter(getattr({Model}, key) == value)
        return query.first() is not None
```

**Rules:**
- ✅ Only database operations - no business logic
- ✅ Return models or None, never raise exceptions for "not found"
- ✅ Use `db.session` from extensions
- ✅ Use Flask-SQLAlchemy query style (`Model.query`)

---

### 4. Service Template

```python
"""
{Model} Service - Business Logic Layer

Business logic for {model} operations.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from modules.{module}.repositories.{model}_repository import {Model}Repository
from modules.{module}.schemas.{model}_schema import (
    {Model}CreateSchema,
    {Model}UpdateSchema
)

logger = logging.getLogger(__name__)


class {Model}Service:
    """
    Service class for {model} business logic.
    
    All business rules, validation, and orchestration happen here.
    """
    
    def __init__(self):
        """Initialize service with dependencies."""
        self.repo = {Model}Repository()
    
    def create(
        self, 
        data: {Model}CreateSchema,
        user_id: int
    ) -> Tuple[Dict[str, Any], int]:
        """
        Create a new {model}.
        
        Args:
            data: Validated creation data
            user_id: ID of authenticated user
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        # Business validation
        if self.repo.exists(name=data.name, user_id=user_id):
            return {
                "error": "A {model} with this name already exists",
                "code": "DUPLICATE_NAME"
            }, 409
        
        # Create record
        instance = self.repo.create(
            **data.model_dump(),
            user_id=user_id
        )
        
        logger.info(f"Created {model} {instance.id} by user {user_id}")
        
        return {
            "message": "{Model} created successfully",
            "data": instance.to_dict()
        }, 201

    def get_by_id(
        self, 
        id: int, 
        user_id: int
    ) -> Tuple[Dict[str, Any], int]:
        """
        Get {model} by ID.
        
        Returns:
            Tuple of (response_dict, status_code)
        """
        instance = self.repo.find_by_id(id)
        
        if not instance:
            return {"error": "{Model} not found", "code": "NOT_FOUND"}, 404
        
        # Authorization check
        if instance.user_id != user_id:
            return {"error": "{Model} not found", "code": "NOT_FOUND"}, 404
        
        return {"data": instance.to_dict()}, 200

    def get_list(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        **filters
    ) -> Tuple[Dict[str, Any], int]:
        """Get paginated list of {models}."""
        offset = (page - 1) * page_size
        
        items = self.repo.find_all(
            limit=page_size,
            offset=offset,
            user_id=user_id,
            **filters
        )
        total = self.repo.count(user_id=user_id, **filters)
        
        return {
            "data": [item.to_dict() for item in items],
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        }, 200

    def update(
        self,
        id: int,
        data: {Model}UpdateSchema,
        user_id: int
    ) -> Tuple[Dict[str, Any], int]:
        """Update a {model}."""
        # Check exists and authorized
        instance = self.repo.find_by_id(id)
        
        if not instance or instance.user_id != user_id:
            return {"error": "{Model} not found", "code": "NOT_FOUND"}, 404
        
        # Get only set fields
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return {"error": "No fields to update", "code": "NO_CHANGES"}, 400
        
        instance = self.repo.update(id, **update_data)
        logger.info(f"Updated {model} {id} by user {user_id}")
        
        return {"message": "{Model} updated", "data": instance.to_dict()}, 200

    def delete(self, id: int, user_id: int) -> Tuple[Dict[str, Any], int]:
        """Delete a {model}."""
        instance = self.repo.find_by_id(id)
        
        if not instance or instance.user_id != user_id:
            return {"error": "{Model} not found", "code": "NOT_FOUND"}, 404
        
        self.repo.delete(id)
        logger.info(f"Deleted {model} {id} by user {user_id}")
        
        return {"message": "{Model} deleted successfully"}, 200
```

**Rules:**
- ✅ ALL business logic goes here
- ✅ Authorization checks in service, not route
- ✅ Log important operations
- ✅ Return tuples of (response_dict, status_code)
- ✅ Accept Pydantic validators as input

---

### 5. Resource Template

```python
"""
{Model} Resource

API endpoints for {model} operations.
"""
from flask.views import MethodView
from flask_login import login_required, current_user
from flask_smorest import Blueprint, abort
from werkzeug.exceptions import HTTPException
import logging

from modules.{module}.schemas.{model}_schema import (
    {Model}CreateSchema,
    {Model}UpdateSchema,
    {Model}ResponseSchema,
)
from modules.{module}.services.{model}_service import {Model}Service

logger = logging.getLogger(__name__)

{model}_blp = Blueprint('{model}', __name__, url_prefix='/api/v2/{models}')


@{model}_blp.route('/')
class {Model}CollectionResource(MethodView):
    decorators = [login_required]

    @{model}_blp.arguments({Model}CreateSchema)
    @{model}_blp.response(201, {Model}ResponseSchema)
    def post(self, data):
        try:
            service = {Model}Service()
            result, status_code = service.create(data, current_user.id)
            if status_code >= 400:
                abort(status_code, message=result.get('error', 'Request failed'))
            return result, status_code
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating {model}: {e}", exc_info=True)
            abort(500, message='An unexpected error occurred.')


@{model}_blp.route('/<int:id>')
class {Model}ItemResource(MethodView):
    decorators = [login_required]

    @{model}_blp.response(200, {Model}ResponseSchema)
    def get(self, id: int):
        service = {Model}Service()
        result, status_code = service.get_by_id(id, current_user.id)
        if status_code >= 400:
            abort(status_code, message=result.get('error', 'Request failed'))
        return result, status_code
```

**Rules:**
- ✅ Keep resources thin - just HTTP handling and API docs
- ✅ Use `@login_required` for protected routes
- ✅ Define request/response contracts through schemas
- ✅ Register active endpoints through Flask-Smorest blueprints
- ❌ NO business logic in resources

---

## 🔧 Registering New Resources

Add resource blueprints to `modules/core/api_registry.py`:

```python
api_blueprints = [
    ("modules.{module}.resources.{model}_resource", "{model}_blp"),
]
```

The tuple format is: `(module_path, blueprint_name)`

---

## 📊 Response Format Standard

Use `modules/core/response_formatter.py` for consistent responses:

### Success Response
```python
from modules.core.response_formatter import format_success, format_data

# Simple success
response, status = format_success(
    message="Operation completed",
    status_code=200,
    user_id=123  # Additional data
)

# With data object
response, status = format_data(
    data={"id": 1, "name": "Test"},
    message="Retrieved successfully"
)
```

### Error Response
```python
from modules.core.response_formatter import (
    format_error,
    format_not_found,
    format_validation_error,
    format_internal_error
)

# Generic error
response, status = format_error(
    message="Something went wrong",
    error_code="CUSTOM_ERROR",
    status_code=400
)

# Not found
response, status = format_not_found("Wallet")  # "Wallet not found"

# Validation error (from Pydantic)
response, status = format_validation_error(validation_error)

# Internal error (500)
response, status = format_internal_error()
```

### Paginated Response
```python
from modules.core.response_formatter import format_paginated

response, status = format_paginated(
    items=[item.to_dict() for item in items],
    total=100,
    page=1,
    page_size=20
)
```

---

## 🔒 Authentication & Authorization

### Getting Current User

```python
from flask_login import login_required, current_user

@blueprint.route('/protected')
@login_required
def protected_endpoint():
    user_id = current_user.id
    email = current_user.email
    return jsonify({"user_id": user_id})
```

### JWT Token Auth (Alternative)

```python
from flask_jwt_extended import jwt_required, get_jwt_identity

@blueprint.route('/jwt-protected')
@jwt_required()
def jwt_protected():
    user_id = get_jwt_identity()
    return jsonify({"user_id": user_id})
```

### Session + JWT Hybrid

The app uses Flask-Login sessions as primary auth with JWT as alternative.
Check `current_user.is_authenticated` for session auth.

---

## 🧪 Testing Patterns

### Unit Test Template

```python
"""
Unit Tests for {Model}Service
"""
import pytest
from unittest.mock import Mock, patch
from modules.{module}.services.{model}_service import {Model}Service


@pytest.fixture
def mock_repo():
    """Mock {Model}Repository."""
    return Mock()


@pytest.fixture
def service(mock_repo):
    """Create service with mocked repository."""
    with patch(
        'modules.{module}.services.{model}_service.{Model}Repository',
        return_value=mock_repo
    ):
        svc = {Model}Service()
        svc.repo = mock_repo
        return svc


class TestCreate:
    """Test create operations."""
    
    def test_create_success(self, service, mock_repo):
        """Test successful creation."""
        # Setup
        mock_repo.exists.return_value = False
        mock_instance = Mock(id=1, name="Test")
        mock_instance.to_dict.return_value = {"id": 1, "name": "Test"}
        mock_repo.create.return_value = mock_instance
        
        # Execute
        from modules.{module}.validators import {Model}CreateValidator
        data = {Model}CreateValidator(name="Test")
        response, status = service.create(data, user_id=1)
        
        # Assert
        assert status == 201
        assert response["data"]["name"] == "Test"
        mock_repo.create.assert_called_once()
    
    def test_create_duplicate(self, service, mock_repo):
        """Test duplicate name rejection."""
        mock_repo.exists.return_value = True
        
        from modules.{module}.validators import {Model}CreateValidator
        data = {Model}CreateValidator(name="Duplicate")
        response, status = service.create(data, user_id=1)
        
        assert status == 409
        assert "already exists" in response["error"]
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=modules --cov-report=html

# Run specific module tests
pytest tests/test_wallet_service.py -v

# Run with print output
pytest -s
```

---

## 📝 Common Commands

```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start development server
python app.py
# OR with Flask CLI
flask run --port=8080

# Database migrations
flask db init          # First time only
flask db migrate -m "Description"
flask db upgrade

# Run tests
pytest

# Check syntax
python -m py_compile modules/{module}/services/{model}_service.py
```

---

## 🗃️ Database Patterns

### Connection
- **ORM:** Use `db` from `modules.auth_v2.extensions`
- **Legacy:** `database/connection.py` has direct psycopg2 (avoid for new code)

### Migrations
- Using Flask-Migrate (Alembic)
- Migrations in `flask_migrations/versions/`
- Set `RUN_MIGRATIONS=true` in `.env` for auto-migration on startup

### Model Import Pattern
```python
# Always import db from extensions
from modules.auth_v2.extensions import db

# Import models for relationships
from modules.auth_v2.models.user import User
```

---

## 🔌 External Integrations

| Service | Purpose | Config Keys |
|---------|---------|-------------|
| **Bell MFB** | Personal wallets | `BELL_MFB_*` |
| **SafeHaven MFB** | Community wallets | `SAFEHAVEN_*` |
| **Paystack** | BVN/NIN verification | `PAYSTACK_*` |
| **Redis (Upstash)** | Sessions, caching | `REDIS_URL` |
| **Typesense** | Search | `TYPESENSE_*` |
| **Firebase** | Push notifications | `FIREBASE_CREDENTIALS` |
| **Cloudinary** | Image storage | `CLOUDINARY_*` |

---

## 🚫 Anti-Patterns to Avoid

❌ **DON'T:**
- Put business logic in models
- Put business logic in routes
- Use raw SQL when ORM works
- Return raw database models from routes
- Catch generic `Exception` without logging
- Skip Pydantic validation
- Hardcode values (use config)
- Use `print()` instead of `logger`
- Create circular imports

✅ **DO:**
- Put all business logic in services
- Keep routes thin (just HTTP handling)
- Use Flask-SQLAlchemy ORM
- Return `to_dict()` from models
- Raise/catch specific exceptions
- Validate all inputs with Pydantic
- Use environment variables via `Config`
- Use Python `logging` module
- Import at function level if circular

---

## 📊 Current Module Status

| Module | Status | Description |
|--------|--------|-------------|
| `auth_v2` | ✅ Complete | JWT, OTP, sessions, password management |
| `wallet` | ✅ Complete | Bell MFB integration, deposits, transactions |
| `verification` | ✅ Complete | BVN/NIN via Paystack |
| `community` | ✅ Complete | Peer billing, SafeHaven wallets |
| `tasks` | 🔄 Planned | Celery async tasks |

---

## 📝 Session Notes

```
Use this section to track context across sessions:

Date: YYYY-MM-DD
Session: [Description]
Notes:
- What was worked on
- Current state
- Next steps
```

---

## 📚 Framework Decision & Migration Guides

When considering Flask optimization or migration to FastAPI:

1. **[FRAMEWORK_DECISION_GUIDE.md](docs/FRAMEWORK_DECISION_GUIDE.md)** — Quick reference for Flask vs FastAPI trade-offs
   - When to start FastAPI migration
   - Decision flowchart based on your RPS capacity
   - TL;DR: Optimize Flask now, migrate when you hit limits

2. **[FLASK_OPTIMIZATION_ROADMAP.md](docs/FLASK_OPTIMIZATION_ROADMAP.md)** — Detailed Flask optimization strategy (3-6 months)
   - Phase 1: Monitoring + Query audit
   - Phase 2: Reliability (webhooks, caching)
   - Phase 3: Load testing to establish limits
   - Code examples + acceptance criteria

3. **[FASTAPI_MIGRATION_STRATEGY.md](docs/FASTAPI_MIGRATION_STRATEGY.md)** — Gradual migration to FastAPI (6-12 months)
   - Strangler pattern (zero-disruption migration)
   - Phase-by-phase breakdown
   - When to start (based on Flask reaching limits)

**Recommendation**: Start with `FLASK_OPTIMIZATION_ROADMAP.md` Phase 1. Get metrics. Decide based on data.

---

**Last Updated:** 2026-04-05
