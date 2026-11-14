# syntax=docker/dockerfile:1

# Stage 1: Install production and build dependencies with npm cache
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Stage 2: Build the Next.js production bundle with .next/cache mount
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Stage 3: Lightweight production runner with TeX Live typesetting
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

# Install TeX Live typesetting tools with BuildKit apt cache mounts for PDF compilation
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib/tex ./lib/tex

EXPOSE 3000

CMD ["npm", "run", "start"]
