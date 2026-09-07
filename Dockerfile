# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://pnk:pnk@127.0.0.1:5432/pnk_id?schema=public"
ENV DATABASE_URL=$DATABASE_URL
ARG APP_URL=http://localhost:3100
ARG NEXT_PUBLIC_MAIL_URL=http://localhost:3000
ENV APP_URL=$APP_URL
ENV NEXT_PUBLIC_MAIL_URL=$NEXT_PUBLIC_MAIL_URL
ARG JWT_SECRET=build-time-placeholder-min-32-characters!!
ARG SESSION_SECRET=build-time-placeholder-min-32-characters!
ENV JWT_SECRET=$JWT_SECRET
ENV SESSION_SECRET=$SESSION_SECRET
RUN npx prisma generate && npx next build \
  && npm prune --omit=dev \
  && rm -rf /app/.next/cache

# Standalone Prisma CLI (+ engines) for entrypoint db push — not full app node_modules
FROM node:20-bookworm-slim AS prisma-cli
WORKDIR /prisma-cli
RUN npm init -y && npm install prisma@6.19.0

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli/node_modules ./prisma-cli/node_modules
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3100
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["./entrypoint.sh"]
