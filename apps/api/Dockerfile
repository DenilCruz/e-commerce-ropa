# =========================================================================
# DOCKERFILE - API BACKEND NESTJS (PRODUCCIÓN MULTI-STAGE)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.0.0

# Copiar configuración de monorepo y paquetes requeridos
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json* ./packages/config/
COPY apps/api/package.json ./apps/api/

# Instalar dependencias
RUN pnpm install --frozen-lockfile=false

# Copiar código fuente
COPY tsconfig.json* ./
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Compilar paquetes
RUN pnpm --filter @ecommerce/shared build
RUN pnpm --filter @ecommerce/api build

# =========================================================================
# STAGE FINAL - RUNNER LIGERO DE PRODUCCIÓN
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9.0.0

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json* ./packages/config/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --frozen-lockfile=false

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Carpeta persistente para subida de fotos / multimedia
RUN mkdir -p /app/apps/api/uploads

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
