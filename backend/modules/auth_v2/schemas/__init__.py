"""
Auth V2 Schemas - Marshmallow serialization schemas

Replaces Pydantic validators for input AND output serialization.
"""
from modules.auth_v2.schemas.user_schema import (
    UserSchema,
    UserSummarySchema,
)
from modules.auth_v2.schemas.profile_schema import (
    ProfileSchema,
    ProfileUpdateSchema,
)
from modules.auth_v2.schemas.password_schema import (
    ChangePasswordSchema,
)
from modules.auth_v2.schemas.auth_schema import (
    SignupSchema,
    LoginSchema,
    VerifyOTPSchema,
    ResendOTPSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    AuthSuccessSchema,
    AuthErrorSchema,
    HealthSchema,
)

__all__ = [
    # User
    "UserSchema",
    "UserSummarySchema",
    # Profile
    "ProfileSchema",
    "ProfileUpdateSchema",
    # Password
    "ChangePasswordSchema",
    # Auth
    "SignupSchema",
    "LoginSchema",
    "VerifyOTPSchema",
    "ResendOTPSchema",
    "ForgotPasswordSchema",
    "ResetPasswordSchema",
    "AuthSuccessSchema",
    "AuthErrorSchema",
    "HealthSchema",
]
