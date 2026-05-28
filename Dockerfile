# Single-stage build keeping full node_modules — needed so payload CLI is
# available at runtime for `payload migrate`. ~600 MB image vs ~150 MB for
# standalone but Payload migrations require the CLI tooling.

FROM node:22-alpine
WORKDIR /app

# Sharp needs libc6-compat on alpine, plus build tooling for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy source + build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build placeholders — replaced at runtime
ENV DATABASE_URI=postgres://placeholder:placeholder@localhost:5432/placeholder
ENV PAYLOAD_SECRET=build-time-placeholder-replaced-at-runtime

RUN npm run build

# Runtime
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Node-based TCP healthcheck — ignores redirects, just verifies the server is
# listening on port 3000. Long start_period covers migrate + DB-connect time.
HEALTHCHECK --interval=15s --timeout=10s --start-period=180s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(0)).on('error', () => process.exit(1))" || exit 1

# Boot: run scripts/boot.ts which calls payload.init() to push the schema,
# then start Next.js. The boot script is idempotent — safe to run on every
# container start.
# Use tsx + tsconfig-paths so @payload-config alias resolves; npx invokes the
# local tsx binary. Forces NODE_ENV=development for the boot step only so
# Payload's push-on-init logic activates; the npm run start step runs with
# NODE_ENV=production (the default ENV).
CMD ["sh", "-c", "NODE_ENV=development npx tsx --tsconfig tsconfig.json scripts/boot.ts && npm run start"]
