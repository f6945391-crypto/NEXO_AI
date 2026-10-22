# Validación de diseño — CUN-07 Web

**Archivo de Figma:** página `05 Flujos · Web`
https://www.figma.com/design/mgmuPhGwkmvfhz7xk0QPl5

**Entradas:** `specs/03-tareas/spec.md` y `design/manifiesto-esperado.web.json`, contra la estructura real leída desde Figma.

---

## Resumen

| Métrica | Resultado |
|---|---|
| Requisitos totales | 9 |
| Cubiertos | 9 |
| Ausentes | 0 |
| Cuadros esperados | 12 |
| Cuadros existentes | 12 |
| Cuadros en deriva | 0 |
| Nombres fuera de convención | 0 |
| Nodos con color sin variable | 0 |
| Instancias de componente | 84 |

---

## A. Cobertura por requisito

| Requisito | Cuadro | Estado |
|---|---|---|
| REQ-CUN07-01 | Principal / 01, 02 | CUBIERTO |
| REQ-CUN07-02 | Principal / 03 | CUBIERTO |
| REQ-CUN07-03 | Principal / 05 | CUBIERTO |
| REQ-CUN07-04 | EX-03 / 01, Transversal / Sin permiso de equipo | CUBIERTO |
| REQ-CUN07-05 | EX-01 / 01 | CUBIERTO |
| REQ-CUN07-06 | EX-02 / 01 | CUBIERTO |
| REQ-CUN07-07 | Principal / 04, FA-02 / 01 | CUBIERTO |
| REQ-CUN07-08 | FA-01 / 01 | CUBIERTO |
| REQ-CUN07-09 | Transversal / Modo degradado | CUBIERTO |

## B. Distribución

| Flujo | Cuadros |
|---|---|
| Principal | 5 |
| FA-01 | 1 |
| FA-02 | 1 |
| EX-01 | 1 |
| EX-02 | 1 |
| EX-03 | 1 |
| Transversal | 2 |

Siete de doce cuadros son caminos que no son el feliz. Es la proporción que corresponde a un caso de uso con tres excepciones documentadas.

## C. Componentes

Página `03 Componentes · Web`.

| Componente | Variantes | Propiedades | Instancias |
|---|---|---|---|
| Web / Botón | Tipo = Primario, Secundario, Texto, Destructivo | Etiqueta | 20 |
| Web / Campo | Estado = Vacío, Reposo, Activo, Error | Etiqueta, Valor, Ayuda, Mostrar ayuda | 20 |
| Web / Fila de colaborador | — | Nombre, Detalle | 44 |

**Los componentes web son distintos de los de móvil**, con prefijo de plataforma para evitar colisión. Lo que comparten son las variables, no los componentes: `Web / Botón` tiene menos relleno que `Móvil / Botón` porque en escritorio no aplica el área táctil mínima de 44 píxeles.

## D. Reglas de producto

| Regla | Verificación | Resultado |
|---|---|---|
| RN-ER-03 confirmación previa | `Principal / 04` muestra la acción exacta, los cuatro datos, el enlace a la justificación, tres salidas y la advertencia de que la notificación no se deshace | CUMPLE |
| RN-ER-02 doble aviso | `Principal / 05` confirma al gerente e indica que el colaborador recibió la asignación | CUMPLE |
| RN-OP-03 autorización | `EX-03` rechaza con motivo y sin crear registro | CUMPLE |
| Doble camino | El formulario manual completa el caso de uso sin el asistente | CUMPLE |
| Modo degradado | Existe, con banner y formulario operativo | CUMPLE |

---

## Defecto encontrado y corregido

**`Web / Campo` mezclaba dos cosas distintas:** el estado del borde y el color del valor. El resultado era que un campo con dato escrito se veía igual que uno con marcador de posición, porque la variante `Reposo` pintaba el valor en `texto/suave`.

Se separó en dos variantes:

- `Vacío` — borde neutro, valor en `texto/suave`. Es el marcador de posición.
- `Reposo` — borde neutro, valor en `texto/fuerte`. Es un campo ya lleno.

Siete de las veinte instancias se reasignaron a `Vacío`.

Es un ejemplo de lo que la validación visual detecta y la estructural no: el recuento de instancias estaba perfecto y el defecto seguía ahí.

---

## Decisiones tomadas durante el diseño que no estaban en la especificación

| # | Decisión | Afecta |
|---|---|---|
| 1 | Al no encontrar al colaborador, se ofrecen los miembros del equipo como alternativa en vez de solo rechazar | REQ-CUN07-05 |
| 2 | La falta de fecha límite ofrece atajos relativos (este viernes, en una semana, fin de mes) | REQ-CUN07-06 |
| 3 | El rechazo por autorización ofrece «Solicitar autorización», que implica un flujo que no existe en el modelo | REQ-CUN07-04 |
| 4 | En modo degradado se avisa que no hay sugerencias automáticas, pero la delegación funciona | REQ-CUN07-09 |

**El punto 3 es el importante:** «Solicitar autorización» abre un caso de uso que el Entregable 1 no contempla. O se especifica, o se quita del diseño. No puede quedarse como un botón que no lleva a ninguna parte.

---

## Pendiente

1. **RN-CAL-01** quedó aprobada el 26 de septiembre de 2026, así que CUN-05 y CUN-06 dejan de estar bloqueados. Los ocho cuadros de CUN-05 ya generados quedaron por detrás del criterio final en dos estados; ver `specs/05-equipos/spec.md` sección 5.
2. **Los scripts de generación web** no están guardados en el repositorio. Los de móvil sí (`design/figma/01` a `07`). Mientras eso no se haga, la parte web no es regenerable.
3. **Sin iconografía** en ninguna de las dos plataformas.
