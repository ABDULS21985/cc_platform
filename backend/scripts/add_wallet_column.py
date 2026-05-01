#!/usr/bin/env python
"""
Quick Database Migration Script
Adds the missing bell_mfb_external_reference column to the wallets table.

Run: python add_wallet_column.py
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database credentials from environment
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_SSLMODE = os.getenv('DB_SSLMODE', 'require')

if not all([DB_HOST, DB_USER, DB_PASSWORD, DB_NAME]):
    print("❌ Database credentials not found in environment")
    print("   Make sure .env file exists with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME")
    sys.exit(1)

print(f"📦 Connecting to database...")

try:
    import psycopg2
    from psycopg2 import sql
    
    # Connect to the database
    conn = psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        sslmode=DB_SSLMODE
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("✅ Connected to database")
    
    # Check if column already exists
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'bell_mfb_external_reference'
    """)
    
    if cursor.fetchone():
        print("ℹ️  Column 'bell_mfb_external_reference' already exists")
    else:
        print("📝 Adding column 'bell_mfb_external_reference' to wallets table...")
        
        cursor.execute("""
            ALTER TABLE wallets 
            ADD COLUMN bell_mfb_external_reference VARCHAR(255) NULL
        """)
        
        print("✅ Column added successfully!")
    
    # Verify all expected columns exist
    print("\n📋 Verifying wallets table columns:")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'wallets'
        ORDER BY ordinal_position
    """)
    
    columns = cursor.fetchall()
    for col in columns:
        print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
    
    # Check for any other missing columns from the model
    expected_columns = [
        'id', 'user_id', 'balance', 'currency', 'status',
        'account_number', 'account_name', 
        'bell_mfb_client_id', 'bell_mfb_external_reference',
        'created_at', 'updated_at'
    ]
    
    existing_columns = [col[0] for col in columns]
    missing = [c for c in expected_columns if c not in existing_columns]
    
    if missing:
        print(f"\n⚠️  Missing columns: {missing}")
    else:
        print("\n✅ All expected columns exist!")
    
    cursor.close()
    conn.close()
    
    print("\n🎉 Migration complete! You can now run the test again.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
