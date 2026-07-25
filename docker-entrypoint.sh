#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__TAXI_WEB_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://192.168.0.50:8080/api/v1}",
  VITE_WS_URL: "${VITE_WS_URL:-ws://192.168.0.50:8080/api/v1/ws}",
  VITE_YANDEX_MAPS_API_KEY: "${VITE_YANDEX_MAPS_API_KEY:-}",
  VITE_USE_MOCK_API: "${VITE_USE_MOCK_API:-false}"
};
EOF

exec "$@"
