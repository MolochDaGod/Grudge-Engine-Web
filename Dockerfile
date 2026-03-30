# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN NODE_OPTIONS="--max-old-space-size=3072" npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["node", "dist/index.cjs"]
