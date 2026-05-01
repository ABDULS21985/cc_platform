"""Verification Resources - Flask-Smorest MethodView endpoints"""
from modules.verification.resources.verification_resource import (
    verification_blp,
    BVNVerificationResource,
    NINVerificationResource,
    VerificationStatusResource,
    TaskStatusResource
)

__all__ = [
    'verification_blp',
    'BVNVerificationResource',
    'NINVerificationResource',
    'VerificationStatusResource',
    'TaskStatusResource'
]
