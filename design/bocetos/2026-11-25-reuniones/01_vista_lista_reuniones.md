# Vista de lista: reuniones del equipo

## Propósito
Pantalla de entrada de la pestaña "Disponibilidad de equipo". Muestra todas las reuniones y deja claro cuáles requieren acción.

## Características
- **Tarjetas por reunión:** título, tema e integrantes. Estilo minimalista, con la misma tipografía, colores y escala de la app.
- **Estado por color:**
  - Ámbar, "Comprobación pendiente · Elegir horario libre": falta elegir un horario.
  - Verde con check, "Horario confirmado · Jue 26, 2:00 PM": la reunión ya está configurada.
- **Llamada a la acción:** "Configurar horario" y el chevron `›` indican que la tarjeta es clicable. Solo aparecen en reuniones pendientes.
- **Reunión confirmada:** no muestra "Configurar horario", solo el chevron en gris, porque ya no requiere acción.
- **Sin horario a la vista:** la lista no carga la cuadrícula. Esta aparece al presionar una tarjeta.

## Decisiones de diseño
- Reemplaza el formulario original (equipo, fecha, duración, banda horaria).
- El estado se entiende de un vistazo por el color.
- Se mantiene el panel del asistente a la izquierda con sus sugerencias.
