"""
Organization Resource
Flask-Smorest endpoints for organization management.
"""
from flask.views import MethodView
from flask_smorest import Blueprint

from modules.auth_v2.utils.decorators import token_required
from modules.community.schemas.hierarchy_schema import (
    CreateOrganizationSchema,
    OrganizationListQuerySchema,
    OrganizationResponseSchema,
    OrganizationListResponseSchema,
    HierarchyErrorSchema,
)
from modules.community.services import OrganizationService
from modules.core.response_formatter import format_data, format_error, format_not_found

organization_blp = Blueprint(
    'organizations',
    __name__,
    url_prefix='/api/v2/organizations',
    description='Organization management endpoints',
)

organization_service = OrganizationService()


@organization_blp.route('')
class OrganizationListResource(MethodView):
    @organization_blp.arguments(OrganizationListQuerySchema, location='query')
    @organization_blp.response(200, OrganizationListResponseSchema)
    def get(self, args):
        data = organization_service.list_organizations(
            institution_id=args['institution_id'],
            limit=args.get('limit', 20),
            offset=args.get('offset', 0),
        )
        return format_data(
            data=data,
            message='Organizations retrieved successfully',
            status_code=200,
        )

    @token_required
    @organization_blp.arguments(CreateOrganizationSchema)
    @organization_blp.response(201, OrganizationResponseSchema)
    @organization_blp.alt_response(400, schema=HierarchyErrorSchema)
    @organization_blp.alt_response(403, schema=HierarchyErrorSchema)
    def post(self, payload, current_user=None):
        organization, error = organization_service.create_organization(current_user.id, payload)
        if error:
            status = 403 if error.startswith('Not authorized') else 400
            return format_error(
                error='creation_failed',
                message=error,
                status_code=status,
            )

        return format_data(
            data=organization,
            message='Organization created successfully',
            status_code=201,
        )


@organization_blp.route('/<int:organization_id>')
class OrganizationResource(MethodView):
    @organization_blp.response(200, OrganizationResponseSchema)
    @organization_blp.alt_response(404, schema=HierarchyErrorSchema)
    def get(self, organization_id):
        organization, error = organization_service.get_organization(organization_id)
        if error:
            return format_not_found('Organization')

        return format_data(
            data=organization,
            message='Organization retrieved successfully',
            status_code=200,
        )
