"""
Community Resources Package
Flask-Smorest MethodView resources for community operations
"""
from modules.community.resources.community_resource import (
    community_blp,
    CommunityListResource,
    CommunityResource,
    UserCommunitiesResource,
    UserOwnedCommunitiesResource,
)
from modules.community.resources.member_resource import (
    member_blp,
    CommunityMembersResource,
    JoinCommunityResource,
    LeaveCommunityResource,
    MemberRoleResource
)
from modules.community.resources.bill_resource import (
    bill_blp,
    BillListResource,
    BillResource
)
from modules.community.resources.payment_resource import (
    payment_blp,
    PayBillResource,
    CommunityBalanceResource,
    TransferFundsResource
)
from modules.community.resources.invite_resource import (
    invite_blp,
    InviteResource,
    InviteRevokeResource,
    InviteInfoResource,
    InviteJoinResource
)
from modules.community.resources.community_wallet_resource import (
    community_wallet_blp,
    CommunityDepositResource
)
from modules.community.resources.post_resource import (
    post_blp,
    CommunityPostCommentsResource,
    CommunityPostCommentResource,
    CommunityPostListResource,
    CommunityPostResource,
    CommunityPostMediaUploadResource,
    CommunityPostReactionResource,
)
from modules.community.resources.membership_payment_resource import (
    membership_payment_blp,
    MembershipPaymentInitResource,
    MembershipPaymentVerifyResource,
    MembershipPaymentStatusResource
)
from modules.community.resources.institution_resource import (
    institution_blp,
    InstitutionListResource,
    InstitutionResource,
)
from modules.community.resources.organization_resource import (
    organization_blp,
    OrganizationListResource,
    OrganizationResource,
)

__all__ = [
    # Blueprints
    'community_blp',
    'member_blp',
    'bill_blp',
    'payment_blp',
    'invite_blp',
    'community_wallet_blp',
    'post_blp',
    'membership_payment_blp',
    'institution_blp',
    'organization_blp',
    # Resources
    'CommunityListResource',
    'CommunityResource',
    'UserCommunitiesResource',
    'UserOwnedCommunitiesResource',
    'CommunityMembersResource',
    'JoinCommunityResource',
    'LeaveCommunityResource',
    'MemberRoleResource',
    'BillListResource',
    'BillResource',
    'PayBillResource',
    'CommunityBalanceResource',
    'TransferFundsResource',
    'InviteResource',
    'InviteRevokeResource',
    'InviteInfoResource',
    'InviteJoinResource',
    'CommunityDepositResource',
    'CommunityPostListResource',
    'CommunityPostResource',
    'CommunityPostMediaUploadResource',
    'CommunityPostCommentsResource',
    'CommunityPostCommentResource',
    'CommunityPostReactionResource',
    'MembershipPaymentInitResource',
    'MembershipPaymentVerifyResource',
    'MembershipPaymentStatusResource',
    'InstitutionListResource',
    'InstitutionResource',
    'OrganizationListResource',
    'OrganizationResource',
]
