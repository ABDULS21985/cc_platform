from flask_socketio import emit, join_room
from flask_jwt_extended import jwt_required, get_jwt_identity
from flasgger import swag_from
import inspect
import yaml


def generate_websocket_docs(socketio):
    """Generate documentation for WebSocket endpoints"""
    if not hasattr(socketio, "server") or not socketio.server:
        return {"error": "Socket.IO server not initialized"}

    docs = []
    server = socketio.server

    # Get default namespace
    default_ns = server.handlers.get("/", {})

    for event_name, handler_list in default_ns.items():
        if event_name.startswith("_"):  # Skip internal events
            continue

        if not isinstance(handler_list, list):
            handler_list = [handler_list]

        for handler in handler_list:
            # Unwrap decorated functions
            while hasattr(handler, "__wrapped__"):
                handler = handler.__wrapped__

            doc_info = {
                "event": event_name,
                "namespace": "/",
                "docstring": inspect.getdoc(handler) or "No docs",
            }

            # Get Swagger spec
            if hasattr(handler, "_swag_spec"):
                doc_info["docs"] = handler._swag_spec
            elif doc_info["docstring"] and "---" in doc_info["docstring"]:
                try:
                    doc_info["docs"] = yaml.safe_load(
                        doc_info["docstring"].split("---")[1]
                    )
                except Exception as e:
                    doc_info["yaml_error"] = str(e)

            docs.append(doc_info)

    return {"status": "success", "websocket_endpoints": docs}


def documented_handler(handler, swag_spec=None):
    """Wrapper to preserve Swagger docs on Socket.IO handlers"""
    if swag_spec:
        handler._swag_spec = swag_spec
    return handler


def register_socket_events(socketio):
    """Register all Socket.IO event handlers with Swagger documentation"""

    # Join Community Feed
    def handle_join_community_feed(data):
        """Handle joining a community feed room
        ---
        tags: [Realtime]
        summary: Join community feed room
        description: Subscribe to real-time updates for a specific community feed
        parameters:
          - name: data
            in: body
            required: true
            schema:
              type: object
              properties:
                community_id:
                  type: integer
                  example: 1
                  description: ID of the community to join
              required: [community_id]
        responses:
          feed_update:
            description: Confirmation of successful subscription
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: connected
                user_id:
                  type: integer
                  example: 123
                community_id:
                  type: integer
                  example: 1
        security:
          - Bearer: []
        """
        user_id = get_jwt_identity()
        community_id = data["community_id"]
        join_room(f"community_{community_id}")
        emit(
            "feed_update",
            {"status": "connected", "user_id": user_id, "community_id": community_id},
        )

    socketio.on("join_community_feed")(
        jwt_required()(
            documented_handler(
                handle_join_community_feed,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Join community feed room",
                    "description": "Subscribe to real-time updates for a specific community feed",
                    "parameters": [
                        {
                            "name": "data",
                            "in": "body",
                            "required": True,
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "community_id": {
                                        "type": "integer",
                                        "example": 1,
                                        "description": "ID of the community to join",
                                    }
                                },
                                "required": ["community_id"],
                            },
                        }
                    ],
                    "responses": {
                        "feed_update": {
                            "description": "Confirmation of successful subscription",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "status": {
                                        "type": "string",
                                        "example": "connected",
                                    },
                                    "user_id": {"type": "integer", "example": 123},
                                    "community_id": {"type": "integer", "example": 1},
                                },
                            },
                        }
                    },
                    "security": [{"Bearer": []}],
                },
            )
        )
    )

    # New Post Broadcast
    def handle_new_post(data):
        """Broadcast new posts to community
        ---
        tags: [Realtime]
        summary: Broadcast new post
        description: Push new posts to all subscribers of a community
        parameters:
          - name: data
            in: body
            required: true
            schema:
              type: object
              properties:
                community_id:
                  type: integer
                  description: Target community ID
                post:
                  $ref: '#/definitions/CommunityPost'
              required: [community_id, post]
        """
        emit("new_post", data, room=f"community_{data['community_id']}")

    socketio.on("new_post")(
        documented_handler(
            handle_new_post,
            swag_spec={
                "tags": ["Realtime"],
                "summary": "Broadcast new post",
                "description": "Push new posts to all subscribers of a community",
                "parameters": [
                    {
                        "name": "data",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "community_id": {
                                    "type": "integer",
                                    "description": "Target community ID",
                                },
                                "post": {"$ref": "#/definitions/CommunityPost"},
                            },
                            "required": ["community_id", "post"],
                        },
                    }
                ],
            },
        )
    )

    # Post Like Handler
    def handle_post_like(data):
        """Handle post like/unlike events
        ---
        tags: [Realtime]
        summary: Handle post likes
        description: Real-time like notifications
        parameters:
          - name: data
            in: body
            schema:
              type: object
              properties:
                post_id:
                  type: integer
                action:
                  type: string
                  enum: [like, unlike]
        security:
          - Bearer: []
        """
        pass

    socketio.on("post_like")(
        jwt_required()(
            documented_handler(
                handle_post_like,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Handle post likes",
                    "description": "Real-time like notifications",
                    "parameters": [
                        {
                            "name": "data",
                            "in": "body",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "post_id": {"type": "integer"},
                                    "action": {
                                        "type": "string",
                                        "enum": ["like", "unlike"],
                                    },
                                },
                            },
                        }
                    ],
                    "security": [{"Bearer": []}],
                },
            )
        )
    )

    # Join Wallet Updates
    def handle_join_wallet_updates():
        """Subscribe to wallet balance updates
        ---
        tags: [Realtime]
        summary: Join wallet updates room
        description: Subscribe to real-time updates for the user's wallet balance
        security:
          - Bearer: []
        responses:
          wallet_connected:
            description: Confirmation of successful subscription
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: connected
                user_id:
                  type: integer
                  example: 123
        """
        user_id = get_jwt_identity()
        join_room(f"wallet_{user_id}")
        emit("wallet_connected", {"status": "connected", "user_id": user_id})

    socketio.on("join_wallet_updates")(
        jwt_required()(
            documented_handler(
                handle_join_wallet_updates,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Join wallet updates room",
                    "description": "Subscribe to real-time updates for the user's wallet balance",
                    "security": [{"Bearer": []}],
                    "responses": {
                        "wallet_connected": {
                            "description": "Confirmation of successful subscription",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "status": {
                                        "type": "string",
                                        "example": "connected",
                                    },
                                    "user_id": {"type": "integer", "example": 123},
                                },
                            },
                        }
                    },
                },
            )
        )
    )

    # Request Wallet Balance
    def handle_request_balance():
        """Request current wallet balance
        ---
        tags: [Realtime]
        summary: Request wallet balance
        description: Get the current wallet balance via WebSocket
        security:
          - Bearer: []
        responses:
          balance_update:
            description: Current wallet balance
            schema:
              type: object
              properties:
                balance:
                  type: number
                  format: float
                  example: 1500.50
                currency:
                  type: string
                  example: "NGN"
                updated_at:
                  type: string
                  format: date-time
        """
        user_id = get_jwt_identity()
        from database.connection import db  # Import your DB connection

        conn = db.get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        try:
            cursor.execute(
                """
                SELECT balance, currency, updated_at 
                FROM wallets 
                WHERE user_id = %s
                """,
                (user_id,),
            )
            wallet = cursor.fetchone()

            if wallet:
                emit(
                    "balance_update",
                    {
                        "balance": float(wallet["balance"]),
                        "currency": wallet["currency"],
                        "updated_at": (
                            wallet["updated_at"].isoformat()
                            if wallet["updated_at"]
                            else None
                        ),
                    },
                    room=f"wallet_{user_id}",
                )
        finally:
            cursor.close()
            db.close_connection()

    socketio.on("request_balance")(
        jwt_required()(
            documented_handler(
                handle_request_balance,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Request wallet balance",
                    "description": "Get the current wallet balance via WebSocket",
                    "security": [{"Bearer": []}],
                    "responses": {
                        "balance_update": {
                            "description": "Current wallet balance",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "balance": {
                                        "type": "number",
                                        "format": "float",
                                        "example": 1500.50,
                                    },
                                    "currency": {"type": "string", "example": "NGN"},
                                    "updated_at": {
                                        "type": "string",
                                        "format": "date-time",
                                    },
                                },
                            },
                        }
                    },
                },
            )
        )
    )

    # Transfer Notification
    def handle_transfer_notification(data):
        """Notify users about transfers
        ---
        tags: [Realtime]
        summary: Transfer notification
        description: Send real-time notifications about wallet transfers
        parameters:
          - name: data
            in: body
            required: true
            schema:
              type: object
              properties:
                recipient_id:
                  type: integer
                  description: ID of the recipient user
                amount:
                  type: number
                  format: float
                currency:
                  type: string
                reference:
                  type: string
        security:
          - Bearer: []
        """
        emit("transfer_received", data, room=f"wallet_{data['recipient_id']}")

    socketio.on("transfer_notification")(
        jwt_required()(
            documented_handler(
                handle_transfer_notification,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Transfer notification",
                    "description": "Send real-time notifications about wallet transfers",
                    "parameters": [
                        {
                            "name": "data",
                            "in": "body",
                            "required": True,
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "recipient_id": {
                                        "type": "integer",
                                        "description": "ID of the recipient user",
                                    },
                                    "amount": {"type": "number", "format": "float"},
                                    "currency": {"type": "string"},
                                    "reference": {"type": "string"},
                                },
                            },
                        }
                    ],
                    "security": [{"Bearer": []}],
                },
            )
        )
    )

    # Notifications: subscribe a connected JWT-authenticated client to its
    # own per-user notifications room. Backend code emits to this room from
    # `NotificationService.create_for_user` so the inbox lights up live.
    def handle_join_notifications():
        """Join the per-user notifications room.
        ---
        tags: [Realtime]
        summary: Join notifications room
        description: Subscribe to real-time notification events for the current user
        security:
          - Bearer: []
        responses:
          notifications_connected:
            description: Confirmation of successful subscription
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: connected
                user_id:
                  type: integer
                  example: 123
        """
        user_id = get_jwt_identity()
        join_room(f"notifications_{user_id}")
        emit("notifications_connected", {"status": "connected", "user_id": user_id})

    socketio.on("join_notifications")(
        jwt_required()(
            documented_handler(
                handle_join_notifications,
                swag_spec={
                    "tags": ["Realtime"],
                    "summary": "Join notifications room",
                    "description": "Subscribe to real-time notification events for the current user",
                    "security": [{"Bearer": []}],
                    "responses": {
                        "notifications_connected": {
                            "description": "Confirmation of successful subscription",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "status": {
                                        "type": "string",
                                        "example": "connected",
                                    },
                                    "user_id": {"type": "integer", "example": 123},
                                },
                            },
                        }
                    },
                },
            )
        )
    )
