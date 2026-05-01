"""Verification Marshmallow Schemas"""
from modules.verification.schemas.verification_schema import (
    BVNSchema,
    NINSchema,
    VerificationStatusSchema,
    VerificationResponseSchema,
    TaskStatusResponseSchema,
    VerificationErrorSchema
)

# Backward compatibility alias
ErrorResponseSchema = VerificationErrorSchema

__all__ = [
    'BVNSchema',
    'NINSchema',
    'VerificationStatusSchema',
    'VerificationResponseSchema',
    'TaskStatusResponseSchema',
    'VerificationErrorSchema',
    'ErrorResponseSchema'  # Backward compat
]
