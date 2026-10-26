# =========================================================================
# DOCKERFILE - FRONTEND SPA REACT + VITE (PRODUCCIÓN MULTI-STAGE)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.0.0

# Copiar configuración de monorepo y paquetes requeridos
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json* ./packages/config/
COPY apps/web/package.json ./apps/web/

# Instalar dependencias
RUN pnpm install --frozen-lockfile=false

# Copiar código fuente
COPY tsconfig.json* ./
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/web ./apps/web

# Variable para que el frontend use rutas relativas /api/v1 mediante Nginx Proxy
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Compilar paquetes
RUN pnpm --filter @ecommerce/shared build
RUN pnpm --filter @ecommerce/web build

# =========================================================================
# STAGE FINAL - SERVIDOR WEB NGINX LIGERO
# =========================================================================
FROM nginx:alpine AS runner

# Copiar archivos compilados del SPA
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copiar configuración de Nginx (Reverse Proxy y SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
