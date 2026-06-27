FROM node:20-slim

WORKDIR /app

# TLS CA bundle — without it, HTTPS calls (e.g. to the LLM proxy) fail with
# "unable to get local issuer certificate". node:20-slim ships without it.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=8080
EXPOSE 8080

# Maritime serves this publicly at {public_backend_url}/a/{agent_id} when the
# agent is created with public_web=true + exposed_port=8080. No tunnel needed.
CMD ["node", "server.mjs"]
