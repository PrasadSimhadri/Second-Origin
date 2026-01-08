FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/guard ./apps/guard

RUN npm ci

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/apps/guard
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
COPY --from=builder /app/apps/guard/.next ./apps/guard/.next
COPY --from=builder /app/apps/guard/public ./apps/guard/public
COPY --from=builder /app/apps/guard/package.json ./apps/guard/package.json
COPY --from=builder /app/apps/guard/next.config.ts ./apps/guard/next.config.ts

WORKDIR /app/apps/guard
EXPOSE 3003
CMD ["npm", "start"]
