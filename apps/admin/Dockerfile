FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN npm ci

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/apps/admin
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=builder /app/apps/admin/next.config.ts ./apps/admin/next.config.ts

WORKDIR /app/apps/admin
EXPOSE 3004
CMD ["npm", "start"]
