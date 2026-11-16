# Build stage
FROM node:20-slim AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.4
COPY . .
RUN pnpm install --no-frozen-lockfile --filter="./artifacts/api-server" --filter="./artifacts/edubharat" --filter="./lib/**"
RUN pnpm --filter "./artifacts/api-server" run build
RUN pnpm --filter "./artifacts/edubharat" run build

# Runtime stage
FROM node:20-slim
WORKDIR /app

# Microsoft Edge neural TTS fallback (no API key or cloud billing).
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && python3 -m venv /opt/edge-tts && /opt/edge-tts/bin/pip install --no-cache-dir edge-tts && rm -rf /var/lib/apt/lists/*
ENV EDGE_TTS_PYTHON=/opt/edge-tts/bin/python

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/edubharat/dist/public ./artifacts/api-server/dist/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3000/api/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
