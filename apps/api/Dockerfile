# syntax=docker/dockerfile:1
#
# Imagen de la API y del proceso trabajador (AD-01). Una sola imagen, dos comandos:
#   API:        node dist/main.js         (CMD por defecto)
#   Trabajador: node dist/trabajador.js
# Más la etapa «migraciones», que aplica prisma migrate deploy y no forma parte de la imagen final.
#
# Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile -t nexoai-api:local .
#   docker build -f apps/api/Dockerfile --target migraciones -t nexoai-migrar:local .
#
# Base Debian slim y no Alpine. @node-rs/argon2 trae binario para musl, pero los motores de Prisma
# (schema-engine, que usa migrate deploy) y la detección de OpenSSL de Prisma dan más problemas en
# Alpine; con glibc todo usa los binarios más probados. @prisma/adapter-pg usa pg, que es JavaScript
# puro. La diferencia de tamaño de la base (unos 50 MB) no compensa el riesgo.
# Línea 22 de Node, como .nvmrc. Para fijar un parche exacto: --build-arg IMAGEN_NODE=node:22.x.y-bookworm-slim
ARG IMAGEN_NODE=node:22-bookworm-slim

# ---------------------------------------------------------------------------------------------
# Base común: pnpm 12 y OpenSSL (Prisma lo necesita para elegir y ejecutar su motor de esquema).
FROM ${IMAGEN_NODE} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# Corepack 0.34 no reconoce el binario de pnpm 12 (AGENTS.md); se instala con npm, como en la CI.
RUN npm install --global pnpm@12.10.1
WORKDIR /repo

# ---------------------------------------------------------------------------------------------
# Dependencias: solo los manifiestos, para que esta capa se reutilice mientras no cambien.
# Se copian los de todos los paquetes del espacio de trabajo para que el lockfile congelado cuadre,
# pero solo se instala la API y lo que necesita (contratos). El móvil no entra.
FROM base AS dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/movil/package.json apps/movil/
COPY packages/contratos/package.json packages/contratos/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@nexoai/api..."

# ---------------------------------------------------------------------------------------------
# Compilación en el orden de turbo.json: contratos, cliente de Prisma, API.
FROM dependencias AS construccion
COPY tsconfig.base.json ./
COPY packages/contratos packages/contratos
COPY apps/api apps/api
RUN pnpm --filter @nexoai/contratos build
# El cliente se genera en src/generado y tsc lo compila a dist/generado: la imagen final no
# necesita ejecutar prisma generate ni llevar la CLI de Prisma.
RUN pnpm --filter @nexoai/api generar
RUN pnpm --filter @nexoai/api build
# Carpeta autónoma con solo las dependencias de producción. contratos entra como copia (con su dist),
# no como enlace al espacio de trabajo.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @nexoai/api deploy --prod --store-dir /pnpm/store /despliegue

# ---------------------------------------------------------------------------------------------
# Migraciones: servicio de un solo uso de docker-compose.yml (migrar). Usa la etapa de compilación
# porque necesita la CLI de Prisma (dependencia de desarrollo), el esquema, las migraciones y
# prisma.config.ts. Lee DATABASE_URL del entorno.
FROM construccion AS migraciones
WORKDIR /repo/apps/api
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------------------------
# Imagen final: dependencias de producción y dist. Sin pnpm, sin código fuente, sin herramientas.
FROM ${IMAGEN_NODE} AS final
ENV NODE_ENV=production
ENV PUERTO=3000
WORKDIR /app
COPY --from=construccion /despliegue/package.json ./package.json
COPY --from=construccion /despliegue/node_modules ./node_modules
COPY --from=construccion /despliegue/dist ./dist
# Los archivos son de root y solo de lectura para el proceso: la API no escribe en disco.
USER node
EXPOSE 3000
# GET /salud es público (salud.controller.ts). fetch viene con Node 22: no hace falta curl.
# El trabajador no abre puerto; en docker-compose.yml su comprobación está desactivada.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PUERTO || 3000) + '/salud').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
