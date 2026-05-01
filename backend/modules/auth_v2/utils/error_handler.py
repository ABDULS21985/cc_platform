"""
Error Handler - Wrapper around global response formatter for backward compatibility

Single Responsibility: Maintain backward compatibility with existing auth_v2 code
"""

from modules.core.response_formatter import (
    format_validation_error as _format_validation_error,
    format_success,
    format_error
)


def format_validation_error(error):
    """
    Format Pydantic ValidationError - wrapper around global formatter
    
    Returns only the dict (not tuple) for backward compatibility
    """
    result, _ = _format_validation_error(error)
    return result


def format_error_response(error: str, message: str = None, status_code: int = 400, **extra):
    """
    Format error response - wrapper around global formatter
    
    Returns tuple of (dict, status_code) for backward compatibility
    """
    return format_error(error=error, message=message, status_code=status_code, **extra)


def format_success_response(message: str, status_code: int = 200, **data):
    """
    Format success response - wrapper around global formatter
    
    Returns tuple of (dict, status_code) for backward compatibility
    """
    return format_success(message=message, status_code=status_code, **data)
