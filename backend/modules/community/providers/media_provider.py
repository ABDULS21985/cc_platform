"""
Media Provider Interface
Provider-agnostic contract for community post media operations.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List


class MediaProvider(ABC):
    """Abstract media storage provider interface."""

    @abstractmethod
    def upload_images(self, files: List[Any], folder: str) -> List[Dict[str, Any]]:
        """Upload multiple image files and return normalized metadata payload."""

    @abstractmethod
    def delete_asset(self, asset_id: str) -> bool:
        """Delete an uploaded media asset by provider-specific identifier."""
