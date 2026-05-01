#!/usr/bin/env python
"""
Test Script: Simulate Bell MFB Webhook

This script simulates a Bell MFB webhook notification to test
the wallet crediting flow.

Usage:
    python test_webhook_simulation.py <account_number> <amount>
    
Example:
    python test_webhook_simulation.py 0000000033 1000

Requirements:
    - Flask app running on http://127.0.0.1:8080
    - BELL_MFB_WEBHOOK_SECRET set in .env
"""

import requests
import json
import sys
import hmac
import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================
# CONFIGURATION
# ============================================
BASE_URL = "http://127.0.0.1:8080"
WEBHOOK_SECRET = os.getenv('BELL_MFB_WEBHOOK_SECRET', 'your_webhook_secret_here')

# ============================================
# HELPER FUNCTIONS
# ============================================
def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook"""
    return hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_response(response: requests.Response):
    """Print response details"""
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        return data
    except json.JSONDecodeError:
        print(f"Response: {response.text[:500]}")
        return None

# ============================================
# MAIN
# ============================================
def main():
    print_header("BELL MFB WEBHOOK SIMULATION")
    
    # Parse arguments
    if len(sys.argv) < 3:
        print("Usage: python test_webhook_simulation.py <account_number> <amount>")
        print("Example: python test_webhook_simulation.py 0000000033 1000")
        sys.exit(1)
    
    account_number = sys.argv[1]
    amount = float(sys.argv[2])
    
    # Calculate fees (example: 2% fee)
    fee = round(amount * 0.02, 2)
    net_amount = amount - fee
    stamp_duty = 50 if amount >= 10000 else 0
    
    print(f"Account Number: {account_number}")
    print(f"Amount: ₦{amount:,.2f}")
    print(f"Fee: ₦{fee:,.2f}")
    print(f"Net Amount: ₦{net_amount:,.2f}")
    print(f"Stamp Duty: ₦{stamp_duty:,.2f}")
    
    # Generate a unique reference
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    reference = f"BELL_SIM_{timestamp}"
    
    # Build webhook payload (matching Bell MFB format)
    payload = {
        "event": "collection",
        "reference": reference,
        "virtualAccount": account_number,
        "externalReference": f"EXT_{timestamp}",
        "amountReceived": str(amount),
        "transactionFee": fee,
        "netAmount": net_amount,
        "stampDuty": stamp_duty,
        "sessionId": f"SIM_{timestamp}_SESSION",
        "sourceCurrency": "NGN",
        "sourceAccountNumber": "1234567890",
        "sourceAccountName": "Test Sender",
        "sourceBankCode": "058",
        "sourceBankName": "GTBank (Simulated)",
        "remarks": f"Test deposit simulation - {timestamp}",
        "destinationCurrency": "NGN",
        "status": "successful",
        "createdAt": int(datetime.now().timestamp() * 1000),
        "updatedAt": int(datetime.now().timestamp() * 1000)
    }
    
    # Convert payload to JSON string
    payload_json = json.dumps(payload, separators=(',', ':'))
    
    # Generate signature
    signature = generate_signature(payload_json, WEBHOOK_SECRET)
    
    print(f"\nReference: {reference}")
    print(f"Signature: {signature[:40]}...")
    
    print("\n" + "-" * 60)
    print("Sending webhook...")
    print("-" * 60)
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v2/wallet/webhook",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Signature": signature
            }
        )
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BASE_URL}")
        print("Make sure the Flask app is running: python app.py")
        sys.exit(1)
    
    data = print_response(response)
    
    if response.status_code == 200 and data and data.get('success'):
        print("\n✅ Webhook processed successfully!")
        print(f"   Transaction ID: {data.get('data', {}).get('transaction_id')}")
        print(f"   Internal Reference: {data.get('data', {}).get('reference')}")
        
        if data.get('duplicate'):
            print("   ⚠️  This was a duplicate webhook (already processed)")
    elif response.status_code == 401:
        print("\n❌ Signature verification failed!")
        print("   Make sure BELL_MFB_WEBHOOK_SECRET in .env matches the signature secret.")
    elif response.status_code == 404:
        print("\n❌ Wallet not found!")
        print(f"   No wallet found for account number: {account_number}")
        print("   Make sure the user has initiated a deposit first.")
    else:
        print(f"\n❌ Webhook failed with status {response.status_code}")
    
    print_header("SIMULATION COMPLETE")
    print("\nTo verify the wallet balance was updated:")
    print("  1. Login with the user credentials")
    print("  2. Check GET /api/v2/wallet for updated balance")
    print()

if __name__ == "__main__":
    main()
