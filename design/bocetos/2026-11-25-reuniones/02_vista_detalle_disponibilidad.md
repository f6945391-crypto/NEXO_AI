# Vista de detalle: disponibilidad de Meeting 1

## Propósito
Pantalla que se abre al presionar "Meeting 1". Es un apartado nuevo, dedicado a elegir el horario, en el estilo de When2meet.

## Características
- **Cabecera:** `‹ Volver` regresa a la lista. "Meeting 1" y la píldora ámbar "Comprobación pendiente · Elegir horario" indican la reunión.
- **Leyenda:** escala "0/3 disponibles" a "3/3 disponibles", con el texto "Pasa el cursor sobre el horario para ver quién está disponible".
- **Chips de integrantes con interruptor:** activan o desactivan a cada persona en el cálculo, para simular escenarios.
- **Cuadrícula de calor:** columnas Lun 23 a Vie 27, filas de 9:00 AM a 5:00 PM. Más verde significa más integrantes libres.
- **Tooltip:** al pasar el cursor sobre una celda muestra quién está libre (ej.: Mar 24 · 12:00 PM, Integrantes 1, 2 y 3).
- **Horario sugerido:** celda con borde azul, la que tiene más gente libre.
- **Aviso de privacidad:** "Solo se muestran horas libres u ocupadas, sin títulos ni detalles".
- **Botón "Confirmar horario":** fija el horario elegido. El asistente pediría confirmación antes de ejecutarlo.

## Pendientes y observaciones
- Los puntos de color de los chips no tienen función clara, porque el verde de la cuadrícula ya significa disponibilidad. Conviene volverlos neutros.
- Falta definir si el horario se elige tocando una celda o arrastrando.
- Falta la duración mínima que existía en el formulario original.
- Falta el estado "Sin autorización" para integrantes que no comparten su disponibilidad.
- Al confirmar, la reunión debería pasar a verde y reflejarse en la lista.
