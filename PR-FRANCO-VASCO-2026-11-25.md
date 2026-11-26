# franco-vasco → main · 25 de noviembre de 2026

Rama `franco-vasco`, que sale de `version_parcial` tras la fusión con el CUN-05 de Vasco. Reúne todo lo hecho el 25 de noviembre de 2026 y es la base de la reestructuración del bloque de disponibilidad del equipo (`PROPUESTA-DISPONIBILIDAD-EQUIPO-2026-11-25.md`, pendiente de aval).

## Qué trae

| Versión de `SPEC.md` | Cambio |
|---|---|
| 2.24.0 | Fusión de `main` (CUN-05) con un solo modelo de equipo (D-F1). Detalle en `PR-FUSION-MAIN-2026-11-25.md` |
| 2.25.0 a 2.25.3 | Disponibilidad solo con plan Empresarial y equipo (T-120); escenario de reuniones y capturas de toda la versión (T-124); cambiar la contraseña desde Ajustes (T-121) |
| 2.25.4 | T-041: ciclo de vida de las conversaciones del asistente |
| 2.26.0 a 2.27.0 | Bitácora de una tarea, ficha, contexto y aviso al vencer (T-125 a T-128) |
| 2.28.0 a 2.28.1 | Resumen diario de la bitácora (T-129, T-130), nota de continuidad del asistente (T-040) y evaluación con Groq |
| 2.28.2 | Propuesta de reestructuración de la disponibilidad del equipo (sin código) |

## Migraciones nuevas

`20261125000000_equipo_reglas_administracion`, `20261125120000_bitacora_tarea` y `20261125180000_resumen_bitacora`. Se aplican con `npx pnpm@12.10.1 --filter @nexoai/api migrar`. Ninguna migración aplicada se modificó, salvo la de administración de T-058, que nunca llegó a `main` (ver la guía de la fusión).

## Verificación

`npx pnpm@12.10.1 verificar` sobre la rama: API 529 pruebas (1 saltada por INC-37), contratos 128, extremo a extremo web 57 y móvil 29, trazabilidad 232 requisitos y 0 problemas.

## Para revisar

- **Vasco:** la fusión con CUN-05 (S-1, S-2 y el conflicto de `aplicacion.tsx`), y la propuesta de disponibilidad, que reutiliza su servicio.
- **Pendientes de aval:** los hallazgos de `SPEC.md` §8, entre ellos H-TP-30, 31, 33 a 36, H-AGT-18 y las decisiones D-REU-01 a 09 de la propuesta.
- **No incluido:** restablecer la contraseña por correo (T-122, T-123), que espera PT-3; Next.js 16.4.5, que corrige siete avisos moderados, después del jueves.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
