"""Event media upload service."""
import os
from typing import Any, Dict, Optional, Tuple

from flask import current_app

from modules.community.providers import get_media_provider
from modules.community.services.post_media_service import CommunityPostMediaService


class EventMediaService:
    """Provider-agnostic upload path for event cover images."""

    def upload_cover(self, file: Any, user_id: int) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        if file is None:
            return None, 'No file uploaded. Use form-data key file.'

        validator = CommunityPostMediaService()
        max_size_mb = int(current_app.config.get('EVENT_COVER_MAX_FILE_SIZE_MB', 10))
        validation_error = validator._validate_files([file], max_size_mb * 1024 * 1024, max_size_mb)
        if validation_error:
            return None, validation_error

        provider_name = current_app.config.get('COMMUNITY_MEDIA_PROVIDER', 'cloudinary')
        provider = get_media_provider(provider_name)
        folder = current_app.config.get('CLOUDINARY_UPLOAD_FOLDER', 'community_posts')
        upload_folder = os.path.join(folder, 'events', str(user_id)).replace('\\', '/')

        try:
            media = provider.upload_images([file], folder=upload_folder)
            return media[0] if media else None, None
        except Exception as exc:
            return None, f'Image upload failed: {str(exc)}'
