
import os
from app import create_app
from modules.auth_v2.extensions import db

app = create_app()

with app.app_context():
    print("--- DETECTED PARAMETERS ---")
    print(f"Database URL present: {bool(app.config.get('SQLALCHEMY_DATABASE_URI'))}")
    print(f"Registered Blueprints: {list(app.blueprints.keys())}")
    print("--- DETECTED MODELS ---")
    model_names = list(db.metadata.tables.keys())
    if model_names:
        print(f"Found {len(model_names)} tables in metadata:")
        for table in sorted(model_names):
            print(f" - {table}")
    else:
        print("NO MODELS FOUND in db.metadata. This confirms the issue.")
