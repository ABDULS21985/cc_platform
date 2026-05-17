# Multi-stage Dockerfile for CCP-Backend
# Optimized for Google Cloud Run deployment

# Stage 1: Build stage
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy runtime requirements first (for Docker layer caching)
COPY requirements-prod.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --default-timeout=1000 --no-cache-dir -r requirements-prod.txt

# Stage 2: Production stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser . .

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/v2/auth/health || exit 1

# Entrypoint script to run Flask-Migrate migrations before starting the app
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Running database migrations..."\n\
flask db upgrade\n\
echo "Starting application..."\n\
exec gunicorn --worker-class eventlet -w 1 -b 0.0.0.0:8080 --timeout 120 app:application' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Switch to non-root user
USER appuser

# Run the application with migrations
CMD ["/app/entrypoint.sh"]
