# Encargo — Carril B: Semana y Mes, «Ver anteriores» visible, franja «en espera»

Trabajas en una **copia** del repositorio NexoAI (monorepo pnpm + Turborepo: NestJS + Prisma en `apps/api`, Next.js 16 en `apps/web`, Expo 57 en `apps/movil`, contratos zod en `packages/contratos`). La copia es un repositorio git con un commit base etiquetado `base-36a9551`, que corresponde al commit `36a9551` de la rama real del equipo. **Tu trabajo termina en commits sobre ese base**, que después se convierten en parches (`git format-patch base-36a9551`) y se aplican en el repositorio real con `git am`. Por eso:

- Commits pequeños y limpios, con mensaje en español que empiece por el identificador de la tarea (ver abajo). Autor: `git -c user.name="Claude (carril B)" -c user.email="claude@nexoai.local" commit`.
- **Añade al índice solo los archivos que cambiaste a propósito** (`git add <ruta>`), nunca `git add -A`. No commitees `.env`, `dist/`, `.next/`, `.expo/`, `apps/api/src/generado/`, capturas de Playwright ni `apps/api/test/preparar-base.ts` (es un ajuste local del entorno).
- No hagas `git push`, no cambies de rama, no toques `main`.

## Reglas del repositorio que no se negocian

Lee primero `AGENTS.md` (entero) y `SPEC.md` §3 (principios P-01 a P-11). En particular:

- Todo en **español**: código, comentarios, mensajes de commit, textos de pantalla. Frases cortas. Sin emojis. Sin marcas de «validado».
- Textos de pantalla **sin vocabulario interno** (R-40): nunca «episodio», «turno», «transcripción», «operación» ante la persona.
- Ningún esquema de petición o respuesta fuera de `packages/contratos`. **En este carril no hace falta tocar contratos ni `apps/api`**: las rutas que necesitas ya existen (abajo). Si crees que sí hace falta, para y anótalo en tu informe final en vez de hacerlo.
- Colores, tipografía y espaciado solo con los tokens existentes: `apps/movil/src/tokens.ts` y las variables CSS de `apps/web/src/app/globales.css`. Nada inventado. Iconos: marcadores geométricos como los que hay.
- Las pruebas de extremo a extremo (Playwright) llevan en su `describe` el nombre de la prueba tal como figura en `tasks.md`. Los nombres accesibles que ya usan las pruebas no cambian: `Pídele algo al asistente`, `Enviar`, `Confirmar`, `Descartar`, `Para confirmar`, `Asistente`, `Pedir algo al asistente`, `Cerrar`, `Ver anteriores`, y el separador con `role="separator"`.
- Versiones de dependencias fijadas: **no instales ni actualices nada.**
- Antes de escribir código de la web, mira `apps/web/node_modules/next/dist/docs/` si dudas de una API (Next.js 16 cambió convenciones).

## Lo que ya existe y vas a usar

| Pieza | Dónde | Qué hace |
|---|---|---|
| `GET /agenda/eventos?desde=<ISO>&hasta=<ISO>` | `apps/api/src/agenda/agenda.controller.ts` | Devuelve `EventoAgenda[]` en un rango de **como mucho 31 días** (`RANGO_MAXIMO_DIAS` en `packages/contratos/src/agenda.ts`), en la zona del perfil. Exige calendario conectado |
| `GET /operaciones?estado=en_espera` | `apps/api/src/operaciones/operaciones.controller.ts` | Devuelve las Operaciones en espera (`OperacionRespuesta[]`), cada una con `motivoEspera`, `solicitudOriginal`, `vistaConfirmacion` |
| `GET /asistente/conversacion?antes=&limite=` | T-038 | La transcripción por episodios; ya la consume la conversación |
| Web: `obtenerAgendaDelDia(zona)` | `apps/web/src/lib/agenda.ts` | Calcula medianoche en la zona, llama a la ruta y formatea en el servidor. **Extiéndela** a `obtenerAgenda(zona, nivel, fecha)` o funciones hermanas; reutiliza `medianoche`, `desfase`, `horario` |
| Web: cortes de cada sección | `apps/web/src/app/aplicacion/secciones.ts` | `agenda.cortes = ['Hoy','Semana','Mes']`, hoy sin efecto |
| Web: lienzo | `apps/web/src/app/aplicacion/aplicacion.tsx` | Pinta «Hoy» y los cortes como pestañas |
| Web: conversación | `apps/web/src/app/aplicacion/conversacion.tsx` | Botón «Ver anteriores» al inicio de la lista (línea ~260) |
| Móvil: agenda | `apps/movil/src/pantallas/agenda.tsx`, `apps/movil/src/agenda/dia.ts` | Lista de hoy; selector Hoy·Semana·Mes sin efecto (línea ~13) |
| Móvil: inicio y capa | `apps/movil/src/pantallas/inicio.tsx`, `captura.tsx` | «Ver anteriores» arriba de la lista de la capa (línea ~234) |
| Pruebas e2e | `apps/web/e2e/*.spec.ts`, `apps/movil/e2e/*.spec.ts`, `apps/web/e2e/arrancar-api.mjs`, `cuentas.json` | Arrancan la API real con el calendario y el modelo simulados |
| Diseño | `design/ARQUITECTURA-VISUAL-MOVIL.md` §5.1 (líneas ~255–275) y `design/ARQUITECTURA-VISUAL-WEB.md` §2, §4, §9 | Cómo se ven Semana y Mes |

## Requisitos que implementas (propuestos por el equipo; el texto definitivo lo fija la especificación)

**REQ-CUN01-14 · Semana.** CUANDO el usuario elija el nivel Semana, EL SISTEMA mostrará los siete días de la semana (de lunes a domingo) uno debajo de otro, cada uno con sus compromisos en la zona del perfil, con el día de hoy destacado, y permitirá pasar a la semana anterior y a la siguiente. Los días sin compromisos se muestran igualmente, con «Sin compromisos». Los cancelados se marcan como en Hoy.

**REQ-CUN01-15 · Mes.** CUANDO el usuario elija el nivel Mes, EL SISTEMA mostrará la rejilla del mes (semanas en filas, de lunes a domingo, con los días de otros meses atenuados) con **un punto por cada dos compromisos** del día (uno si hay uno o dos, dos si hay tres o cuatro, como mucho tres), permitirá pasar al mes anterior y al siguiente, y CUANDO el usuario toque un día, lo mostrará en el nivel Hoy para esa fecha, con un control para volver a hoy.

**REQ-CAP-25 · Lo que está en espera se ve fuera de la conversación.** MIENTRAS exista algo en espera para la persona, EL SISTEMA mostrará una franja encima de la agenda de hoy (en el lienzo de la web y en Inicio del móvil) con el número («1 cosa en espera», «2 cosas en espera»); CUANDO la persona la abra, verá cada elemento con la frase que pidió y el motivo en palabras llanas («el asistente no responde», «falta conectar el calendario», «las tareas llegan en una próxima versión»), sin ningún botón de retirar (eso sigue siendo una decisión abierta). Si no hay nada en espera, la franja no aparece.

**Pulido · «Ver anteriores» visible.** El botón se queda **visible al inicio de la lista aunque se haya hecho scroll** (pegajoso en la parte superior de la zona de mensajes) mientras `hayAnteriores` sea verdadero; desaparece cuando no hay más. Si pegajoso no es viable en Expo, un botón al pie junto a la barra de entrada vale.

## Reparto

- **Agente WEB** trabaja en `/home/claude/nexoai-t039` (rama `carril-web`). Solo `apps/web/**`. Tres commits: `T-044 · Semana y mes en la web`, `T-045 · Franja «en espera» en la web`, `Pulido · «Ver anteriores» visible en la web`.
- **Agente MÓVIL** trabaja en `/home/claude/nexoai-t039-movil` (rama `carril-movil`). Solo `apps/movil/**`. Tres commits: `T-044 · Semana y mes en el móvil`, `T-045 · Franja «en espera» en el móvil`, `Pulido · «Ver anteriores» visible en el móvil`.
- Ninguno toca `apps/api`, `packages/contratos`, `specs/`, `SPEC.md` ni `design/`. La especificación la escribe otro.

## Cómo probar sin pisarte con el otro agente

PostgreSQL y Redis ya corren en localhost (usuario `nexoai`, clave `nexoai`). El `.env` de la copia ya está. **Cada agente usa sus propios puertos y su propia base:**

| | Agente WEB | Agente MÓVIL |
|---|---|---|
| API de pruebas | `PUERTO_API_E2E=3302 BASE_E2E=nexoai_e2e_web_prueba node e2e/arrancar-api.mjs` desde `apps/web` | `PUERTO_API_E2E=3303 BASE_E2E=nexoai_e2e_movil_prueba CUENTAS_E2E=e2e/cuentas.json CORS_ORIGENES=http://localhost:3203 node ../web/e2e/arrancar-api.mjs` desde `apps/movil` (mira cómo lo hace `apps/movil/playwright.config.ts`) |
| Cliente | `API_URL=http://localhost:3302 npx next dev -p 3301` | `EXPO_PUBLIC_API_URL=http://localhost:3303 CI=1 npx expo start --web --port 3203` |
| Playwright | Ajusta `apps/web/playwright.config.ts` solo si hace falta para los puertos, **y no lo commitees** si el cambio es solo de puertos | Igual con `apps/movil/playwright.config.ts` |

La API de pruebas usa `MODELO_PROVEEDOR=simulado` con el guion de `apps/api/src/agente/modelo/guion-demostracion.ts` («Agéndame una revisión hoy a las 23», «Agéndame una reunión mañana a las 10», «Recuérdame pagar el recibo») y un calendario simulado. Para poblar una semana o un mes en las pruebas, registra compromisos por la conversación (`POST /asistente/mensajes` + `POST /asistente/decisiones` confirmar) o directamente con `POST /operaciones` (`agenda.registrar`) + confirmar; mira `apps/web/e2e/agenda.spec.ts` para ver cómo se hace hoy. Nota: el 429 y los reintentos no aplican con el simulado.

Comprobación de tipos y compilación antes de cada commit: `npx pnpm@12.10.1 --filter @nexoai/web typecheck` (o el script equivalente que veas en `package.json`) / `--filter @nexoai/movil`. Las pruebas e2e de tu paquete deben quedar en verde; añade al menos una prueba nueva por tarea con el nombre `web.agenda-semana-y-mes`, `web.en-espera-visible`, `movil.agenda-semana-y-mes`, `movil.en-espera-visible`.

Usa `playwright` del monorepo (ya instalado; Chromium disponible, no ejecutes `playwright install`).

## Qué devuelves al terminar

Un informe corto (en español) con: los hashes de tus commits y su `--stat`; qué pruebas añadiste y su resultado; **una captura PNG por pantalla nueva** (Semana, Mes, franja en espera, Ver anteriores pegajoso) guardadas en `/home/claude/capturas/salida/carril-<web|movil>/`; y cualquier cosa que no pudiste resolver o que crees que necesita contrato, API o decisión del equipo. No sobrescribas nada en `design/capturas/`.

Si una decisión de diseño no está escrita (por ejemplo, cómo se navega entre semanas), elige lo más simple y coherente con lo que hay, y anótala en el informe como «decisión tomada durante el diseño», que es lo que pide `AGENTS.md`.
