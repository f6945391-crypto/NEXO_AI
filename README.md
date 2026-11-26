# NexoAI

Asistente personal inteligente · Curso de Diseño de Software · Entregable 2.

El proyecto se desarrolla guiado por especificación. **Empieza por [`SPEC.md`](SPEC.md)**: estado, principios, decisiones y registro de cambios. Las instrucciones de trabajo, incluidas las de la IA, están en [`AGENTS.md`](AGENTS.md).

## Levantar el proyecto

Requisitos: Node.js 22.12 o posterior, Python 3.12 y Docker.

```bash
npx pnpm@12.10.1 install
```

Copia `.env.example` a `.env`. PostgreSQL usa el puerto 5433, para no chocar con uno instalado en el equipo.

```bash
docker compose up -d
```

```bash
npx pnpm@12.10.1 --filter @nexoai/api migrar
```

```bash
npx pnpm@12.10.1 --filter @nexoai/api semilla
```

```bash
npx pnpm@12.10.1 verificar
```

`verificar` compila, ejecuta las pruebas y comprueba que especificación y trazabilidad digan lo mismo. Si falla, el cambio no está terminado.

## Ejecutar con contenedores

La API, el trabajador y la web también corren en contenedores, con el perfil `aplicacion` de `docker-compose.yml`. Sin el perfil, `docker compose up -d` sigue levantando solo PostgreSQL y Redis para el desarrollo diario. El móvil no se empaqueta.

Hace falta el `.env` de la raíz: los contenedores toman de allí sus variables.

```bash
docker compose --profile aplicacion up --build
```

Orden de arranque: PostgreSQL sano → `migrar` aplica las migraciones y termina → `api` y `trabajador` → `web`, cuando la API responde en `/salud`. La web queda en http://localhost:3001 y la API en http://localhost:3000. Si ya corre un `next dev` o una API fuera de Docker, esos puertos están ocupados: ciérralos antes.

Alta de una cuenta dentro del contenedor (sin `pnpm`, así que tampoco el problema del `--`):

```bash
docker compose --profile aplicacion run --rm api node dist/cli/crear-cuenta.js --nueva-organizacion "<nombre>" --correo <correo> --rol <rol> --plan <plan>
```

Registros:

```bash
docker compose --profile aplicacion logs -f api trabajador web
```

Para pararlo todo: `docker compose --profile aplicacion down`. Los datos de PostgreSQL siguen en su volumen.

| Imagen | Dockerfile | Comando |
|---|---|---|
| `nexoai-api:local` | `apps/api/Dockerfile` | API: `node dist/main.js`. Trabajador: la misma imagen con `node dist/trabajador.js` |
| `nexoai-migrar:local` | `apps/api/Dockerfile`, etapa `migraciones` | `npx prisma migrate deploy`. Lleva la CLI de Prisma, que la imagen de la API no tiene |
| `nexoai-web:local` | `apps/web/Dockerfile` | `node apps/web/server.js` (salida `standalone` de Next.js) |

**Direcciones dentro de la red de compose.** El `.env` apunta a `localhost:5433` y `localhost:6379`, que es lo correcto desde el equipo. Dentro de un contenedor, `localhost` es el propio contenedor: la base es `postgres:5432` y Redis es `redis:6379`. Por eso el perfil sobreescribe `DATABASE_URL` y `REDIS_URL` con `environment`, que manda sobre `env_file`, y la web recibe `API_URL=http://api:3000`. Se eligió sobreescribir en vez de exigir variables nuevas para que el `.env` de siempre sirva sin cambios. Si hace falta otra dirección, se pone en `.env`: `DATABASE_URL_CONTENEDOR`, `REDIS_URL_CONTENEDOR` o `API_URL_CONTENEDOR`. `WEB_URL` y `GOOGLE_REDIRECT_URI` no cambian: las usa el navegador, que sigue en `localhost`.

**Diferencias con el desarrollo.** Las imágenes corren con `NODE_ENV=production`:

- La API rechaza `MODELO_PROVEEDOR=simulado` y `CALENDARIO_SIMULADO`. Con contenedores, usa `no-configurado` o `compatible-openai`.
- Las cookies de sesión de la web son `Secure`: el navegador las guarda en http://localhost, pero no si se entra por la IP del equipo sin HTTPS.

Variables de la web: ninguna en la construcción (no usa `NEXT_PUBLIC_*`). En la ejecución, `API_URL`, `PORT` (3001) y `HOSTNAME` (0.0.0.0).

La integración continua construye las tres imágenes sin publicarlas (trabajo `imagenes` de `.github/workflows/ci.yml`).
