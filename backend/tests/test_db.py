
import requests

BASE_URL = "http://localhost:5000"
TEST_BVN = "22529290436"  # Use IDCheck.ng test BVN


def test_bvn_verification():
    print("\n=== Testing BVN Verification ===")
    response = requests.post(
        f"{BASE_URL}/api/verify/bvn", json={"bvn": TEST_BVN, "consent": True}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    try:
        data = response.json()
        print("JSON Response:", data)
        return data.get("verification_id")
    except:
        print("⚠️ Couldn't parse JSON response")
        return None


if __name__ == "__main__":
    print("🚀 Starting verification tests (no auth)")
    verification_id = test_bvn_verification()

    if verification_id:
        print(f"\n✅ Success! Verification ID: {verification_id}")
    else:
        print("\n❌ Test failed")
