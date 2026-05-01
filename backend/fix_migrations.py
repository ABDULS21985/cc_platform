#!/usr/bin/env python
"""Fix corrupted migration history by truncating and reapplying migrations."""

import os
import sys

os.environ['FLASK_ENV'] = 'development'

try:
    from app import create_app
    from database.connection import db
    from sqlalchemy import text
    
    app = create_app()
    with app.app_context():
        print("Connecting to database...")
        
        # Show current state
        try:
            result = db.session.execute(text('SELECT version_num FROM alembic_version'))
            bad_migrations = [row[0] for row in result]
            if bad_migrations:
                print(f"Found corrupted migrations: {bad_migrations}")
        except:
            print("No alembic_version table found (expected for fresh DB)")
        
        # Truncate the migration table
        try:
            db.session.execute(text('TRUNCATE TABLE alembic_version CASCADE'))
            db.session.commit()
            print("✓ Cleared migration history")
        except Exception as e:
            print(f"Error truncating table: {e}")
            # Try delete instead
            try:
                db.session.execute(text('DELETE FROM alembic_version'))
                db.session.commit()
                print("✓ Cleared migration history (via DELETE)")
            except Exception as e2:
                print(f"Could not clear migrations: {e2}")
        
        print("\nNow run: python manage.py db upgrade")
        
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
