# Informe — pruebas de reuniones (disponibilidad de equipo) y testeo de la versión

**Fecha:** 25 de noviembre de 2026 · **Rama:** `version_parcial` · **`SPEC.md`:** 2.25.2 · **Tarea:** T-124
**Pedido:** revisar por qué la prueba de reuniones daba problemas, definir los datos que hacen falta (administrador, líder de grupo e integrantes, con cuentas de Gmail conectadas) y armar un grupo de casos de prueba; además, capturas de todos los casos de uso y su testeo.

**Documentos que acompañan a este informe:**

| Documento | Qué tiene |
|---|---|
| `specs/05-equipos/casos-de-prueba.md` | Los datos que se necesitan y los doce casos CP-R-01 a 12, con su resultado esperado. Es la especificación de la prueba (SDD) |
| `design/capturas/2026-11-25-version-completa/README.md` | Todos los casos de uso de la versión, web y móvil, con su captura, requisito, prueba automática y testeo visual, y la lista de lo que se ve mal encajado (U-01 a U-12) |
| `design/capturas/2026-11-25-version-completa/web/` y `movil/` | 42 capturas de la web y 25 del móvil |

---

## 1. Resumen

- **Por qué fallaba la prueba de reuniones.** No era un solo problema, sino cuatro: (1) los datos de prueba no tenían un equipo completo, con calendarios conectados y autorizaciones; (2) una cuenta afiliada no puede entrar en un equipo (INC-37); (3) la zona de empresa todavía no crea equipos; (4) la rejilla se veía sin estilos por un defecto de la fusión. Detalle en §2.
- **Lo que se hizo:** escribir los datos y los casos (§3 y §4), sembrarlos en las pruebas con el calendario simulado y automatizarlos: **12 de 12 casos pasan** (11 en la API y 4 en pantalla, que se solapan en parte). La rejilla quedó corregida.
- **Lo que falta y solo puede hacer el equipo:** la prueba con Gmail reales (§6), que pide cuatro cuentas de Gmail de prueba registradas en Google Cloud.

---

## 2. Por qué la prueba de reuniones daba problemas

| # | Problema | Efecto | Qué se hizo |
|---|---|---|---|
| P-1 | **Los datos de prueba no tenían un equipo completo.** Las cuentas de equipo de las pruebas web (Acme: rosa, lucia, mateo) no tenían calendario conectado ni autorización, y las pruebas de administración las cambian (suspenden a lucia, restablecen a mateo) | Toda consulta salía «sin datos»: no se podía ver un resultado real ni la rejilla | Escenario propio, «Proyecto Alfa» en la organización «Reuniones Demo», con siete cuentas y un estado distinto cada una (§3), que nadie más toca |
| P-2 | **Una cuenta afiliada no puede entrar en un equipo (INC-37).** `miembro_de_equipo` exige que la cuenta sea de la misma organización que el equipo, y una cuenta personal afiliada sigue en su organización (H-ADM-16) | Si se intenta agregar a un equipo una cuenta de Gmail personal afiliada, la base de datos lo rechaza | Todas las cuentas del escenario son **cuentas propias** de la empresa. INC-37 sigue abierta en `SPEC.md` §9 y hay que decidirla antes de la afiliación (T-063 a T-066) |
| P-3 | **La zona de empresa no crea equipos todavía** (T-066 y T-067 pendientes) | El administrador ve los equipos, pero no puede armar uno | El equipo se siembra por código: en las pruebas, `e2e/arrancar-api.mjs`; en desarrollo, un script como `crear-equipo-prueba` |
| P-4 | **La rejilla se veía sin estilos.** En la fusión del 25 de noviembre, a la regla `.candidatas__detalle` de `globales.css` le faltó su llave de cierre (y quedó un `\n` suelto), y todas las reglas de CUN-05 quedaron anidadas dentro de ella | Leyenda, eje de horas y filas se veían como texto corrido, sin barras | Corregido; las pruebas no lo detectaban porque comprueban textos, no estilos |
| P-5 | El corte se cerraba con autorizaciones que se leían, pero ninguna prueba verificaba el cálculo con varias personas a la vez | — | CP-R-05 a 11 comprueban los huecos comunes, los motivos de «sin datos», la duración y el cambio de autorizaciones |

---

## 3. Datos que se necesitan

Detalle completo en `specs/05-equipos/casos-de-prueba.md` §1. En resumen:

| Persona | Correo | Papel | Plan | En «Proyecto Alfa» | Autoriza | Calendario |
|---|---|---|---|---|---|---|
| **Administrador** | `admin@reuniones.test` | Administra la organización | Empresarial | No | — | No hace falta |
| **Líder de grupo** | `lider@reuniones.test` | Responsable del equipo | Empresarial | Responsable | Sí | Conectado |
| Integrante | `ana@reuniones.test` | Colaboradora | Empresarial | Integrante | Sí | Conectado |
| Integrante | `beto@reuniones.test` | Colaborador | Empresarial | Integrante | Sí | Conectado |
| Integrante | `carla@reuniones.test` | Colaboradora | Empresarial | Integrante | **No (pendiente)** | Conectado |
| Integrante | `diego@reuniones.test` | Colaborador | Empresarial | Integrante | Sí | **Sin conectar** |
| Control | `pablo@reuniones.test` | Usuario personal | **Personal** | No | — | Opcional |

**Eventos de mañana (Lima):** líder 09:00–10:00 y 15:00–16:00; ana 10:00–11:00 y 15:30–17:00; beto 08:00–09:30 y 13:00–14:00; carla 11:00–12:00. **Huecos comunes esperados** de líder, ana y beto: 11:00–13:00, 14:00–15:00 y 17:00–20:00.

---

## 4. Casos y resultados

| Caso | Qué comprueba | API | Web | Resultado |
|---|---|---|---|---|
| CP-R-01 | Plan Personal: sin corte; 403 `SIN_PLAN_EMPRESARIAL` | ✅ | ✅ | Pasa |
| CP-R-02 | Administrador sin equipo: sin corte; 403 `SIN_EQUIPO` | ✅ | ✅ | Pasa |
| CP-R-03 | El administrador ve el equipo, su responsable y sus miembros en la zona | — | ✅ | Pasa |
| CP-R-04 | «Responsable: lider@reuniones.test · 5 integrantes» | ✅ | ✅ | Pasa |
| CP-R-05 | Consulta a todos: parcial, 3 de 5, carla y diego sin datos con su motivo, tres huecos | ✅ | ✅ | Pasa |
| CP-R-06 | Solo líder, ana y beto: completa y sin advertencia | ✅ | — | Pasa |
| CP-R-07 | Con 90 minutos: dos huecos admiten la duración | ✅ | — | Pasa |
| CP-R-08 | Una integrante obtiene lo mismo que el líder | ✅ | — | Pasa |
| CP-R-09 | Ninguna respuesta trae títulos de eventos | ✅ | — | Pasa |
| CP-R-10 | Carla autoriza: su hora ocupada entra en el cálculo | ✅ | — | Pasa |
| CP-R-11 | Ana retira su autorización: pasa a sin datos | ✅ | — | Pasa |
| CP-R-12 | Un equipo ajeno se rechaza | ✅ | — | Pasa |

Capturas del escenario: W25 a W35 y W38 en el README de capturas.

---

## 5. Verificación completa

| Conjunto | Resultado |
|---|---|
| Tipos y compilación (contratos, API, web, móvil) | Limpios |
| API | **480 de 480**, más 1 en `skip` por INC-37 (53 archivos) |
| Contratos | **127 de 127** |
| Extremo a extremo, web | **53 de 53** |
| Extremo a extremo, móvil | **24 de 24** |
| Trazabilidad | 224 requisitos, 0 problemas |

---

## 6. Prueba manual con Gmail reales (la tiene que preparar el equipo)

No la puedo hacer yo: hace falta entrar en cuentas de Google, y eso queda en manos del equipo.

1. **Cuatro cuentas de Gmail de prueba**, sin datos personales: para lider, ana, beto y carla.
2. En Google Cloud, pantalla de consentimiento OAuth en modo «Testing» → **Test users**: agregar las cuatro.
3. En cada Google Calendar, crear para mañana los eventos de §3, en hora de Lima.
4. Dar de alta las siete cuentas en la base de desarrollo:
   - el administrador, con `crear-cuenta --nueva-organizacion "Reuniones Demo" --correo admin@reuniones.test --rol gerente --plan empresarial --administrador`;
   - las demás, con `crear-cuenta --organizacion <uuid de Reuniones Demo> --correo … --rol … --plan …`.
   Cada una completa su primer ingreso eligiendo Lima. Las contraseñas temporales se muestran una sola vez: guárdenlas fuera del repositorio.
5. Lider, ana, beto y carla entran en la web, van a Ajustes → «Conectar» del calendario y eligen su Gmail.
6. Sembrar el equipo «Proyecto Alfa» con un script como `crear-equipo-prueba`, con estas cuentas: la zona de empresa todavía no crea equipos.
7. Lider, ana, beto y diego autorizan su disponibilidad en el corte; carla no.
8. Recorrer CP-R-01 a 12 y anotar el resultado junto a esta tabla.

**Lo que esta prueba agrega sobre la automática:** la sincronización real con Google, la ventana de la copia local y los eventos creados en otra zona. Si algo falla solo con Google, el primer sospechoso es el permiso (el «Test user» que falta) o la ventana de la copia (−30 a +365 días).

---

## 7. Hallazgos y lo que queda abierto

| # | Qué | Estado |
|---|---|---|
| INC-37 | Una cuenta afiliada no cabe en `miembro_de_equipo` | Abierta; decidir antes de T-063 a T-066 |
| U-01 a U-12 | Detalles de interfaz mal encajados (README de capturas §4) | Para el feedback del equipo antes de reestructurar |
| — | El asistente consultando la disponibilidad del equipo no tiene prueba: el guion simulado no tiene esa frase | Probar a mano con Groq |
| — | Next.js 16.4.2 corta un arranque o una compilación de cada dos con su aviso de vulnerabilidad | Actualizar a 16.4.5 después del jueves |
