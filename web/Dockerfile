# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ── Stage 2: builder ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Backend URLs must be known at build time so Next.js bakes them into
# routes-manifest.json (rewrites are compiled, not evaluated at runtime).
ARG MONOLITH_URL=http://api-monolith:8100
ARG DELIVERY_SERVICE_URL=http://delivery-service:8013
ARG NOTIFICATION_SERVICE_URL=http://notification-service:8008
ENV MONOLITH_URL=$MONOLITH_URL
ENV DELIVERY_SERVICE_URL=$DELIVERY_SERVICE_URL
ENV NOTIFICATION_SERVICE_URL=$NOTIFICATION_SERVICE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
