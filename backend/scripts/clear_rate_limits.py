"""
Clear all rate limit keys from Redis
"""
import os
os.environ['FLASK_APP'] = 'app.py'

from app import create_app
import extension.extensions as ext

def clear_all_rate_limits():
    """Clear all rate limit keys"""
    app = create_app()

    with app.app_context():
        if not ext.redis_client:
            print("Redis client not available")
            return

        # Find all rate limit keys
        keys = ext.redis_client.keys('*rate_limit*')

        if not keys:
            print("No rate limit keys found")
            return

        print(f"Found {len(keys)} rate limit keys:")
        for key in keys:
            print(f"  - {key}")
            ext.redis_client.delete(key)

        print(f"\n✓ Cleared {len(keys)} rate limit keys")

if __name__ == "__main__":
    clear_all_rate_limits()
