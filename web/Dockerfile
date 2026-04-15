# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Backend URLs must be known at build time so Next.js bakes them into
# routes-manifest.json (rewrites are compiled, not evaluated at runtime).
ARG MONOLITH_URL=http://api-monolith:8100
ARG DELIVERY_SERVICE_URL=http://delivery-service:8013
ARG NOTIFICATION_SERVICE_URL=http://notification-service:8008
ENV MONOLITH_URL=$MONOLITH_URL
ENV DELIVERY_SERVICE_URL=$DELIVERY_SERVICE_URL
ENV NOTIFICATION_SERVICE_URL=$NOTIFICATION_SERVICE_URL

RUN npm run build

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
EXPOSE 3000
CMD ["npm", "start"]
