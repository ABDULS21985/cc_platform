"""
Profile Resource - RESTful profile endpoints using Flask-Smorest

Replaces profile_route.py with:
- MethodView classes (like Django REST ViewSets)
- Automatic schema validation with @blp.arguments()
- Automatic response serialization with @blp.response()
- Auto-generated OpenAPI documentation
"""
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_login import login_required, current_user
import logging

from modules.auth_v2.schemas.profile_schema import ProfileSchema, ProfileUpdateSchema, ProfileEnvelopeSchema
from modules.auth_v2.schemas.password_schema import ChangePasswordSchema
from modules.auth_v2.services.profile_service import ProfileService
from modules.auth_v2.schemas.auth_schema import ApiErrorEnvelopeSchema, ApiSuccessEnvelopeSchema
from modules.core.response_formatter import format_data, format_error, format_internal_error

logger = logging.getLogger(__name__)

# Create blueprint with Flask-Smorest
profile_blp = Blueprint(
    'profile_v2',
    __name__,
    url_prefix='/api/v2/user',
    description='User Profile Operations'
)

# Service instance
profile_service = ProfileService()


@profile_blp.route('/profile')
class ProfileResource(MethodView):
    """
    Profile resource for get and update operations.
    
    GET /api/v2/user/profile - Get current user's profile
    PATCH /api/v2/user/profile - Update current user's profile
    """
    
    decorators = [login_required]
    
    @profile_blp.response(200, ProfileEnvelopeSchema)
    @profile_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @profile_blp.doc(
        summary='Get User Profile',
        description="Get the authenticated user's profile information"
    )
    def get(self):
        """Get current user's profile."""
        try:
            result, status_code = profile_service.get_profile(current_user.id)
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "profile_get_failed"),
                    message=result.get("message", "Failed to get profile"),
                    status_code=status_code,
                )
                return response, status
            
            data = (result or {}).get("data", {})
            response, status = format_data(data=data, message=(result or {}).get("message", "Profile retrieved"), status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error getting profile: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status
    
    @profile_blp.arguments(ProfileUpdateSchema)
    @profile_blp.response(200, ProfileEnvelopeSchema)
    @profile_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    @profile_blp.doc(
        summary='Update User Profile',
        description="Update the authenticated user's profile. All fields are optional."
    )
    def patch(self, update_data):
        """Update current user's profile."""
        try:
            # Filter out None values (only update provided fields)
            filtered_data = {k: v for k, v in update_data.items() if v is not None}
            
            if not filtered_data:
                response, status = format_error(error="no_changes", message="No fields to update", status_code=400)
                return response, status
            
            result, status_code = profile_service.update_profile(
                current_user.id,
                filtered_data
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "profile_update_failed"),
                    message=result.get("message", "Failed to update profile"),
                    status_code=status_code,
                )
                return response, status
            
            data = (result or {}).get("data", {})
            response, status = format_data(data=data, message=(result or {}).get("message", "Profile updated"), status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error updating profile: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@profile_blp.route('/profile/upload-image')
class ProfileImageResource(MethodView):
    """
    Profile image upload resource.
    
    POST /api/v2/user/profile/upload-image - Upload profile photo
    """
    
    decorators = [login_required]
    
    @profile_blp.doc(
        summary='Upload Profile Image',
        description='Upload a profile photo. Accepts image files (png, jpg, jpeg, gif, webp). Max size 5MB.',
        consumes=['multipart/form-data']
    )
    @profile_blp.response(200, ProfileEnvelopeSchema)
    @profile_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    def post(self):
        """Upload profile image."""
        try:
            if 'image' not in request.files:
                response, status = format_error(error="missing_file", message="No image file provided", status_code=400)
                return response, status
            
            file = request.files['image']
            
            result, status_code = profile_service.upload_profile_image(
                current_user.id,
                file
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "upload_failed"),
                    message=result.get("message", "Failed to upload image"),
                    status_code=status_code,
                )
                return response, status
            
            data = (result or {}).get("data", {})
            response, status = format_data(data=data, message=(result or {}).get("message", "Image uploaded"), status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error uploading profile image: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@profile_blp.route('/profile/upload-header')
class HeaderImageResource(MethodView):
    """
    Header image upload resource.
    
    POST /api/v2/user/profile/upload-header - Upload header/cover image
    """
    
    decorators = [login_required]
    
    @profile_blp.doc(
        summary='Upload Header Image',
        description='Upload a header/cover image. Accepts image files (png, jpg, jpeg, gif, webp). Max size 5MB.',
        consumes=['multipart/form-data']
    )
    @profile_blp.response(200, ProfileEnvelopeSchema)
    @profile_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    def post(self):
        """Upload header image."""
        try:
            if 'image' not in request.files:
                response, status = format_error(error="missing_file", message="No image file provided", status_code=400)
                return response, status
            
            file = request.files['image']
            
            result, status_code = profile_service.upload_header_image(
                current_user.id,
                file
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "upload_failed"),
                    message=result.get("message", "Failed to upload image"),
                    status_code=status_code,
                )
                return response, status
            
            data = (result or {}).get("data", {})
            response, status = format_data(data=data, message=(result or {}).get("message", "Header uploaded"), status_code=200)
            return response, status
            
        except Exception as e:
            logger.error(f"Error uploading header image: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status


@profile_blp.route('/change-password')
class ChangePasswordResource(MethodView):
    """
    Change password resource.
    
    POST /api/v2/user/change-password - Change user password
    """
    
    decorators = [login_required]
    
    @profile_blp.arguments(ChangePasswordSchema)
    @profile_blp.doc(
        summary='Change Password',
        description='Change the authenticated user\'s password. Requires current password.'
    )
    @profile_blp.response(200, ApiSuccessEnvelopeSchema)
    @profile_blp.alt_response(400, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(401, schema=ApiErrorEnvelopeSchema)
    @profile_blp.alt_response(500, schema=ApiErrorEnvelopeSchema)
    def post(self, password_data):
        """Change user password."""
        try:
            result, status_code = profile_service.change_password(
                current_user.id,
                password_data
            )
            
            if status_code >= 400:
                response, status = format_error(
                    error=result.get("error", "change_password_failed"),
                    message=result.get("message", "Failed to change password"),
                    status_code=status_code,
                )
                return response, status
            
            payload = dict(result or {})
            payload.pop("success", None)
            message = payload.pop("message", "Password changed")
            response, status = format_data(data=payload, message=message, status_code=status_code)
            return response, status
            
        except Exception as e:
            logger.error(f"Error changing password: {e}", exc_info=True)
            response, status = format_internal_error()
            return response, status
