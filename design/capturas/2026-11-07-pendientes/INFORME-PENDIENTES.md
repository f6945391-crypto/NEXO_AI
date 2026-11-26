# Capturas del carril pendientes — 7 de noviembre de 2026

**Qué:** la tarjeta ya decidida en la conversación de la web, en paridad con H-CAP-01 del móvil.
**Cómo se tomaron:** Playwright con Chromium a 1440×900, contra la API real con el asistente y el calendario simulados, sobre `nexoai_e2e_t5_prueba`. La prueba `una tarjeta ya decidida queda sin botones y con «Confirmado» o «Descartado»` (`apps/web/e2e/asistente.spec.ts`) guarda la captura con `CAPTURAS_PENDIENTES=<carpeta>`. Cuenta `asistente`: se pide «Agéndame una llamada mañana a las 16» y se confirma; luego «… a las 18» y se descarta.

| Pantalla | Antes | Después |
|---|---|---|
| Conversación con dos tarjetas decididas | `web-tarjeta-decidida-antes.png`: las dos tarjetas quedan sin botones, pero nada en ellas dice cómo terminaron; solo se deduce del mensaje y de la línea que vienen debajo | `web-tarjeta-decidida-despues.png`: al pie de cada tarjeta, «Confirmado» o «Descartado» en texto suave, y el borde de la tarjeta pasa al tono base. Se mantiene al recargar |

## Lo que no se cambió

- La tarjeta decidida sigue mostrando todos sus datos. El móvil la pliega; en la web no se pidió.
- El criterio es el del móvil, copiado tal cual: además de «Confirmado» y «Descartado», da «Cambiado por otro horario» si llegó otra propuesta y «No se pudo hacer» si llegó un fallo.
