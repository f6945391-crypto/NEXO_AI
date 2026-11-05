"""Anota capturas con llamadas numeradas y una leyenda al pie. Solo produce imágenes nuevas."""
from PIL import Image, ImageDraw, ImageFont
import os, textwrap

WEB = './salida/web'
MOV = './salida/movil'
OUT = '.'
os.makedirs(f'{OUT}/web', exist_ok=True); os.makedirs(f'{OUT}/movil', exist_ok=True)

def fuente(t):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, t)
    return ImageFont.load_default()
def fuente_n(t):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, t)
    return ImageFont.load_default()

ROJO = (200, 30, 30)

def anotar(entrada, salida, llamadas, titulo, escala=1):
    im = Image.open(entrada).convert('RGB')
    d = ImageDraw.Draw(im)
    r = 18 * escala
    f = fuente(20 * escala)
    for i, (x, y, _) in enumerate(llamadas, 1):
        x *= escala; y *= escala
        d.ellipse([x - r, y - r, x + r, y + r], fill=ROJO, outline='white', width=3 * escala)
        tw = d.textlength(str(i), font=f)
        d.text((x - tw / 2, y - 12 * escala), str(i), fill='white', font=f)
    # leyenda
    fl = fuente_n(min(17 * escala, 28)); ft = fuente(min(20 * escala, 30))
    ancho_txt = int((im.width - 40 * escala) / (9.2 * escala))
    lineas = [('t', l) for l in textwrap.wrap(titulo, ancho_txt)]
    for i, (_, _, texto) in enumerate(llamadas, 1):
        for j, l in enumerate(textwrap.wrap(texto, ancho_txt)):
            lineas.append(('n', (f'{i}. ' if j == 0 else '    ') + l))
    alto = int((len(lineas) * 24 + 40) * escala)
    out = Image.new('RGB', (im.width, im.height + alto), 'white')
    out.paste(im, (0, 0))
    d = ImageDraw.Draw(out)
    d.line([(0, im.height), (im.width, im.height)], fill=(180, 180, 180), width=2)
    y = im.height + 14 * escala
    for tipo, l in lineas:
        d.text((20 * escala, y), l, fill=(30, 30, 30), font=ft if tipo == 't' else fl)
        y += 24 * escala
    out.save(salida)
    print('anotada', salida)

def antes_despues(a, b, salida, titulo, llamadas_b):
    A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
    out = Image.new('RGB', (A.width + B.width + 30, A.height), 'white')
    out.paste(A, (0, 0)); out.paste(B, (A.width + 30, 0))
    tmp = '/tmp/_ad.png'; out.save(tmp)
    anotar(tmp, salida, [(x + A.width + 30, y, t) for x, y, t in llamadas_b], titulo)

# ---------- WEB ----------
anotar(f'{WEB}/W02-agenda-blanco-inicial.png', f'{OUT}/web/W02-blanco-inicial.png', [
    (36, 40, 'Navegación de 72 px con tres destinos; el activo coincide con el lienzo (Agenda).'),
    (180, 180, 'Blanco inicial de la conversación: pregunta, promesa de confirmación y tres ejemplos. Correcto según diseño §8.'),
    (1020, 580, 'El lienzo vacío repite la invitación al asistente. Dos llamadas a la misma acción en pantalla.'),
    (1380, 52, 'Control de expandir el lienzo. No existe el inverso (decisión de diseño §3).'),
    (300, 850, 'Barra de entrada fija al pie, enviar deshabilitado con el campo vacío.'),
], 'W02 · Web 1440×900 · Estado inicial tras entrar')

anotar(f'{WEB}/W03-mensaje-enviado-pensando.png', f'{OUT}/web/W03-pensando.png', [
    (420, 55, 'El mensaje se ve al instante (corrección del 29 de octubre). Hora al pie, alineado a la derecha.'),
    (140, 130, '«Pensando…» como texto plano. Sin indicador de progreso ni estimación; con Groq puede durar varios segundos.'),
], 'W03 · Web · Mensaje enviado, esperando al asistente')

anotar(f'{WEB}/W04-tarjeta-propuesta.png', f'{OUT}/web/W04-tarjeta.png', [
    (300, 150, 'Título de la acción exacta (P-03, RN-ER-03). Bien.'),
    (160, 300, 'La duración dice que la hora de fin la puso el sistema (REQ-CUN01-01). Bien.'),
    (170, 368, 'Confirmar y Descartar con jerarquía clara. No hay «editar» ni «cambiar hora» sin volver a escribir.'),
    (1020, 500, 'El lienzo no reacciona a la propuesta: no muestra el día en que caería el compromiso (diseño §4, modo Objeto).'),
], 'W04 · Web · Tarjeta de confirmación')

antes_despues(f'{WEB}/W06-resultado-confirmado.png', f'{WEB}/W08-siguiente-mensaje-respuesta-sin-contexto.png',
    f'{OUT}/web/W06-W08-vaciado.png', 'W06 → W08 · Web · Tras confirmar, el siguiente mensaje vacía la conversación', [
    (510, 55, 'Izquierda: resultado confirmado y Hoy actualizado. Derecha: al escribir «Mejor a las 5», la petición, la tarjeta y el «Listo» desaparecen de golpe.'),
    (205, 136, 'El asistente responde sin contexto. Con el simulado: «No sé hacer eso todavía»; con Groq: pregunta qué mover. En ambos casos la persona perdió el hilo.'),
    (1020, 288, 'El único rastro de lo hecho es la fila en Hoy. No hay «registro» ni separador: el diseño §4 preveía que el lienzo pasara a modo Registro.'),
])

anotar(f'{WEB}/W10-tarjeta-con-conflicto.png', f'{OUT}/web/W10-conflicto.png', [
    (300, 80, 'Respuesta a «¿Qué tengo hoy?»: lista armada por el código, compacta. Bien (REQ-CUN01-13).'),
    (160, 455, 'Fila «Alternativas» en texto corrido con fechas largas repetidas…'),
    (285, 668, '…y las mismas alternativas otra vez como botones. Redundante y largo; la tarjeta ocupa toda la columna.'),
    (300, 574, 'Motivo del conflicto en ámbar, claro. Bien.'),
    (163, 764, 'Sin «Confirmar»: no se puede confirmar en conflicto. Falta decirlo explícitamente.'),
], 'W10 · Web · Conflicto de horario con alternativas')

anotar(f'{WEB}/W13-recarga-tras-cierre-conversacion-vacia.png', f'{OUT}/web/W13-recarga.png', [
    (180, 180, 'Tras recargar, la conversación vuelve al blanco inicial: la persona no puede repasar nada de lo que pidió hoy.'),
    (1020, 288, 'Lo hecho solo se infiere de la agenda. Sin historial, sin registro, sin «qué hicimos».'),
], 'W13 · Web · Recarga tras cerrar una acción')

anotar(f'{WEB}/W14-pregunta-dato-faltante.png', f'{OUT}/web/W14-pregunta.png', [
    (150, 136, 'Pregunta fija por el primer dato que falta («¿Qué día?»). Corto y claro (REQ-CUN01-07, R-20).'),
    (300, 850, 'La respuesta se escribe en el mismo campo. No hay sugerencias (hoy / mañana / elegir día) que acorten el turno.'),
], 'W14 · Web · Dato que falta')

anotar(f'{WEB}/W16-tarea-en-espera.png', f'{OUT}/web/W16-en-espera.png', [
    (316, 170, 'Aviso tranquilo en ámbar, con la frase guardada y el motivo. Distinto de un fallo (REQ-CAP-23). Bien.'),
    (1020, 580, 'Lo que quedó en espera no se ve en ningún otro sitio: ni en el lienzo ni en Tareas. Solo vive en la conversación, que se vaciará.'),
], 'W16 · Web · Tarea en espera')

anotar(f'{WEB}/W19-ancho-1024-tarjeta.png', f'{OUT}/web/W19-1024.png', [
    (336, 400, 'A 1024 px la columna de conversación conserva sus 528 px…'),
    (812, 450, '…y el lienzo baja a ~345 px. El diseño define 72/528/840 para 1440 y no dice qué ceder por debajo.'),
    (150, 136, 'Aquí sí se mantuvo el contexto: una pregunta no cierra el episodio, así que la petición siguiente la completó.'),
], 'W19 · Web 1024×768 · Ancho menor')

# ---------- MÓVIL (escala 2) ----------
anotar(f'{MOV}/M02-inicio-agenda-vacia.png', f'{OUT}/movil/M02-inicio.png', [
    (195, 500, 'Estado vacío con la invitación al asistente (REQ-CUN01-12). Bien.'),
    (320, 748, 'Asa «Pedir algo» en violeta, distinto del azul primario del resto. Dos acentos para la misma acción.'),
    (195, 815, 'Barra de tres destinos, igual que la web. Bien.'),
], 'M02 · Móvil 390×844 · Inicio con agenda vacía', escala=2)

anotar(f'{MOV}/M05-tarjeta-propuesta.png', f'{OUT}/movil/M05-tarjeta.png', [
    (195, 167, 'La capa de captura cubre casi toda la agenda; el título «¿Qué hacemos?» sigue arriba aunque ya se está conversando.'),
    (195, 400, 'Misma tarjeta que la web, con etiquetas apiladas. Legible.'),
    (195, 580, 'Confirmar a ancho completo, Descartar debajo. Jerarquía clara.'),
    (195, 790, 'Enviar en gris mientras está vacío: se parece a «deshabilitado para siempre».'),
], 'M05 · Móvil · Tarjeta de confirmación en la capa de captura', escala=2)

antes_despues(f'{MOV}/M06-resultado-confirmado.png', f'{MOV}/M08-siguiente-mensaje-sin-contexto.png',
    f'{OUT}/movil/M06-M08-vaciado.png', 'M06 → M08 · Móvil · Tras confirmar, el siguiente mensaje vacía la capa', [
    (195 * 2, 598 * 2, 'La capa se encoge al nuevo par mensaje–respuesta; la petición y el «Listo» ya no están.'),
    (195 * 2, 218 * 2, 'La agenda de fondo sí muestra «Revisión»: es el único rastro, y queda tapado por la capa.'),
])

anotar(f'{MOV}/M10-capa-reabierta-tras-cierre.png', f'{OUT}/movil/M10-reabierta.png', [
    (195, 598, 'Al cerrar y reabrir la capa solo queda la conversación abierta (el episodio sin acción). Lo confirmado antes no se puede repasar.'),
], 'M10 · Móvil · Capa reabierta tras un cierre', escala=2)

anotar(f'{MOV}/M11-tarjeta-con-conflicto.png', f'{OUT}/movil/M11-conflicto.png', [
    (195, 350, 'Las alternativas en texto corrido ocupan cuatro líneas…'),
    (195, 530, '…y se repiten como botones. En móvil la tarjeta ya no cabe: hay que desplazar para ver el título de la acción.'),
], 'M11 · Móvil · Conflicto con alternativas', escala=2)

anotar(f'{MOV}/M15-tarea-en-espera.png', f'{OUT}/movil/M15-en-espera.png', [
    (195, 628, 'Aviso en ámbar, igual que la web. Bien.'),
    (195, 400, 'La capa en espera tapa la agenda vacía de fondo; no hay dónde ver «lo que está en espera» fuera de esta capa.'),
], 'M15 · Móvil · Tarea en espera', escala=2)
