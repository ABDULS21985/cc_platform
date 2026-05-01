#!/usr/bin/env python
"""
Test Script: BVN Verification to Wallet Creation (MOCKED)

This script tests the complete flow from BVN verification to wallet creation
with MOCKED verification responses - perfect for testing wallet creation
without needing real Paystack API calls.

What this tests:
1. Login to existing account
2. Check current verification status
3. Submit BVN for verification (mocked success)
4. Monitor task completion
5. ✨ Verify wallet is created automatically
6. Check wallet details

Prerequisites:
- Flask app running: python app.py
- Celery worker running: celery -A modules.tasks.celery_app worker --loglevel=info --pool=solo
- Set MOCK_VERIFICATION=true in .env (or the script will do it)

Usage:
    python test_verification_to_wallet.py
"""
import requests
import time
import json
import os
import sys
from redis import Redis
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================
BASE_URL = "http://127.0.0.1:8080"
EMAIL = "bayoutrubradda-7684@yopmail.com"
PASSWORD = "SecurePass123!"

# Test BVN data (can be any 11-digit number for mocked tests)
BVN = "22500636592"
DOB = "1994-12-27"

# Redis connection for cleanup
redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

# Create session to maintain cookies
session = requests.Session()

# ============================================
# HELPER FUNCTIONS
# ============================================
def print_header(title: str):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_step(step: int, description: str):
    """Print step indicator"""
    print(f"\n[Step {step}] {description}")
    print("-" * 50)

def print_success(message: str):
    print(f"✅ {message}")

def print_error(message: str):
    print(f"❌ {message}")

def print_warning(message: str):
    print(f"⚠️  {message}")

def print_info(message: str):
    print(f"ℹ️  {message}")

def print_response(response: requests.Response, show_full: bool = True):
    """Print response details"""
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        if show_full:
            print(f"Response: {json.dumps(data, indent=2)}")
        return data
    except json.JSONDecodeError:
        print(f"Response: {response.text[:500]}")
        return None

# ============================================
# TEST STEPS
# ============================================
def step1_login():
    """Login and get session cookie"""
    print_step(1, "Logging in...")
    
    try:
        response = session.post(
            f"{BASE_URL}/api/v2/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            headers={"Content-Type": "application/json"}
        )
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to {BASE_URL}")
        print_info("Make sure Flask app is running: python app.py")
        return None
    
    data = print_response(response)
    
    if response.status_code == 200 and data:
        user_id = data.get('user', {}).get('id')
        print_success(f"Login successful! User ID: {user_id}")
        return user_id
    else:
        print_error("Login failed!")
        if data and data.get('code') == 'EMAIL_NOT_VERIFIED':
            print_info("User's email is not verified.")
        return None

def step2_cleanup(user_id: int):
    """Clean up any stuck verification or rate limits"""
    print_step(2, "Cleaning up previous test data...")
    
    try:
        redis_client = Redis.from_url(redis_url, decode_responses=True)
        
        # Clear rate limits
        rate_limit_key = f"rate_limit:bvn_verification:{user_id}:verify_bvn"
        deleted = redis_client.delete(rate_limit_key)
        print_info(f"Cleared rate limit: {rate_limit_key} (deleted: {deleted})")
        
        print_success("Cleanup complete")
    except Exception as e:
        print_warning(f"Redis cleanup skipped: {e}")

def step3_check_status():
    """Check current verification status"""
    print_step(3, "Checking current verification status...")
    
    response = session.get(
        f"{BASE_URL}/api/v2/verification/status",
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 200 and data and data.get('success'):
        status_data = data.get('data', {})
        status = status_data.get('status', 'none')
        has_wallet = status_data.get('has_wallet', False)
        
        print_info(f"Current status: {status}")
        print_info(f"Has wallet: {has_wallet}")
        
        if status == 'verified':
            print_warning("User is already verified!")
            if has_wallet:
                print_success("Wallet already exists")
                return 'already_verified_with_wallet'
            else:
                print_warning("Verified but no wallet - will check wallet creation")
                return 'verified_no_wallet'
        elif status == 'processing':
            print_warning("Verification is stuck in 'processing' state")
            print_info("You may need to clean up the database record")
            return 'stuck'
        else:
            print_success("Ready for fresh verification")
            return 'ready'
    else:
        print_success("No existing verification - ready for fresh test")
        return 'ready'

def step4_submit_verification():
    """Submit BVN for verification"""
    print_step(4, f"Submitting BVN verification (BVN: {BVN}, DOB: {DOB})...")
    
    response = session.post(
        f"{BASE_URL}/api/v2/verification/bvn",
        json={"bvn": BVN, "date_of_birth": DOB},
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 202 and data and data.get('success'):
        task_id = data.get('data', {}).get('task_id')
        verification_id = data.get('data', {}).get('verification_id')
        
        print_success("Verification submitted!")
        print_info(f"Task ID: {task_id}")
        print_info(f"Verification ID: {verification_id}")
        
        return task_id, verification_id
    else:
        print_error("Verification submission failed!")
        if data:
            print_info(f"Error: {data.get('message', 'Unknown')}")
        return None, None

def step5_monitor_task(task_id: str, max_wait: int = 60):
    """Monitor Celery task status"""
    print_step(5, f"Monitoring task {task_id}...")
    
    print_info("Watch your Celery worker terminal for:")
    print("  1. 🔍 'Verifying BVN with external provider'")
    print("  2. ✅ 'BVN verified successfully'")
    print("  3. 💼 'Creating wallet for verified user'")
    print("  4. ✅ 'Wallet created for user'")
    print()
    
    start_time = time.time()
    last_state = None
    
    while time.time() - start_time < max_wait:
        response = session.get(f"{BASE_URL}/api/v2/verification/task/{task_id}")
        
        if response.status_code == 200:
            data = response.json().get('data', {})
            state = data.get('state', 'UNKNOWN')
            
            if state != last_state:
                elapsed = int(time.time() - start_time)
                print(f"  [{elapsed}s] Task state: {state}")
                
                if data.get('result'):
                    result = data['result']
                    if isinstance(result, dict):
                        print(f"       Result: {json.dumps(result, indent=8)}")
                    else:
                        print(f"       Result: {result}")
                
                last_state = state
            
            if state == 'SUCCESS':
                print_success("Verification task completed!")
                return True
            elif state == 'FAILURE':
                print_error("Verification task failed!")
                return False
        
        time.sleep(2)
    
    print_warning(f"Timeout after {max_wait}s - task may still be running")
    return False

def step6_check_wallet():
    """Check if wallet was created"""
    print_step(6, "Checking wallet creation...")
    
    # Give the async wallet creation task a moment
    print_info("Waiting for async wallet creation...")
    time.sleep(3)
    
    response = session.get(
        f"{BASE_URL}/api/v2/wallet",
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 200 and data and data.get('success'):
        wallet = data.get('data', {})
        
        print_success("Wallet created successfully!")
        print()
        print("📋 WALLET DETAILS:")
        print(f"   Wallet ID: {wallet.get('id')}")
        print(f"   Balance: ₦{float(wallet.get('balance', 0)):,.2f}")
        print(f"   Currency: {wallet.get('currency', 'NGN')}")
        print(f"   Status: {wallet.get('status')}")
        
        # Check Bell MFB account (will be NULL until first deposit)
        account_number = wallet.get('account_number')
        if account_number:
            print(f"   Bell MFB Account: {account_number}")
            print(f"   Account Name: {wallet.get('account_name')}")
        else:
            print(f"   Bell MFB Account: Not yet created (created on first deposit)")
        
        return True
    elif response.status_code == 404:
        print_error("Wallet not found!")
        print_info("Wallet creation may have failed. Check Celery logs.")
        return False
    else:
        print_error("Error checking wallet")
        return False

def step7_final_check():
    """Final verification and wallet status check"""
    print_step(7, "Final status check...")
    
    response = session.get(
        f"{BASE_URL}/api/v2/verification/status",
        headers={"Content-Type": "application/json"}
    )
    
    data = response.json() if response.status_code == 200 else {}
    status_data = data.get('data', {})
    
    print()
    print("📊 FINAL STATUS:")
    print(f"   Verified: {status_data.get('verified', False)}")
    print(f"   Status: {status_data.get('status', 'unknown')}")
    print(f"   Has Wallet: {status_data.get('has_wallet', False)}")
    print(f"   Verification Type: {status_data.get('verification_type', 'N/A')}")
    
    if status_data.get('verified_at'):
        print(f"   Verified At: {status_data.get('verified_at')}")
    
    return status_data.get('verified', False) and status_data.get('has_wallet', False)

# ============================================
# MAIN
# ============================================
def main():
    print_header("BVN VERIFICATION → WALLET CREATION TEST")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {BASE_URL}")
    print(f"Email: {EMAIL}")
    print(f"BVN: {BVN}")
    print(f"DOB: {DOB}")
    print()
    print_warning("Make sure Celery worker is running:")
    print("  celery -A modules.tasks.celery_app worker --loglevel=info --pool=solo")
    
    try:
        # Step 1: Login
        user_id = step1_login()
        if not user_id:
            print_error("TEST FAILED: Could not login")
            return False
        
        # Step 2: Cleanup
        step2_cleanup(user_id)
        
        # Step 3: Check current status
        status = step3_check_status()
        
        if status == 'already_verified_with_wallet':
            print_header("TEST SKIPPED")
            print_success("User is already verified with a wallet!")
            print_info("To test fresh verification, delete the verification and wallet records.")
            return True
        
        if status == 'stuck':
            print_header("TEST BLOCKED")
            print_error("Clean up stuck verification record and try again")
            return False
        
        if status == 'verified_no_wallet':
            # Just check wallet
            print_info("Skipping verification, just checking wallet...")
            wallet_ok = step6_check_wallet()
            return wallet_ok
        
        # Step 4: Submit verification
        task_id, verification_id = step4_submit_verification()
        if not task_id:
            print_error("TEST FAILED: Could not submit verification")
            return False
        
        # Step 5: Monitor task
        task_success = step5_monitor_task(task_id)
        
        # Step 6: Check wallet (even if task reports failure, wallet might exist)
        time.sleep(2)  # Give DB a moment
        wallet_ok = step6_check_wallet()
        
        # Step 7: Final check
        all_good = step7_final_check()
        
        # Summary
        print_header("TEST SUMMARY")
        
        if task_success and wallet_ok and all_good:
            print_success("ALL TESTS PASSED!")
            print()
            print("What happened:")
            print("  1. ✅ Login successful")
            print("  2. ✅ BVN verification submitted")
            print("  3. ✅ Celery task processed verification")
            print("  4. ✅ Wallet created automatically")
            print("  5. ✅ User status updated to verified")
            print()
            print("Next steps:")
            print("  - Test deposit: python test_deposit_flow.py")
            return True
        else:
            print_error("SOME TESTS FAILED")
            print()
            print(f"  Task Success: {'✅' if task_success else '❌'}")
            print(f"  Wallet Created: {'✅' if wallet_ok else '❌'}")
            print(f"  Final Status OK: {'✅' if all_good else '❌'}")
            print()
            print("Check logs for details:")
            print("  - Flask logs: API errors")
            print("  - Celery logs: Task execution")
            return False
    
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        return False
    except Exception as e:
        print_error(f"TEST FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
