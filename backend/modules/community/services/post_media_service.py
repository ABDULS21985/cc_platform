"""
Community Post Media Service
Business logic for multi-image uploads used by community posts.
"""
import os
from typing import Any, Dict, List, Optional, Tuple

from flask import current_app

from modules.community.providers import get_media_provider


class CommunityPostMediaService:
    """Service for provider-agnostic post image uploads."""

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    DEFAULT_MAX_FILES = 10
    DEFAULT_MAX_FILE_SIZE_MB = 10

    def upload_images(self, files: List[Any], user_id: int) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
        """Validate and upload multiple images for post composition."""
        if not files:
            return None, 'No files uploaded. Use form-data key files with one or more images.'

        max_files = int(current_app.config.get('COMMUNITY_POST_MEDIA_MAX_FILES', self.DEFAULT_MAX_FILES))
        max_size_mb = int(current_app.config.get('COMMUNITY_POST_MEDIA_MAX_FILE_SIZE_MB', self.DEFAULT_MAX_FILE_SIZE_MB))
        max_size_bytes = max_size_mb * 1024 * 1024

        if len(files) > max_files:
            return None, f'You can upload a maximum of {max_files} images per request.'

        validation_error = self._validate_files(files, max_size_bytes, max_size_mb)
        if validation_error:
            return None, validation_error

        provider_name = current_app.config.get('COMMUNITY_MEDIA_PROVIDER', 'cloudinary')
        provider = get_media_provider(provider_name)
        folder = current_app.config.get('CLOUDINARY_UPLOAD_FOLDER', 'community_posts')
        upload_folder = os.path.join(folder, 'posts', str(user_id)).replace('\\', '/')

        try:
            media = provider.upload_images(files, folder=upload_folder)
            return media, None
        except Exception as exc:
            return None, f'Image upload failed: {str(exc)}'

    def _validate_files(self, files: List[Any], max_size_bytes: int, max_size_mb: int) -> Optional[str]:
        for file in files:
            filename = (file.filename or '').strip()
            if not filename:
                return 'One of the uploaded files is missing a filename.'

            if not self._allowed_file(filename):
                allowed = ', '.join(sorted(self.ALLOWED_EXTENSIONS))
                return f'Unsupported file type for {filename}. Allowed extensions: {allowed}.'

            content_type = (getattr(file, 'mimetype', '') or '').lower()
            if content_type and not content_type.startswith('image/'):
                return f'Invalid content type for {filename}. Only images are allowed.'

            size = self._get_file_size(file)
            if size > max_size_bytes:
                return f'{filename} is too large. Maximum allowed size is {max_size_mb}MB.'

        return None

    def _allowed_file(self, filename: str) -> bool:
        if '.' not in filename:
            return False
        extension = filename.rsplit('.', 1)[1].lower()
        return extension in self.ALLOWED_EXTENSIONS

    def _get_file_size(self, file: Any) -> int:
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size
