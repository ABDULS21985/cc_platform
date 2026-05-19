"""
Auth Resource - RESTful authentication endpoints using Flask-Smorest

Replaces individual auth route files with unified MethodView classes:
- SignupResource: User registration
- LoginResource: User authentication  
- VerifyEmailResource: Email verification with OTP
- VerifyLoginOTPResource: Login OTP verification
- LogoutResource: Session termination
- HealthResource: API health check
"""
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_login import login_required, current_user
from werkzeug.exceptions import HTTPException
import logging

from modules.auth_v2.schemas.auth_schema import (
    SignupSchema,
    LoginSchema,
    VerifyOTPSchema,
    ResendOTPSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ApiSuccessEnvelopeSchema,
    ApiErrorEnvelopeSchema,
)
from modules.auth_v2.schemas.user_schema import UserSchema
from modules.auth_v2.services.signup_service import SignupService
from modules.auth_v2.services.login_service import LoginService
from modules.auth_v2.services.verify_email_service import VerifyEmailService
from modules.auth_v2.services.logout_service import LogoutService
from modules.auth_v2.services.forgot_password_service import ForgotPasswordService
from modules.core.response_formatter import format_data, format_error, format_internal_error
from modules.verification.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

# Create blueprint with Flask-Smorest
auth_blp = Blueprint(
    'auth_v2',
    __name__,
    url_prefix='/api/v2/auth',
    description='Authentication Operations'
)

# Service instances
signup_service = SignupService()
login_service = LoginService()
verify_email_service = VerifyEmailService()
logout_service = LogoutService()
forgot_password_service = ForgotPasswordService()


@auth_blp.route('/health')
class HealthResource(MethodView):
    """
    Health check resource.
    
    GET /api/v2/auth/health - Check if API is running
    """
    
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.doc(
        summary='Health Check',
        description='Check if Auth V2 API is running'
    )
    def get(self):
        """Health check endpoint."""
        response, status = format_data(
            data={
                "status": "healthy",
                "service": "Auth V2",
                "version": "2.0.0",
            },
            message="OK",
            status_code=200,
        )
        return response, status


@auth_blp.route('/signup')
class SignupResource(MethodView):
    """
    User registration resource.
    
    POST /api/v2/auth/signup - Register a new user
    """
    
    @rate_limit(max_requests=5, window_minutes=60, key_prefix="auth_signup")
    @auth_blp.arguments(SignupSchema)
    @auth_blp.response(201, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(409, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='User Signup',
        description='Register a new user with name, phone number, and password.'
    )
    def post(self, signup_data):
        """User signup endpoint."""
        try:
            result, status_code = signup_service.signup(signup_data)
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "signup_failed"),
                    message=result.get("message", "Signup failed"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Signup successful")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during signup: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/login')
class LoginResource(MethodView):
    """
    User login resource.
    
    POST /api/v2/auth/login - Authenticate user
    """
    
    @rate_limit(max_requests=10, window_minutes=5, key_prefix="auth_login")
    @auth_blp.arguments(LoginSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(403, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='User Login',
        description='Authenticate user with email or phone number and password.'
    )
    def post(self, login_data):
        """User login endpoint."""
        try:
            result, status_code = login_service.login(
                login_data['identifier'],
                login_data['password'],
                login_data.get('remember', False)
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "login_failed"),
                    message=result.get("message", "Login failed"),
                    status_code=status_code,
                )
                # preserve any service-provided hints (e.g. requires_otp)
                for k in ("requires_otp", "otp_sent"):
                    if k in (result or {}):
                        response[k] = result[k]
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Login successful")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            # Re-raise HTTP exceptions (including abort()) - don't mask them
            raise
        except Exception as e:
            logger.error(f"Error during login: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/verify-email')
class VerifyEmailResource(MethodView):
    """
    Email verification resource.
    
    POST /api/v2/auth/verify-email - Verify email with OTP
    """
    
    @rate_limit(max_requests=10, window_minutes=10, key_prefix="auth_verify_email")
    @auth_blp.arguments(VerifyOTPSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='Verify Email',
        description='Verify email address using OTP sent during signup'
    )
    def post(self, verify_data):
        """Verify email with OTP endpoint."""
        try:
            result, status_code = verify_email_service.verify_email(
                verify_data['email'],
                verify_data['otp']
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "verification_failed"),
                    message=result.get("message", "Verification failed"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Email verified")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during email verification: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/resend-otp')
class ResendOTPResource(MethodView):
    """
    Resend OTP resource.
    
    POST /api/v2/auth/resend-otp - Resend verification OTP
    """
    
    @rate_limit(max_requests=5, window_minutes=60, key_prefix="auth_resend_otp")
    @auth_blp.arguments(ResendOTPSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='Resend OTP',
        description='Resend email verification OTP'
    )
    def post(self, resend_data):
        """Resend verification OTP endpoint."""
        try:
            result, status_code = verify_email_service.resend_otp(
                resend_data['email']
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "resend_otp_failed"),
                    message=result.get("message", "Failed to resend OTP"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "OTP resent")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error resending OTP: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/verify-login-otp')
class VerifyLoginOTPResource(MethodView):
    """
    Login OTP verification resource.
    
    POST /api/v2/auth/verify-login-otp - Verify login OTP and create session
    """
    
    @rate_limit(max_requests=10, window_minutes=10, key_prefix="auth_verify_login_otp")
    @auth_blp.arguments(VerifyOTPSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='Verify Login OTP',
        description='Verify login OTP and create user session'
    )
    def post(self, verify_data):
        """Verify login OTP endpoint."""
        try:
            result, status_code = login_service.verify_login_otp(
                verify_data['email'],
                verify_data['otp'],
                verify_data.get('remember', False)
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "otp_verification_failed"),
                    message=result.get("message", "OTP verification failed"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "OTP verified")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during login OTP verification: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/logout')
class LogoutResource(MethodView):
    """
    User logout resource.
    
    POST /api/v2/auth/logout - Log out current user
    """
    
    decorators = [login_required]
    
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='User Logout',
        description='Log out current user and destroy session'
    )
    def post(self):
        """User logout endpoint."""
        try:
            result, status_code = logout_service.logout()
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "logout_failed"),
                    message=result.get("message", "Logout failed"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Logged out")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during logout: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/forgot-password')
class ForgotPasswordResource(MethodView):
    """
    Forgot password resource.

    POST /api/v2/auth/forgot-password - Request password reset OTP
    """

    @rate_limit(max_requests=5, window_minutes=60, key_prefix="auth_forgot_password")
    @auth_blp.arguments(ForgotPasswordSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='Forgot Password',
        description='Request a password reset OTP. Response is generic to prevent email enumeration.'
    )
    def post(self, data):
        try:
            result, status_code = forgot_password_service.request_reset(data['email'])
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "forgot_password_failed"),
                    message=result.get("message", "Request failed"),
                    status_code=status_code,
                )
                return response, status
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Request received")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during forgot password: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@auth_blp.route('/reset-password')
class ResetPasswordResource(MethodView):
    """
    Reset password resource.

    POST /api/v2/auth/reset-password - Confirm reset with OTP + new password
    """

    @rate_limit(max_requests=10, window_minutes=10, key_prefix="auth_reset_password")
    @auth_blp.arguments(ResetPasswordSchema)
    @auth_blp.response(200, ApiSuccessEnvelopeSchema)
    @auth_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(429, schema=ApiErrorEnvelopeSchema)
    @auth_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @auth_blp.doc(
        summary='Reset Password',
        description='Verify OTP and set a new password.'
    )
    def post(self, data):
        try:
            result, status_code = forgot_password_service.confirm_reset(
                data['email'],
                data['otp'],
                data['new_password'],
            )
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "reset_password_failed"),
                    message=result.get("message", "Reset failed"),
                    status_code=status_code,
                )
                return response, status
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Password reset")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during password reset: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status
