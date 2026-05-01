"""
Slug Utilities
Functions for generating URL-friendly slugs.
"""
import re
import uuid


def generate_slug(name: str, unique_suffix: bool = True) -> str:
    """
    Generate a URL-friendly slug from a name.
    
    Args:
        name: The name to convert to a slug
        unique_suffix: Whether to add a unique suffix (default: True)
        
    Returns:
        URL-friendly slug string
        
    Examples:
        >>> generate_slug("Lagos Tech Community")
        'lagos-tech-community-a1b2c3'
        >>> generate_slug("Lagos Tech Community", unique_suffix=False)
        'lagos-tech-community'
    """
    if not name:
        raise ValueError("Name cannot be empty")
    
    # Convert to lowercase and replace non-alphanumeric with hyphens
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    
    if unique_suffix:
        # Add short unique suffix to ensure uniqueness
        suffix = uuid.uuid4().hex[:6]
        return f"{base_slug}-{suffix}"
    
    return base_slug


def normalize_slug(slug: str) -> str:
    """
    Normalize an existing slug (clean up, lowercase).
    
    Args:
        slug: The slug to normalize
        
    Returns:
        Normalized slug string
    """
    if not slug:
        raise ValueError("Slug cannot be empty")
    
    return re.sub(r'[^a-z0-9-]+', '-', slug.lower()).strip('-')
