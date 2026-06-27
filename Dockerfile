FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=8080
EXPOSE 8080

# Maritime serves this publicly at {public_backend_url}/a/{agent_id} when the
# agent is created with public_web=true + exposed_port=8080. No tunnel needed.
CMD ["node", "server.mjs"]
