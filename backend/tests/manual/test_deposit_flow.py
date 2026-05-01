#!/usr/bin/env python
"""
Test Script: Deposit Flow with Bell MFB Integration

This script tests the complete deposit flow:
1. Login with credentials
2. Check wallet status
3. Initiate a deposit
4. Verify Bell MFB account details are returned

Usage:
    python test_deposit_flow.py

Requirements:
    - Flask app running on http://127.0.0.1:8080
    - User must be verified (BVN/NIN completed)
"""

import requests
import json
import sys
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================
BASE_URL = "http://127.0.0.1:8080"
EMAIL = "bayoutrubradda-7684@yopmail.com"
PASSWORD = "SecurePass123!"

# Test deposit amount (in Naira)
DEPOSIT_AMOUNT = 1000.00

# ============================================
# HELPER FUNCTIONS
# ============================================
def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_step(step: int, description: str):
    """Print a step indicator"""
    print(f"\n[Step {step}] {description}")
    print("-" * 50)

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

def print_success(message: str):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message: str):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message: str):
    """Print info message"""
    print(f"ℹ️  {message}")

# ============================================
# MAIN TEST FLOW
# ============================================
def main():
    print_header("DEPOSIT FLOW TEST")
    print(f"Base URL: {BASE_URL}")
    print(f"Email: {EMAIL}")
    print(f"Deposit Amount: ₦{DEPOSIT_AMOUNT:,.2f}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Create session to maintain cookies
    session = requests.Session()
    
    # ----------------------------------------
    # STEP 1: Login
    # ----------------------------------------
    print_step(1, "Logging in...")
    
    try:
        response = session.post(
            f"{BASE_URL}/api/v2/auth/login",
            json={
                "email": EMAIL,
                "password": PASSWORD
            },
            headers={"Content-Type": "application/json"}
        )
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to {BASE_URL}")
        print_info("Make sure the Flask app is running: python app.py")
        sys.exit(1)
    
    data = print_response(response)
    
    if response.status_code != 200:
        print_error("Login failed!")
        if data and data.get('code') == 'EMAIL_NOT_VERIFIED':
            print_info("User's email is not verified. Please verify email first.")
        sys.exit(1)
    
    print_success("Login successful!")
    
    # ----------------------------------------
    # STEP 2: Check Verification Status
    # ----------------------------------------
    print_step(2, "Checking verification status...")
    
    response = session.get(
        f"{BASE_URL}/api/v2/verification/status",
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 200 and data:
        verified = data.get('data', {}).get('verified', False)
        has_wallet = data.get('data', {}).get('has_wallet', False)
        
        if verified:
            print_success(f"User is verified: {data.get('data', {}).get('status')}")
        else:
            print_error("User is NOT verified!")
            print_info("Please complete BVN/NIN verification first.")
            sys.exit(1)
        
        if has_wallet:
            print_success("User has a wallet")
        else:
            print_error("User does NOT have a wallet!")
            print_info("Wallet should be created automatically after verification.")
            sys.exit(1)
    
    # ----------------------------------------
    # STEP 3: Get Current Wallet Info
    # ----------------------------------------
    print_step(3, "Getting wallet info...")
    
    response = session.get(
        f"{BASE_URL}/api/v2/wallet",
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 200 and data:
        wallet = data.get('data', {})
        print_info(f"Wallet ID: {wallet.get('id')}")
        print_info(f"Current Balance: ₦{float(wallet.get('balance', 0)):,.2f}")
        print_info(f"Currency: {wallet.get('currency', 'NGN')}")
        print_info(f"Status: {wallet.get('status')}")
        
        # Check if Bell MFB account exists
        account_number = wallet.get('account_number')
        if account_number:
            print_success(f"Bell MFB Account: {account_number}")
        else:
            print_info("No Bell MFB account yet (will be created on deposit)")
    
    # ----------------------------------------
    # STEP 4: Initiate Deposit
    # ----------------------------------------
    print_step(4, f"Initiating deposit of ₦{DEPOSIT_AMOUNT:,.2f}...")
    
    response = session.post(
        f"{BASE_URL}/api/v2/wallet/deposit",
        json={
            "amount": DEPOSIT_AMOUNT,
            "description": "Test deposit from script"
        },
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response)
    
    if response.status_code == 200 and data and data.get('success'):
        deposit_data = data.get('data', {})
        
        print_success("Deposit initiated successfully!")
        print()
        print("📋 DEPOSIT DETAILS:")
        print(f"   Transaction ID: {deposit_data.get('transaction_id')}")
        print(f"   Reference: {deposit_data.get('reference')}")
        print(f"   Amount: ₦{deposit_data.get('amount')}")
        print(f"   Status: {deposit_data.get('status')}")
        
        bank_details = deposit_data.get('bank_details', {})
        if bank_details:
            print()
            print("🏦 BANK DETAILS (Transfer to this account):")
            print(f"   Account Number: {bank_details.get('account_number')}")
            print(f"   Account Name: {bank_details.get('account_name')}")
            print(f"   Bank Name: {bank_details.get('bank_name')}")
        
        instructions = deposit_data.get('instructions')
        if instructions:
            print()
            print(f"📝 Instructions: {instructions}")
        
        message = deposit_data.get('message')
        if message:
            print(f"💬 Message: {message}")
    else:
        print_error("Deposit failed!")
        if data:
            print_info(f"Error: {data.get('message', 'Unknown error')}")
            print_info(f"Code: {data.get('error', 'N/A')}")
        
        if response.status_code == 403:
            print_info("Verification required. Complete BVN/NIN verification first.")
        elif response.status_code == 404:
            print_info("Wallet not found. Complete verification to create wallet.")
    
    # ----------------------------------------
    # STEP 5: Verify Wallet Updated (Optional)
    # ----------------------------------------
    print_step(5, "Verifying wallet after deposit initiation...")
    
    response = session.get(
        f"{BASE_URL}/api/v2/wallet",
        headers={"Content-Type": "application/json"}
    )
    
    data = print_response(response, show_full=False)
    
    if response.status_code == 200 and data:
        wallet = data.get('data', {})
        account_number = wallet.get('account_number')
        
        if account_number:
            print_success(f"Bell MFB Account confirmed: {account_number}")
            print_info(f"Account Name: {wallet.get('account_name')}")
        else:
            print_info("Bell MFB account creation may have failed. Check logs.")
    
    # ----------------------------------------
    # DONE
    # ----------------------------------------
    print_header("TEST COMPLETE")
    print()
    print("📌 NEXT STEPS:")
    print("   1. Transfer the deposit amount to the bank account shown above")
    print("   2. Bell MFB will send a webhook notification when payment is received")
    print("   3. Your wallet balance will be credited automatically")
    print()
    print("🔧 TO TEST WEBHOOK (simulate Bell MFB notification):")
    print("   See: test_webhook_simulation.py")
    print()

if __name__ == "__main__":
    main()
