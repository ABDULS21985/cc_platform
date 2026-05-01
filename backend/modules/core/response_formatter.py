"""
Global Response Formatter - Unified API Response Structure

Single Responsibility: Standardize all API responses across all modules

This module provides helpers to format consistent responses for:
- Success responses with data
- Error responses with error codes
- Validation errors with field-level details
- Paginated responses

All responses follow this structure:
{
    "success": boolean,
    "message": string (optional),
    "error": string (optional, error code only),
    "data": object (optional),
    "errors": object (optional, field errors),
    "pagination": object (optional)
}
"""

from typing import Dict, List, Any, Optional, Tuple
from pydantic import ValidationError


def format_success(
    message: str = "Success",
    status_code: int = 200,
    **data
) -> Tuple[Dict[str, Any], int]:
    """
    Format success response
    
    Args:
        message: Success message
        status_code: HTTP status code (default: 200)
        **data: Additional data to include in response
        
    Returns:
        Tuple of (response_dict, status_code)
        
    Example:
        response, status = format_success(
            message="User created successfully",
            status_code=201,
            user_id=123,
            email="user@example.com"
        )
    """
    response = {
        "success": True,
        "message": message
    }
    
    # Add any data fields
    if data:
        response.update(data)
    
    return response, status_code


def format_data(
    data: Any,
    message: str = "Success",
    status_code: int = 200,
) -> Tuple[Dict[str, Any], int]:
    """
    Format response with data object
    
    Args:
        data: Data object to return
        message: Success message
        status_code: HTTP status code
        
    Returns:
        Tuple of (response_dict, status_code)
        
    Example:
        response, status = format_data(
            data=wallet_dict,
            message="Wallet retrieved successfully",
            status_code=200
        )
    """
    return {
        "success": True,
        "message": message,
        "data": data
    }, status_code


def format_error(
    error: str,
    message: str = None,
    status_code: int = 400,
    **extra
) -> Tuple[Dict[str, Any], int]:
    """
    Format error response
    
    Args:
        error: Error code/type (e.g., 'validation_failed', 'not_found')
        message: User-friendly error message
        status_code: HTTP status code
        **extra: Additional fields to include
        
    Returns:
        Tuple of (response_dict, status_code)
        
    Example:
        response, status = format_error(
            error="invalid_credentials",
            message="Email or password is incorrect",
            status_code=401
        )
    """
    response = {
        "success": False,
        "error": error,
        "message": message or error.replace("_", " ").title()
    }
    
    # Add any extra fields
    response.update(extra)
    
    return response, status_code


def format_validation_error(
    validation_error: ValidationError,
    message: str = "Validation failed. Please check the following fields:"
) -> Tuple[Dict[str, Any], int]:
    """
    Format Pydantic validation error into frontend-friendly format
    
    Args:
        validation_error: Pydantic ValidationError
        message: Custom error message
        
    Returns:
        Tuple of (response_dict, 400)
        
    Example:
        try:
            data = UserValidator(**request.json)
        except ValidationError as e:
            return jsonify(*format_validation_error(e)), 400
    """
    errors_dict = {}
    
    for err in validation_error.errors():
        # Get field name (handle nested fields)
        field = str(err['loc'][-1]) if err['loc'] else 'unknown'
        
        # Get human-readable message
        msg = err['msg']
        
        # Customize messages for better UX
        if err['type'] == 'missing':
            msg = f"{field.replace('_', ' ').title()} is required"
        elif err['type'] == 'string_too_short':
            min_length = err.get('ctx', {}).get('min_length', 'required')
            msg = f"{field.replace('_', ' ').title()} must be at least {min_length} characters"
        elif err['type'] == 'string_too_long':
            max_length = err.get('ctx', {}).get('max_length', 'limited')
            msg = f"{field.replace('_', ' ').title()} cannot exceed {max_length} characters"
        elif err['type'] == 'value_error':
            msg = f"Invalid {field.replace('_', ' ')}"
        
        errors_dict[field] = msg
    
    return {
        "success": False,
        "error": "validation_failed",
        "message": message,
        "errors": errors_dict
    }, 400


def format_paginated(
    items: List[Any],
    total: int,
    page: int,
    per_page: int,
    message: str = "Data retrieved successfully",
    status_code: int = 200,
) -> Tuple[Dict[str, Any], int]:
    """
    Format paginated response
    
    Args:
        items: List of items on current page
        total: Total number of items
        page: Current page number (1-indexed)
        per_page: Items per page
        message: Success message
        status_code: HTTP status code
        
    Returns:
        Tuple of (response_dict, status_code)
        
    Example:
        response, status = format_paginated(
            items=users,
            total=100,
            page=1,
            per_page=20,
            message="Users retrieved successfully"
        )
    """
    total_pages = (total + per_page - 1) // per_page  # Ceiling division
    
    return {
        "success": True,
        "message": message,
        "data": items,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }, status_code


def format_not_found(
    resource: str = "Resource",
    status_code: int = 404
) -> Tuple[Dict[str, Any], int]:
    """
    Format not found error
    
    Args:
        resource: Resource name (e.g., 'User', 'Wallet')
        status_code: HTTP status code (default: 404)
        
    Returns:
        Tuple of (response_dict, status_code)
        
    Example:
        if not user:
            return jsonify(*format_not_found("User")), 404
    """
    return format_error(
        error="not_found",
        message=f"{resource} not found",
        status_code=status_code
    )


def format_unauthorized(
    message: str = "Unauthorized access"
) -> Tuple[Dict[str, Any], int]:
    """
    Format unauthorized error (401)
    
    Args:
        message: Error message
        
    Returns:
        Tuple of (response_dict, 401)
    """
    return format_error(
        error="unauthorized",
        message=message,
        status_code=401
    )


def format_forbidden(
    message: str = "Access forbidden"
) -> Tuple[Dict[str, Any], int]:
    """
    Format forbidden error (403)
    
    Args:
        message: Error message
        
    Returns:
        Tuple of (response_dict, 403)
    """
    return format_error(
        error="forbidden",
        message=message,
        status_code=403
    )


def format_conflict(
    message: str = "Resource already exists"
) -> Tuple[Dict[str, Any], int]:
    """
    Format conflict error (409)
    
    Args:
        message: Error message
        
    Returns:
        Tuple of (response_dict, 409)
    """
    return format_error(
        error="conflict",
        message=message,
        status_code=409
    )


def format_internal_error(
    message: str = "An unexpected error occurred. Please try again.",
    details: str = None
) -> Tuple[Dict[str, Any], int]:
    """
    Format internal server error (500)
    
    Args:
        message: User-friendly error message
        details: Technical details (optional, for debugging)
        
    Returns:
        Tuple of (response_dict, 500)
    """
    response = {
        "success": False,
        "error": "internal_server_error",
        "message": message
    }
    
    if details:
        response["details"] = details
    
    return response, 500
