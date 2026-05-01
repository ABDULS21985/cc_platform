# Auth V2 - Clean Architecture

## 🎯 What Changed?

We restructured the auth module from **1700+ lines of spaghetti** into a clean, layered architecture.

## 📁 Structure

```
auth_v2/
├── resources/       # HTTP resources and OpenAPI docs
│   ├── auth_resource.py
│   └── profile_resource.py
├── schemas/         # Request/response validation and serialization
│   ├── auth_schema.py
│   └── user_schema.py
├── services/        # Business logic
│   ├── signup_service.py
│   ├── login_service.py
│   ├── verify_email_service.py
│   ├── logout_service.py
│   ├── token_service.py
│   └── password_service.py
├── repositories/    # Database access
│   └── user_repository.py
├── utils/           # Auth-specific helpers
├── email_templates/ # Module-owned email assets
└── models/          # Domain models
  └── user.py
```

## 🧭 Active Rule

- Active auth work belongs only in `modules/auth_v2/`.
- Root `routes/` is legacy and should not receive new auth work.
- The active flow is `resource -> schema -> service -> repository -> model`.

## ✅ Benefits

### Before (Old Code)
```python
# 1731 lines in one file 😱
# Database, email, Firebase, validation all mixed together
# Impossible to test
# Duplicate code everywhere
```

### After (New Code)
```python
# Each file < 200 lines ✨
# Clear separation of concerns
# Easy to test (mock each layer)
# Reusable components
```

## 🚀 New Endpoints

**Base URL**: `/api/v2/auth`

### Signup
```bash
POST /api/v2/auth/signup
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-01-01",
  "password": "SecurePass123!",
  "phone_number": "+1234567890"
}
```

### Login
```bash
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Health Check
```bash
GET /api/v2/auth/health
```

## 🧪 Testing

```bash
# Test signup
curl -X POST http://localhost:8080/api/v2/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "date_of_birth": "1990-01-01",
    "password": "SecurePass123!"
  }'

# Test login
curl -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## 📊 Comparison

| Metric | Old (auth/manual_auth.py) | New (auth_v2/) |
|--------|---------------------------|----------------|
| Lines of code | 1731 | ~600 (split across files) |
| Files | 1 monolith | 11 focused files |
| Testability | Hard | Easy |
| Maintainability | Low | High |
| Duplication | High | Low |
| Separation | None | Clear layers |

## 🔄 Migration Strategy

1. **Both versions run side-by-side**
   - Old: `/api/auth/*` (still works)
   - New: `/api/v2/auth/*` (new clean version)

2. **Test new version thoroughly**
   - All tests pass
   - No regressions

3. **Switch traffic gradually**
   - Start with 10% to v2
   - Monitor errors
   - Increase to 100%

4. **Delete old code**
   - Once confident, remove auth/ folder
   - Rename auth_v2/ to auth/

## 🎓 Code Examples

### Resource (resources/auth_resource.py)
```python
@auth_blp.route('/signup')
class SignupResource(MethodView):
  @auth_blp.arguments(SignupSchema)
  @auth_blp.response(201, AuthSuccessSchema)
  def post(self, signup_data):
    result, status_code = signup_service.signup(signup_data)
    return result, status_code
```

### Service (services/auth_service.py)
```python
def signup(self, user_data):
    # Check if exists
    if self.user_repo.find_by_email(user_data['email']):
        return {"error": "Email exists"}, 409
    
    # Hash password
    password_hash = self.password_service.hash_password(user_data['password'])
    
    # Create user
    user_id = self.user_repo.create_user({...})
    
    return {"user_id": user_id}, 201
```

### Repository (repositories/user_repository.py)
```python
def create_user(user_data):
  user = User(**user_data)
  db.session.add(user)
  db.session.commit()
  return user
```

## 🚧 What's Next?

- [ ] Add OTP service
- [ ] Add email integration
- [ ] Add Firebase integration
- [ ] Add Typesense sync
- [ ] Migrate more endpoints (forgot password, etc.)
- [ ] Add comprehensive tests
- [ ] Performance benchmarks

## 💡 Why This Matters

**Before**: Finding a bug meant searching through 1700 lines  
**After**: Finding a bug? Check the specific layer (resource/schema/service/repository)

**Before**: Testing required full database + email setup  
**After**: Mock each layer independently

**Before**: Duplicate code in 4 auth files  
**After**: One repository, one service, reused everywhere

This is how professional backend code should look. 🎯
