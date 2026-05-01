import requests
import os

BASE_URL = "http://localhost:5000"

# First login to establish session
session = requests.Session()
login_response = session.post(
    f"{BASE_URL}/api/login",
    json={"email": "test@example.com", "password": "testpassword"},
)
print("Login:", login_response.json())


def test_bvn_verification():
    url = f"{BASE_URL}/api/verify/bvn"  # Updated URL to match your routes
    payload = {
        "bvn": "12345678901",  # Test BVN from IDCheck.ng
        "consent": True,
        # Removed user_id since we'll get it from session
    }
    response = session.post(url, json=payload)  # Use the same session
    print("BVN Verification Response:", response.json())
    return response.json().get("verification_id")


def test_status():
    url = f"{BASE_URL}/api/verification-status"  # Updated endpoint
    response = session.get(url)  # Use the same session
    print("Verification Status:", response.json())


if __name__ == "__main__":
    print("Starting basic verification tests...")
    verification_id = test_bvn_verification()
    test_status()


# import requests
# import base64
# import os

# BASE_URL = "http://localhost:5000"
# USER_ID = 1


# # Helper to load image as base64
# def image_to_base64(image_path):
#     with open(image_path, "rb") as image_file:
#         return base64.b64encode(image_file.read()).decode("utf-8")


# def test_bvn_verification():
#     url = f"{BASE_URL}/verify/bvn"
#     payload = {
#         "user_id": USER_ID,
#         "bvn": "12345678901",  # Replace with test BVN
#         "consent": True,
#     }
#     response = requests.post(url, json=payload)
#     print("BVN Verification Response:", response.json())
#     return response.json().get("verification_id")


# # def test_face_verification(verification_id):
# #     url = f"{BASE_URL}/verify/face"
# #     image_path = "test_face.jpg"  # Replace with actual test image
# #     payload = {
# #         "user_id": USER_ID,
# #         "verification_id": verification_id,
# #         "image": image_to_base64(image_path),
# #     }
# #     response = requests.post(url, json=payload)
# #     print("Face Verification Response:", response.json())


# def test_status():
#     url = f"{BASE_URL}/verification-status/{USER_ID}"
#     response = requests.get(url)
#     print("Verification Status:", response.json())


# if __name__ == "__main__":
#     print("Starting ID Verification Tests...")
#     verification_id = test_bvn_verification()
#     # test_face_verification(verification_id)
#     test_status()
