"""
Institution Resource
Flask-Smorest endpoints for institution management.
"""
from flask.views import MethodView
from flask_smorest import Blueprint
import logging

from modules.auth_v2.utils.decorators import token_required
from modules.community.schemas.hierarchy_schema import (
    PaginationSchema,
    CreateInstitutionSchema,
    InstitutionResponseSchema,
    InstitutionListResponseSchema,
    HierarchyErrorSchema,
)
from modules.community.services import InstitutionService
from modules.core.response_formatter import format_data, format_error, format_not_found

logger = logging.getLogger(__name__)

institution_blp = Blueprint(
    'institutions',
    __name__,
    url_prefix='/api/v2/institutions',
    description='Institution management endpoints',
)

institution_service = InstitutionService()


@institution_blp.route('')
class InstitutionListResource(MethodView):
    @institution_blp.arguments(PaginationSchema, location='query')
    @institution_blp.response(200, InstitutionListResponseSchema)
    def get(self, args):
        data = institution_service.list_institutions(
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return format_data(
            data=data,
            message='Institutions retrieved successfully',
            status_code=200,
        )

    @token_required
    @institution_blp.arguments(CreateInstitutionSchema)
    @institution_blp.response(201, InstitutionResponseSchema)
    @institution_blp.alt_response(400, schema=HierarchyErrorSchema)
    def post(self, payload, current_user=None):
        institution, error = institution_service.create_institution(current_user.id, payload)
        if error:
            return format_error(
                error='creation_failed',
                message=error,
                status_code=400,
            )

        return format_data(
            data=institution,
            message='Institution created successfully',
            status_code=201,
        )


@institution_blp.route('/<int:institution_id>')
class InstitutionResource(MethodView):
    @institution_blp.response(200, InstitutionResponseSchema)
    @institution_blp.alt_response(404, schema=HierarchyErrorSchema)
    def get(self, institution_id):
        institution, error = institution_service.get_institution(institution_id)
        if error:
            return format_not_found('Institution')

        return format_data(
            data=institution,
            message='Institution retrieved successfully',
            status_code=200,
        )
