# syntax=docker/dockerfile:1
#
# Imagen de la web (Next.js 16, salida standalone de next.config.ts).
# Se construye desde la raíz del monorepo:
#   docker build -f apps/web/Dockerfile -t nexoai-web:local .
#
# Variables:
#   En la construcción: ninguna. La web no usa NEXT_PUBLIC_*, así que nada queda fijado en el paquete.
#   En la ejecución:    API_URL (dirección de la API vista desde el servidor de la web; en compose,
#                       http://api:3000), PORT (3001 por defecto) y HOSTNAME (0.0.0.0).
#   NODE_ENV=production hace que las cookies de sesión sean «Secure» (src/lib/sesion.ts): el navegador
#   solo las guarda en HTTPS o en http://localhost.
#
# Base Debian slim, la misma que la API (ver apps/api/Dockerfile). La web no tiene binarios nativos
# propios; se usa la misma base para no mantener dos.
ARG IMAGEN_NODE=node:22-bookworm-slim

# ---------------------------------------------------------------------------------------------
FROM ${IMAGEN_NODE} AS base
# Corepack 0.34 no reconoce el binario de pnpm 12 (AGENTS.md); se instala con npm, como en la CI.
RUN npm install --global pnpm@12.10.1
WORKDIR /repo

# ---------------------------------------------------------------------------------------------
# Dependencias: solo los manifiestos. Se instala la web y lo que necesita (contratos); el móvil no.
FROM base AS dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/movil/package.json apps/movil/
COPY packages/contratos/package.json packages/contratos/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --filter "@nexoai/web..."

# ---------------------------------------------------------------------------------------------
FROM dependencias AS construccion
ENV NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY packages/contratos packages/contratos
COPY apps/web apps/web
RUN pnpm --filter @nexoai/contratos build
# next build deja en apps/web/.next/standalone un server.js y el node_modules mínimo, con la raíz
# del rastreo en la del monorepo (outputFileTracingRoot).
RUN pnpm --filter @nexoai/web build

# ---------------------------------------------------------------------------------------------
# Imagen final: la carpeta standalone y los estáticos. Sin pnpm ni código fuente.
FROM ${IMAGEN_NODE} AS final
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=construccion /repo/apps/web/.next/standalone ./
# server.js sirve .next/static solo si está junto a él; standalone no lo copia. apps/web no tiene public/.
COPY --from=construccion /repo/apps/web/.next/static ./apps/web/.next/static
# Next.js escribe su caché en .next/cache; es lo único escribible por el proceso.
RUN mkdir -p apps/web/.next/cache && chown node:node apps/web/.next/cache
USER node
EXPOSE 3001
# /entrar responde 200 sin sesión y sin consultar la API.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/entrar').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
