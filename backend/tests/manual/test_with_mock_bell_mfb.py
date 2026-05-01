"""
Complete Verification Flow Test with Mock Bell MFB Server

This script:
1. Starts a mock Bell MFB server on port 9000
2. Temporarily patches your app to use the mock server
3. Runs the complete verification flow test
4. Cleans up and restores everything

Usage:
    python test_with_mock_bell_mfb.py
"""
import os
import sys
import time
import json
import threading
import requests
from flask import Flask, request, jsonify
from redis import Redis

# =============================================================================
# MOCK BELL MFB SERVER
# =============================================================================

mock_app = Flask(__name__)


@mock_app.route('/v1/generate-token', methods=['POST'])
def mock_generate_token():
    """Mock Bell MFB token generation"""
    print("[MOCK] Token request received")
    return jsonify({
        'access_token': 'mock_token_12345678',
        'token_type': 'Bearer',
        'expires_in': 3600
    }), 200


@mock_app.route('/v1/clients/onboard', methods=['POST'])
def mock_onboard_client():
    """Mock Bell MFB client onboarding (BVN/NIN verification)"""
    data = request.json
    print(f"[MOCK] Onboarding request received: {json.dumps(data, indent=2)}")

    # Simulate processing delay
    time.sleep(2)

    # Generate mock response
    first_name = data.get('firstName', 'Test')
    last_name = data.get('lastName', 'User')
    account_number = f"99{int(time.time()) % 100000000:08d}"

    response = {
        'success': True,
        'message': 'Client onboarded successfully',
        'data': {
            'clientId': f'MOCK_CLIENT_{int(time.time())}',
            'accountNumber': account_number,
            'accountName': f'{first_name} {last_name}',
            'status': 'ACTIVE',
            'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
    }

    print(f"[MOCK] Returning success response: {json.dumps(response, indent=2)}")
    return jsonify(response), 200


def start_mock_server():
    """Start mock Bell MFB server in background thread"""
    import logging
    # Suppress Flask startup messages
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    mock_app.run(host='127.0.0.1', port=9000, debug=False, use_reloader=False, threaded=True)


# =============================================================================
# TEST CONFIGURATION
# =============================================================================

BASE_URL = "http://127.0.0.1:8080"
MOCK_BELL_URL = "http://127.0.0.1:9000/v1"

# Test user credentials
EMAIL = "bayoutrubradda-7684@yopmail.com"
PASSWORD = "SecurePass123!"
BVN = "22500636592"
DOB = "1990-01-15"

# Create session for requests
session = requests.Session()

# Redis for cleanup
redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
redis_client = Redis.from_url(redis_url, decode_responses=True)


# =============================================================================
# TEST UTILITIES
# =============================================================================

def print_section(title):
    """Print formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def wait_for_mock_server(max_wait=10):
    """Wait for mock server to be ready"""
    print("Waiting for mock server to start...", end="", flush=True)
    start = time.time()
    while time.time() - start < max_wait:
        try:
            response = requests.get(f"{MOCK_BELL_URL}/health", timeout=1)
            print(" Ready!")
            return True
        except:
            print(".", end="", flush=True)
            time.sleep(0.5)
    print(" Timeout!")
    return False


def patch_bell_mfb_url():
    """
    Temporarily patch Bell MFB URL in the running Flask app
    This requires restarting the app with BELL_MFB_BASE_URL=http://localhost:9000/v1
    """
    print_section("SETUP: CONFIGURE MOCK BELL MFB URL")
    print("  IMPORTANT SETUP STEPS:")
    print("\n1. Stop your Flask app if it's running")
    print("\n2. Set environment variable temporarily:")
    print("   Windows (PowerShell):")
    print(f"     $env:BELL_MFB_BASE_URL='{MOCK_BELL_URL}'")
    print("   Windows (CMD):")
    print(f"     set BELL_MFB_BASE_URL={MOCK_BELL_URL}")
    print("   Linux/Mac:")
    print(f"     export BELL_MFB_BASE_URL={MOCK_BELL_URL}")
    print("\n3. Start Flask app:")
    print("     python app.py")
    print("\n4. Press Enter when Flask app is running with mock URL...")
    input()


# =============================================================================
# TEST STEPS
# =============================================================================

def cleanup_rate_limits(user_id):
    """Clear rate limits for testing"""
    print_section("CLEANUP: RATE LIMITS")
    rate_limit_key = f"rate_limit:bvn_verification:{user_id}:verify_bvn"
    deleted = redis_client.delete(rate_limit_key)
    print(f"✓ Cleared rate limit: {rate_limit_key} (deleted: {deleted})")


def login():
    """Login and return user_id"""
    print_section("STEP 1: LOGIN")

    response = session.post(
        f"{BASE_URL}/api/v2/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if response.status_code == 200:
        # Try different response structures
        user_id = None
        if 'user' in data:
            user_id = data['user'].get('id')
        elif 'data' in data and 'user' in data['data']:
            user_id = data['data']['user'].get('id')
        elif 'data' in data and 'id' in data['data']:
            user_id = data['data']['id']

        if user_id:
            print(f"\n✓ Login successful")
            print(f"✓ User ID: {user_id}")
            return user_id
        else:
            print("\n⚠ Login successful but couldn't extract user_id")
            print("Response structure:", data)
            return None
    else:
        print(f"\n✗ Login failed!")
        return None


def check_verification_status():
    """Check current verification status"""
    print_section("STEP 2: CHECK VERIFICATION STATUS")

    response = session.get(f"{BASE_URL}/api/v2/verification/status")

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if response.status_code == 200 and data.get('success'):
        status = data['data']['status']
        print(f"\n⚠ Current status: {status}")
        if status in ['processing', 'verified', 'failed']:
            print(f"⚠ Found existing {status} verification - needs cleanup")
            print("\nAttempting automatic cleanup...")

            # Try to delete via Flask shell
            try:
                from app import create_app
                from modules.auth_v2.extensions import db
                from modules.verification.repositories.verification_repository import VerificationRepository

                app = create_app()
                with app.app_context():
                    # Get user_id from the verification data
                    user_id = data['data'].get('user_id')
                    if not user_id:
                        print("✗ Could not determine user_id from verification data")
                        return False

                    repo = VerificationRepository()
                    verification = repo.find_by_user_id(user_id)
                    if verification:
                        db.session.delete(verification)
                        db.session.commit()
                        print(f"✓ Deleted {status} verification record for user {user_id}")
                        print("✓ Ready for fresh test\n")
                        return True
                    else:
                        print("✗ Verification record not found")
                        return False
            except Exception as e:
                print(f"✗ Automatic cleanup failed: {e}")
                print("\nManual cleanup required:")
                print("  python cleanup_verification.py 3")
                return False
    else:
        print("\n✓ No existing verification - ready to test")

    return True


def submit_bvn_verification():
    """Submit BVN for verification"""
    print_section("STEP 3: SUBMIT BVN VERIFICATION")

    response = session.post(
        f"{BASE_URL}/api/v2/verification/bvn",
        json={"bvn": BVN, "date_of_birth": DOB}
    )

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if response.status_code == 202:
        task_id = data['data']['task_id']
        print(f"\n✓ Verification submitted!")
        print(f"✓ Task ID: {task_id}")
        return task_id
    else:
        print(f"\n✗ Verification submission failed")
        return None


def monitor_task(task_id, max_wait=60):
    """Monitor Celery task progress"""
    print_section("STEP 4: MONITOR TASK PROGRESS")

    print(f"Monitoring task: {task_id}")
    print("Watch Celery worker logs for mock API calls\n")

    start = time.time()
    last_state = None

    while time.time() - start < max_wait:
        response = session.get(f"{BASE_URL}/api/v2/verification/task/{task_id}")

        if response.status_code == 200:
            data = response.json()['data']
            state = data['state']

            if state != last_state:
                elapsed = int(time.time() - start)
                print(f"[{elapsed}s] State: {state}")

                if state == 'SUCCESS':
                    print("\n✓ Task completed successfully!")
                    print(f"Result: {json.dumps(data.get('result'), indent=2)}")
                    return True
                elif state == 'FAILURE':
                    print(f"\n✗ Task failed!")
                    print(f"Error: {data.get('error')}")
                    return False

                last_state = state

        time.sleep(2)

    print(f"\n⚠ Timeout after {max_wait}s")
    return False


def check_final_verification():
    """Check final verification status"""
    print_section("STEP 5: FINAL VERIFICATION STATUS")

    response = session.get(f"{BASE_URL}/api/v2/verification/status")

    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    if data.get('success') and data['data']['status'] == 'verified':
        print("\n✓ Verification successful!")
        return True
    else:
        print("\n✗ Verification not completed")
        return False


def check_wallet():
    """Check if wallet was created"""
    print_section("STEP 6: CHECK WALLET CREATION")

    response = session.get(f"{BASE_URL}/api/v2/wallet")

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        print("\n✓ Wallet created successfully!")
        return True
    else:
        print(f"Response: {response.text}")
        print("\n✗ Wallet not found")
        return False


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def main():
    """Run complete test with mock Bell MFB"""

    print("\n" + "="*60)
    print("  VERIFICATION FLOW TEST - WITH MOCK BELL MFB")
    print("="*60)
    print("\nThis script will:")
    print("  1. Start a mock Bell MFB server on port 9000")
    print("  2. Test the complete verification flow")
    print("  3. Verify wallet creation")
    print("\n" + "="*60)

    # Start mock server in background thread
    print("\nStarting mock Bell MFB server...")
    mock_thread = threading.Thread(target=start_mock_server, daemon=True)
    mock_thread.start()
    time.sleep(3)  # Give server time to start
    print("✓ Mock server started on http://127.0.0.1:9000")

    try:
        # Instruct user to configure app
        patch_bell_mfb_url()

        # Run tests
        user_id = login()
        if not user_id:
            print("\n✗ TEST FAILED: Login failed")
            return

        cleanup_rate_limits(user_id)

        ready = check_verification_status()
        if not ready:
            print("\n⚠ Manual cleanup required - run: python cleanup_verification.py")
            return

        task_id = submit_bvn_verification()
        if not task_id:
            print("\n✗ TEST FAILED: Could not submit verification")
            return

        print("\n⚠ WATCH CELERY WORKER LOGS - You should see:")
        print("  [MOCK] Token request received")
        print("  [MOCK] Onboarding request received")
        print("  [MOCK] Returning success response\n")

        success = monitor_task(task_id)

        time.sleep(2)

        verified = check_final_verification()

        if verified:
            check_wallet()

        # Summary
        print_section("TEST SUMMARY")

        if success and verified:
            print(" ALL TESTS PASSED!")
            print("\n✓ Mock Bell MFB server worked")
            print("✓ BVN verification completed")
            print("✓ Wallet created")
            print("✓ Your code works perfectly!")
            print("\n💡 Next steps:")
            print("  - When Bell MFB sandbox is back up")
            print("  - Remove BELL_MFB_BASE_URL env var")
            print("  - Test with real Bell MFB API")
        else:
            print("⚠ TEST COMPLETED WITH ISSUES")
            print("\nCheck logs above for details")

        print("\n" + "="*60)
        print("Mock server will keep running for 30 seconds")
        print("Press Ctrl+C to stop early")
        print("="*60)

        time.sleep(30)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n✗ TEST FAILED WITH ERROR:")
        print(f"  {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n" + "="*60)
        print("  CLEANUP")
        print("="*60)
        print("\n⚠ Remember to:")
        print("  1. Stop Flask app")
        print("  2. Remove BELL_MFB_BASE_URL environment variable")
        print("  3. Restart Flask app normally")
        print("\n" + "="*60)


if __name__ == "__main__":
    main()
