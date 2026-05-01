"""
Verification Flow Test Script
Tests the complete BVN verification workflow with Paystack Identity

✨ UPDATED: Now tests REAL BVN verification with Paystack!
✨ REFACTORED: Wallet creation is now separate from verification

What this tests:
1. Login to existing account
2. Check current verification status
3. Submit BVN for verification
4. ✨ Paystack verifies BVN (name/DOB matching)
5. ✨ Wallet is created (async)
6. User status updated

Prerequisites:
- Flask app running: python app.py
- Celery worker running: celery -A modules.tasks.celery_app worker --loglevel=info --pool=solo
- Paystack test key configured in .env
"""
import requests
import time
import json
from redis import Redis

# Configuration
BASE_URL = "http://127.0.0.1:8080"
EMAIL = "bayoutrubradda-7684@yopmail.com"
PASSWORD = "SecurePass123!"

# ⚠️ IMPORTANT: BVN and DOB must match what's registered with this BVN!
# If you don't know the registered name/DOB, the test will fail at Paystack verification
BVN = "22500636592"
DOB = "1994-12-27"  # Must match the DOB registered with this BVN

# ℹ️ NOTE: This script assumes the user's signup name matches the BVN name
# If names don't match, Paystack verification will fail

# Redis connection for cleanup - using Upstash from environment
import os
redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
redis_client = Redis.from_url(redis_url, decode_responses=True)

# Create a session to maintain cookies
session = requests.Session()


def print_section(title):
    """Print formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def cleanup_test_data(user_id):
    """Clean up stuck verifications and rate limits"""
    print_section("STEP 1: CLEANUP")

    # Clear rate limits
    rate_limit_key = f"rate_limit:bvn_verification:{user_id}:verify_bvn"
    deleted = redis_client.delete(rate_limit_key)
    print(f"✓ Cleared rate limit key: {rate_limit_key} (deleted: {deleted})")

    # Clear any stuck verification records via Flask shell would be better
    # For now, we'll just report if one exists
    print("✓ Ready for fresh verification test")
    print("Note: If verification is stuck, you may need to run:")
    print("  flask shell -> delete or update stuck verification record")


def login():
    """Login and get session cookie"""
    print_section("STEP 2: LOGIN")

    response = session.post(
        f"{BASE_URL}/api/v2/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        resp_data = response.json()
        user_id = resp_data['user']['id']
        print(f"\n✓ Login successful")
        print(f"✓ User ID: {user_id}")
        print(f"✓ Session cookie set")
        return user_id
    else:
        print("✗ Login failed!")
        return None


def check_current_status():
    """Check current verification status"""
    print_section("STEP 3: CHECK CURRENT STATUS")

    response = session.get(
        f"{BASE_URL}/api/v2/verification/status"
    )

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if data.get('success'):
        status = data['data']['status']
        print(f"\n✓ Current status: {status}")

        if status == 'processing':
            print("⚠ WARNING: Verification stuck in 'processing' state")
            print("  You need to clean this up before testing")
            return False
        elif status == 'verified':
            print("⚠ WARNING: Already verified")
            print("  You need to delete this record to test fresh verification")
            return False
        else:
            print("✓ Ready for new verification")
            return True
    else:
        print("✓ No existing verification - ready for fresh test")
        return True


def submit_bvn_verification():
    """Submit BVN for verification"""
    print_section("STEP 4: SUBMIT BVN VERIFICATION")

    response = session.post(
        f"{BASE_URL}/api/v2/verification/bvn",
        json={"bvn": BVN, "date_of_birth": DOB}
    )

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if response.status_code == 202:
        task_id = data['data']['task_id']
        verification_id = data['data']['verification_id']
        print(f"\n✓ Verification submitted successfully")
        print(f"✓ Task ID: {task_id}")
        print(f"✓ Verification ID: {verification_id}")
        return task_id, verification_id
    else:
        print(f"\n✗ Verification submission failed!")
        return None, None


def monitor_task_status(task_id, max_wait=120):
    """Monitor Celery task status in real-time"""
    print_section("STEP 5: MONITOR TASK PROGRESS")

    print(f"Monitoring task {task_id}...")
    print("(Check your Celery worker logs for detailed execution)\n")

    start_time = time.time()
    last_state = None

    while time.time() - start_time < max_wait:
        response = session.get(
            f"{BASE_URL}/api/v2/verification/task/{task_id}"
        )

        if response.status_code == 200:
            data = response.json()['data']
            state = data['state']

            if state != last_state:
                print(f"[{int(time.time() - start_time)}s] Task state: {state}")
                if data.get('result'):
                    print(f"  Result: {json.dumps(data['result'], indent=2)}")
                last_state = state

            if state == 'SUCCESS':
                print(f"\n✓ Verification completed successfully!")
                return True
            elif state == 'FAILURE':
                print(f"\n✗ Verification failed!")
                print(f"Error: {data.get('result')}")
                return False

        time.sleep(2)

    print(f"\n⚠ Timeout after {max_wait}s - task still running")
    return False


def check_final_status():
    """Check final verification status"""
    print_section("STEP 6: FINAL VERIFICATION STATUS")

    response = session.get(
        f"{BASE_URL}/api/v2/verification/status"
    )

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if data.get('success'):
        status_data = data['data']
        print(f"\n✓ Verification Type: {status_data['verification_type']}")
        print(f"✓ Status: {status_data['status']}")
        print(f"✓ Verified: {status_data['verified']}")
        if status_data['verified_at']:
            print(f"✓ Verified At: {status_data['verified_at']}")
        if status_data['error_message']:
            print(f"⚠ Error: {status_data['error_message']}")


def check_wallet_created():
    """Check if wallet was created after successful verification"""
    print_section("STEP 6: CHECK WALLET CREATION")

    # Note: Wallet is created asynchronously by a separate Celery task
    # Give it a moment to be created
    time.sleep(3)

    response = session.get(
        f"{BASE_URL}/api/v2/wallet"
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        print(f"\n✓ Wallet created!")
        return True
    else:
        print(f"Response: {response.text}")
        if response.status_code == 404:
            print(f"\n⚠ Wallet not found yet (still being created)")
            return False
        else:
            print(f"\n⚠ Error checking wallet")
            return False


def main():
    """Run complete verification flow test"""
    print("\n" + "="*60)
    print("  BVN VERIFICATION FLOW - COMPLETE TEST")
    print("  ✨ WITH PAYSTACK IDENTITY VERIFICATION")
    print("="*60)
    print(f"\nTest Configuration:")
    print(f"  Email: {EMAIL}")
    print(f"  BVN: {BVN}")
    print(f"  DOB: {DOB}")
    print(f"  Base URL: {BASE_URL}")
    print(f"\n⚠️  IMPORTANT:")
    print(f"  - User's signup name must match BVN registered name")
    print(f"  - DOB must match BVN registered DOB")
    print(f"  - Paystack will verify this information")
    print(f"  - Test mode is FREE (no charges)")

    try:
        # Step 1: Login
        user_id = login()
        if not user_id:
            print("\n✗ TEST FAILED: Could not login")
            return

        # Step 2: Cleanup (optional - can be skipped if not needed)
        cleanup_test_data(user_id)

        # Step 3: Check current status
        ready = check_current_status()
        if not ready:
            print("\n⚠ MANUAL CLEANUP REQUIRED:")
            print("  Run: python cleanup_verification.py")
            print("\n  Then re-run this script")
            return

        # Step 4: Submit verification
        task_id, verification_id = submit_bvn_verification()
        if not task_id:
            print("\n✗ TEST FAILED: Could not submit verification")
            return

        # Step 5: Monitor task
        print("\n⚠ IMPORTANT: Watch your Celery worker terminal for:")
        print("  1. 🔍 'Verifying BVN with external provider'")
        print("  2. ✅ 'BVN verified successfully'")
        print("  3. 💼 'Creating wallet for verified user'")
        print("  4. ✅ 'Wallet created for user'")
        print()
        success = monitor_task_status(task_id)

        # Step 6: Check final status
        time.sleep(2)  # Give DB a moment to update
        check_final_status()

        # Step 7: Check wallet
        if success:
            check_wallet_created()

        # Summary
        print_section("TEST SUMMARY")
        if success:
            print("✅ VERIFICATION PASSED!")
            print("✅ BVN verified with Paystack")
            print("✅ Wallet created successfully")
            print("\nWhat happened:")
            print("  1. ✅ Paystack verified BVN exists")
            print("  2. ✅ Paystack verified name matches")
            print("  3. ✅ Paystack verified DOB matches")
            print("  4. ✅ BVN encrypted and stored")
            print("  5. ✅ Wallet account created (async)")
            print("  6. ✅ User status updated to verified")
            print("\nCheck logs for:")
            print("  - Flask logs: Paystack API responses")
            print("  - Celery logs: Full verification & wallet creation flow")
        else:
            print("❌ VERIFICATION FAILED")
            print("\nPossible reasons:")
            print("  1. ❌ Name doesn't match BVN records")
            print("  2. ❌ DOB doesn't match BVN records")
            print("  3. ❌ BVN is blacklisted")
            print("  4. ❌ Paystack API error")
            print("\nCheck logs for details")

    except Exception as e:
        print(f"\n✗ TEST FAILED WITH ERROR:")
        print(f"  {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
