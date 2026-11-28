import type { ReglaGuion } from './modelo-simulado';

// H-AGT-02 · T-029. Guion del simulado para demostrar el asistente sin clave (`MODELO_PROVEEDOR=simulado`).
// Cubre los ejemplos de la web y algunas variantes; lo demás recibe «No sé hacer eso todavía». Las
// herramientas a las que llama llegan con T-031. El paso vacío del final deja que el código arme la respuesta.

const DIA = '(hoy|mañana|pasado mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)';
const HORA = '(\\d{1,2}(?::\\d{2})?)';

const consulta = (franja: string, desde: string, hasta: string): ReglaGuion => ({
  si: `^¿?qu[eé] tengo (?:el |este )?${DIA} por la ${franja}\\??$`,
  pasos: [{ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{$1}', hasta: '{$1}', horaDesde: desde, horaHasta: hasta } }] }, { texto: '' }],
});

export const GUION_DEMOSTRACION: ReglaGuion[] = [
  // T-157 · REQ-AGT-09: una frase con varias cosas, como la de la prueba de Franco del 28 de noviembre de 2026. El
  // simulado separa y pasa el período; la lista, los días y lo que falta los pone el código
  {
    si: '^qu[eé] tareas y compromisos tengo la semana siguiente,? y agrega un bloque de ([0-9]{1,2}) a ([0-9]{1,2}) que se llame (.+)$',
    pasos: [
      {
        llamadas: [
          {
            nombre: 'asistente_desglosar',
            argumentos: {
              partes: [
                { clase: 'consulta_tareas', que: 'tus tareas', periodo: 'semana_siguiente' },
                { clase: 'consulta_agenda', que: 'tus compromisos', periodo: 'semana_siguiente' },
                { clase: 'compromiso', que: '$3', horaInicio: '{hora:$1}', horaFin: '{tarde:$2}' },
              ],
            },
          },
          { nombre: 'tareas_consultar', argumentos: { periodo: 'semana_siguiente' } },
          { nombre: 'agenda_consultar', argumentos: { periodo: 'semana_siguiente' } },
          { nombre: 'agenda_registrar_evento', argumentos: { titulo: '$3', horaInicio: '{hora:$1}', horaFin: '{tarde:$2}' } },
        ],
      },
      { texto: '' },
    ],
  },
  {
    si: '^el (lunes|martes|mi[eé]rcoles|jueves|viernes) el bloque de ([0-9]{1,2}) a ([0-9]{1,2}) que se llame (.+)$',
    pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: '$4', fecha: '{$1}', horaInicio: '{hora:$2}', horaFin: '{tarde:$3}' } }] }, { texto: '' }],
  },
  // T-133 · 10-reuniones: van primero, para que «agéndame una reunión con…» no se lea como un compromiso.
  // El simulado solo pasa lo dicho; el grupo lo resuelve el código (REQ-CUN06-02)
  {
    si: `^(?:busca una hora|reuni[oó]n|ag[eé]ndame una reuni[oó]n) (?:de (.+?) )?con el (?:equipo|proyecto) (.+?) esta semana$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', equipo: '$2', desde: '{hoy}', hasta: '{viernes}' } }] }, { texto: '' }],
  },
  {
    si: `^(?:busca una hora|reuni[oó]n|ag[eé]ndame una reuni[oó]n) (?:de (.+?) )?con el (?:equipo|proyecto) (.+?)$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', equipo: '$2' } }] }, { texto: '' }],
  },
  {
    si: `^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?) el ${DIA} por la tarde$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2'], desde: '{$3}', hasta: '{$3}', franja: 'tarde' } }] }, { texto: '' }],
  },
  {
    si: `^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?) el ${DIA} por la mañana$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2'], desde: '{$3}', hasta: '{$3}', franja: 'manana' } }] }, { texto: '' }],
  },
  {
    si: '^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?) y (.+?), (.+?) si puede$',
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2', '$3', '$4'], opcionales: ['$4'] } }] }, { texto: '' }],
  },
  {
    si: '^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?) y (.+?)$',
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2', '$3'] } }] }, { texto: '' }],
  },
  {
    si: `^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?) ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2'], desde: '{$3}', hasta: '{$3}' } }] }, { texto: '' }],
  },
  {
    si: '^(?:busca una hora|reuni[oó]n)(?: de (.+?))? con (.+?)$',
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { tema: '$1', personas: ['$2'] } }] }, { texto: '' }],
  },
  {
    si: '^(?:agenda|organiza|coordina) una reuni[oó]n$',
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: {} }] }, { texto: '' }],
  },
  {
    si: `^(?:mueve|pasa) la reuni[oó]n (?:de |del )?(.+?) al ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'reuniones_proponer', argumentos: { reunion: '$1', desde: '{$2}', hasta: '{$2}' } }] }, { texto: '' }],
  },
  {
    si: '^cancela la reuni[oó]n (?:de |del )?(.+)$',
    pasos: [{ llamadas: [{ nombre: 'reuniones_cancelar', argumentos: { reunion: '$1' } }] }, { texto: '' }],
  },
  {
    si: `^ag[eé]ndame (.+?) (?:el |este |para el )?${DIA} a las ${HORA}$`,
    pasos: [
      { llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: '{titulo:$1}', fecha: '{$2}', horaInicio: '{hora:$3}' } }] },
      { texto: '' },
    ],
  },
  // Sin día ni hora: la herramienta responde que faltan datos y el asistente pregunta el primero (REQ-CUN01-07)
  {
    si: '^ag[eé]ndame (.+)$',
    pasos: [{ llamadas: [{ nombre: 'agenda_registrar_evento', argumentos: { titulo: '{titulo:$1}' } }] }, { texto: '' }],
  },
  consulta('mañana', '06:00', '12:00'),
  consulta('tarde', '12:00', '20:00'),
  consulta('noche', '20:00', '23:59'),
  {
    si: `^¿?qu[eé] tengo (?:el |este )?${DIA}\\??$`,
    pasos: [{ llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{$1}', hasta: '{$1}' } }] }, { texto: '' }],
  },
  // T-040 · REQ-AGT-01 v2 · plan §14.5: lo que usa la nota de continuidad. El simulado la lee solo con las
  // marcas {nota:…} (modelo-simulado.ts). «Mejor a las 5» va siempre sobre el último compromiso de la nota: con
  // una propuesta abierta, que el simulado no ve, este guion no distingue el criterio 1 de REQ-AGT-01. «A las 5»
  // se lee por la tarde, como en el criterio del requisito
  // T-143 · REQ-AGT-07: lo que sigue a una tarea propuesta y sin decidir se aplica a ella ({nota:propuestaId}).
  // Un horario («de 3 pm a 6 pm») no cabe en una tarea: la herramienta responde con la oferta de un compromiso
  {
    si: `^ser[aá] ese d[ií]a de ${HORA} ?(?:pm)? a (?:las )?${HORA} ?(?:pm)?$`,
    pasos: [
      { llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: '{nota:propuestaId}', horaInicio: '{tarde:$1}', horaFin: '{tarde:$2}' } }] },
      { texto: '' },
    ],
  },
  {
    si: `^mejor el ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_cambiar', argumentos: { tareaId: '{nota:propuestaId}', fecha: '{$1}' } }] }, { texto: '' }],
  },
  {
    si: `^mejor a las ${HORA}(?: de la tarde)?$`,
    pasos: [
      { llamadas: [{ nombre: 'agenda_consultar', argumentos: { desde: '{nota:fecha}', hasta: '{nota:fecha}' } }] },
      { llamadas: [{ nombre: 'agenda_modificar_evento', argumentos: { eventoId: '{nota:eventoId}', horaInicio: '{tarde:$1}' } }] },
      { texto: '' },
    ],
  },
  { si: '^¿?qu[eé] hicimos\\??$', pasos: [{ texto: '{nota:resumen}' }] },
  // La nota no empuja a actuar: un saludo es solo un saludo (B8)
  { si: '^(?:hola|buenas)[.!]?$', pasos: [{ texto: 'Hola, ¿qué hacemos?' }] },
  // T-050, T-051 · 09-tareas-personales: las tareas personales. Una tarea ya no queda en espera: se propone
  {
    si: '^¿?qu[eé] tengo pendiente esta semana\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_consultar', argumentos: { desde: '{hoy}', hasta: '{domingo}' } }] }, { texto: '' }],
  },
  {
    si: '^¿?qu[eé] tengo pendiente\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_consultar', argumentos: {} }] }, { texto: '' }],
  },
  // REQ-CUN03-02: no se entiende qué hay que hacer; la herramienta lo dice y se pregunta solo eso
  {
    si: `^recu[eé]rdame lo del ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { fecha: '{$1}' } }] }, { texto: '' }],
  },
  {
    si: `^recu[eé]rdame (.+?) (?:antes del|para el|el) ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$1}', fecha: '{$2}' } }] }, { texto: '' }],
  },
  // T-126 · REQ-CUN03-26: con quién o para qué es la tarea, como contexto
  {
    si: '^recu[eé]rdame (.+?), (lo veo con .+|es para .+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$1}', contexto: '{titulo:$2}' } }] }, { texto: '' }],
  },
  {
    si: '^(?:recu[eé]rdame|tengo que) (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$1}' } }] }, { texto: '' }],
  },
  // H-TP-14: «pídele a alguien» se registra como algo que se espera de esa persona, sin escribirle
  {
    si: `^p[ií]dele a (.+?) (?:el|la|los|las) (.+?) para el ${DIA}$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$2}', deQuien: '$1', fecha: '{$3}' } }] }, { texto: '' }],
  },
  {
    si: `^(.+?) tiene que (?:enviarme|mandarme|darme) (?:el|la|los|las) (.+?) (?:el|este) ${DIA}(?: que viene)?$`,
    pasos: [{ llamadas: [{ nombre: 'tareas_registrar', argumentos: { texto: '{titulo:$2}', deQuien: '$1', fecha: '{$3}' } }] }, { texto: '' }],
  },
  // T-126 · REQ-CUN03-21, 23: la bitácora de una tarea. Antes que «ya …», que es darla por hecha
  {
    si: '^(?:sobre|avanc[eé] con) (?:el |la |los |las |lo de )?(.+?): (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_anotar_avance', argumentos: { tarea: '$1', avance: '{titulo:$2}' } }] }, { texto: '' }],
  },
  {
    si: '^(ya habl[eé] con (.+?)(?:,|:) .+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_anotar_avance', argumentos: { tarea: '$2', avance: '{titulo:$1}' } }] }, { texto: '' }],
  },
  {
    si: '^¿?c[oó]mo va (?:el |la |los |las |lo de )?(.+?)\\??$',
    pasos: [{ llamadas: [{ nombre: 'tareas_bitacora', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  {
    si: '^ya (.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_completar', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  {
    si: '^reabre (?:la tarea )?(.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_reabrir', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  {
    si: '^descarta (?:la tarea )?(.+)$',
    pasos: [{ llamadas: [{ nombre: 'tareas_descartar', argumentos: { texto: '$1' } }] }, { texto: '' }],
  },
  // T-142 · REQ-AGT-06: una explicación como la que devolvió Groq (captura 04a de la revisión del 27 de noviembre
  // de 2026), con marcas, nombres internos y los puntos en un párrafo. La limpia el código: en pantalla se ve
  // texto llano, un punto por línea
  {
    si: '^(?:dime )?¿?c[oó]mo funciona la secci[oó]n (?:de )?tareas\\??$',
    pasos: [
      {
        texto:
          'La sección **Tareas** guarda lo que tienes que hacer y lo que esperas de otras personas: ' +
          '1. **Anotar una tarea**: con `tareas_registrar`, por ejemplo «recuérdame enviar el informe el viernes». ' +
          '2. **Ver lo pendiente**: «¿qué tengo pendiente?» (`tareas_consultar`). ' +
          '3. **Darla por hecha**: «ya envié el informe» (`tareas_completar`). ' +
          '4. **Contar cómo va**: «sobre el informe: me falta la firma de Rosa» (`tareas_anotar_avance`).',
      },
    ],
  },
  // REQ-CUN03-16: lo que las tareas personales no hacen se dice, sin intentarlo
  {
    si: '^(?:ponle prioridad|div[ií]dela|hazla repetir|as[ií]gnale)',
    pasos: [{ texto: 'Las tareas personales no tienen prioridades, pasos ni repeticiones, y no se asignan a otras personas. No cambié nada.' }],
  },
  // T-129 · REQ-CUN03-28: el resumen diario de la bitácora (src/tareas/resumenes-bitacora.ts). La petición
  // empieza por MARCA_PETICION_RESUMEN y lista los avances del más reciente al más antiguo, «- [cuándo] texto»;
  // el simulado responde con un texto fijo armado con el último
  {
    si: '^Resumen de la bitácora de una tarea\\.[\\s\\S]*?\\n- \\[[^\\]\\n]*\\] ([^\\n]+)',
    pasos: [{ texto: 'Lo último anotado: $1' }],
  },
];
