# Capturas del carril tareas — 7 de noviembre de 2026

**Área:** `specs/09-tareas-personales` (CUN-03), tareas T-046 a T-055.
**Cómo se tomaron:** Playwright con Chromium contra la API real y el asistente simulado, sobre bases propias del carril (`nexoai_e2e_t4tareas_prueba`, `nexoai_e2e_t4tareasmovil_prueba`). Web a 1440×900, móvil (Expo web) a 390×844, zona del navegador Lima. Las cuentas `tareas` y `tareasVacio` y sus datos los siembra `apps/web/e2e/arrancar-api.mjs`.
**Datos de la cuenta `tareas`:** «Pagar el recibo» hoy antes de las 23:00, «Renovar el DNI» vencida hace tres días, «Enviar la tesis» en cinco días, «Llamar al dentista» y «Devolver el libro» sin fecha, «Presupuesto» de Juan desde hace seis días y para dentro de siete, «Comprar el regalo» hecha ayer, y el compromiso «Dentista» hoy de 10:00 a 11:00.

**Antes:** la web y el móvil de la base de la tanda (`base-tanda3`) contra la API nueva. Las capturas de la web «antes» se tomaron con la API ya de este carril, así que en la conversación la lista de tareas que devuelve el asistente **no se pinta** (la web anterior no conocía ese turno); en la base real, «¿Qué tengo pendiente?» recibía «No sé hacer eso todavía.».

## Web

| Pantalla | Antes | Después |
|---|---|---|
| Tareas, «Con fecha» | `web-tareas-con-fecha-antes.png`: estado vacío genérico, «Nada en «Con fecha»» | `web-tareas-con-fecha-despues.png`: «Renovar el DNI» primero, con «Vencía el…» y la marca «Vencida»; después «Pagar el recibo» con su hora límite y «Enviar la tesis». «Hecho» y «Descartar» en cada fila |
| Tareas, «Sin fecha» | `web-tareas-sin-fecha-antes.png` | `web-tareas-sin-fecha-despues.png`: la más reciente primero; al pie, «Ver hechas (7 días) · 1» |
| Tareas, «Esperando de alguien» | `web-tareas-esperando-antes.png` | `web-tareas-esperando-despues.png`: «Presupuesto · De Juan · Desde el…, hace 6 días · Para el…», con «Recibido» |
| Tareas vacía | `web-tareas-vacia-antes.png` | `web-tareas-vacia-despues.png`: qué va en la franja, un ejemplo y «Pedírselo al asistente», que enfoca la entrada |
| Hoy con tareas | `web-hoy-con-tareas-antes.png`: solo «Dentista» | `web-hoy-con-tareas-despues.png`: «Dentista» en su hora y debajo «Tareas para este día» con «Pagar el recibo · Antes de las 23:00» y «Renovar el DNI», vencida |
| Conversación «¿Qué tengo pendiente?» | `web-conversacion-que-tengo-pendiente-antes.png`: el mensaje sin respuesta visible | `web-conversacion-que-tengo-pendiente-despues.png`: la lista armada por el código, en «Con fecha», «Sin fecha» y «Esperando de alguien», con la vencida en rojo |

## Móvil

| Pantalla | Antes | Después |
|---|---|---|
| Tareas, «Con fecha» | `movil-tareas-con-fecha-antes.png`: «Nada en tus tareas» | `movil-tareas-con-fecha-despues.png`: el selector de franjas y las mismas tareas, en el mismo orden y con los mismos textos que la web |
| Tareas, «Esperando de alguien» | (antes no había franjas) | `movil-tareas-esperando-despues.png` |
| Tareas vacía | `movil-tareas-vacia-antes.png` | `movil-tareas-vacia-despues.png`: estado vacío por franja con «Pedírselo al asistente», que abre la capa de captura |
| Hoy con tareas | `movil-hoy-con-tareas-antes.png` | `movil-hoy-con-tareas-despues.png`: el grupo «Tareas para este día» debajo de los compromisos, con «Hecho» |

## Lo que se ve y lo que dice la especificación

- Ningún texto nombra la interfaz ni estados internos (R-40): «Vencía el…», «Debía llegar el…», «Hecha el…», «Recibido el…», «Ver hechas (7 días)», «Deshacer», «Pedírselo al asistente».
- No hay ningún campo para escribir o cambiar una tarea a mano (R-42, H-TP-08): crear y cambiar se le piden al asistente.
- «Hecho» no muestra tarjeta y ofrece «Deshacer» seis segundos; «Descartar» sí muestra la tarjeta con la tarea exacta y «Ya no aparecerá en tus tareas, tampoco entre las hechas» (H-TP-07).
- En Semana y Mes no aparece ninguna tarea (H-TP-09).
- Colores y espaciados con los tokens existentes (`globales.css`, `tokens.ts`). La marca de vencida usa `estado-error` y su tinte suave; no se añadió ningún token.

## Pendiente de revisar con diseño

- El tamaño de «Hecho» en la web (botón secundario de 36 px de alto) frente al de la agenda.
- En el móvil, el selector de tres franjas ocupa casi todo el ancho a 390 px; con «Encargadas» (Plan Empresarial, `03-tareas`) no cabría.
- La conversación del móvil con la lista de tareas no se capturó; la cubre la prueba `movil.tareas-en-hoy`.
