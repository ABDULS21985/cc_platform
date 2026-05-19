#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REMOTE_HOST="${UAT_REMOTE_HOST:-}"
REMOTE_USER="${UAT_REMOTE_USER:-root}"
REMOTE_PORT="${UAT_REMOTE_PORT:-22}"
REMOTE_PATH="${UAT_REMOTE_PATH:-/opt/cc_platform}"
REMOTE_SSH_KEY="${UAT_REMOTE_SSH_KEY:-}"
REMOTE_PASSWORD="${UAT_REMOTE_PASSWORD:-${SSHPASS:-}}"

SYNC_SOURCE=1
DELETE_REMOTE=1
REMOTE_DEPLOY_ARGS=()

usage() {
  cat <<'USAGE'
Usage:
  scripts/remote-deploy-uat.sh [remote options] [-- deploy-uat options]

Remote options:
  --host HOST           SSH host. Required unless UAT_REMOTE_HOST is set
  --user USER           SSH user. Default: root
  --port PORT           SSH port. Default: 22
  --path PATH           Remote repo path. Default: /opt/cc_platform
  -i, --identity-file   SSH private key path
  --no-sync             Do not rsync the repo before running deployment
  --no-delete           Do not delete stale remote files during rsync
  -h, --help            Show this help

Everything after "--" is passed to scripts/deploy-uat.sh on the server:
  scripts/remote-deploy-uat.sh --host 203.0.113.10 -- --skip-build
  scripts/remote-deploy-uat.sh --host 203.0.113.10 -- --force-recreate

First-run UAT values can be exported locally and will be passed to the server:
  UAT_DOMAIN=uat.example.com
  UAT_SERVER_IP=203.0.113.10
  UAT_URL=https://uat.example.com
  TLS_EMAIL=ops@example.com
  PAYSTACK_SECRET_KEY=...

Required access:
  This deploys over SSH. Configure SSH access for the remote user first,
  preferably with a key:
    ssh-copy-id root@203.0.113.10
  Password auth is also supported through UAT_REMOTE_PASSWORD or SSHPASS.
USAGE
}

log() {
  printf '[remote-uat] %s\n' "$*"
}

fail() {
  printf '[remote-uat] error: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH"
}

shell_quote() {
  printf '%q' "$1"
}

join_quoted() {
  local item
  for item in "$@"; do
    shell_quote "$item"
    printf ' '
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      REMOTE_HOST="${2:?--host requires a value}"
      shift 2
      ;;
    --user)
      REMOTE_USER="${2:?--user requires a value}"
      shift 2
      ;;
    --port)
      REMOTE_PORT="${2:?--port requires a value}"
      shift 2
      ;;
    --path)
      REMOTE_PATH="${2:?--path requires a value}"
      shift 2
      ;;
    -i|--identity-file)
      REMOTE_SSH_KEY="${2:?--identity-file requires a path}"
      shift 2
      ;;
    --no-sync)
      SYNC_SOURCE=0
      shift
      ;;
    --no-delete)
      DELETE_REMOTE=0
      shift
      ;;
    --)
      shift
      REMOTE_DEPLOY_ARGS+=("$@")
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      REMOTE_DEPLOY_ARGS+=("$1")
      shift
      ;;
  esac
done

[[ -n "$REMOTE_HOST" ]] || fail "--host or UAT_REMOTE_HOST is required"

require_cmd ssh
require_cmd rsync
if [[ -n "$REMOTE_PASSWORD" && -z "$REMOTE_SSH_KEY" ]]; then
  require_cmd sshpass
fi

SSH_BASE=(ssh -p "$REMOTE_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "$REMOTE_SSH_KEY" ]]; then
  SSH_BASE+=(-i "$REMOTE_SSH_KEY")
fi

if [[ -t 0 && -t 1 ]]; then
  SSH_RUN=("${SSH_BASE[@]}" -tt)
else
  SSH_RUN=("${SSH_BASE[@]}")
fi

REMOTE="${REMOTE_USER}@${REMOTE_HOST}"
REMOTE_PATH_Q="$(shell_quote "$REMOTE_PATH")"

ssh_cmd() {
  if [[ -n "$REMOTE_PASSWORD" && -z "$REMOTE_SSH_KEY" ]]; then
    SSHPASS="$REMOTE_PASSWORD" sshpass -e "${SSH_BASE[@]}" "$@"
  else
    "${SSH_BASE[@]}" "$@"
  fi
}

ssh_run_cmd() {
  if [[ -n "$REMOTE_PASSWORD" && -z "$REMOTE_SSH_KEY" ]]; then
    SSHPASS="$REMOTE_PASSWORD" sshpass -e "${SSH_RUN[@]}" "$@"
  else
    "${SSH_RUN[@]}" "$@"
  fi
}

build_rsync_transport() {
  local transport=(ssh -p "$REMOTE_PORT" -o StrictHostKeyChecking=accept-new)
  if [[ -n "$REMOTE_SSH_KEY" ]]; then
    transport+=(-i "$REMOTE_SSH_KEY")
  elif [[ -n "$REMOTE_PASSWORD" ]]; then
    transport=(sshpass -e "${transport[@]}")
  fi
  join_quoted "${transport[@]}"
}

rsync_cmd() {
  if [[ -n "$REMOTE_PASSWORD" && -z "$REMOTE_SSH_KEY" ]]; then
    SSHPASS="$REMOTE_PASSWORD" rsync "$@"
  else
    rsync "$@"
  fi
}

sync_source() {
  local rsync_args
  rsync_args=(
    -az
    --human-readable
    --stats
    --progress
    --filter 'P .env'
    --filter 'P .ENV'
    --filter 'P .env.*'
    --filter 'P .uat/***'
    --exclude .git/
    --exclude .env
    --exclude .ENV
    --exclude .env.*
    --exclude .uat/
    --exclude node_modules/
    --exclude '**/node_modules/'
    --exclude .next/
    --exclude '**/.next/'
    --exclude out/
    --exclude '**/out/'
    --exclude .venv/
    --exclude '**/.venv/'
    --exclude __pycache__/
    --exclude '**/__pycache__/'
    --exclude .pytest_cache/
    --exclude '**/.pytest_cache/'
    --exclude dist/
    --exclude '**/dist/'
    --exclude build/
    --exclude '**/build/'
    --exclude coverage/
    --exclude '*.log'
    --exclude '*credentials*.json'
    --exclude '*.pem'
    --exclude '*.p8'
  )

  if ((DELETE_REMOTE)); then
    rsync_args+=(--delete)
  fi

  log "ensuring remote path exists: $REMOTE:$REMOTE_PATH"
  ssh_cmd "$REMOTE" "mkdir -p $REMOTE_PATH_Q"

  log "syncing repository to $REMOTE:$REMOTE_PATH"
  rsync_cmd "${rsync_args[@]}" -e "$(build_rsync_transport)" "$ROOT_DIR/" "$REMOTE:$REMOTE_PATH/"
}

check_remote_prereqs() {
  log "checking remote Docker prerequisites"
  ssh_cmd "$REMOTE" "command -v docker >/dev/null && docker compose version >/dev/null"
}

remote_env_exports() {
  local keys
  local key
  keys=(
    UAT_DOMAIN
    UAT_SERVER_IP
    UAT_URL
    UAT_HTTP_ONLY
    TLS_EMAIL
    NEXT_PUBLIC_API_URL
    FRONTEND_URL
    ALLOWED_ORIGINS
    API_HOST
    SESSION_COOKIE_SECURE
    ALLOW_DNS_MISMATCH
    CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET
    FIREBASE_CREDENTIALS
    ENABLE_PUSH_NOTIFICATIONS
    FCM_ENABLED
    MAIL_SERVER
    MAIL_PORT
    MAIL_USE_TLS
    MAIL_USE_SSL
    MAIL_USERNAME
    MAIL_PASSWORD
    MAIL_NAME
    DEFAULT_FROM_EMAIL
    SMTP_SERVER
    SMTP_PORT
    SMTP_USERNAME
    SMTP_PASSWORD
    FROM_EMAIL
    FROM_NAME
    IDCHECK_API_KEY
    IDCHECK_PUBLIC_KEY
    IDCHECK_LIVE_KEY
    IDCHECK_BASE_URL
    PAYSTACK_SECRET_KEY
    PAYSTACK_PUBLIC_KEY
    PERSONAL_PAYMENT_PROVIDER
    COMMUNITY_PAYMENT_PROVIDER
    BELL_MFB_CLIENT_ID
    BELL_MFB_CLIENT_SECRET
    BELL_MFB_BASE_URL
    BELL_MFB_BUSINESS_ACCOUNT
    BELL_MFB_WEBHOOK_SECRET
    SAFEHAVEN_OAUTH_APP_CLIENT_ID
    SAFEHAVEN_USER_ID
    SAFEHAVEN_CLIENT_ID
    SAFEHAVEN_BASE_URL
    SAFEHAVEN_CALLBACK_URL
    SAFEHAVEN_WEBHOOK_SECRET
    SAFEHAVEN_COMPANY_URL
    SAFEHAVEN_ACCOUNT_VALID_FOR
    SAFEHAVEN_AMOUNT_CONTROL
    SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER
    SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE
    SAFEHAVEN_PRIVATE_KEY_PEM
    GOOGLE_OAUTH_CLIENT_ID
    GOOGLE_OAUTH_CLIENT_SECRET
    GOOGLE_OAUTH_REDIRECT_URI
    APPLE_CLIENT_ID
    APPLE_TEAM_ID
    APPLE_KEY_ID
    APPLE_PRIVATE_KEY_PATH
    APPLE_REDIRECT_URI
    FACEBOOK_APP_ID
    FACEBOOK_APP_SECRET
    FACEBOOK_REDIRECT_URI
    SMS_ENABLED
    TERMII_API_KEY
    TERMII_SENDER_ID
    MAX_DAILY_SMS_NAIRA
    LOG_LEVEL
    SENTRY_DSN
    ENFORCE_PRODUCTION_READINESS
  )

  for key in "${keys[@]}"; do
    if [[ -n "${!key-}" ]]; then
      printf '%s=%q ' "$key" "${!key}"
    fi
  done
}

run_remote_deploy() {
  local remote_args
  local command

  if ((${#REMOTE_DEPLOY_ARGS[@]})); then
    remote_args="$(join_quoted "${REMOTE_DEPLOY_ARGS[@]}")"
  else
    remote_args=""
  fi
  command="cd $REMOTE_PATH_Q && $(remote_env_exports) bash scripts/deploy-uat.sh $remote_args"

  log "running UAT deployment on $REMOTE"
  ssh_run_cmd "$REMOTE" "$command"
}

main() {
  check_remote_prereqs

  if ((SYNC_SOURCE)); then
    sync_source
  else
    log "source sync skipped"
  fi

  run_remote_deploy
}

main "$@"
