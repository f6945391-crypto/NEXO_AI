"""Auditoría móvil del 7 de noviembre de 2026: capturas anotadas MC-nn.

Usa las funciones de design/capturas/2026-11-04/herramientas/anotar.py (llamadas numeradas, leyenda al pie,
tamaños de fuente limitados para el móvil) sin ejecutar su recorrido propio. Solo produce imágenes nuevas.
Uso: python3 -I anotar-auditoria.py <raíz del repositorio> <carpeta de capturas «antes» del carril de código>
"""
import os, sys, tempfile
from PIL import Image, ImageDraw

RAIZ = os.path.abspath(sys.argv[1])
ANTES = os.path.abspath(sys.argv[2])
HERRAMIENTA = os.path.join(RAIZ, 'design/capturas/2026-11-04/herramientas/anotar.py')
SALIDA = os.path.join(RAIZ, 'design/capturas/2026-11-07-movil-auditoria/anotadas')
CRUDO = os.path.join(RAIZ, 'design/capturas/2026-11-04/crudo/movil')
T039 = os.path.join(RAIZ, 'design/capturas/2026-11-06-t039/movil')

# Solo la parte de funciones de la herramienta; su recorrido propio usa rutas relativas que aquí no existen.
fuente_herramienta = open(HERRAMIENTA, encoding='utf-8').read().split('# ---------- WEB ----------')[0]
trabajo = tempfile.mkdtemp(prefix='anotar-mc-')
os.chdir(trabajo)
espacio = {}
exec(compile(fuente_herramienta, HERRAMIENTA, 'exec'), espacio)
anotar, fuente_n, ROJO = espacio['anotar'], espacio['fuente_n'], espacio['ROJO']
os.makedirs(SALIDA, exist_ok=True)

# ---------- A1 · conflicto en la capa, estado actual (390 × 844, escala 1) ----------
anotar(f'{ANTES}/movil-conflicto-despues.png', f'{SALIDA}/A1-capa-conflicto.png', [
    (262, 36, 'MC-02. «Agenda» y «Ajustes» se leen a través del velo (contraste 6,7:1). La capa empieza en y = 68 y corta «Lo que va a pasar» por la mitad: dos cabeceras a la vez.'),
    (222, 105, 'MC-05. «¿Qué hacemos?» con una propuesta en curso. El título invita a empezar cuando ya se está decidiendo algo.'),
    (340, 152, 'MC-07. La lista baja hasta el final: lo primero que se ve es «Fecha» cortada. La acción y la petición quedan arriba, fuera de la vista.'),
    (340, 345, 'MC-06. «Alternativas» en texto: cuatro líneas (unos 100 px) que repiten los tres botones de abajo.'),
    (372, 560, 'MC-01. La tarjeta mide 659 px, el 78 % del alto, y no cabe en los 532 px de la lista.'),
    (372, 720, 'MC-03. Barra de dos filas: campo de 72 px y «Enviar» de 44 a ancho completo; con márgenes, 160 px (19 % del alto) que no son conversación.'),
    (300, 790, 'MC-04. «Enviar» vacío: blanco sobre gris (1,7:1). Parece deshabilitado para siempre.'),
], 'A1 · Tarjeta con cruce, 6 nov. 2026')

# ---------- A2 · medida de la tarjeta frente al alto de la pantalla ----------
# El alto de la tarjeta sale de las capturas de elemento del carril de código (`movil-conflicto-tarjeta-*.png`:
# su alto es el de la caja de la tarjeta, aunque los píxeles sean los de la pantalla porque la tarjeta está
# dentro de una lista con desplazamiento). Comprobado sumando filas sobre A1: unos 657 px.
pantalla = Image.open(f'{ANTES}/movil-conflicto-despues.png').convert('RGB')
alto_hoy = Image.open(f'{ANTES}/movil-conflicto-tarjeta-despues.png').height
alto_antes = Image.open(f'{ANTES}/movil-conflicto-tarjeta-antes.png').height
fondo_tarjeta = 671  # borde inferior de la tarjeta en A1
lienzo = Image.new('RGB', (pantalla.width + 260, 844), 'white')
lienzo.paste(pantalla, (0, 0))
d = ImageDraw.Draw(lienzo)
f = fuente_n(13)
tope = round(844 * 0.40)
# zona que la capa deja para la lista
d.rectangle([2, 140, pantalla.width - 3, 672], outline=ROJO, width=2)
# la tarjeta entera, como barra junto a la pantalla
for x0, alto, nombre in ((pantalla.width + 30, alto_hoy, 'hoy'), (pantalla.width + 140, alto_antes, 'antes del pulido')):
    arriba = fondo_tarjeta - alto
    d.rectangle([x0, max(arriba, 0), x0 + 70, fondo_tarjeta], outline=ROJO, width=3)
    d.text((x0, fondo_tarjeta + 8), f'{nombre}', fill=ROJO, font=f)
    d.text((x0, fondo_tarjeta + 26), f'{alto} px ({round(100 * alto / 844)} %)', fill=ROJO, font=f)
    if arriba < 0:
        d.text((x0 + 2, 4), f'sigue {-arriba} px', fill=ROJO, font=f)
d.line([(pantalla.width + 20, 140), (lienzo.width, 140)], fill=(120, 120, 120), width=1)
# el tope del 40 %, contado desde el borde inferior de la lista
for x in range(0, lienzo.width, 12):
    d.line([(x, fondo_tarjeta - tope), (x + 6, fondo_tarjeta - tope)], fill=ROJO, width=2)
d.text((pantalla.width + 30, fondo_tarjeta - tope - 18), f'40 % del alto: {tope} px', fill=ROJO, font=f)
compuesto = os.path.join(trabajo, 'a2.png')
lienzo.save(compuesto)
anotar(compuesto, f'{SALIDA}/A2-medida-tarjeta.png', [
    (200, 406, 'MC-01. Recuadro: lo que la capa deja para la lista, de y = 140 a y = 672 (532 px).'),
    (pantalla.width + 65, 420, 'MC-01. Barras: la tarjeta entera, apoyada en su borde inferior. Hoy mide 659 px (78 % de 844): empieza en y = 12, detrás de las dos cabeceras. Antes del pulido, 699 px (83 %).'),
    (pantalla.width + 230, fondo_tarjeta - tope, 'Tope que fija la revisión para la tarjeta plegada con una alternativa: el 40 % del alto, 338 px. Cabe entera en la lista con sitio para la petición.'),
], 'A2 · Medida · La tarjeta frente a la pantalla y a la lista')

# ---------- A3 · tarjeta sin cruce (escala 2) ----------
anotar(f'{CRUDO}/M05-tarjeta-propuesta.png', f'{SALIDA}/A3-tarjeta-sin-cruce.png', [
    (362, 290, 'MC-17. La acción no dice cuál: «Revisión» solo está en el dato Título. Si se pliega, el título del compromiso tiene que seguir a la vista.'),
    (362, 494, 'MC-18. Zona horaria y «porque no indicaste la hora de fin»: lo que la tarjeta plegada no puede perder (P-05, REQ-CUN01-01).'),
    (14, 610, 'MC-01. Sin cruce, la tarjeta mide 416 px: el 49 % del alto para una sola petición.'),
    (362, 742, 'MC-03. Campo de 72 px y «Enviar» de 44, en dos filas.'),
    (300, 128, 'MC-19. Aquí el borde de la capa está en y = 130; con el mensaje recién enviado estaba en 524 y con el cruce en 68: la capa cambia de alto con cada turno.'),
], 'A3 · Móvil · Tarjeta sin cruce (4 de noviembre de 2026; la tarjeta no ha cambiado)', escala=2)

# ---------- A4 · capa reabierta con historia (escala 2) ----------
anotar(f'{T039}/A-M06-A4-capa-reabierta-con-ver-anteriores.png', f'{SALIDA}/A4-capa-con-historia.png', [
    (222, 105, 'MC-05. «¿Qué hacemos?» encima de dos episodios. La cabecera no dice de qué va lo que se lee.'),
    (372, 144, 'MC-16. El separador de arriba pasa por debajo de la cabecera sin límite: «Viernes 6, 22:22» se lee cortado.'),
    (372, 390, 'MC-08. La tarjeta ya confirmada conserva todos los datos (314 px, 37 % del alto) y no dice que ya se decidió.'),
    (372, 600, 'MC-09. «Listo» repite fecha y hora, con «de 10:00 – 11:00» y paréntesis dentro de paréntesis. MC-10: verde sobre su tinte, 4,4:1, por debajo de 4,5:1.'),
], 'A4 · Móvil · Capa reabierta tras T-039, con separadores', escala=2)

# ---------- A5 · el asa y la sección (390 × 844, escala 1) ----------
anotar(f'{ANTES}/movil-franja-hoy-despues.png', f'{SALIDA}/A5-asa-y-seccion.png', [
    (262, 730, 'MC-13. El asa es una píldora «Pedir algo» en tinte de agente, de 48 px. El documento (§2 y §3) dice botón redondo de 56.'),
    (378, 764, 'MC-12. El asa no dice si hay algo esperando tu decisión: una propuesta abierta solo se descubre abriendo la capa.'),
    (250, 176, 'MC-11. Selector Hoy · Semana · Mes de 36 px de alto, por debajo de 44.'),
    (372, 112, 'Contexto: la franja «en espera» (decisión 26 de 02-agenda) usa la marca ámbar. El indicador del asa tiene que ser otro, porque esperar tu decisión no es estar en espera.'),
], 'A5 · Agenda Hoy, franja y asa')

# ---------- A6 · mensaje recién enviado (escala 2) ----------
anotar(f'{CRUDO}/M04-mensaje-enviado-pensando.png', f'{SALIDA}/A6-pensando.png', [
    (250, 45, 'Contexto: con la capa baja, la sección se ve entera y no compite. Ese es el antecedente que pide §2; MC-02 es el corte, no el fondo.'),
    (130, 661, 'MC-15. «Pensando…» va entre la lista y la barra: al aparecer empuja la barra unos 32 px y desaparece al llegar la respuesta.'),
    (372, 720, 'MC-10. El contorno del campo, borde/fuerte sobre blanco, da 1,7:1; el límite de un control pide 3:1.'),
    (330, 524, 'MC-19. Borde de la capa en y = 524: crece con cada turno hasta el 92 % del alto.'),
], 'A6 · Móvil · Mensaje enviado, esperando al asistente (4 de noviembre de 2026)', escala=2)
