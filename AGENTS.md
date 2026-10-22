# AGENTS.md — instrucciones para la IA que trabaja en este repositorio

Este proyecto se desarrolla con **Spec-Driven Development, modo spec-anchored**. La fuente de verdad es `SPEC.md`. Léelo antes de cualquier tarea.

> No confundir con `specs/agentes/*.md` (cuando exista): eso especifica el comportamiento del asistente NexoAI. Este archivo dice cómo trabajar en el repositorio.

## Orden obligatorio ante cualquier cambio

1. **Ubica el requisito.** Busca el `REQ-*` que justifica el cambio en `specs/<área>/spec.md`. Si no existe, **no escribas código**: redacta el requisito en EARS (formato en `SPEC.md` §2.3) y propónlo.
2. **Cambia la especificación primero.** Edita el `spec.md` del área.
3. **Actualiza `SPEC.md`** en el mismo turno:
   - §5 o §6 si cambia el número de requisitos, el estado o la cobertura de un CUN.
   - §8 si se abre o se cierra una decisión.
   - §9 si encuentras una contradicción entre documentos. **Anótala; no la resuelvas por tu cuenta.**
   - §11 siempre: una línea con fecha, versión, cambio, archivos y quién. Sube la versión de la cabecera.
4. **Recién entonces** `plan.md` → `tasks.md` → código → prueba.
5. Al terminar, regenera la trazabilidad, anota tarea, prueba y estado del requisito en `specs/trazabilidad.md` y ejecuta `python tools/trazabilidad.py --check`. Si falla, no está terminado.
6. Usa los términos tal como los define `specs/glosario.md`. Si un término nuevo hace falta, se añade allí primero.

## Prohibiciones

- No inventar comportamiento que la especificación no dice. **Si tienes que decidir algo que el spec no cubre, es un hallazgo**: anótalo en el spec del área bajo «Decisiones tomadas durante el diseño» y en `SPEC.md` §8.
- No reutilizar un identificador retirado. No renumerar requisitos existentes.
- No poner nombres de tecnología dentro de un `spec.md`; van en `plan.md`.
- No contradecir un principio de `SPEC.md` §3. Si un requisito lo pide, se señala como inconsistencia.
- No modificar el Entregable 1 ni `REPLANTEO.md` sin que el equipo lo pida: son registros de decisiones, no borradores.
- No borrar documentos ni cuadros de diseño anteriores; se marcan como anteriores.

## Dónde va cada cosa

| Qué | Dónde |
|---|---|
| Estado del proyecto, principios, decisiones abiertas, registro de cambios | `SPEC.md` |
| Requisitos EARS por área | `specs/<nn-área>/spec.md` |
| Diseño técnico por área / desglose de tareas | `specs/<nn-área>/plan.md` · `tasks.md` |
| Arquitectura y stack | `PROPUESTA-TECNICA.md` |
| Reglas de producto R-nn y decisiones D-nn | `REPLANTEO.md` §8 y §9 |
| Arquitectura visual y validaciones de diseño | `design/` |

## Idioma y estilo

Todo en español. Frases cortas, tablas para lo enumerable, sin relleno. Las fechas en formato absoluto (22 de octubre de 2026, o `2026-10-22` en tablas).

## Stack y comandos

Requisitos: Node.js 22.12 o posterior (`.nvmrc`), Python 3.12 y Docker. pnpm no hace falta instalarlo: se ejecuta con `npx pnpm@12.10.1`. Corepack 0.34 no sirve, porque no reconoce el binario nativo de pnpm 12.

| Comando | Para qué |
|---|---|
| `npx pnpm@12.10.1 install` | Instala todo el monorepo |
| `docker compose up -d` | Levanta PostgreSQL (con pgvector) y Redis |
| `npx pnpm@12.10.1 verificar` | Comprobación de tipos, compilación, pruebas y trazabilidad. **Una tarea no está hecha si esto falla** |
| `npx pnpm@12.10.1 test` | Solo las pruebas |
| `node apps/api/dist/main.js` | Arranca la API compilada (`PUERTO`, 3000 por defecto) |
| `python tools/trazabilidad.py` | Regenera `specs/trazabilidad.md` desde los `spec.md` |
| `python tools/trazabilidad.py --check` | Verifica la sincronía entre especificaciones y trazabilidad; sale con 1 si hay problemas |

**Stack:** TypeScript en todo el monorepo (pnpm + Turborepo). API en NestJS + Prisma, cola con BullMQ, agente con LangGraph.js, web con Next.js, móvil con Expo, pruebas con Vitest y Playwright. El detalle está en `PROPUESTA-TECNICA.md` §4. **Las versiones están fijadas exactas** en cada `package.json`; antes de cambiar la configuración de una herramienta, lee la documentación de la versión instalada (por ejemplo, `node_modules/turbo/docs`), que puede diferir de lo que conoces.

**`@swc/core` está fijado en 1.16.2 a propósito.** Desde la 1.16.12, su binario nativo se niega a cargar si su carpeta de caché es escribible por otros usuarios, y en este equipo lo son todas. No lo subas sin comprobar que `pnpm test` sigue pasando.

**Estructura:**

| Carpeta | Contenido |
|---|---|
| `apps/api` | NestJS: un módulo por módulo de dominio, y el proceso trabajador como segundo punto de entrada. Pruebas en `test/`, cada `describe` con el nombre de la prueba que figura en `tasks.md` |
| `apps/web` · `apps/movil` | Clientes (T-010, T-020) |
| `packages/contratos` | Esquemas zod: la única definición de cada petición, respuesta y herramienta (AD-08) |
| `tools/` | Herramientas del método, como `trazabilidad.py` |

**Prohibiciones propias del stack:**
- Ningún esquema de petición o respuesta fuera de `packages/contratos`.
- Ninguna escritura con efecto fuera de una Operación (AD-09). Un servicio de dominio no llama a Google directamente desde un controlador.
- Ningún SDK de proveedor de modelo fuera del módulo del agente (P-06).
- Nada de `$queryRaw` de Prisma fuera del repositorio de búsqueda semántica.
- No modificar una migración ya aplicada; se crea una nueva.
