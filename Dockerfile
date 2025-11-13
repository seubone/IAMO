# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# ferramentas para compilar nativos (bufferutil, etc)
RUN apk add --no-cache python3 make g++

# copia manifests primeiro pra cache decente
COPY package*.json ./

# install completo (com dev) para buildar nativos e gerar node_modules
RUN npm ci

# copia o resto
COPY . .

# build do projeto (TypeScript/Vite)
RUN npm run build

# tira dev deps e fica só prod
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app

# init, curl (for healthcheck), postgresql client (for db init), e user não-root
RUN apk add --no-cache dumb-init curl postgresql-client \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001

# só o que precisa pra rodar
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copy init script and make executable BEFORE changing user
COPY --from=builder /app/scripts/init-db.sh ./init-db.sh
RUN chmod +x ./init-db.sh && \
    chown nodejs:nodejs ./init-db.sh

USER nodejs
EXPOSE 5051
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:5051/health || exit 1
ENTRYPOINT ["/usr/bin/dumb-init","--"]
ENV NODE_ENV=production
CMD ["sh", "-c", "[ -f ./init-db.sh ] && ./init-db.sh || true; node dist/index.js"]
