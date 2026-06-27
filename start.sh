#!/bin/sh
# Start the Pi web chat, then expose it publicly so a non-technical user can
# just open a link. With CLOUDFLARE_TUNNEL_TOKEN set you get a STABLE custom
# URL; without it, a free ephemeral https://<random>.trycloudflare.com link
# (printed below — watch `maritime logs`).
set -e

node server.mjs &
SERVER_PID=$!

PORT="${PORT:-8080}"
if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
  echo "[tunnel] starting named Cloudflare tunnel (stable URL)…"
  cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" &
else
  echo "[tunnel] starting quick Cloudflare tunnel — public URL will print below:"
  cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" &
fi

# If the web server dies, take the container down so Maritime restarts it.
wait "$SERVER_PID"
