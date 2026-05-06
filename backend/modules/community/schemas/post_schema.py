"""
Marshmallow Schemas for Community Post Operations
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError

from modules.community.constants import CommunityPostReactionType, CommunityPostType


class CommunityPostListQuerySchema(Schema):
    """Query parameters for listing community posts."""

    limit = fields.Integer(
        load_default=20,
        validate=validate.Range(min=1, max=100),
        metadata={'description': 'Page size'},
    )
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset'},
    )
    post_type = fields.String(
        load_default=None,
        validate=validate.OneOf(CommunityPostType.values()),
        metadata={'description': 'Optional post type filter'},
    )
    pinned_only = fields.Boolean(
        load_default=False,
        metadata={'description': 'Return only pinned posts'},
    )


class CommunityPostCommentListQuerySchema(Schema):
    """Query parameters for listing post comments."""

    limit = fields.Integer(
        load_default=20,
        validate=validate.Range(min=1, max=100),
        metadata={'description': 'Page size'},
    )
    offset = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
        metadata={'description': 'Pagination offset'},
    )


class CreateCommunityPostSchema(Schema):
    """Schema for creating a community post."""

    body = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=5000),
        metadata={'description': 'Post body text'},
    )
    media_urls = fields.List(
        fields.Url(),
        load_default=list,
        metadata={'description': 'Optional media attachments'},
    )
    mentioned_user_ids = fields.List(
        fields.Integer(validate=validate.Range(min=1)),
        load_default=list,
        validate=validate.Length(max=20),
        metadata={'description': 'Explicit tagged users in the post'},
    )
    post_type = fields.String(
        load_default=CommunityPostType.POST.value,
        validate=validate.OneOf(CommunityPostType.values()),
        metadata={'description': 'Post type'},
    )
    is_pinned = fields.Boolean(
        load_default=False,
        metadata={'description': 'Pin post to top of community feed'},
    )
    comments_enabled = fields.Boolean(
        load_default=True,
        metadata={'description': 'Allow comments for the post'},
    )

    @validates_schema
    def validate_content(self, data, **kwargs):
        body = (data.get('body') or '').strip()
        media_urls = data.get('media_urls') or []
        if not body and not media_urls:
            raise ValidationError('Post must contain body text or at least one media URL.')


class UpdateCommunityPostSchema(Schema):
    """Schema for updating a community post."""

    body = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=5000),
        metadata={'description': 'Updated post body text'},
    )
    media_urls = fields.List(
        fields.Url(),
        required=False,
        metadata={'description': 'Updated media attachments'},
    )
    mentioned_user_ids = fields.List(
        fields.Integer(validate=validate.Range(min=1)),
        required=False,
        validate=validate.Length(max=20),
        metadata={'description': 'Updated explicit tagged users'},
    )
    post_type = fields.String(
        required=False,
        validate=validate.OneOf(CommunityPostType.values()),
        metadata={'description': 'Updated post type'},
    )
    is_pinned = fields.Boolean(
        required=False,
        metadata={'description': 'Updated pin state'},
    )
    comments_enabled = fields.Boolean(
        required=False,
        metadata={'description': 'Updated comments enabled state'},
    )


class CreateCommunityPostCommentSchema(Schema):
    """Schema for creating a post comment."""

    body = fields.String(
        required=True,
        validate=validate.Length(min=1, max=2000),
        metadata={'description': 'Comment body text'},
    )


class ToggleCommunityPostReactionSchema(Schema):
    """Schema for toggling a post reaction."""

    reaction_type = fields.String(
        load_default=CommunityPostReactionType.LIKE.value,
        validate=validate.OneOf(CommunityPostReactionType.values()),
        metadata={'description': 'Reaction type'},
    )


class MentionedUserSchema(Schema):
    """Tagged user payload."""

    id = fields.Integer()
    firstname = fields.String()
    lastname = fields.String()
    full_name = fields.String()
    profile_photo = fields.String(allow_none=True)


class CommunityPostMentionDataSchema(Schema):
    """Mention response schema."""

    id = fields.Integer()
    post_id = fields.Integer()
    mentioned_user_id = fields.Integer()
    created_at = fields.String()
    user = fields.Nested(MentionedUserSchema)


class CommunityPostAuthorSchema(Schema):
    """Author preview schema."""

    id = fields.Integer()
    firstname = fields.String()
    lastname = fields.String()
    full_name = fields.String()
    profile_photo = fields.String(allow_none=True)


class CommunityPostDataSchema(Schema):
    """Community post response payload."""

    id = fields.Integer()
    community_id = fields.Integer()
    author_user_id = fields.Integer()
    body = fields.String(allow_none=True)
    media_urls = fields.List(fields.String())
    post_type = fields.String()
    status = fields.String()
    is_pinned = fields.Boolean()
    comments_enabled = fields.Boolean()
    edited_at = fields.String(allow_none=True)
    created_at = fields.String()
    updated_at = fields.String()
    mention_count = fields.Integer()
    comments_count = fields.Integer()
    reactions_count = fields.Integer()
    current_user_reacted = fields.Boolean()
    current_user_reaction_type = fields.String(allow_none=True)
    mentioned_user_ids = fields.List(fields.Integer())
    author = fields.Nested(CommunityPostAuthorSchema)
    mentions = fields.List(fields.Nested(CommunityPostMentionDataSchema))


class CommunityPostResponseSchema(Schema):
    """Response schema for a single community post."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostDataSchema)


class CommunityPostListDataSchema(Schema):
    """Community post list response payload."""

    posts = fields.List(fields.Nested(CommunityPostDataSchema))
    pagination = fields.Dict()


class CommunityPostListResponseSchema(Schema):
    """Response schema for a list of community posts."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostListDataSchema)


class CommunityPostCommentDataSchema(Schema):
    """Post comment response payload."""

    id = fields.Integer()
    post_id = fields.Integer()
    author_user_id = fields.Integer()
    body = fields.String()
    status = fields.String()
    edited_at = fields.String(allow_none=True)
    created_at = fields.String()
    updated_at = fields.String()
    author = fields.Nested(CommunityPostAuthorSchema)


class CommunityPostCommentResponseSchema(Schema):
    """Response schema for a single post comment."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostCommentDataSchema)


class CommunityPostCommentListDataSchema(Schema):
    """Comment list response payload."""

    comments = fields.List(fields.Nested(CommunityPostCommentDataSchema))
    pagination = fields.Dict()


class CommunityPostCommentListResponseSchema(Schema):
    """Response schema for a list of post comments."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostCommentListDataSchema)


class CommunityPostReactionDataSchema(Schema):
    """Reaction toggle response payload."""

    post_id = fields.Integer()
    reaction_type = fields.String()
    reacted = fields.Boolean()
    reactions_count = fields.Integer()


class CommunityPostReactionResponseSchema(Schema):
    """Response schema for a post reaction toggle."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostReactionDataSchema)


class CommunityPostMediaItemSchema(Schema):
    """Uploaded media item payload."""

    provider = fields.String()
    asset_id = fields.String()
    url = fields.Url()
    width = fields.Integer(allow_none=True)
    height = fields.Integer(allow_none=True)
    format = fields.String(allow_none=True)
    bytes = fields.Integer(allow_none=True)
    original_filename = fields.String(allow_none=True)


class CommunityPostMediaUploadDataSchema(Schema):
    """Media upload response payload."""

    media = fields.List(fields.Nested(CommunityPostMediaItemSchema))
    count = fields.Integer()


class CommunityPostMediaUploadResponseSchema(Schema):
    """Response schema for media uploads."""

    success = fields.Boolean()
    message = fields.String()
    data = fields.Nested(CommunityPostMediaUploadDataSchema)
