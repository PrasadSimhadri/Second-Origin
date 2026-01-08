FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/customer ./apps/customer

# Install dependencies
RUN npm ci

# Build packages
WORKDIR /app/packages/shared
RUN npm run build

# Build app
WORKDIR /app/apps/customer
ENV NEXT_TELEMETRY_DISABLED 1
# Pass env vars at build time if needed, or rely on runtime for some. 
# Next.js inlines NEXT_PUBLIC_ vars at build time. 
# For Docker, we often need to provide them as ARGs or build with placeholder.
# For this MVP, we proceed assuming .env is handled or mounted.
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/customer/.next ./apps/customer/.next
COPY --from=builder /app/apps/customer/public ./apps/customer/public
COPY --from=builder /app/apps/customer/package.json ./apps/customer/package.json
COPY --from=builder /app/apps/customer/next.config.ts ./apps/customer/next.config.ts

WORKDIR /app/apps/customer
EXPOSE 3002
CMD ["npm", "start"]
