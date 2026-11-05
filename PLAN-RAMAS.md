# Plan de ramas — NexoAI

**Fecha:** 5 de noviembre de 2026
**Repositorio:** `https://github.com/f6945391-crypto/NEXO_AI` · rama base `main` en `5fe7257`
**Qué es:** la estructura de ramas para trabajar a partir del `main` publicado, sin tocarlo directamente. Los comandos los ejecuta el equipo; Claude no hace push ni crea ramas.

---

## 1. Principio

`main` es la copia publicada y **solo recibe fusiones**: nunca se trabaja encima. Cada línea de trabajo sale de `main`, vive en su rama, pasa `verificar` en la integración continua y vuelve a `main` por *pull request*. Dentro de cada rama se respeta el orden de `AGENTS.md`: especificación → `SPEC.md` → plan → tareas → código → prueba, **un commit por tarea**.

```
main ──●─────────────────────────●──────────────────────────────●──►
       │ 5fe7257                 ▲ fusión 1                     ▲ fusión 2 (cuando esté lista)
       │                         │                              │
       ├─ actualizacion/error-npm ●  (1 commit, corta)          │
       │                                                        │
       └─ modificacion/vision-nexoai ●──●──●──●──●──●───────────●
                                     P0 T-038 T-039 T-040 T-041 T-042
```

## 2. Punto de partida: marcar la base

Antes de abrir ramas, una etiqueta que fije «lo que había» (la fase 2 completa, hasta T-037). Sirve para comparar y para volver.

```
git checkout main
git pull
git tag -a fase2-base -m "Fase 2 completa (T-001 a T-037) y los tres informes del agente"
git push origin fase2-base
```

## 3. Rama `actualizacion/error-npm`

**Para qué:** arreglar el fallo de `pnpm audit` en la integración continua (node-forge ≤ 1.4.0 vía la CLI de Expo). Es independiente de todo lo demás y debe entrar primero, para que `main` vuelva a estar en verde.

**Contenido (un solo commit):**

| Archivo | Cambio |
|---|---|
| `pnpm-workspace.yaml` | En `overrides`: `node-forge@<=1.4.0: 1.4.1`, con su comentario (GHSA-5x38-2vff-x55p y cuatro más, 5 de noviembre de 2026, corregido en 1.4.1). Quitar de `ignoreGhsas` la excepción `GHSA-86w9-cpqp-85rv`, que ya tiene corrección |
| `pnpm-lock.yaml` | Lo regenera `pnpm install` |
| `SPEC.md` §11 | Una línea: fecha, versión, «Corrección de seguridad: node-forge 1.4.1 por override; excepción retirada», archivos, quién |

**Comandos:**

```
git checkout main
git checkout -b actualizacion/error-npm
# editar pnpm-workspace.yaml y SPEC.md
npx pnpm@12.10.1 install
npx pnpm@12.10.1 audit --audit-level high      # debe terminar sin altas
npx pnpm@12.10.1 verificar                      # todo en verde
git add pnpm-workspace.yaml pnpm-lock.yaml SPEC.md
git commit -m "Corrección de seguridad: node-forge 1.4.1 por override (GHSA-5x38-2vff-x55p y cuatro más)"
git push -u origin actualizacion/error-npm
```

Después: abrir el *pull request* `actualizacion/error-npm → main`, esperar a que `verificar` pase en GitHub, fusionar. Borrar la rama.

## 4. Rama `modificacion/vision-nexoai`

**Para qué:** la reestructuración del agente y de la interfaz descrita en `INFORME-MEMORIA-AGENTE.md` (§6, incluida §6.4) e `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` (§6). Es una rama **larga**: vive varias semanas y recibe un commit por tarea.

**Se crea desde `main` ya con la corrección anterior fusionada** (si se crea antes, se trae con `git merge main` en cuanto exista).

```
git checkout main
git pull
git checkout -b modificacion/vision-nexoai
git push -u origin modificacion/vision-nexoai
```

**Orden de commits dentro de la rama** (uno por paso; cada uno deja `verificar` y `trazabilidad.py --check` en verde):

| # | Commit | Qué toca | Referencia |
|---|---|---|---|
| P0 | «Paso 0: H-AGT-16 y H-AGT-17; REQ-AGT-01 v2, REQ-AGT-03 a 05; glosario; diseño; plan; T-038 a T-042 (solo especificación)» | `specs/07-agente/spec.md`, `specs/glosario.md`, `design/ARQUITECTURA-VISUAL-WEB.md`, `…-MOVIL.md`, `specs/07-agente/plan.md`, `tasks.md`, `SPEC.md` §5, §8, §9, §11, `specs/trazabilidad.md` | Informe estructura §5.10; informe memoria §8 y §6.4.7 |
| 1 | «T-038: transcripción propia y conversación paginada» | API, contratos, migración | Informe estructura §6 paso 1 |
| 2 | «T-039: la conversación no se vacía; separadores y ver anteriores (web y móvil)» | web, móvil | Informe visual §6 pasos 1 y 2 |
| 3 | «T-040: nota de continuidad y evaluación por trayectorias» | API, `evaluar-asistente` | Informe estructura §6 paso 3 |
| 4 | «T-041: cierre por inactividad y retención de puntos de control» | API, trabajador | Informe estructura §6 paso 4 |
| 5 | «T-042: alternativas de referente y hilo por actividad» (si el equipo lo acepta) | API, contratos, web, móvil | Informe memoria §6.4 |
| — | Pulido visual independiente (tarjeta en conflicto, lienzo en modo Objeto, anchos, asa) | web, móvil, `globales.css`, `tokens.ts` | Informe visual §6 pasos 3, 4, 7, 8, 9. Puede ir como commits sueltos en esta rama o en una rama corta `actualizacion/pulido-visual` desde `main` |

**Al terminar cada tarea:** `git push`. La integración continua corre en cada push de la rama y avisa si algo se rompe, sin tocar `main`.

**Cómo vuelve a `main`:** cuando la rama esté completa y el equipo la haya probado (incluido el teléfono real), *pull request* `modificacion/vision-nexoai → main`. Si `main` cambió mientras tanto, antes: `git merge main` dentro de la rama y resolver conflictos ahí, nunca en `main`.

## 5. Reglas cortas

- **Nombres:** `actualizacion/<qué>` para correcciones y mantenimiento (cortas); `modificacion/<qué>` para cambios de rumbo o de alcance (largas). Minúsculas, sin acentos ni espacios.
- **Nunca `git push --force` sobre `main`.** Si hace falta rehacer historia, solo en la rama propia y avisando.
- **`.env` jamás se commitea.** Ya está en `.gitignore`; si GitHub avisa de un secreto, se rota la clave, no solo se borra el archivo.
- **Un commit por tarea**, con el identificador `T-nnn` en el mensaje, como ya hace el repositorio.
- **Claude trabaja solo en la rama que el equipo le indique**, nunca en `main`.

## 6. Qué está pendiente de decidir antes de P0

Están listadas en `INFORME-MEMORIA-AGENTE.md` §10 (puntos 1 a 9), `INFORME-ESTRUCTURA-Y-REESTRUCTURACION-AGENTE.md` §9 e `INFORME-VISUAL-AGENTE.md` §8. Sin esas decisiones, P0 no se puede redactar completo; con ellas, es una sesión de trabajo.
