"""Community providers package."""
from modules.community.providers.cloudinary_media_provider import CloudinaryMediaProvider
from modules.community.providers.media_provider import MediaProvider


def get_media_provider(provider_name: str) -> MediaProvider:
    """Resolve configured media provider."""
    name = (provider_name or 'cloudinary').strip().lower()
    if name == 'cloudinary':
        return CloudinaryMediaProvider()
    raise ValueError(f"Unsupported community media provider: {provider_name}")


__all__ = ['MediaProvider', 'CloudinaryMediaProvider', 'get_media_provider']
