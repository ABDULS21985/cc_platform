"""
Cloudinary Media Provider
Community post image upload implementation using Cloudinary.
"""
import logging
from typing import Any, Dict, List

from cloudinary import uploader

from modules.community.providers.media_provider import MediaProvider

logger = logging.getLogger(__name__)


class CloudinaryMediaProvider(MediaProvider):
    """Cloudinary-backed media provider."""

    def upload_images(self, files: List[Any], folder: str) -> List[Dict[str, Any]]:
        uploaded: List[Dict[str, Any]] = []
        for file in files:
            result = uploader.upload(
                file,
                folder=folder,
                resource_type='image',
                overwrite=False,
                transformation=[
                    {'quality': 'auto:good'},
                    {'fetch_format': 'auto'},
                ],
            )

            uploaded.append(
                {
                    'provider': 'cloudinary',
                    'asset_id': result.get('public_id'),
                    'url': result.get('secure_url'),
                    'width': result.get('width'),
                    'height': result.get('height'),
                    'format': result.get('format'),
                    'bytes': result.get('bytes'),
                    'original_filename': file.filename,
                }
            )

        return uploaded

    def delete_asset(self, asset_id: str) -> bool:
        try:
            result = uploader.destroy(asset_id)
            return result.get('result') == 'ok'
        except Exception:
            logger.exception('Failed to delete Cloudinary asset %s', asset_id)
            return False
