import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime
from config import Config
from flask import current_app
import os


class FirebaseService:
    _instance = None

    def __init__(self):
        if not FirebaseService._instance:
            try:
                # Check if Firebase credentials file exists
                if not os.path.exists(Config.FIREBASE_CREDENTIALS):
                    print(f"⚠️  Firebase credentials not found at {Config.FIREBASE_CREDENTIALS}")
                    print("⚠️  Firebase features will be disabled")
                    self.app = None
                    self.db = None
                    FirebaseService._instance = self
                    return
                
                cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS)
                self.app = firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                print("Firebase initialized successfully")
            except Exception as e:
                print(f"WARNING: Firebase initialization failed: {e}")
                print("WARNING: Firebase features will be disabled")
                self.app = None
                self.db = None
            
            FirebaseService._instance = self

    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = FirebaseService()
        return cls._instance

    # Existing Firestore messaging methods
    def get_conversation(self, user1_id, user2_id, last_message_id=None):
        messages_ref = self.db.collection("messages")
        query = messages_ref.where(
            "participants", "array_contains", sorted([user1_id, user2_id])
        ).order_by("timestamp", direction="DESC")

        if last_message_id:
            last_msg = messages_ref.document(last_message_id).get()
            query = query.start_after(last_msg)

        return query.limit(Config.MESSAGES_PER_PAGE).stream()

    def send_message(self, sender_id, receiver_id, message_text):
        message_data = {
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "message": message_text,
            "timestamp": datetime.utcnow(),
            "read": False,
            "participants": sorted([sender_id, receiver_id]),
        }
        _, doc_ref = self.db.collection("messages").add(message_data)
        return doc_ref.id

    # New Push Notification Methods
    def send_push_notification(self, device_tokens, title, body, data=None):
        """
        Send push notifications to multiple devices
        :param device_tokens: List of FCM registration tokens
        :param title: Notification title
        :param body: Notification body
        :param data: Additional data payload (dict)
        :return: Dict with delivery results or None on failure
        """
        if not device_tokens:
            return None

        # Create a multicast message
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=device_tokens,
        )

        try:
            response = messaging.send_multicast(message)
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "responses": [
                    {
                        "success": resp.success,
                        "message_id": resp.message_id,
                        "error": getattr(resp, "error", None),
                    }
                    for resp in response.responses
                ],
            }
        except Exception as e:
            current_app.logger.error(f"Push notification failed: {str(e)}")
            return None

    def subscribe_to_topic(self, device_tokens, topic_name):
        """
        Subscribe devices to a topic for broadcast messages
        :param device_tokens: List of FCM registration tokens
        :param topic_name: Name of topic to subscribe to
        :return: Dict with subscription results or None on failure
        """
        try:
            response = messaging.subscribe_to_topic(device_tokens, topic_name)
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "errors": getattr(response, "errors", None),
            }
        except Exception as e:
            current_app.logger.error(f"Topic subscription failed: {str(e)}")
            return None

    def send_to_topic(self, topic_name, title, body, data=None):
        """
        Send notification to all devices subscribed to a topic
        :param topic_name: Name of topic to send to
        :param title: Notification title
        :param body: Notification body
        :param data: Additional data payload (dict)
        """
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            topic=topic_name,
        )

        try:
            return messaging.send(message)
        except Exception as e:
            current_app.logger.error(f"Topic message failed: {str(e)}")
            return None


# Singleton instance
firebase = FirebaseService.get_instance()


# import firebase_admin
# from firebase_admin import credentials, firestore, messaging
# from datetime import datetime
# from config import Config


# class FirebaseService:
#     _instance = None

#     def __init__(self):
#         if not FirebaseService._instance:
#             cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS)
#             self.app = firebase_admin.initialize_app(cred)
#             self.db = firestore.client()
#             FirebaseService._instance = self

#     @classmethod
#     def get_instance(cls):
#         if not cls._instance:
#             cls._instance = FirebaseService()
#         return cls._instance

#     # Message-related methods
#     def get_conversation(self, user1_id, user2_id, last_message_id=None):
#         messages_ref = self.db.collection('messages')
#         query = messages_ref.where(
#             'participants', 'array_contains', sorted([user1_id, user2_id])
#         ).order_by('timestamp', direction='DESC')

#         if last_message_id:
#             last_msg = messages_ref.document(last_message_id).get()
#             query = query.start_after(last_msg)

#         return query.limit(Config.MESSAGES_PER_PAGE).stream()

#     def send_message(self, sender_id, receiver_id, message_text):
#         message_data = {
#             'sender_id': sender_id,
#             'receiver_id': receiver_id,
#             'message': message_text,
#             'timestamp': datetime.utcnow(),
#             'read': False,
#             'participants': sorted([sender_id, receiver_id])
#         }
#         _, doc_ref = self.db.collection('messages').add(message_data)
#         return doc_ref.id

# # Singleton instance
# firebase = FirebaseService.get_instance()
