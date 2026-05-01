"""
Image Upload Utility - Cloudinary upload helper

Single Responsibility: Handle image uploads to Cloudinary
"""
import logging
from typing import Tuple, Optional
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Max file size (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_image(file: FileStorage) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded image file.
    
    Args:
        file: Uploaded file from request.files
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    if not allowed_file(file.filename):
        return False, f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check file size (read and seek back)
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Seek back to start
    
    if size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
    
    return True, None


def upload_to_cloudinary(
    file: FileStorage,
    folder: str = "profile_images",
    public_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """
    Upload image to Cloudinary.
    
    Args:
        file: Uploaded file from request.files
        folder: Cloudinary folder to upload to
        public_id: Optional custom public ID for the image
        
    Returns:
        Tuple of (image_url, error_message)
    """
    try:
        from cloudinary import uploader
        
        # Validate file first
        is_valid, error = validate_image(file)
        if not is_valid:
            return None, error
        
        # Upload options
        upload_options = {
            "folder": folder,
            "resource_type": "image",
            "overwrite": True,
            "transformation": [
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ]
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        # Upload to Cloudinary
        result = uploader.upload(file, **upload_options)
        
        image_url = result.get("secure_url")
        
        if not image_url:
            return None, "Upload succeeded but no URL returned"
        
        logger.info(f"Image uploaded to Cloudinary: {image_url}")
        return image_url, None
        
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}", exc_info=True)
        return None, f"Upload failed: {str(e)}"


def delete_from_cloudinary(public_id: str) -> bool:
    """
    Delete image from Cloudinary.
    
    Args:
        public_id: Cloudinary public ID of the image
        
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        from cloudinary import uploader
        
        result = uploader.destroy(public_id)
        
        if result.get("result") == "ok":
            logger.info(f"Image deleted from Cloudinary: {public_id}")
            return True
        
        logger.warning(f"Failed to delete image from Cloudinary: {result}")
        return False
        
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}", exc_info=True)
        return False
