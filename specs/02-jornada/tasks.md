# Tareas — Jornada (CUN-02), sección Actividad

**Plan:** `specs/02-jornada/plan.md` (propuesta del 7 de noviembre de 2026)
**Numeración:** empieza en **T-080 a propósito**, con un hueco tras las de `09-tareas-personales` (T-046 a T-055) y `08-administracion`, porque las cuatro áreas se escriben a la vez. Se renumeran al integrar si hace falta.
**Regla:** una tarea cabe en una sesión de trabajo. Termina cuando se cumple su «Hecho cuando», su prueba pasa y `python tools/trazabilidad.py --check` sigue limpio.

Estados: `pendiente` · `en curso` · `hecha`.

Orden: contrato → consulta → web → móvil. T-084 espera a las tareas personales.

---

### T-080 · Contrato de Actividad

- **Satisface:** REQ-CUN02-25, 26, 27, 28, 29, 33 · habilita AD-08
- **Depende de:** —
- **Contenido:** `packages/contratos/src/actividad.ts`: `NivelActividad`, `ConsultaActividad` (nivel por defecto `dia`, fecha `AAAA-MM-DD` opcional y válida), `CompromisoOcurrido`, `AccionDelAsistente`, `EstadoCalendarioActividad` y `Actividad`; una línea en `index.ts`
- **Hecho cuando:** la API, la web y el móvil usan este esquema y no otro; una fecha imposible o un nivel desconocido no pasan
- **Prueba:** `actividad.consulta-valida-nivel-y-fecha` (unitaria, en `packages/contratos`)
- **Estado:** hecha · 7 de noviembre de 2026. 12 pruebas; 30 en `packages/contratos`
- **Notas de implementación:** `FechaCalendario` es nuevo y propio de este contrato (Agenda pasa instantes, no fechas). Sin campo para las tareas completadas hasta T-084

### T-081 · Consulta `GET /actividad`

- **Satisface:** REQ-CUN02-25, 26, 27, 28, 29, 31, 34, 35 · H-JOR-02 a 08, 10, 11
- **Depende de:** T-080
- **Contenido:** `apps/api/src/actividad/`: `periodo.ts` (función pura), `descripcion.ts`, `ConsultaActividadService`, `ActividadController` con `@SobreLoPropio()`, `ActividadModule` (importa `AgendaModule` e `IntegracionesModule`); el módulo al final de `imports` en `app.module.ts`
- **Hecho cuando:** con el calendario simulado, devuelve solo los compromisos terminados y no cancelados del período, y solo las Operaciones ejecutadas, con hora de ejecución, frase, datos y origen; sin calendario devuelve el registro y `sin_conectar`; nada de otra persona; funciona sin proveedor de modelo
- **Pruebas:** `actividad.periodos` (unitaria), `actividad.compromisos-ocurridos`, `actividad.registro-del-asistente`, `actividad.sin-calendario`, `actividad.solo-lo-propio`, `actividad.sin-proveedor-de-modelo` (integración)
- **Estado:** hecha · 7 de noviembre de 2026. 7 pruebas unitarias y 11 de integración; 251 en la API
- **Notas de implementación:**
  - Las pruebas de integración eligen una zona en la que ahora es de día, para que «hace dos horas» caiga hoy a cualquier hora de ejecución.
  - Un compromiso sembrado después de la primera lectura no aparece hasta pasados los 2 minutos de margen de la copia, igual que en Agenda (decisión 22 de `02-agenda`). No es un fallo de Actividad.
  - Las Operaciones se ordenan por `ejecutada_en` y, a igualdad, por `creada_en`.

### T-082 · Web: sección Actividad

- **Satisface:** REQ-CUN02-25, 26, 27, 28, 29, 30, 31, 33, 34
- **Depende de:** T-081
- **Contenido:** `app/aplicacion/actividad.tsx` (cliente) y `actividad-servidor.ts` (acción de servidor que lee y formatea); en `aplicacion.tsx`, solo el montaje en lugar del vacío. Período con anterior, siguiente hasta el actual y vuelta al actual; bloques «Compromisos» y «Lo que hizo el asistente» con su cantidad; agrupación por día en Semana y Mes; vacío por nivel y por bloque; sin calendario
- **Hecho cuando:** el recorrido de la prueba pasa con la cuenta `actividad` y la `actividadVacia`; capturas 1440 × 900 de Día, Semana, Mes y vacío
- **Prueba:** `web.actividad` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026. 4 pruebas; 28 de extremo a extremo en la web
- **Notas de implementación:**
  - La lectura es una función de servidor (`leerActividad`), llamada al cambiar de nivel o de período: el nivel lo elige el cliente, así que no va en la dirección como en Agenda. Next.js 16 avisa de que las funciones de servidor se despachan de una en una; aquí hay una sola por cambio, y la última que llega es la que cuenta.
  - Estilos propios en `actividad.module.css` (solo variables de `globales.css`); el período, la fila y el vacío reutilizan las clases de Agenda. No se toca `globales.css` para no chocar con el carril de tareas.
  - `aplicacion.tsx`: el montaje y que el cuerpo del lienzo sea de lista también en Actividad.
  - La cuenta `actividad` de las pruebas vive en una zona en la que es de día al arrancar (las pruebas leen la zona del perfil).

### T-083 · Móvil: sección Actividad

- **Satisface:** REQ-CUN02-25, 26, 27, 28, 29, 30, 31, 33, 34
- **Depende de:** T-081
- **Contenido:** `pantallas/actividad.tsx` con el selector y la disposición de `pantallas/agenda.tsx` y los formatos de `agenda/dia.ts`; en `aplicacion.tsx`, solo el montaje en lugar del vacío
- **Hecho cuando:** el mismo recorrido que la web pasa sobre Expo web a 390 × 844; capturas de Día, Semana, Mes y vacío
- **Prueba:** `movil.actividad` (extremo a extremo)
- **Estado:** hecha · 7 de noviembre de 2026. 4 pruebas; 18 de extremo a extremo en el móvil
- **Notas de implementación:**
  - Lee `GET /actividad` con `conSesion` y formatea con `agenda/dia.ts` (sin tocarlo). Vuelve a leer cuando el asistente deja algo hecho (`version`, T-035).
  - La hora de cada fila va arriba, en `marca/base` para los compromisos y en `agente/base` para las acciones (§3, «Dato de apoyo»); los datos de la acción, en pares etiqueta / valor.
  - Sin calendario, remite a Ajustes en la web, como Agenda en el móvil.
  - En `aplicacion.tsx`, solo una rama del montaje. La entrada `actividad` de `VACIOS` queda sin uso; se retira al integrar para no chocar con el carril de tareas, que toca la misma constante.
  - En Expo web, el selector no expone `aria-selected`: la prueba comprueba el nivel por su contenido.

### T-084 · Tareas completadas en Actividad

- **Satisface:** REQ-CUN02-32 · H-JOR-12
- **Depende de:** T-081, T-082, T-083 y la integración de `09-tareas-personales` (T-046 en adelante)
- **Contenido:** lo que dice `plan.md` §7: campo `tareasCompletadas` en el contrato, lectura de `tarea` hecha en el período, tercer bloque en web y móvil
- **Hecho cuando:** una tarea completada el martes aparece el martes en Semana con su hora; una descartada o pendiente no
- **Prueba:** `actividad.tareas-completadas` (integración), y los casos nuevos de `web.actividad` y `movil.actividad`
- **Estado:** pendiente · **sin empezar a propósito**: no se depende de un carril que se construye a la vez
