# Capturas — Zona de empresa (Administración), 7 de noviembre de 2026

**Carril:** administración (rama `carril-t4-cun03`, base `base-tanda3`). **Tareas:** T-058 a T-062 de `specs/08-administracion/tasks.md`.
**Cómo se tomaron:** web 1440×900, Chromium sin interfaz, contra la API real (`next dev` en el puerto 3412, API en el 3411, base `nexoai_e2e_t4admin_prueba`), con las cuentas de `apps/web/e2e/cuentas.json` sembradas por `e2e/arrancar-api.mjs`. El círculo «N» del ángulo inferior es el indicador de `next dev`; no forma parte de la pantalla.
**Antes:** no hay. La zona no existía y no tiene cuadros en Figma (`spec.md` §5 los pide: `WEB-v2 / Administración / 01` a `05`). Estas capturas sirven de referencia hasta que existan.

## Qué muestra cada una

| Archivo | Pantalla | Requisitos |
|---|---|---|
| `01-entrada.png` | Entrada propia de la zona, `/administracion/entrar`: el mismo formulario que `/entrar`, con su título y para quién es | REQ-ADM-05, 06 · plan §7.1 |
| `07-rechazo-cuenta-personal.png` | Una cuenta personal sin empresa, con su contraseña correcta: el mismo texto que unas credenciales inválidas | REQ-ACC-03, REQ-ADM-06 |
| `02-personas.png` | Personas: correo, de dónde es la cuenta, estado, plan (selector), equipos con «(responsable)», «Administra» y «Acciones» | REQ-ADM-08 |
| `03a-menu-de-acciones.png` | El menú de una fila: Suspender, Restablecer contraseña, Nombrar administrador, Dar de baja | REQ-ADM-11 a 14 |
| `03-tarjeta-suspender.png` | Tarjeta de confirmación de «Suspender una cuenta», tal como la arma la API | REQ-ADM-12, 16 |
| `03b-tarjeta-baja-irreversible.png` | «Dar de baja una cuenta»: lo que no se puede deshacer, en el color de advertencia | REQ-ADM-13, 16 |
| `03c-tarjeta-no-confirmable.png` | La única administradora intenta dejar de serlo: el motivo, sin «Confirmar» | REQ-ADM-03 |
| `04a-dar-de-alta.png` | Formulario de alta: correo, plan y «También administra la organización» | REQ-ADM-09 |
| `04b-tarjeta-alta.png` | Tarjeta del alta, con «La contraseña temporal se muestra una sola vez» | REQ-ADM-09, 16 |
| `04-contrasena-temporal.png` | La contraseña temporal, una sola vez, con «Copiar» y «Listo». Detrás, la fila nueva «Aún no entró» y la suspendida | REQ-ADM-09 |
| `02b-personas-despues.png` | Personas tras el alta y la suspensión | REQ-ADM-08, 12 |
| `05-equipos.png` | Equipos en solo lectura: una tarjeta por equipo, responsable y miembros, «Sin responsable» destacado | REQ-ADM-28 a 32 (lectura) |
| `06-registro.png` | Registro: lo hecho desde la zona, de lo más reciente a lo más antiguo, con quién y cuándo, en la zona horaria de quien mira | REQ-ADM-16 · plan §7.2, §9 |

## Decisiones visibles en las capturas

- **Armazón propio** (plan §7.2): navegación de 240 px con el nombre de la organización, los apartados según lo que la cuenta tiene en la empresa y, al pie, la cuenta y «Salir de Administración». No reutiliza la navegación de 72 px de la aplicación ni importa nada de `app/aplicacion/`.
- **Textos** (R-40, H-ADM-31): «De la organización» y «Se sumó con su cuenta», nunca «cuenta propia» ni «afiliada»; «Aún no entró» para el primer ingreso pendiente; «Dada de baja».
- **Plan en la fila:** un selector; elegir otro plan abre su tarjeta, no lo cambia (REQ-ADM-11).
- **Fechas** del registro con la zona de la persona que mira (P-05); el texto muestra el nombre IANA tal cual («America/Lima»). Si se prefiere el nombre de la ciudad, es un cambio de texto.
- Colores, espaciados y radios: solo variables de `globales.css`; la hoja nueva es `app/(empresa)/administracion/empresa.css`.

## Lo que no está y por qué

- **Entrada desde la aplicación** (el botón al pie de la navegación, `aria-label="Administración"`): toca `app/aplicacion/`, fuera de este carril (T-064 o integración).
- **Invitar y «Quitar de la organización»** en Personas: T-063 y T-064. Una fila de alguien que se sumó con su cuenta no muestra acciones.
- **Crear equipos, añadir, quitar y nombrar responsable:** T-066 y T-067.
- **Mi equipo:** fase 4, después de CUN-07 y CUN-08.
