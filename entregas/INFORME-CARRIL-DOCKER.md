# Informe del carril Docker — empaquetado de la aplicación

6 de noviembre de 2026. Rama `carril-docker` sobre `base-4a2b3f7`.

**Estado: sin verificar en ejecución.** En la máquina del carril hay cliente de Docker y `docker compose`, pero no demonio (`/var/run/docker.sock` no existe), y no se arrancó uno. Ninguna imagen se construyó. Lo que sí se verificó está abajo, con cómo.

## Qué se hizo

| Archivo | Cambio |
|---|---|
| `apps/api/Dockerfile` | Nuevo. Etapas `base`, `dependencias`, `construccion`, `migraciones` y `final`. Debian slim, `pnpm deploy --prod`, usuario `node`, `HEALTHCHECK` contra `GET /salud`, `CMD ["node", "dist/main.js"]`. El trabajador usa esta imagen con `node dist/trabajador.js` |
| `apps/web/Dockerfile` | Nuevo. Etapas `base`, `dependencias`, `construccion` y `final`. Salida `standalone`, usuario `node`, `HEALTHCHECK` contra `/entrar`, `CMD ["node", "apps/web/server.js"]` |
| `apps/web/next.config.ts` | `output: 'standalone'` y `outputFileTracingRoot` en la raíz del monorepo |
| `.dockerignore` | Nuevo |
| `docker-compose.yml` | `postgres` y `redis` sin cambios. Perfil `aplicacion` con `migrar`, `api`, `trabajador` y `web` |
| `.github/workflows/ci.yml` | Trabajo `imagenes`, en paralelo a `verificar`, sin `needs`, `push: false`, caché `type=gha` |
| `README.md` | Sección «Ejecutar con contenedores» |
| `AGENTS.md` | Una fila en la tabla de comandos |
| `PROPUESTA-TECNICA.md` | Nota con fecha bajo el cuadro del stack (§4.1), que remite a los Dockerfile |

## Decisiones tomadas

| Decisión | Motivo |
|---|---|
| Base `node:22-bookworm-slim`, no Alpine | `@node-rs/argon2` tiene binario para musl, pero el motor de esquema de Prisma (lo usa `migrate deploy`) y su detección de OpenSSL dan más problemas en Alpine. `@prisma/adapter-pg` usa `pg`, JavaScript puro. Unos 50 MB más de base no compensan el riesgo |
| Etiqueta `22-bookworm-slim` sin parche fijo | Sigue a `.nvmrc` (`22`), igual que la CI. Sin acceso a Docker Hub no se pudo comprobar qué parche exacto existe. Se puede fijar con `--build-arg IMAGEN_NODE=…` |
| pnpm con `npm install --global pnpm@12.10.1` | Corepack 0.34 no reconoce pnpm 12 (AGENTS.md); igual que la CI |
| Instalación filtrada (`--filter "@nexoai/api..."`, `"@nexoai/web..."`) | El móvil (Expo) no entra en ninguna imagen. Se copian los cuatro `package.json` para que el lockfile congelado cuadre |
| `pnpm deploy --prod` para la API | Funciona con pnpm 12.10.1 sin `inject-workspace-packages`: `@nexoai/contratos` entra como copia con su `dist`. No hizo falta alternativa |
| Sin `prisma generate` en la etapa final | El cliente se genera en `src/generado` y `tsc` lo compila a `dist/generado`. La imagen final no lleva la CLI de Prisma |
| Migraciones en una etapa aparte (`migraciones`) | `prisma migrate deploy` necesita la CLI (dependencia de desarrollo), el esquema y `prisma.config.ts`. Meterlos en la imagen final la agranda solo para un servicio de un solo uso |
| Direcciones de la red de compose con `environment` | `environment` manda sobre `env_file`: el `.env` de siempre sirve sin cambios. Variables opcionales `DATABASE_URL_CONTENEDOR`, `REDIS_URL_CONTENEDOR`, `API_URL_CONTENEDOR` |
| Redis con `condition: service_started` | El servicio `redis` no tiene comprobación de salud y el encargo pide dejarlo tal cual. ioredis reintenta. Si el equipo prefiere `service_healthy`, basta añadir `healthcheck: redis-cli ping` a `redis` |
| `api` y `trabajador` con el mismo `build` e `image: nexoai-api:local` | Una sola imagen; la segunda construcción sale entera de la caché |
| Comprobación de salud desactivada en `trabajador` | No abre puerto; la de la imagen (`/salud`) siempre fallaría |
| Nota de despliegue en `PROPUESTA-TECNICA.md` | No hay ninguna decisión «AD-» de despliegue en `specs/*/plan.md`. La fila «Despliegue» está en `SPEC.md` §4 (no §5) y en `PROPUESTA-TECNICA.md` §4.1. `SPEC.md` no se tocó |

## Qué se verificó fuera de Docker y cómo

| Comprobación | Cómo | Resultado |
|---|---|---|
| Instalación | `npx pnpm@12.10.1 install --frozen-lockfile` en el árbol | 814 paquetes, sin errores |
| Orden de compilación | `--filter @nexoai/contratos build`, `--filter @nexoai/api generar` (con el motor falso, solo aquí), `--filter @nexoai/api build`, `--filter @nexoai/web build` | Los cuatro sin errores. `dist/generado/prisma` existe tras `build` |
| Etapa `dependencias` de la API, en limpio | Carpeta `/tmp/sim-api` con solo lo que copian los `COPY` y un almacén de pnpm vacío; `pnpm install --frozen-lockfile --filter "@nexoai/api..."` | Sin errores |
| Etapa `construccion` de la API | En la misma carpeta, `packages/contratos` y `apps/api` sin `node_modules`, `dist` ni `src/generado`; los cuatro `RUN` del Dockerfile | Sin errores; `/despliegue` con `dist`, `node_modules` (193 MB) y `@nexoai/contratos/dist` |
| Etapa `final` de la API | Solo `package.json`, `node_modules` y `dist` copiados a otra carpeta; `node dist/main.js` contra una base propia (`nexoai_docker_prueba`, migrada con `psql`) y el Redis local | `GET /salud` → 200 `{"estado":"ok"}`. El comando literal del `HEALTHCHECK` sale con 0 |
| CLI en la carpeta desplegada | `node dist/cli/crear-cuenta.js --nueva-organizacion … --rol gerente --plan empresarial` | Cuenta creada y contraseña temporal mostrada |
| Trabajador en la carpeta desplegada | `timeout 8 node dist/trabajador.js` | Siguió vivo hasta el corte (salida 124), módulos iniciados, sin errores |
| CLI de Prisma en la etapa `migraciones` | `npx --no-install prisma --version` en `apps/api`; después `npx prisma migrate status` como usuario `nobody` sobre el árbol de root | Se resuelve en local y carga `prisma.config.ts`, también sin permiso de escritura. Luego falla al bajar el motor (403 del proxy de esta máquina), lo esperado aquí |
| Etapas de la web, en limpio | Carpeta `/tmp/sim-web` con solo lo que copian los `COPY`; `install --filter "@nexoai/web..."`, `contratos build`, `web build` | Sin errores |
| Etapa `final` de la web | `.next/standalone` y `.next/static` copiados a otra carpeta (42 MB); `node apps/web/server.js` con `PORT` y `API_URL` | `/entrar` → 200, `/` → 307 a `/entrar`, CSS de `/_next/static` → 200. Con cookie falsa, `/` → 307 a `/sesion/renovar`: habló con la API |
| `API_URL` en la ejecución | Búsqueda en el paquete del servidor | Queda `process.env.API_URL ?? "http://localhost:3000"`: no se fija en la construcción |
| Tipos de la web | `--filter @nexoai/web typecheck` | Sin errores |
| `docker-compose.yml` | `docker compose config --services`, con y sin perfil, con y sin `.env` | Sin perfil: `postgres`, `redis`, también sin `.env`. Con perfil: los seis; `DATABASE_URL` y `REDIS_URL` sobreescritas. Con perfil y sin `.env`: error claro |
| `ci.yml` | Lectura con `yaml.safe_load` | Trabajos `verificar` e `imagenes`; `imagenes` sin `needs` |
| Trazabilidad | `python tools/trazabilidad.py --check` | 157 requisitos, 0 problemas |

No se ejecutó `pnpm verificar` completo: el cambio no toca código de la aplicación y las pruebas comparten bases con otros carriles.

## Qué queda por verificar con Docker Desktop

En la raíz del repositorio, con el `.env` de siempre. Antes: cerrar `next dev` y cualquier API local (puertos 3000 y 3001), y poner `MODELO_PROVEEDOR` en `no-configurado` o `compatible-openai`.

| # | Comando | Qué esperar |
|---|---|---|
| 1 | `docker build -f apps/api/Dockerfile -t nexoai-api:local .` | Termina sin error. En `pnpm install`, `@prisma/engines postinstall: Done` |
| 2 | `docker build -f apps/api/Dockerfile --target migraciones -t nexoai-migrar:local .` | Casi todo sale de la caché del paso 1. `npx prisma version` lista `Schema Engine` con su versión |
| 3 | `docker build -f apps/web/Dockerfile -t nexoai-web:local .` | Termina sin error; la tabla de rutas de `next build` en el registro |
| 4 | `docker images nexoai-*` | API cerca de 400 MB, web cerca de 250 MB, migrar más grande (lleva todo el `node_modules` de desarrollo). Si son mucho mayores, revisar `.dockerignore` |
| 5 | `docker run --rm nexoai-api:local id` | `uid=1000(node)` |
| 6 | `docker compose --profile aplicacion up --build` | `migrar` imprime las migraciones aplicadas (o «No pending migrations») y sale con 0; `api` y `web` llegan a `healthy`; el trabajador inicia sus módulos |
| 7 | En otra terminal: `docker compose --profile aplicacion ps` | `api` y `web` en `healthy`, `trabajador` en `running`, `migrar` en `exited (0)` |
| 8 | `curl http://localhost:3000/salud` | `{"estado":"ok"}` |
| 9 | Abrir http://localhost:3001 | Redirige a `/entrar` |
| 10 | `docker compose --profile aplicacion run --rm api node dist/cli/crear-cuenta.js --nueva-organizacion "Prueba" --correo prueba@nexoai.local --rol gerente --plan empresarial` | «Cuenta creada» y la contraseña temporal |
| 11 | Entrar en http://localhost:3001 con esa cuenta | Pide cambiar la contraseña y la zona horaria. Si el navegador no guarda la sesión, ver el riesgo de cookies |
| 12 | `docker compose --profile aplicacion logs -f api trabajador web` | Sin errores |
| 13 | `docker compose up -d` (sin perfil) en otra ocasión | Solo `postgres` y `redis`, como hasta hoy |
| 14 | Tras subir la rama: el trabajo `imagenes` en GitHub Actions | Verde, en paralelo a `verificar` |

## Riesgos conocidos

| Riesgo | Qué puede pasar | Qué hacer |
|---|---|---|
| Motor de Prisma en la construcción | `pnpm install` baja el motor de esquema de `binaries.prisma.sh`; si no puede, no falla. Como usuario `node`, Prisma no podría bajarlo después (aquí se reprodujo: «Can't write to …/@prisma/engines») | La etapa `migraciones` ejecuta `npx prisma version` como root antes de `USER node`: baja el motor si falta, o la construcción falla en el paso 2 y no al migrar |
| `pnpm deploy` | Probado con pnpm 12.10.1. Otra versión de pnpm puede exigir `inject-workspace-packages=true` | La versión está fijada en los dos Dockerfile |
| `standalone` con pnpm y monorepo | Next.js copia enlaces simbólicos relativos a `node_modules/.pnpm`. Funcionó copiado a otra carpeta, pero no en una capa de imagen | Paso 9. En Windows no aplica: se construye dentro de Linux |
| Binarios nativos | Con Debian slim, `@node-rs/argon2` usa `linux-x64-gnu` (o `arm64-gnu` en Mac con Apple Silicon); ambos vienen en el lockfile como opcionales | Paso 10 ejercita argon2 |
| `NODE_ENV=production` | La API rechaza `MODELO_PROVEEDOR=simulado` y `CALENDARIO_SIMULADO`. Con un `.env` de demostración, la API no arranca | Documentado en `README.md`. **Necesita decisión del equipo** si se quiere demostrar con el simulado en contenedores |
| Cookies `Secure` | Con `NODE_ENV=production` las cookies de sesión son `Secure`. Chrome y Firefox las aceptan en http://localhost; entrando por la IP del equipo sin HTTPS, no | En un PaaS habrá HTTPS |
| Puertos 3000 y 3001 | Chocan con una API o un `next dev` locales | Cerrarlos antes, o cambiar el lado izquierdo de `ports` |
| Etiqueta de la base sin parche fijo | `node:22-bookworm-slim` cambia con cada parche de Node 22 | Fijar parche o digest cuando haya registro de imágenes |
| Tamaño de la imagen de la API | `@prisma/client` pesa 71 MB en `node_modules`; la imagen ronda 400 MB | Aceptable para un PaaS. Se puede recortar después |
| Versiones de las acciones de Docker | `setup-buildx-action@v3` y `build-push-action@v6`: no se pudo comprobar si hay versión más nueva | Revisar al subir la rama |

## Para `SPEC.md` (lo edita otro)

- §4, fila «Despliegue»: puede remitir a `apps/api/Dockerfile`, `apps/web/Dockerfile` y al perfil `aplicacion`.
- §8: decidir si el perfil `aplicacion` debe admitir el modelo simulado (hoy no, por `NODE_ENV=production`).
- §11: una línea con los archivos de este informe.
