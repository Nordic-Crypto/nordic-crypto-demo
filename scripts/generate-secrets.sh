#!/bin/sh
# Creates .env with strong random secrets. Refuses to overwrite an existing file.
set -eu
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists — not overwriting." >&2
  exit 1
fi

DOMAIN="${1:-localhost}"
EMAIL="${2:-admin@example.com}"

gen() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-48; }

umask 077
cat > .env <<EOF
DOMAIN=${DOMAIN}
ACME_EMAIL=${EMAIL}
POSTGRES_PASSWORD=$(gen)
APP_DB_PASSWORD=$(gen)
REDIS_PASSWORD=$(gen)
DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

echo "Created .env (readable only by you) for domain: ${DOMAIN}"
