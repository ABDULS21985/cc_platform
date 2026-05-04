"""
API Registry - Flask-Smorest API registration

Centralized registration of Flask-Smorest blueprints.
Primary registration path for active REST API resources.
"""
import logging

logger = logging.getLogger(__name__)


def register_api_blueprints(api):
    """
    Register all Flask-Smorest blueprints with the API instance.
    
    Args:
        api: Flask-Smorest Api instance
    """
    # List of (module_path, blueprint_name) for Flask-Smorest resources
    api_blueprints = [
        # Auth V2 - Authentication resources (signup, login, verify, logout)
        ("modules.auth_v2.resources.auth_resource", "auth_blp"),
        # Auth V2 - Profile resource (profile CRUD, password change, image upload)
        ("modules.auth_v2.resources.profile_resource", "profile_blp"),
        # Verification - BVN/NIN identity verification (async with Celery)
        ("modules.verification.resources.verification_resource", "verification_blp"),
        # Wallet - Wallet operations (balance, transactions, deposit, withdraw)
        ("modules.wallet.resources.wallet_resource", "wallet_blp"),
        # Wallet Webhook - Bell MFB transaction notifications
        ("modules.wallet.resources.webhook_resource", "webhook_blp"),
        # Community - Community management (CRUD, search, stats)
        ("modules.community.resources.community_resource", "community_blp"),
        # Community Members - Membership management (join, leave, roles)
        ("modules.community.resources.member_resource", "member_blp"),
        # Community Bills - Bill management (CRUD, payments)
        ("modules.community.resources.bill_resource", "bill_blp"),
        # Community Payments - Payment processing and transfers
        ("modules.community.resources.payment_resource", "payment_blp"),
        # Community Invites - Invite code management
        ("modules.community.resources.invite_resource", "invite_blp"),
        # Community Posts - Community feed posts and mentions
        ("modules.community.resources.post_resource", "post_blp"),
        # Community Wallet - Community deposits
        ("modules.community.resources.community_wallet_resource", "community_wallet_blp"),
        # Membership Payments - Paid community membership flow
        ("modules.community.resources.membership_payment_resource", "membership_payment_blp"),
        # Institution - Root container for organizations and communities
        ("modules.community.resources.institution_resource", "institution_blp"),
        # Organization - Parent grouping for communities inside institutions
        ("modules.community.resources.organization_resource", "organization_blp"),
        # Admin - Super Admin portal
        ("modules.admin.resources.me_resource", "admin_me_blp"),
        ("modules.admin.resources.overview_resource", "admin_overview_blp"),
        ("modules.admin.resources.users_resource", "admin_users_blp"),
        ("modules.admin.resources.communities_resource", "admin_communities_blp"),
        ("modules.admin.resources.transactions_resource", "admin_transactions_blp"),
        # Notifications — in-app user notifications
        ("modules.notifications.resources.notification_resource", "notification_blp"),
        # Bookmarks — user-saved items (posts, events, communities, bills, transactions)
        ("modules.bookmarks.resources.bookmark_resource", "bookmark_blp"),
        # Events — community events with attendance tracking
        ("modules.events.resources.event_resource", "event_blp"),
        # Audit — user-facing activity log (sign-ins, transfers, role changes)
        ("modules.audit.resources.audit_resource", "audit_blp"),
        # Discovery — trending topics computed from posts
        ("modules.discovery.resources.trending_resource", "discovery_blp"),
        # Dev tools — seed endpoints gated on FLASK_ENV=development
        ("modules.dev_tools.resources.seed_resource", "dev_seed_blp"),
    ]
    
    for module_path, blueprint_name in api_blueprints:
        try:
            # Dynamically import the module
            module = __import__(module_path, fromlist=[blueprint_name])
            blp = getattr(module, blueprint_name)
            
            # Register with Flask-Smorest API
            api.register_blueprint(blp)
            logger.info(f"✓ Registered API blueprint: {blueprint_name}")
            
        except Exception as e:
            logger.error(f"✗ Failed to register API blueprint {blueprint_name}: {str(e)}")
            raise
    
    logger.info(f"✓ All {len(api_blueprints)} API blueprints registered successfully")
