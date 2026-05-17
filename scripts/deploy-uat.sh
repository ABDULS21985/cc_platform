#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.uat.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.uat}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-240}"
UAT_RUNTIME_DIR="${UAT_RUNTIME_DIR:-$ROOT_DIR/.uat}"
export NGINX_CONF_PATH="${NGINX_CONF_PATH:-$UAT_RUNTIME_DIR/nginx/default.conf}"

SKIP_BUILD=0
SKIP_MIGRATE=0
SKIP_PROXY=0
WRITE_ENV_ONLY=0
FORCE_RECREATE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/deploy-uat.sh [options]

Options:
  --env-file PATH       Use a custom UAT env file. Default: .env.uat
  --compose-file PATH   Use a custom compose file. Default: docker-compose.uat.yml
  --skip-build          Do not run docker compose build
  --skip-migrate        Do not run Flask database migrations
  --skip-proxy          Do not start the bundled Nginx/Certbot proxy
  --force-recreate      Force container recreation during up
  --write-env-only      Create/validate the env file, then exit
  -h, --help            Show this help

First-run configuration can be supplied with environment variables:
  UAT_DOMAIN=uat.example.com
  UAT_SERVER_IP=203.0.113.10
  UAT_URL=https://uat.example.com
  TLS_EMAIL=ops@example.com
  NEXT_PUBLIC_API_URL=https://uat.example.com/api

Optional provider values can also be exported before first run and will be
written to .env.uat:
  CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  PAYSTACK_SECRET_KEY=...
  SAFEHAVEN_BASE_URL=...
  SAFEHAVEN_PRIVATE_KEY_PEM=...

Existing .env.uat files are never overwritten.
DNS must point UAT_DOMAIN at UAT_SERVER_IP before Nginx/Certbot can issue TLS.
USAGE
}

log() {
  printf '[uat] %s\n' "$*"
}

warn() {
  printf '[uat] warning: %s\n' "$*" >&2
}

fail() {
  printf '[uat] error: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:?--env-file requires a path}"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="${2:?--compose-file requires a path}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --skip-proxy)
      SKIP_PROXY=1
      shift
      ;;
    --force-recreate)
      FORCE_RECREATE=1
      shift
      ;;
    --write-env-only)
      WRITE_ENV_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH"
}

random_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

fernet_key() {
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '\n'
}

env_file_value() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 0
  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

config_value() {
  local key="$1"
  if [[ -n "${!key-}" ]]; then
    printf '%s' "${!key}"
  else
    env_file_value "$key"
  fi
}

prompt_value() {
  local key="$1"
  local prompt="$2"
  local default="${3:-}"
  local value

  value="$(config_value "$key")"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return 0
  fi

  if [[ -n "$default" ]]; then
    if [[ ! -t 0 ]]; then
      printf '%s' "$default"
      return 0
    fi
    read -r -p "$prompt [$default]: " value
    printf '%s' "${value:-$default}"
  else
    [[ -t 0 ]] || fail "$key is required. Set it in the environment or create $ENV_FILE."
    read -r -p "$prompt: " value
    [[ -n "$value" ]] || fail "$key cannot be empty"
    printf '%s' "$value"
  fi
}

require_https_url() {
  local key="$1"
  local value="$2"
  [[ "$value" == https://* ]] || fail "$key must be an HTTPS URL"
}

normalize_https_url() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value%/}"

  if [[ "$value" == http://* ]]; then
    fail "public UAT URLs must use HTTPS, not HTTP: $value"
  fi
  if [[ "$value" != https://* ]]; then
    value="https://$value"
  fi
  printf '%s' "$value"
}

host_from_url() {
  local url="$1"
  url="${url#http://}"
  url="${url#https://}"
  url="${url%%/*}"
  url="${url%%:*}"
  printf '%s' "$url"
}

require_not_placeholder() {
  local key="$1"
  local value="$2"
  [[ -n "$value" ]] || fail "$key is required"
  [[ "$value" != replace-with-* ]] || fail "$key is still a placeholder"
  [[ "$value" != your-* ]] || fail "$key is still a placeholder"
}

optional_env_value() {
  local key="$1"
  local value
  value="$(config_value "$key")"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

create_env_file_if_missing() {
  if [[ -f "$ENV_FILE" ]]; then
    log "using existing env file: $ENV_FILE"
    return 0
  fi

  require_cmd openssl

  log "creating $ENV_FILE"

  local public_url
  local domain
  local server_ip
  local tls_email
  local next_public_api_url

  public_url="$(normalize_https_url "$(prompt_value UAT_URL "Public UAT URL" "${UAT_DOMAIN:+https://$UAT_DOMAIN}")")"
  domain="$(host_from_url "$public_url")"
  server_ip="$(prompt_value UAT_SERVER_IP "UAT server public IP" "${UAT_SERVER_IP:-}")"
  tls_email="$(prompt_value TLS_EMAIL "TLS/Let's Encrypt contact email" "${TLS_EMAIL:-}")"
  next_public_api_url="$(normalize_https_url "$(prompt_value NEXT_PUBLIC_API_URL "Frontend API URL" "$public_url/api")")"

  require_https_url UAT_URL "$public_url"
  require_https_url NEXT_PUBLIC_API_URL "$next_public_api_url"

  umask 077
  cat > "$ENV_FILE" <<EOF
# Generated by scripts/deploy-uat.sh
# Do not commit this file.

COMPOSE_PROJECT_NAME=cc-platform-uat
IMAGE_TAG=uat
UAT_DOMAIN=$domain
UAT_SERVER_IP=$server_ip
TLS_EMAIL=$tls_email
NGINX_CONF_PATH=$NGINX_CONF_PATH

APP_ENV=uat
FLASK_ENV=production
ENV=uat
DEBUG=False
PORT=8080

DB_NAME=ccp_uat
DB_USER=ccp
DB_PASSWORD=$(random_secret)
DB_HOST_PORT=5434
DB_BIND_ADDRESS=127.0.0.1
DB_SSLMODE=disable

REDIS_PORT=6381
REDIS_BIND_ADDRESS=127.0.0.1
TYPESENSE_HOST_PORT=8109
TYPESENSE_BIND_ADDRESS=127.0.0.1
TYPESENSE_API_KEY=$(random_secret)

BACKEND_PORT=18080
BACKEND_BIND_ADDRESS=127.0.0.1
HTTP_BIND_ADDRESS=0.0.0.0
HTTPS_BIND_ADDRESS=0.0.0.0

SECRET_KEY=$(random_secret)
FLASK_SECRET_KEY=$(random_secret)
JWT_SECRET_KEY=$(random_secret)
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=86400
ENCRYPTION_KEY=$(fernet_key)

FRONTEND_URL=$public_url
ALLOWED_ORIGINS=$public_url
NEXT_PUBLIC_API_URL=$next_public_api_url
API_HOST=$domain
SESSION_COOKIE_SAMESITE=Lax
SESSION_LIFETIME=604800

CLOUDINARY_CLOUD_NAME=$(optional_env_value CLOUDINARY_CLOUD_NAME)
CLOUDINARY_API_KEY=$(optional_env_value CLOUDINARY_API_KEY)
CLOUDINARY_API_SECRET=$(optional_env_value CLOUDINARY_API_SECRET)
CLOUDINARY_UPLOAD_FOLDER=${CLOUDINARY_UPLOAD_FOLDER:-community_posts}

FIREBASE_CREDENTIALS=$(optional_env_value FIREBASE_CREDENTIALS)
ENABLE_PUSH_NOTIFICATIONS=${ENABLE_PUSH_NOTIFICATIONS:-false}
FCM_ENABLED=${FCM_ENABLED:-false}

MAIL_SERVER=${MAIL_SERVER:-smtp.gmail.com}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USE_TLS=${MAIL_USE_TLS:-True}
MAIL_USE_SSL=${MAIL_USE_SSL:-False}
MAIL_USERNAME=$(optional_env_value MAIL_USERNAME)
MAIL_PASSWORD=$(optional_env_value MAIL_PASSWORD)
MAIL_NAME="${MAIL_NAME:-CCPay <noreply@ccpay.ng>}"
DEFAULT_FROM_EMAIL=${DEFAULT_FROM_EMAIL:-noreply@ccpay.ng}
SMTP_SERVER=${SMTP_SERVER:-smtp.gmail.com}
SMTP_PORT=${SMTP_PORT:-465}
SMTP_USERNAME=$(optional_env_value SMTP_USERNAME)
SMTP_PASSWORD=$(optional_env_value SMTP_PASSWORD)
FROM_EMAIL=${FROM_EMAIL:-noreply@ccpay.ng}
FROM_NAME="${FROM_NAME:-CCPay}"

IDCHECK_API_KEY=$(optional_env_value IDCHECK_API_KEY)
IDCHECK_PUBLIC_KEY=$(optional_env_value IDCHECK_PUBLIC_KEY)
IDCHECK_LIVE_KEY=$(optional_env_value IDCHECK_LIVE_KEY)
IDCHECK_BASE_URL=${IDCHECK_BASE_URL:-https://devapi.idcheck.ng}
PAYSTACK_SECRET_KEY=$(optional_env_value PAYSTACK_SECRET_KEY)
PAYSTACK_PUBLIC_KEY=$(optional_env_value PAYSTACK_PUBLIC_KEY)

PERSONAL_PAYMENT_PROVIDER=${PERSONAL_PAYMENT_PROVIDER:-safehaven}
COMMUNITY_PAYMENT_PROVIDER=${COMMUNITY_PAYMENT_PROVIDER:-safehaven}
BELL_MFB_CLIENT_ID=$(optional_env_value BELL_MFB_CLIENT_ID)
BELL_MFB_CLIENT_SECRET=$(optional_env_value BELL_MFB_CLIENT_SECRET)
BELL_MFB_BASE_URL=$(optional_env_value BELL_MFB_BASE_URL)
BELL_MFB_BUSINESS_ACCOUNT=$(optional_env_value BELL_MFB_BUSINESS_ACCOUNT)
BELL_MFB_WEBHOOK_SECRET=$(optional_env_value BELL_MFB_WEBHOOK_SECRET)
SAFEHAVEN_OAUTH_APP_CLIENT_ID=$(optional_env_value SAFEHAVEN_OAUTH_APP_CLIENT_ID)
SAFEHAVEN_USER_ID=$(optional_env_value SAFEHAVEN_USER_ID)
SAFEHAVEN_CLIENT_ID=$(optional_env_value SAFEHAVEN_CLIENT_ID)
SAFEHAVEN_BASE_URL=$(optional_env_value SAFEHAVEN_BASE_URL)
SAFEHAVEN_CALLBACK_URL=${SAFEHAVEN_CALLBACK_URL:-$public_url/api/v2/wallet/webhook}
SAFEHAVEN_WEBHOOK_SECRET=$(optional_env_value SAFEHAVEN_WEBHOOK_SECRET)
SAFEHAVEN_COMPANY_URL=${SAFEHAVEN_COMPANY_URL:-$public_url}
SAFEHAVEN_ACCOUNT_VALID_FOR=${SAFEHAVEN_ACCOUNT_VALID_FOR:-900}
SAFEHAVEN_AMOUNT_CONTROL=${SAFEHAVEN_AMOUNT_CONTROL:-OverPayment}
SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER=$(optional_env_value SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER)
SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE=$(optional_env_value SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE)
SAFEHAVEN_PRIVATE_KEY_PEM=$(optional_env_value SAFEHAVEN_PRIVATE_KEY_PEM)

GOOGLE_OAUTH_CLIENT_ID=$(optional_env_value GOOGLE_OAUTH_CLIENT_ID)
GOOGLE_OAUTH_CLIENT_SECRET=$(optional_env_value GOOGLE_OAUTH_CLIENT_SECRET)
GOOGLE_OAUTH_REDIRECT_URI=${GOOGLE_OAUTH_REDIRECT_URI:-$public_url/api/auth/google/callback}
APPLE_CLIENT_ID=$(optional_env_value APPLE_CLIENT_ID)
APPLE_TEAM_ID=$(optional_env_value APPLE_TEAM_ID)
APPLE_KEY_ID=$(optional_env_value APPLE_KEY_ID)
APPLE_PRIVATE_KEY_PATH=$(optional_env_value APPLE_PRIVATE_KEY_PATH)
APPLE_REDIRECT_URI=${APPLE_REDIRECT_URI:-$public_url/api/auth/apple/callback}
FACEBOOK_APP_ID=$(optional_env_value FACEBOOK_APP_ID)
FACEBOOK_APP_SECRET=$(optional_env_value FACEBOOK_APP_SECRET)
FACEBOOK_REDIRECT_URI=${FACEBOOK_REDIRECT_URI:-$public_url/api/auth/facebook/callback}

SMS_ENABLED=${SMS_ENABLED:-false}
TERMII_API_KEY=$(optional_env_value TERMII_API_KEY)
TERMII_SENDER_ID=${TERMII_SENDER_ID:-CCPay}
MAX_DAILY_SMS_NAIRA=${MAX_DAILY_SMS_NAIRA:-5000}

USE_NEW_USER_SERVICE=${USE_NEW_USER_SERVICE:-false}
USE_NEW_AUTH_SERVICE=${USE_NEW_AUTH_SERVICE:-false}
USE_NEW_WALLET_SERVICE=${USE_NEW_WALLET_SERVICE:-false}
USE_NEW_COMMUNITY_SERVICE=${USE_NEW_COMMUNITY_SERVICE:-false}
USE_NEW_NOTIFICATION_SERVICE=${USE_NEW_NOTIFICATION_SERVICE:-false}
SHADOW_MODE=${SHADOW_MODE:-false}
NEW_CODE_PERCENTAGE=${NEW_CODE_PERCENTAGE:-0}
MOCK_VERIFICATION=${MOCK_VERIFICATION:-false}
USE_MOCK_PROVIDER=${USE_MOCK_PROVIDER:-false}
ENFORCE_PRODUCTION_READINESS=${ENFORCE_PRODUCTION_READINESS:-true}
ALLOW_SUPER_ADMIN_BOOTSTRAP=${ALLOW_SUPER_ADMIN_BOOTSTRAP:-false}
ALLOW_DUMMY_DATA_SEED=${ALLOW_DUMMY_DATA_SEED:-false}

LOG_LEVEL=${LOG_LEVEL:-INFO}
SENTRY_DSN=$(optional_env_value SENTRY_DSN)
MESSAGES_PER_PAGE=${MESSAGES_PER_PAGE:-20}
EOF

  chmod 600 "$ENV_FILE"
  log "created $ENV_FILE with generated secrets"
}

validate_env() {
  local key
  local value

  for key in \
    DB_PASSWORD \
    SECRET_KEY \
    FLASK_SECRET_KEY \
    JWT_SECRET_KEY \
    ENCRYPTION_KEY \
    TYPESENSE_API_KEY \
    FRONTEND_URL \
    ALLOWED_ORIGINS \
    NEXT_PUBLIC_API_URL \
    TLS_EMAIL \
    UAT_DOMAIN \
    UAT_SERVER_IP; do
    value="$(config_value "$key")"
    require_not_placeholder "$key" "$value"
  done

  require_https_url FRONTEND_URL "$(config_value FRONTEND_URL)"
  require_https_url NEXT_PUBLIC_API_URL "$(config_value NEXT_PUBLIC_API_URL)"

  if [[ "$(config_value ALLOWED_ORIGINS)" =~ localhost|127\.0\.0\.1|0\.0\.0\.0 ]]; then
    fail "ALLOWED_ORIGINS must not contain localhost, 127.0.0.1, or 0.0.0.0"
  fi

  local secret
  for key in SECRET_KEY FLASK_SECRET_KEY JWT_SECRET_KEY; do
    secret="$(config_value "$key")"
    if ((${#secret} < 32)); then
      fail "$key must be at least 32 characters"
    fi
  done

  if [[ "$(config_value SECRET_KEY)" == "$(config_value JWT_SECRET_KEY)" ]]; then
    fail "JWT_SECRET_KEY must be different from SECRET_KEY"
  fi
}

resolve_ipv4() {
  local host="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$host" | awk '/^[0-9.]+$/ { print }'
  elif command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$host" | awk '{ print $1 }' | sort -u
  else
    return 1
  fi
}

validate_dns() {
  local server_ip
  local host
  local ips

  server_ip="$(config_value UAT_SERVER_IP)"
  host="$(config_value UAT_DOMAIN)"
  ips="$(resolve_ipv4 "$host" || true)"
  if [[ -z "$ips" ]]; then
    if [[ "${ALLOW_DNS_MISMATCH:-}" == "1" ]]; then
      warn "could not resolve A record for $host; DNS may still be propagating"
    else
      fail "$host has no resolvable A record. Point it at $server_ip or set ALLOW_DNS_MISMATCH=1 to deploy before propagation."
    fi
    return 0
  fi
  if ! grep -qxF "$server_ip" <<<"$ips"; then
    if [[ "${ALLOW_DNS_MISMATCH:-}" == "1" ]]; then
      warn "$host resolves to [$ips], expected $server_ip"
    else
      fail "$host must resolve to $server_ip before UAT can go live. Set ALLOW_DNS_MISMATCH=1 to deploy before propagation."
    fi
  fi
}

proxy_headers() {
  cat <<'EOF'
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
EOF
}

backend_locations() {
  cat <<EOF
  location /api/ {
$(proxy_headers)
    proxy_pass http://backend:8080;
  }

  location /socket.io/ {
$(proxy_headers)
    proxy_pass http://backend:8080;
  }
EOF
}

write_nginx_http_config() {
  local domain
  domain="$(config_value UAT_DOMAIN)"

  mkdir -p "$(dirname "$NGINX_CONF_PATH")"
  cat > "$NGINX_CONF_PATH" <<EOF
server {
  listen 80 default_server;
  server_name _;

  location = /nginx-health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files \$uri =404;
  }

  location / {
    return 404;
  }
}

server {
  listen 80;
  server_name $domain;
  client_max_body_size 20m;

  location = /nginx-health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files \$uri =404;
  }

$(backend_locations)

  location / {
$(proxy_headers)
    proxy_pass http://frontend:3000;
  }
}
EOF
}

write_nginx_https_config() {
  local domain
  domain="$(config_value UAT_DOMAIN)"

  mkdir -p "$(dirname "$NGINX_CONF_PATH")"
  cat > "$NGINX_CONF_PATH" <<EOF
server {
  listen 80 default_server;
  server_name $domain;

  location = /nginx-health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files \$uri =404;
  }

  location / {
    return 308 https://\$host\$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name $domain;
  client_max_body_size 20m;

  ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 1d;

  location = /nginx-health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }

$(backend_locations)

  location / {
$(proxy_headers)
    proxy_pass http://frontend:3000;
  }
}
EOF
}

issue_tls_certificate() {
  local domain
  local tls_email

  domain="$(config_value UAT_DOMAIN)"
  tls_email="$(config_value TLS_EMAIL)"

  log "requesting Let's Encrypt certificate for $domain"
  compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    --email "$tls_email" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring \
    --expand \
    -d "$domain"
}

reload_nginx() {
  log "reloading Nginx proxy"
  compose exec -T nginx nginx -t
  compose exec -T nginx nginx -s reload
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_for_services() {
  local services=("$@")
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local service
  local cid
  local status
  local pending

  while true; do
    pending=()
    for service in "${services[@]}"; do
      cid="$(compose ps -q "$service" 2>/dev/null || true)"
      if [[ -z "$cid" ]]; then
        pending+=("$service:not-created")
        continue
      fi
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || printf 'unknown')"
      if [[ "$status" != "healthy" && "$status" != "running" ]]; then
        pending+=("$service:$status")
      fi
    done

    if ((${#pending[@]} == 0)); then
      return 0
    fi

    if ((SECONDS >= deadline)); then
      compose ps
      fail "services did not become healthy in ${HEALTH_TIMEOUT_SECONDS}s: ${pending[*]}"
    fi

    printf '[uat] waiting for health: %s\n' "${pending[*]}"
    sleep 5
  done
}

main() {
  require_cmd docker
  require_cmd openssl

  [[ -f "$COMPOSE_FILE" ]] || fail "compose file not found: $COMPOSE_FILE"

  create_env_file_if_missing
  validate_env

  if ((WRITE_ENV_ONLY)); then
    log "env file is ready: $ENV_FILE"
    exit 0
  fi

  if ((SKIP_PROXY == 0)); then
    validate_dns
    write_nginx_http_config
  fi

  log "validating compose config"
  compose config >/tmp/cc-platform-uat-compose.rendered.yml

  if ((SKIP_BUILD == 0)); then
    log "building UAT images"
    compose build --pull
  else
    warn "skipping image build"
  fi

  local up_flags=(-d)
  if ((FORCE_RECREATE)); then
    up_flags+=(--force-recreate)
  fi

  log "starting stateful services"
  compose up "${up_flags[@]}" postgres redis typesense
  wait_for_services postgres redis typesense

  if ((SKIP_MIGRATE == 0)); then
    log "running backend migrations"
    compose run --rm --no-deps backend flask db upgrade
  else
    warn "skipping backend migrations"
  fi

  log "starting application services"
  compose up "${up_flags[@]}" backend celery-worker frontend
  wait_for_services backend celery-worker frontend

  if ((SKIP_PROXY)); then
    warn "skipping bundled Nginx proxy and TLS issuance"
    log "UAT application services are up"
    compose ps
    exit 0
  fi

  log "starting Nginx proxy for ACME challenge"
  compose up "${up_flags[@]}" nginx
  wait_for_services nginx

  issue_tls_certificate
  write_nginx_https_config
  reload_nginx

  log "UAT stack is up"
  compose ps

  printf '\nUAT endpoints:\n'
  printf '  Frontend: %s\n' "$(config_value FRONTEND_URL)"
  printf '  API:      %s\n' "$(config_value NEXT_PUBLIC_API_URL)"
  printf '  Backend:  http://127.0.0.1:%s/api/v2/auth/health\n' "$(config_value BACKEND_PORT)"
  printf '  Server:   %s\n' "$(config_value UAT_SERVER_IP)"
  printf '\nOperational commands:\n'
  printf '  Logs:      docker compose --env-file %q -f %q logs -f\n' "$ENV_FILE" "$COMPOSE_FILE"
  printf '  Status:    docker compose --env-file %q -f %q ps\n' "$ENV_FILE" "$COMPOSE_FILE"
  printf '  Renew TLS: docker compose --env-file %q -f %q run --rm certbot renew --webroot -w /var/www/certbot && docker compose --env-file %q -f %q exec nginx nginx -s reload\n' "$ENV_FILE" "$COMPOSE_FILE" "$ENV_FILE" "$COMPOSE_FILE"
}

main "$@"
