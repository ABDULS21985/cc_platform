#!/usr/bin/env python
"""
Quick BVN Verification Test with Paystack
Tests the new Paystack Identity integration

Usage:
    python test_bvn_with_paystack.py

Prerequisites:
    1. Flask app running: python app.py
    2. Celery worker running: celery -A modules.tasks.celery_app worker --loglevel=info --pool=solo
    3. Existing user account (or create one)
"""
import os
import sys

# Add color output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")


def check_environment():
    """Check if all required environment variables are set"""
    print_header("ENVIRONMENT CHECK")

    required_vars = {
        'PAYSTACK_SECRET_KEY': 'Paystack API key',
        'ENCRYPTION_KEY': 'Encryption key for BVN',
        'BELL_MFB_CLIENT_ID': 'Bell MFB client ID',
        'BELL_MFB_CLIENT_SECRET': 'Bell MFB client secret',
        'DATABASE_URL': 'PostgreSQL connection',
        'REDIS_URL': 'Redis connection'
    }

    missing = []
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if value:
            if var == 'PAYSTACK_SECRET_KEY':
                mode = "TEST" if value.startswith('sk_test_') else "LIVE"
                print_success(f"{desc}: Set ({mode} mode)")
            else:
                print_success(f"{desc}: Set")
        else:
            print_error(f"{desc}: NOT SET")
            missing.append(var)

    if missing:
        print_error(f"\nMissing environment variables: {', '.join(missing)}")
        print_info("Add them to your .env file and restart")
        return False

    print_success("\nAll environment variables configured!")
    return True


def test_paystack_provider():
    """Test Paystack provider directly"""
    print_header("PAYSTACK PROVIDER TEST")

    try:
        from modules.verification.providers.paystack_provider import PaystackProvider

        provider = PaystackProvider()
        print_success(f"Provider initialized: {provider.name}")
        print_info(f"Mode: {'TEST (FREE)' if provider.is_test_mode else 'LIVE (₦150/verification)'}")
        print_info(f"Base URL: {provider.base_url}")

        print_success("\nPaystack provider ready!")
        return True

    except ValueError as e:
        print_error(f"Configuration error: {str(e)}")
        return False
    except Exception as e:
        print_error(f"Provider test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def check_services():
    """Check if required services are running"""
    print_header("SERVICES CHECK")

    import requests
    from redis import Redis

    # Check Flask app
    try:
        response = requests.get("http://127.0.0.1:8080/healthcheck", timeout=2)
        if response.status_code == 200:
            print_success("Flask app: Running ✓")
        else:
            print_error("Flask app: Not responding properly")
            return False
    except requests.RequestException:
        print_error("Flask app: NOT RUNNING")
        print_warning("Start with: python app.py")
        return False

    # Check Redis
    try:
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        redis_client = Redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        print_success("Redis: Running ✓")
    except Exception as e:
        print_error(f"Redis: NOT RUNNING - {str(e)}")
        return False

    # Check Celery (just warn, don't fail)
    print_warning("Celery worker: Please verify it's running manually")
    print_info("Start with: celery -A modules.tasks.celery_app worker --loglevel=info --pool=solo")

    print_success("\nCore services are running!")
    return True


def run_verification_test():
    """Run the complete verification flow test"""
    print_header("RUNNING VERIFICATION FLOW TEST")

    print_info("Starting test_verification_flow.py...\n")

    # Import and run the test
    try:
        from test_verification_flow import main as run_flow_test
        run_flow_test()
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    return True


def main():
    """Main test runner"""
    print_header("BVN VERIFICATION WITH PAYSTACK - TEST SUITE")

    print_info("This will test:")
    print("  1. Environment configuration")
    print("  2. Paystack provider setup")
    print("  3. Required services (Flask, Redis, Celery)")
    print("  4. Complete verification flow")
    print("\n" + "-"*60 + "\n")

    # Step 1: Environment check
    if not check_environment():
        print_error("\n❌ Environment check failed!")
        print_info("Fix the issues above and try again")
        sys.exit(1)

    # Step 2: Test Paystack provider
    if not test_paystack_provider():
        print_error("\n❌ Paystack provider test failed!")
        sys.exit(1)

    # Step 3: Check services
    if not check_services():
        print_error("\n❌ Services check failed!")
        print_info("Make sure Flask app and Redis are running")
        sys.exit(1)

    # Step 4: Ask user if ready to proceed
    print("\n" + "="*60)
    print(f"{Colors.BOLD}{Colors.YELLOW}READY TO TEST VERIFICATION FLOW{Colors.END}")
    print("="*60)
    print("\nThis will:")
    print("  1. Login to your test account")
    print("  2. Submit BVN for verification")
    print("  3. Paystack will verify BVN (name/DOB matching)")
    print("  4. Bell MFB will create virtual account")
    print("  5. Wallet will be created")
    print("\n" + Colors.YELLOW + "⚠️  Make sure:" + Colors.END)
    print("  - You have edited test_verification_flow.py with correct:")
    print("    - EMAIL (existing user)")
    print("    - PASSWORD")
    print("    - BVN (with matching name/DOB)")
    print("  - Celery worker is running")
    print()

    response = input("Proceed with verification test? (y/n): ")
    if response.lower() != 'y':
        print_warning("\nTest cancelled")
        return

    # Step 5: Run verification test
    run_verification_test()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_warning("\n\nTest interrupted by user")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n\nTest failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
