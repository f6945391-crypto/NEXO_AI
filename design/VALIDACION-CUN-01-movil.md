# Validación de diseño — CUN-01 Móvil

**Archivo de Figma:** NexoAI · Móvil, página `02 Flujos`
https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5

**Fecha:** 25 de septiembre de 2026
**Entradas:** `specs/02-agenda/spec.md` y `design/manifiesto-esperado.movil.json`, contra la estructura real leída desde Figma.

---

## Resumen

| Métrica | Resultado |
|---|---|
| Requisitos totales | 12 |
| Cubiertos | 12 |
| Parciales | 0 |
| Ausentes | 0 |
| Cuadros esperados | 13 |
| Cuadros existentes | 13 |
| Cuadros en deriva | 0 |
| Cuadros con nombre fuera de convención | 0 |
| Nodos con color sin variable vinculada | 0 |

---

## A. Cobertura por requisito

| Requisito | Cuadro que lo representa | Estado |
|---|---|---|
| REQ-CUN01-01 | Principal / 03 Solicitud escrita, 04 Interpretando | CUBIERTO |
| REQ-CUN01-02 | Principal / 04 Interpretando | CUBIERTO |
| REQ-CUN01-03 | Principal / 05 Confirmación pendiente, FA-02 / 02 | CUBIERTO |
| REQ-CUN01-04 | Principal / 06 Compromiso registrado | CUBIERTO |
| REQ-CUN01-05 | FA-01 / 01 Conflicto detectado | CUBIERTO |
| REQ-CUN01-06 | FA-02 / 01 y 02 | CUBIERTO |
| REQ-CUN01-07 | EX-01 / 01 Información insuficiente | CUBIERTO |
| REQ-CUN01-08 | EX-02 / 01 Sin autorización | CUBIERTO |
| REQ-CUN01-09 | Principal / 01 y 02 | CUBIERTO |
| REQ-CUN01-10 | Principal / 02, 05 (zona horaria visible) | CUBIERTO |
| REQ-CUN01-11 | Transversal / Modo degradado | CUBIERTO |
| REQ-CUN01-12 | Principal / 01 Agenda vacía | CUBIERTO |

## B. Deriva

Ningún cuadro sin requisito que lo justifique. `Transversal / Cargando agenda` no responde a un requisito funcional: es un estado de latencia exigido por las reglas de presentación. Queda declarado, no eliminado.

## C. Completitud de flujo

| Flujo | Cuadros | Cierre |
|---|---|---|
| Principal | 6 | Sí, en 06 Compromiso registrado |
| FA-01 Conflicto | 1 | Sí, devuelve al flujo principal o cancela |
| FA-02 Modificar o cancelar | 2 | Sí, en 02 Confirmación de cancelación |
| EX-01 Información insuficiente | 1 | Sí, devuelve al flujo principal |
| EX-02 Sin autorización | 1 | Sí, concede permiso o camino manual |
| Transversal | 2 | No aplica |

## D. Convención de nombres

13 de 13 cumplen `CUN-XX / Plataforma / Flujo / NN Estado`.

## E. Sistema

- 39 variables en 4 colecciones: color (19), espaciado (10), radio (4), tipografía (6).
- Todas con `scopes` explícitos y con code syntax WEB en formato `var(--color-marca-base)`, para que Dev Mode devuelva el nombre del token y no el valor.
- Todos los rellenos, bordes, tamaños de texto, espaciados y radios están vinculados a variables. Cero valores sueltos.

### Componentes

Página `01 Componentes`.

| Componente | Variantes | Propiedades | Instancias en uso |
|---|---|---|---|
| Botón | Tipo = Primario, Secundario, Texto, Destructivo | Etiqueta (texto) | 13 |
| Tarjeta / Evento | — | Hora, Título (texto) | 6 |
| Burbuja | Autor = Usuario, Asistente | Mensaje (texto) | 6 |
| Barra de entrada | Estado = Reposo, Activo, Deshabilitado | Texto (texto) | 5 |

30 instancias en total. **Cero copias sueltas:** ningún elemento repetido en los cuadros quedó fuera del sistema.

## F. Reglas de producto

| Regla | Verificación | Resultado |
|---|---|---|
| RN-ER-03 confirmación previa | Registro y cancelación tienen su cuadro de confirmación con acción, datos, motivo y advertencia de irreversibilidad | CUMPLE |
| RN-OP-01 permisos | Existe estado sin autorización con indicación de qué permiso falta | CUMPLE |
| Modo degradado | Existe, y mantiene la agenda y la creación manual operativas | CUMPLE |
| Estado vacío | Existe para la lista de compromisos | CUMPLE |
| Zona horaria | Visible en encabezado y en la tarjeta de confirmación | CUMPLE |

---

## Limitaciones conocidas

1. **Un solo modo de color.** El plan Starter limita las colecciones a un modo, así que el tema oscuro no está cargado en Figma. Los valores existen en `tokens.json` bajo `$extensions.oscuro` y se cargan en un paso cuando el plan sea Professional.
2. **Sin biblioteca compartida.** `Fundamentos` no existe todavía como archivo publicado; las variables y los componentes viven dentro de `NexoAI · Móvil`. Al crear el archivo web habrá que extraerlos, y publicar una biblioteca requiere plan Professional.
3. **Web sin empezar.** Esta validación cubre únicamente la plataforma móvil.
4. **Sin iconografía.** Los cuadros no usan iconos todavía. Cuando se añadan, van como `INSTANCE_SWAP` dentro de los componentes, nunca como una variante por icono.

---

## Siguiente paso

Arrancar la plataforma web con CUN-05 (consultar disponibilidad de equipo), que es donde está la rejilla de disponibilidad. Antes de generar cuadros web hay que resolver dos cosas:

1. **El criterio de RN-CAL-01**, aprobado el 26 de septiembre de 2026 y documentado en `specs/05-equipos/spec.md` sección 1. Queda incorporarlo al texto de la regla en el Entregable 1.
2. **El plan de Figma.** Con Starter no se puede publicar `Fundamentos` como biblioteca, así que el archivo web no podría consumir estas variables ni estos componentes: habría que duplicarlos, que es exactamente lo que el sistema de diseño existe para evitar.
