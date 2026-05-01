# Install required package: pip install psycopg2-binary python-dotenv

import psycopg2
from psycopg2 import OperationalError, pool
from config import Config


class Database:
    """Handles PostgreSQL Database Connection with Connection Pooling"""

    def __init__(self):
        self.connection = None
        self.connection_pool = None
        self._init_pool()

    def _init_pool(self):
        """Initialize connection pool"""
        try:
            self.connection_pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=20,
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                port=Config.DB_PORT,
                sslmode=getattr(Config, "DB_SSLMODE", "require"),
            )
            print("PostgreSQL connection pool initialized successfully.")
        except OperationalError as e:
            print(f"Connection pool initialization failed: {e}")

    def connect(self):
        """Establish a connection to the database"""
        try:
            self.connection = psycopg2.connect(
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                port=Config.DB_PORT,
                sslmode=getattr(Config, "DB_SSLMODE", "require"),
            )
            print("PostgreSQL Database connected successfully.")
        except OperationalError as e:
            print(f"Database connection failed: {e}")
    
    def get_connection(self):
        """Return connection from pool (preferred) or fallback to direct connection"""
        try:
            if self.connection_pool:
                return self.connection_pool.getconn()
        except Exception as e:
            print(f"Error getting connection from pool: {e}")
        
        # Fallback to direct connection
        if self.connection is None or self.connection.closed:
            self.connect()
        if self.connection is None:
            raise RuntimeError("Database connection not available.")
        return self.connection

    def return_connection(self, conn):
        """Return connection to pool"""
        try:
            if self.connection_pool:
                self.connection_pool.putconn(conn)
        except Exception as e:
            print(f"Error returning connection to pool: {e}")

    def close_connection(self):
        """Closes the database connection safely (for direct connections only)"""
        try:
            if self.connection and not self.connection.closed:
                self.connection.close()
                print("Database connection closed successfully.")
        except Exception as e:
            print(f"Error closing database connection: {e}")
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        try:
            if self.connection_pool:
                self.connection_pool.closeall()
                print("All pool connections closed.")
        except Exception as e:
            print(f"Error closing pool connections: {e}")


# Initialize a database instance
db = Database()
