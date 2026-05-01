"""
Auth V2 Resources - Flask-Smorest MethodView endpoints

RESTful resources using Flask-Smorest for:
- Automatic OpenAPI documentation
- Schema-based validation and serialization
- Class-based views (like Django REST ViewSets)
"""
from modules.auth_v2.resources.profile_resource import profile_blp
from modules.auth_v2.resources.auth_resource import auth_blp

__all__ = [
    "profile_blp",
    "auth_blp",
]
