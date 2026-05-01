"""
Community Schemas Package
Marshmallow schemas for community request validation and response serialization
"""
from modules.community.schemas.community_schema import (
    CreateCommunitySchema,
    UpdateCommunitySchema,
    SearchCommunitySchema,
    CommunityDataSchema,
    CommunityResponseSchema,
    CommunityListResponseSchema,
    CommunityErrorSchema
)
from modules.community.schemas.member_schema import (
    InviteMemberSchema,
    UpdateMemberRoleSchema,
    MemberDataSchema,
    MemberResponseSchema,
    MemberListResponseSchema
)
from modules.community.schemas.bill_schema import (
    CreateBillSchema,
    UpdateBillSchema,
    PayBillSchema,
    BillDataSchema,
    BillResponseSchema,
    BillListResponseSchema
)
from modules.community.schemas.payment_schema import (
    TransferFundsSchema,
    CommunityDepositSchema,
    MembershipPaymentInitSchema,
    PaymentDataSchema,
    PaymentResponseSchema,
    TransferResponseSchema
)
from modules.community.schemas.invite_schema import (
    CreateInviteSchema,
    InviteDataSchema,
    InviteResponseSchema
)
from modules.community.schemas.post_schema import (
    CommunityPostListQuerySchema,
    CreateCommunityPostSchema,
    UpdateCommunityPostSchema,
    CommunityPostDataSchema,
    CommunityPostResponseSchema,
    CommunityPostListResponseSchema,
    CommunityPostMediaItemSchema,
    CommunityPostMediaUploadDataSchema,
    CommunityPostMediaUploadResponseSchema,
)
from modules.community.schemas.hierarchy_schema import (
    PaginationSchema,
    CreateInstitutionSchema,
    InstitutionDataSchema,
    InstitutionResponseSchema,
    InstitutionListResponseSchema,
    CreateOrganizationSchema,
    OrganizationListQuerySchema,
    OrganizationDataSchema,
    OrganizationResponseSchema,
    OrganizationListResponseSchema,
    HierarchyErrorSchema,
)

# Backward compatibility alias
ErrorResponseSchema = CommunityErrorSchema

__all__ = [
    # Community
    'CreateCommunitySchema',
    'UpdateCommunitySchema',
    'SearchCommunitySchema',
    'CommunityDataSchema',
    'CommunityResponseSchema',
    'CommunityListResponseSchema',
    'CommunityErrorSchema',
    'ErrorResponseSchema',  # Backward compat
    # Member
    'InviteMemberSchema',
    'UpdateMemberRoleSchema',
    'MemberDataSchema',
    'MemberResponseSchema',
    'MemberListResponseSchema',
    # Bill
    'CreateBillSchema',
    'UpdateBillSchema',
    'PayBillSchema',
    'BillDataSchema',
    'BillResponseSchema',
    'BillListResponseSchema',
    # Payment
    'TransferFundsSchema',
    'CommunityDepositSchema',
    'MembershipPaymentInitSchema',
    'PaymentDataSchema',
    'PaymentResponseSchema',
    'TransferResponseSchema',
    # Invite
    'CreateInviteSchema',
    'InviteDataSchema',
    'InviteResponseSchema',
    # Post
    'CommunityPostListQuerySchema',
    'CreateCommunityPostSchema',
    'UpdateCommunityPostSchema',
    'CommunityPostDataSchema',
    'CommunityPostResponseSchema',
    'CommunityPostListResponseSchema',
    'CommunityPostMediaItemSchema',
    'CommunityPostMediaUploadDataSchema',
    'CommunityPostMediaUploadResponseSchema',
    # Hierarchy
    'PaginationSchema',
    'CreateInstitutionSchema',
    'InstitutionDataSchema',
    'InstitutionResponseSchema',
    'InstitutionListResponseSchema',
    'CreateOrganizationSchema',
    'OrganizationListQuerySchema',
    'OrganizationDataSchema',
    'OrganizationResponseSchema',
    'OrganizationListResponseSchema',
    'HierarchyErrorSchema',
]
