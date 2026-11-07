# Entregas del 6 de noviembre de 2026 — carriles B y C

Parches listos para aplicar sobre `modificacion/vision-nexoai` (base `36a9551`, T-039). Los aplica Claude Code o Franco con `git am`; nadie más toca el repositorio. Probado: los siete se aplican en cadena y sin conflictos sobre `36a9551`. Si la rama ya avanzó (T-040, T-043 en `apps/api`), siguen aplicando porque no tocan `apps/api` ni `packages/contratos`; ante un conflicto en `SPEC.md`, usar `git am -3`.

## Orden

```
git am entregas/carril-c/*.patch          # 1 commit: especificación (REQ-CUN01-14, 15; REQ-CAP-25; T-044, T-045)
git am entregas/carril-b-web/*.patch      # 3 commits: T-044, T-045 y pulido, solo apps/web
git am entregas/carril-b-movil/*.patch    # 3 commits: T-044, T-045 y pulido, solo apps/movil
npx pnpm@12.10.1 verificar
python tools/trazabilidad.py --check
```

Después, **lo que solo puede hacer Claude Code** (para no chocar): `SPEC.md` §5 (157 requisitos; 02-agenda 15, 01-captura 25), §8 (abierto: retirar algo de la cola desde la franja), §11 (una línea por este lote); y marcar T-044 y T-045 como **hechas** en `specs/02-agenda/tasks.md` y en la trazabilidad (`implementado`, con sus pruebas), cuando `verificar` pase en su equipo.

## Qué trae cada carril

| Carril | Commits | Qué verá la persona |
|---|---|---|
| C · especificación | 1 | Nada en pantalla. Requisitos, decisiones 20–26, plan §10, tareas T-044/T-045, nota en el diseño web, trazabilidad |
| B · web | 3 (+906/−67 en `apps/web`) | **Semana**: siete días con sus compromisos, hoy destacado, «Semana anterior/siguiente», «Esta semana». **Mes**: rejilla con puntos, atenuados de otros meses, tocar un día abre Hoy con «Volver a hoy». **Franja «en espera»** sobre Hoy. **«Ver anteriores» pegado arriba** |
| B · móvil | 3 (+622/−55 en `apps/movil`) | Lo mismo, con la forma de `ARQUITECTURA-VISUAL-MOVIL.md` §5.1 |

Capturas en `capturas-carril-b/web/` y `movil/`.

## Pruebas que añaden

| Nombre | Dónde | Resultado en el contenedor |
|---|---|---|
| `web.agenda-semana-y-mes` (2 casos) | `apps/web/e2e/agenda.spec.ts` | Pasa |
| `web.en-espera-visible` | `apps/web/e2e/asistente.spec.ts` | Pasa |
| `web.asistente-historial` (+1 caso: pegajoso) | `apps/web/e2e/asistente.spec.ts` | Pasa |
| `movil.agenda-semana-y-mes` (2 casos) | `apps/movil/e2e/agenda-semana-y-mes.spec.ts` | Pasa |
| `movil.en-espera-visible` | `apps/movil/e2e/en-espera.spec.ts` | Pasa |

Web: 21 de 22 corrieron (la que no, `acceso.recorrido-web › volver desde otro sitio`, tiene el puerto 3101 escrito a mano y aquí se usaron otros; en el equipo correrá). Móvil: 11 de 11. Tipos: limpios en los dos.

Cuentas nuevas en `apps/web/e2e/cuentas.json` (`agendaSemana`, `enEspera`, `historialLargo`) y en `apps/movil/e2e/cuentas.json` (`asistente`, `asistenteEspera`), sembradas por `arrancar-api.mjs`.

## Lo que hay que saber antes de aplicar

1. **Contrato.** `OperacionRespuesta` no expone `motivoEspera` ni `solicitudOriginal`. La franja toma la frase de «Lo que pediste» y el motivo de `motivoNoConfirmable`, dentro de `vistaConfirmacion`. Por eso los motivos salen largos («Las tareas llegan en una próxima versión. Queda guardado hasta entonces.») y no cortos como dice REQ-CAP-25. Para los cortos hacen falta esos dos campos en `packages/contratos` y en la API: **hallazgo para el carril del agente**, anotado en la decisión 26.
2. **`RANGO_MAXIMO_DIAS` es 366**, no 31 (el 31 es de la herramienta del asistente). La especificación quedó corregida (decisión 22).
3. **Una diferencia entre web y móvil:** la franja «en espera» sale solo en Hoy en la web y en los tres niveles en el móvil. REQ-CAP-25 dice «sobre la agenda de hoy»: unificar al nivel Hoy en el móvil (un cambio de pocas líneas, decisión 26).
4. **Registrar por la API en las pruebas exige origen `agente`** (`control_directo` da 403 por R-42). Las pruebas lo hacen así. El compromiso cancelado de la prueba web se inserta directo en la réplica porque el calendario simulado no devuelve cancelados en la primera lectura.
5. **Opacidad 0,6** mientras carga la vista nueva en la web: no sale de ningún token. Si molesta, se quita o se añade el token.
6. **Mejora pendiente:** en Semana, si hoy cae al final y hay muchos compromisos, no se desplaza solo hasta hoy.
7. `apps/web/e2e/arrancar-api.mjs` cambia **solo** para sembrar las cuentas nuevas; la migración sigue con `prisma migrate deploy`.

## Decisiones tomadas durante el diseño (ya en la decisión 24–26 del spec de agenda)

Fecha de foco única para los tres niveles; «Anterior/Siguiente» en texto; cancelados no cuentan para los puntos; varios días cuentan en cada día; días de otros meses elegibles; franja en el nivel Hoy, también sin calendario, desplegada en el sitio.

## Siguiente paso de pruebas

Cuando esté aplicado: A7–A11 del plan (tarjeta en conflicto queda para el pulido del agente; Semana/Mes y franja ya tienen capturas aquí; anchos 1024/768 y accesibilidad pendientes), más repetir A1–A6 para confirmar que nada se rompió.
