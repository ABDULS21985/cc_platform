# Community Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Database Schema](#database-schema)
5. [Repository Layer](#repository-layer)
6. [Service Layer](#service-layer)
7. [API Resources](#api-resources)
8. [Payment Integration](#payment-integration)
9. [Invite Link System](#invite-link-system)
10. [Usage Examples](#usage-examples)

---

## Overview

The **Community Module** enables users to create, manage, and join groups that pool funds, manage expenses, and collect dues. Communities can be:
- **Public**: Anyone can join freely
- **Private**: Requires payment to join

### Key Features
- Community creation and management
- Member management with roles (member, admin, owner)
- Bill/expense management and tracking
- Wallet management for fund collection
- Invite link system with usage limits and expiry
- Payment integration for membership fees
- Interest/category tagging
- Community dashboard and activity tracking

---

## Architecture

> Note: Any references below to legacy `routes/*` files are historical. Active development and registration now use `modules/community/resources/*` through Flask-Smorest blueprints.

The module follows **SOLID principles** with a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                  API Resources Layer                     │
│        (Flask-Smorest Blueprints + OpenAPI Docs)        │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                          │
│      (Business Logic, Validations, Orchestration)       │
├─────────────────────────────────────────────────────────┤
│                 Repository Layer                         │
│         (Database Access & Query Abstraction)           │
├─────────────────────────────────────────────────────────┤
│                   Model Layer                            │
│         (Data Entities, Relationships, Validation)      │
├─────────────────────────────────────────────────────────┤
│                   Database Layer                         │
│            (PostgreSQL with SQLAlchemy ORM)             │
└─────────────────────────────────────────────────────────┘
```

### Principles Applied
- **Single Responsibility**: Each class handles one concern
- **Open/Closed**: Easy to extend without modifying existing code
- **Liskov Substitution**: Models can substitute db.Model
- **Interface Segregation**: Clean, focused interfaces
- **Dependency Inversion**: Depends on abstractions (repositories)

---

## Data Models

### 1. Community Model
**File**: `models/community.py`

Represents a group/community for pooling funds.

```python
class Community(db.Model):
    id                  # Primary key
    name                # Community name (unique)
    slug                # URL-friendly identifier (unique)
    description         # Community description
    banner_url          # Banner image URL
    visibility          # 'public' or 'private'
    member_cost         # NGN amount (for private communities)
    
    # Invite System
    invite_code         # Unique invite code (11 chars)
    invite_expires_at   # Expiry timestamp
    invite_max_uses     # Usage limit (optional)
    invite_uses         # Current usage count
    invite_status       # 'active' or 'revoked'
    
    status              # 'active', 'suspended', 'closed'
    created_by          # FK to User (owner)
    member_count        # Cached active member count
    created_at          # Creation timestamp
    updated_at          # Last update timestamp
    
    # Relationships
    members             # CommunityMember (one-to-many)
    wallet              # CommunityWallet (one-to-one)
    interests           # Interest (many-to-many)
    bills               # Bill (one-to-many)
    creator             # User (many-to-one)
```

**Key Methods**:
- `to_dict()` — Serializes to JSON with invite info
- `add_member(user_id, status)` — Add member to community
- `get_active_members()` — Fetch active members only

---

### 2. CommunityMember Model
**File**: `models/community_member.py`

Represents membership relationship.

```python
class CommunityMember(db.Model):
    id                  # Primary key
    community_id        # FK to Community
    user_id             # FK to User
    status              # 'active', 'pending_payment', 'suspended'
    role                # 'member', 'admin', 'owner'
    contribution        # Total amount contributed (NGN)
    created_at          # When joined
    updated_at          # Last status change
    
    # Relationships
    community           # Community (many-to-one)
    user                # User (many-to-one)
```

**Status Workflow**:
1. `pending_payment` — User joined via paid invite, awaiting payment
2. `active` — Payment confirmed or community is free
3. `suspended` — Temporarily removed (can rejoin)
4. (removed) — Left or kicked out

---

### 3. CommunityWallet Model
**File**: `models/community_wallet.py`

Manages community fund storage and transfers.

```python
class CommunityWallet(db.Model):
    id                  # Primary key
    community_id        # FK to Community (unique)
    balance             # Current balance (NGN)
    currency            # 'NGN' (default)
    account_number      # Bank account number
    account_name        # Account holder name
    status              # 'active', 'frozen', 'closed'
    bell_mfb_client_id  # Integration ID
    created_at          # Creation timestamp
    updated_at          # Last balance update
    
    # Relationships
    community           # Community (one-to-one)
```

---

### 4. Bill & BillSession Models
**File**: `models/bill.py` & `models/bill_session.py`

Track expenses and payment collections.

```python
class Bill(db.Model):
    id                  # Primary key
    community_id        # FK to Community
    creator_id          # FK to User (who created)
    title               # Bill title
    description         # Details
    amount              # Total due (NGN)
    type                # 'due', 'expense', 'fee'
    min_amount          # Minimum payment accepted
    status              # 'active', 'settled', 'overdue'
    created_at
    updated_at

class BillSession(db.Model):
    id                  # Primary key
    bill_id             # FK to Bill
    user_id             # FK to User (who pays)
    amount              # Amount user paid
    status              # 'pending', 'paid', 'failed'
    created_at
    updated_at
```

---

### 5. Interest Model
**File**: `models/interest.py`

Categorize communities by interest.

```python
class Interest(db.Model):
    id                  # Primary key
    name                # Interest name (e.g., 'Tech', 'Finance')
    slug                # URL slug
    
    # Relationships
    communities         # Community (many-to-many)
```

---

## Database Schema

### Migrations
- **001cleanslate**: Initial schema with communities table
- **002commtables**: Community wallets, interests, bills, bill sessions
- **003commfields**: Added community_id to wallet_transactions
- **004invites**: Added invite fields to communities table

### Key Tables

#### communities
```sql
CREATE TABLE communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    banner_url VARCHAR(500),
    visibility VARCHAR(20) DEFAULT 'public',
    member_cost NUMERIC(15, 2) DEFAULT 0.00,
    
    -- Invite System
    invite_code VARCHAR(16) UNIQUE,
    invite_expires_at TIMESTAMP,
    invite_max_uses INTEGER,
    invite_uses INTEGER DEFAULT 0,
    invite_status VARCHAR(20) DEFAULT 'active',
    
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_communities_name ON communities(name);
CREATE INDEX ix_communities_slug ON communities(slug);
CREATE INDEX ix_invite_code ON communities(invite_code);
```

#### community_members
```sql
CREATE TABLE community_members (
    id SERIAL PRIMARY KEY,
    community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    role VARCHAR(20) DEFAULT 'member',
    contribution NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

CREATE INDEX ix_community_members_community_id ON community_members(community_id);
CREATE INDEX ix_community_members_user_id ON community_members(user_id);
```

#### community_wallets
```sql
CREATE TABLE community_wallets (
    id SERIAL PRIMARY KEY,
    community_id INTEGER UNIQUE REFERENCES communities(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    account_number VARCHAR(50),
    account_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    bell_mfb_client_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Repository Layer

Repositories abstract database access and provide a clean query interface.

### CommunityRepository
**File**: `repositories/community_repository.py`

```python
class CommunityRepository:
    def find_by_id(id)              # Get community by ID
    def find_by_slug(slug)          # Get community by slug
    def find_by_invite_code(code)   # Get community by invite code
    def find_active()               # Get all active communities
    def find_by_creator(user_id)    # Get communities created by user
    def create(data)                # Create new community
    def update(id, data)            # Update community fields
    def delete(id)                  # Soft delete (set status='closed')
    def get_member_count(id)        # Count active members
```

### MemberRepository
**File**: `repositories/member_repository.py`

```python
class MemberRepository:
    def find_member(community_id, user_id)          # Get specific membership
    def find_members(community_id, status=None)     # List community members
    def is_member(community_id, user_id)            # Check membership
    def is_owner(community_id, user_id)             # Check ownership
    def add_member(community_id, user_id, role)     # Add member
    def remove_member(community_id, user_id)        # Remove member
    def update_status(id, status)                   # Change member status
    def update_status_by_community_and_user(...)    # Helper for payment flow
    def update_role(id, role)                       # Change member role
```

### WalletRepository
**File**: `repositories/wallet_repository.py`

```python
class WalletRepository:
    def find_by_community_id(community_id)  # Get wallet for community
    def create(community_id, data)          # Create wallet
    def update_balance(id, amount)          # Adjust balance
    def freeze(id)                          # Freeze wallet
    def unfreeze(id)                        # Unfreeze wallet
```

### BillRepository
**File**: `repositories/bill_repository.py`

```python
class BillRepository:
    def find_by_id(id)
    def find_by_community(community_id)
    def create(data)
    def update(id, data)
    def settle(id)
```

---

## Service Layer

Services contain business logic and orchestration.

### CommunityService
**File**: `services/community_service.py`

Handles community CRUD and administration.

```python
class CommunityService:
    def create_community(user_id, name, description, visibility, member_cost)
        # Create new community, set creator as owner
        
    def update_community(community_id, data, user_id)
        # Update community (owner/admin only)
        
    def delete_community(community_id, user_id)
        # Soft delete (set status='closed')
        
    def get_community(community_id)
        # Fetch with full details (members, wallet, etc.)
        
    def get_communities_paginated(page, limit, visibility='public')
        # List public/private communities
```

---

### MembershipService
**File**: `services/membership_service.py`

Manages community members and roles.

```python
class MembershipService:
    def add_member(community_id, user_id, role='member')
        # Add new member
        
    def remove_member(community_id, user_id)
        # Remove member from community
        
    def update_member_role(community_id, user_id, role)
        # Change role (member → admin or vice versa)
        
    def promote_to_admin(community_id, user_id)
        # Grant admin privileges
        
    def is_member(community_id, user_id)
        # Check if user is member
        
    def is_admin(community_id, user_id)
        # Check if user is admin/owner
        
    def is_admin_or_owner(community_id, user_id)
        # Combined check
        
    def get_members(community_id, status='active')
        # List community members
```

---

### InviteService
**File**: `services/invite_service.py`

Manages invite link lifecycle.

```python
class InviteService:
    def generate_invite(community_id, expires_in_days, max_uses, regenerate=False)
        # Create/refresh invite code
        # Returns: (invite_dict, error_message)
        
    def revoke_invite(community_id)
        # Deactivate invite (status='revoked')
        
    def preview_invite(invite_code)
        # Show community info without joining
        # Validates: code exists, not expired, usage < limit
        
    def redeem_invite(invite_code, user_id)
        # User joins community via invite
        # Returns: (member_dict, error_message)
        # For paid communities: status='pending_payment'
        # For free communities: status='active'
        
    def activate_after_payment(invite_code, user_id)
        # Called by payment webhook after payment succeeds
        # Sets status='active', increments invite_uses
```

---

### WalletService
**File**: `services/wallet_service.py`

Manages community funds.

```python
class WalletService:
    def create_wallet(community_id, account_number, account_name)
        # Create community wallet
        
    def deposit(community_id, amount, transaction_id)
        # Record fund deposit
        
    def withdraw(community_id, amount, reason)
        # Record fund withdrawal
        
    def get_balance(community_id)
        # Get current balance
        
    def freeze_wallet(community_id, reason)
        # Suspend withdrawals
```

---

## API Resources

### Community Resources
**File**: `resources/community_resource.py`

#### Create Community
```http
POST /api/v1/communities
Authorization: Bearer <token>

{
    "name": "Lagos Tech Community",
    "description": "Tech professionals in Lagos",
    "visibility": "private",
    "member_cost": 5000
}

Response: 200 OK
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Lagos Tech Community",
        "slug": "lagos-tech-community",
        "visibility": "private",
        "member_cost": 5000,
        "created_by": 123,
        "status": "active",
        "member_count": 1,
        "created_at": "2026-01-08T12:00:00Z"
    }
}
```

#### Get Community
```http
GET /api/v1/communities/<id>

Response: 200 OK
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Lagos Tech Community",
        "description": "...",
        "visibility": "private",
        "member_cost": 5000,
        "members": [
            {"user_id": 123, "role": "owner", "status": "active"},
            {"user_id": 124, "role": "member", "status": "active"}
        ],
        "wallet": {
            "balance": 15000,
            "status": "active"
        },
        "status": "active"
    }
}
```

#### List Communities
```http
GET /api/v1/communities?page=1&limit=20&visibility=public

Response: 200 OK
{
    "success": true,
    "data": {
        "communities": [...],
        "page": 1,
        "limit": 20,
        "total": 150
    }
}
```

#### Update Community
```http
PUT /api/v1/communities/<id>
Authorization: Bearer <token>

{
    "description": "Updated description",
    "member_cost": 10000
}

Response: 200 OK
```

#### Delete Community
```http
DELETE /api/v1/communities/<id>
Authorization: Bearer <token>

Response: 200 OK
{"success": true, "message": "Community closed"}
```

---

### Member Resources
**File**: `resources/member_resource.py`

#### Add Member
```http
POST /api/v1/communities/<id>/members
Authorization: Bearer <token>

{
    "user_id": 125
}

Response: 200 OK
```

#### Get Members
```http
GET /api/v1/communities/<id>/members

Response: 200 OK
{
    "success": true,
    "data": {
        "members": [
            {
                "user_id": 123,
                "username": "john_doe",
                "role": "owner",
                "status": "active",
                "contribution": 5000,
                "joined_at": "2026-01-01T00:00:00Z"
            }
        ]
    }
}
```

#### Remove Member
```http
DELETE /api/v1/communities/<id>/members/<user_id>
Authorization: Bearer <token>

Response: 200 OK
```

#### Update Member Role
```http
PUT /api/v1/communities/<id>/members/<user_id>/role
Authorization: Bearer <token>

{
    "role": "admin"
}

Response: 200 OK
```

---

### Invite Resources
**File**: `resources/invite_resource.py`

#### Create Invite
```http
POST /api/v1/communities/<id>/invite
Authorization: Bearer <token>

{
    "expires_in_days": 7,
    "max_uses": 100,
    "regenerate": false
}

Response: 200 OK
{
    "success": true,
    "data": {
        "invite_code": "xY9kL2pQ8w",
        "invite_url": "/api/v1/invite/xY9kL2pQ8w",
        "expires_at": "2026-01-15T00:00:00Z",
        "max_uses": 100,
        "uses": 0,
        "status": "active"
    }
}
```

#### Preview Invite
```http
GET /api/v1/invite/<code>

Response: 200 OK
{
    "success": true,
    "data": {
        "community_id": 1,
        "name": "Lagos Tech Community",
        "description": "...",
        "visibility": "private",
        "member_cost": 5000,
        "member_count": 42,
        "invite": {
            "expires_at": "2026-01-15T00:00:00Z",
            "max_uses": 100,
            "uses": 5,
            "status": "active"
        }
    }
}
```

#### Join via Invite
```http
POST /api/v1/invite/<code>/join
Authorization: Bearer <token>

Response: 200 OK
{
    "success": true,
    "data": {
        "community_id": 1,
        "status": "pending_payment",  // or "active" if free
        "payment_required": true,
        "amount": 5000,
        "currency": "NGN"
    }
}
```

#### Revoke Invite
```http
POST /api/v1/communities/<id>/invite/revoke
Authorization: Bearer <token>

Response: 200 OK
{"success": true, "data": {"revoked": true}}
```

---

## Payment Integration

### Flow: User Joins Paid Community

```
1. User calls: POST /api/v1/invite/{code}/join
   Response: {
       "status": "pending_payment",
       "payment_required": true,
       "amount": 5000
   }
   
   ↓ Member created with status='pending_payment'

2. Frontend initiates payment with Paystack/Flutterwave
   Payment amount: 5000 NGN
   
   ↓ Payment processed, webhook received

3. Backend receives webhook: POST /api/v1/payments/webhook
   Verifies signature, finds transaction
   
   ↓ Calls invite_service.activate_after_payment(invite_code, user_id)
   
4. Member status updated to 'active'
   Community member_count incremented
   invite_uses incremented
   
   ✓ User now has full community access
```

### Webhook Handler
**File**: `resources/membership_payment_resource.py` and `resources/community_wallet_resource.py`

```python
@app.route('/api/v1/payments/webhook', methods=['POST'])
def payment_webhook():
    """Process Paystack/Flutterwave webhook"""
    
    # 1. Verify signature
    # 2. Get transaction details
    # 3. Find invite_code and user_id from transaction metadata
    # 4. Call activate_after_payment()
    # 5. Return 200 OK to webhook provider
```

---

## Invite Link System

### Overview
- **One invite code per community** (can regenerate)
- **Invite code format**: 11-character URL-safe string
- **Expiry**: Optional, set when generating
- **Usage limit**: Optional, incremented each redemption
- **Status**: 'active' or 'revoked'

### Invite Lifecycle

```
┌─────────────────────────────────┐
│   Community created             │
│   (no invite code yet)          │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│   Admin calls: create_invite()  │
│   Generates: xY9kL2pQ8w         │
│   Expires: +7 days              │
│   Max uses: 100                 │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│   Invite ACTIVE                 │
│   (can share with users)        │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
   JOIN        REVOKE
   (uses++)     (status='revoked')
      │
      ↓
  ┌─────────────────────────────┐
  │  EXPIRED/LIMIT REACHED      │
  │  (no new joins allowed)     │
  └─────────────────────────────┘
```

### Invite Code Generation
```python
import secrets

def _generate_token(length=11):
    # Generates: xY9kL2pQ8w (11 chars, URL-safe)
    return secrets.token_urlsafe(length)[:length]
```

### Validation Rules
```python
def _validate_invite(community):
    # Must pass all checks:
    if not community:
        return 'Invite not found'
    if community.invite_status != 'active':
        return 'Invite is not active'
    if community.invite_expires_at < datetime.utcnow():
        return 'Invite has expired'
    if community.invite_uses >= community.invite_max_uses:
        return 'Invite usage limit reached'
    if community.status != 'active':
        return 'Community is not active'
```

---

## Usage Examples

### Example 1: Create a Community

```python
from modules.community.services import CommunityService

service = CommunityService()

# Create community
community, error = service.create_community(
    user_id=123,
    name="Lagos Entrepreneurs",
    description="Startup founders in Lagos",
    visibility="private",
    member_cost=10000  # NGN
)

if not error:
    print(f"Created: {community.name} (ID: {community.id})")
```

### Example 2: Generate Invite Link

```python
from modules.community.services.invite_service import InviteService

invite_service = InviteService()

# Generate invite valid for 14 days, max 50 uses
invite, error = invite_service.generate_invite(
    community_id=1,
    expires_in_days=14,
    max_uses=50,
    regenerate=False
)

if not error:
    invite_url = f"https://app.com/join/{invite['invite_code']}"
    print(f"Share this link: {invite_url}")
```

### Example 3: User Joins via Invite

```python
# Scenario: User visits /join/xY9kL2pQ8w

# 1. Preview what they're joining
preview, error = invite_service.preview_invite("xY9kL2pQ8w")
# Returns: community info, member_count, cost, etc.

# 2. User clicks "Join"
member, error = invite_service.redeem_invite("xY9kL2pQ8w", user_id=456)

if not error:
    if member['payment_required']:
        # Initiate payment flow
        return {
            'status': 'pending_payment',
            'amount': 5000,
            'payment_url': '/payments/initiate'
        }
    else:
        # Free community, instant join
        return {'status': 'active'}
```

### Example 4: Process Payment Webhook

```python
# After user pays via Paystack

@app.route('/webhooks/payment', methods=['POST'])
def handle_payment_webhook():
    data = request.get_json()
    
    # Verify signature
    if not verify_paystack_signature(data):
        return {'error': 'Invalid signature'}, 401
    
    # Extract metadata
    invite_code = data['metadata']['invite_code']
    user_id = data['metadata']['user_id']
    amount = data['amount'] / 100  # Convert from kobo
    
    # Activate membership
    success, error = invite_service.activate_after_payment(
        invite_code=invite_code,
        user_id=user_id
    )
    
    if success:
        # Send email: "Welcome to the community!"
        return {'status': 'success'}, 200
```

### Example 5: Manage Community Members

```python
from modules.community.services import MembershipService

membership_service = MembershipService()

# Get all active members
members = membership_service.get_members(community_id=1, status='active')

# Promote member to admin
membership_service.update_member_role(
    community_id=1,
    user_id=456,
    role='admin'
)

# Check if user is owner
is_owner = membership_service.is_admin_or_owner(community_id=1, user_id=123)
```

### Example 6: Manage Community Wallet

```python
from modules.community.services import WalletService

wallet_service = WalletService()

# Create wallet
wallet, error = wallet_service.create_wallet(
    community_id=1,
    account_number="1234567890",
    account_name="Lagos Entrepreneurs Fund"
)

# Get balance
balance = wallet_service.get_balance(community_id=1)
print(f"Community balance: ₦{balance}")

# Record deposit (after member pays dues)
wallet_service.deposit(
    community_id=1,
    amount=5000,
    transaction_id="txn_12345"
)
```

---

## Error Handling

All services return `(data, error)` tuples:

```python
result, error = service.operation()

if error:
    return {'success': False, 'error': error}, 400
else:
    return {'success': True, 'data': result}, 200
```

### Common Errors
- `'Community not found'` — Community ID doesn't exist
- `'Unauthorized'` — User lacks permission
- `'Invite not found'` — Invalid invite code
- `'Invite has expired'` — Expiry time passed
- `'Invite usage limit reached'` — Max uses exceeded
- `'User already member'` — Can't rejoin
- `'Invalid visibility'` — Must be 'public' or 'private'

---

## Testing

Run community module tests:

```bash
# Test all community features
pytest tests/test_community.py -v

# Test invite system
pytest tests/test_invite_service.py -v

# Test membership
pytest tests/test_membership.py -v

# Test payment integration
pytest tests/test_payment_integration.py -v
```

---

## Deployment Checklist

- [ ] Run migrations: `python -m flask db upgrade`
- [ ] Configure Paystack/Flutterwave API keys
- [ ] Set up payment webhook endpoint
- [ ] Configure email service for notifications
- [ ] Test invite flow end-to-end
- [ ] Test payment webhook with test transactions
- [ ] Configure production Redis for sessions
- [ ] Set up logging and monitoring
- [ ] Configure S3/Cloudinary for banner images
- [ ] Load initial interests/categories

---

## Future Enhancements

- [ ] Community roles beyond member/admin/owner (treasurer, secretary, etc.)
- [ ] Bill templates for recurring expenses
- [ ] Automated payment reminders
- [ ] Community activity feed
- [ ] Community chat/messaging
- [ ] Advanced analytics dashboard
- [ ] Expense reconciliation reports
- [ ] Mobile app integration
- [ ] Community verification badges
- [ ] Referral bonuses for invites

---

## Support & Troubleshooting

### Issue: User joined but status is not updating to 'active'
**Solution**: Ensure webhook is configured and payment provider is sending POST requests to `/api/v1/payments/webhook`

### Issue: Invite code not unique
**Solution**: Migration 004invites creates unique constraint. If upgrading, run: `python -m flask db upgrade`

### Issue: Community member_count out of sync
**Solution**: Run: `python scripts/sync_member_counts.py` to recalculate from database

---

## References

- [Community Resources](resources/)
- [Models](models/)
- [Services](services/)
- [Repositories](repositories/)
- [Migrations](../../../flask_migrations/versions/)
- [Database Docs](../../../docs/deployment/DEPLOYMENT.md)

