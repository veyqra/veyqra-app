FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1 \
    VEYQRA_INTERNAL_API_URL=http://api:8000

RUN npm run build --workspace=web

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    VEYQRA_INTERNAL_API_URL=http://api:8000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
