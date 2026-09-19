# E-Commerce Ropa - Monorepo Architecture

Arquitectura base y estructura de carpetas estandarizada para el desarrollo colaborativo del ecosistema de comercio electrónico de ropa.

---

## 🏗️ Estructura del Monorepo

```text
ecommerce-ropa/
├── apps/
│   ├── api/                 # Backend NestJS + PostgreSQL + Redis
│   ├── web/                 # Frontend Web React (Vite + TailwindCSS + Zustand + React Query)
│   └── mobile/              # Frontend Móvil React Native (Expo)
├── packages/
│   ├── shared/              # Modelos, DTOs (Zod), constantes y utils compartidos
│   └── config/              # Configuraciones base de TypeScript, ESLint y Prettier
├── docker-compose.yml       # Infraestructura local (PostgreSQL & Redis)
├── package.json             # Raíz con scripts de Turbo
├── pnpm-workspace.yaml      # Configuración de workspaces PNPM
└── turbo.json               # Pipeline de compilación y orquestación
```

---

## 🧭 Diagrama de Comunicación

```
┌─────────────┐      ┌─────────────┐
│  React Web  │      │ React Native│
└──────┬──────┘      └──────┬──────┘
       │                    │
       │   HTTPS + JWT      │
       └────────┬───────────┘
                ▼
        ┌───────────────┐
        │  NestJS API   │
        │  /api/v1/...  │
        └───────┬───────┘
                ▼
    ┌───────────┴───────────┐
    │                       │
┌───▼────┐         ┌────────▼─────┐
│Postgres│         │  Cloudinary  │
└────────┘         └──────────────┘
    │
┌───▼────┐
│ Redis  │
└────────┘
```

---

## 👥 Guía para Desarrolladores

### ¿Dónde trabajar?

- **Backend Developers**: Trabajan en `apps/api/src/modules/<tu-modulo>/`.
- **Frontend Web Developers**: Trabajan en `apps/web/src/features/<tu-feature>/`.
- **Mobile Developers**: Trabajan en `apps/mobile/src/screens/<tu-pantalla>/`.
- **Contratos & Tipos Compartidos**: Modificar o agregar contratos en `packages/shared/src/`.

---

## 🚀 Instrucciones para Levantar el Proyecto

### 1. Prerrequisitos
- **Node.js**: Versión 18 o superior (recomendado v20 / v22).
- **PNPM**: Gestor de paquetes (`npm install -g pnpm`).
- **Docker & Docker Compose**: Para los servicios de base de datos y caché.
- **Expo Go** *(Opcional para mobile)*: App instalada en tu teléfono (Android o iOS).

---

### 2. Instalación de Dependencias

Ejecuta el siguiente comando en la raíz del proyecto para instalar todas las dependencias del monorepo:

```bash
pnpm install
```

---

### 3. Levantar la Base de Datos y Redis (Docker)

Inicia los contenedores de PostgreSQL 16 y Redis 7:

```bash
docker compose up -d
```

> **Servicios activos:**
> - PostgreSQL en `localhost:5432` (Usuario: `postgres`, Password: `postgres`, DB: `ecommerce_db`)
> - Redis en `localhost:6379`

---

### 4. Levantar los Proyectos

Puedes levantar todo simultáneamente con Turborepo o iniciar cada servicio por separado:

#### A. Iniciar todo en paralelo (Monorepo Completo)
```bash
pnpm dev
```

---

#### B. Iniciar servicios individualmente

#### 🔹 Backend (NestJS API)
```bash
# Desde la raíz:
pnpm --filter @ecommerce/api dev

# O entrando a la carpeta:
cd apps/api
pnpm dev
```
- **API URL:** `http://localhost:3000/api/v1`
- **Swagger UI (Documentación interactiva):** `http://localhost:3000/docs`

---

#### 🔹 Frontend Web (React + Vite)
```bash
# Desde la raíz:
pnpm --filter @ecommerce/web dev

# O entrando a la carpeta:
cd apps/web
pnpm dev
```
- **Web App:** `http://localhost:5173`

---

#### 🔹 Frontend Móvil (React Native + Expo)
```bash
# Entrando a la carpeta mobile:
cd apps/mobile
pnpm start -c
```
- **En tu Teléfono:** 
  1. Abre la app **Expo Go** (debe estar en el mismo Wi-Fi que tu PC).
  2. Escanea el código QR que aparece en la terminal.
  3. *(Si está conectado por USB en Android)*: Presiona la tecla **`a`** en la terminal.
- **En el Navegador Web:** Presiona la tecla **`w`** en la terminal.
- **Recargar cambios:** Presiona la tecla **`r`** en la terminal.

---

### 5. Comandos Útiles

| Comando | Descripción |
|---|---|
| `pnpm build` | Compila todos los paquetes y aplicaciones con Turborepo |
| `pnpm lint` | Ejecuta el linter en todo el código |
| `pnpm format` | Formatea el código con Prettier |
| `docker compose down` | Detiene los contenedores de PostgreSQL y Redis |
