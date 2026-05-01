import os
from typesense import Client
from dotenv import load_dotenv

load_dotenv()

env = os.getenv("ENV", "production")

# Make Typesense optional - won't crash if not configured
client = None

try:
    if env == "development":
        api_key = os.getenv("TYPESENSE_API_KEY")
        if api_key:
            client = Client(
                {
                    "nodes": [
                        {
                            "host": "localhost",
                            "port": int(os.getenv("TYPESENSE_PORT", "8108")),
                            "protocol": os.getenv("TYPESENSE_PROTOCOL", "http"),
                        }
                    ],
                    "api_key": api_key,
                    "connection_timeout_seconds": 2,
                }
            )
        else:
            print("⚠️  Typesense API key not configured, search features will be disabled")
    else:
        api_key = os.getenv("TYPESENSE_PROD_API_KEY")
        host = os.getenv("TYPESENSE_PROD_HOST")
        if api_key and host:
            client = Client(
                {
                    "nodes": [
                        {
                            "host": host,
                            "port": int(os.getenv("TYPESENSE_PROD_PORT", "443")),
                            "protocol": os.getenv("TYPESENSE_PROD_PROTOCOL", "https"),
                        }
                    ],
                    "api_key": api_key,
                    "connection_timeout_seconds": 2,
                }
            )
        else:
            print("⚠️  Typesense not configured, search features will be disabled")
except Exception as e:
    print(f"⚠️  Failed to initialize Typesense: {e}")
    print("⚠️  Search features will be disabled")
    client = None
