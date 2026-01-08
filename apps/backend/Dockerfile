FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies
RUN npm ci

# Build shared packages if needed (tsc)
WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/ui
# UI might not need build for backend but good practice
# RUN npm run build 

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

WORKDIR /app/apps/backend
CMD ["node", "dist/main"]
