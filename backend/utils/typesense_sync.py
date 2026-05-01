from extension.typesense_client import client as typesense_client
import threading
import logging

logger = logging.getLogger(__name__)


def sync_user_to_typesense(user_id, user_data):
    document = {
        "id": str(user_id),
        "firstname": user_data["firstname"],
        "lastname": user_data["lastname"],
        "email": user_data["email"],
        "role": user_data.get("role", "user"),
        "auth_provider": user_data.get("auth_provider", "Manual Auth"),
    }

    try:
        result = typesense_client.collections["users"].documents.upsert(document)
        logger.info(f"Typesense sync succeeded for user {user_id}: {result}")
    except Exception as e:
        logger.error(f"Typesense sync failed for user {user_id}: {e}")


def async_sync_user_to_typesense(user_id, user_data):
    thread = threading.Thread(target=sync_user_to_typesense, args=(user_id, user_data))
    thread.start()
