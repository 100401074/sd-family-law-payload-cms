# Multi-stage build for Payload CMS (Next.js 15 standalone output).

# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Build the Next.js + Payload app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_DISABLE_ADMIN=false
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Media uploads — mounted from a persistent volume in production
RUN mkdir -p /app/media

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3000/admin/login || exit 1

CMD ["node", "server.js"]
