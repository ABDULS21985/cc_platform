#!/usr/bin/env python
"""Clear all migration records from database to allow fresh upgrade."""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Get database credentials the same way as app.py
db_host = os.getenv("DB_HOST", "localhost")
db_user = os.getenv("DB_USER", "postgres")
db_password = os.getenv("DB_PASSWORD", "")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "ccpay")

if not all([db_host, db_user, db_name]):
    print("ERROR: Missing database configuration (DB_HOST, DB_USER, DB_NAME)")
    exit(1)

try:
    conn = psycopg2.connect(
        host=db_host,
        port=int(db_port),
        user=db_user,
        password=db_password,
        database=db_name
    )
    
    cursor = conn.cursor()
    
    # Check current state
    cursor.execute("SELECT version_num FROM alembic_version")
    rows = cursor.fetchall()
    print(f"Current migrations in DB: {[r[0] for r in rows]}")
    
    # Delete all
    cursor.execute("DELETE FROM alembic_version")
    conn.commit()
    print("✓ Cleared all migration records")
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM alembic_version")
    count = cursor.fetchone()[0]
    print(f"Remaining records: {count}")
    
    cursor.close()
    conn.close()
    print("\nNow run: python manage.py db upgrade")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
