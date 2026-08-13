# Build from frontend/: docker build -t food-rec-frontend frontend/
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the client/server bundle at build time — NextAuth's authorize()
# and the /api/backend rewrite both read these server-side.
ARG BACKEND_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV BACKEND_URL=$BACKEND_URL NEXTAUTH_URL=$NEXTAUTH_URL NEXTAUTH_SECRET=$NEXTAUTH_SECRET
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
