FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 1. Install Dependencies
FROM base AS deps
COPY nucmed-modern/package.json nucmed-modern/package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# 2. Build Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY nucmed-modern/ .

# Dummy DATABASE_URL for Prisma generate during build (real URL injected at runtime)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV APP_ROLE=web
ENV RUN_PRISMA_MIGRATIONS=false

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/cron.js ./cron.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./start.sh

# Prisma CLI for migrations
RUN npm install --no-save prisma@5.22.0 @prisma/client@5.22.0

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD sh -c 'if [ "${APP_ROLE}" = "cron" ]; then ps | grep "[n]ode cron.js" >/dev/null; else wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null; fi' || exit 1

CMD ["./entrypoint.sh"]
