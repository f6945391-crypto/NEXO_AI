# NexoAI — Especificación base

**Qué es este archivo:** la fuente de verdad del proyecto y el índice de todas las demás especificaciones. Es un documento **vivo**: cambia cada vez que cambia el proyecto, y cambia **antes** que el código.
**Método:** Spec-Driven Development, modo **spec-anchored** (§2).
**Equipo:** Franco, Aixa, Vasco · Curso de Diseño de Software · Entregable 2
**Versión:** 2.10.0 · **Última actualización:** 22 de octubre de 2026 · Registro completo en §11

---

## 0. Cómo se usa

1. **Nadie toca código sin un requisito que lo justifique.** Si el requisito no existe, se escribe primero en el `spec.md` del área y se registra aquí.
2. **Todo cambio deja huella en este archivo:** la tabla de §5 o §6 que corresponda, y una línea en §11.
3. **Lo que este archivo no repite, lo enlaza.** El detalle de cada requisito vive en `specs/<área>/spec.md`; las reglas de producto en `REPLANTEO.md` §8; la arquitectura en `PROPUESTA-TECNICA.md`. Aquí solo va lo que hace falta para ver el proyecto entero de un vistazo.
4. **Si este archivo y otro se contradicen, es un defecto**, no una preferencia: se anota en §9 y se resuelve en sesión.

---

## 1. Producto en una página

NexoAI es un asistente personal con IA para organizar el tiempo, gestionar tareas y coordinar equipos.

**Premisa:** la facilidad está en el agente. La persona pide y confirma, y el agente hace el trabajo. Cuando haya que elegir entre una pantalla más y pedírselo al agente, se elige el agente. De esta premisa salen P-03 y P-11.

| Elemento | Valor |
|---|---|
| Origen del modelo | Entregable 1: CUN-01 a CUN-10, TN-01 y TN-02, EN-01 a EN-08, reglas RN-* |
| Planes | Gratuito (responde) ⊂ Personal (propone) ⊂ Empresarial (coordina personas). Acumulativos — `REPLANTEO.md` §4 |
| Clientes | **Móvil** — Usuario Personal, captura y día a día. **Web** — Gerente, coordinación y seguimiento |
| Estructura de interfaz | Tres secciones en las dos plataformas: **Agenda · Tareas · Actividad**; la captura es una capa, Ajustes va al pie (R-32, R-36) |
| Colaborador | **Tiene cuenta** con rol propio, limitado a sus tareas asignadas, y responde desde el móvil. Su respuesta vuelve al líder como propuesta (D-17) |
| Agentes | Dos configuraciones sobre la misma plataforma: TN-01 Asistente Personal, TN-02 Coordinador Empresarial |

---

## 2. Método

### 2.1 Modo spec-anchored

La especificación y el código se mantienen **sincronizados a propósito**: cada cambio toca los dos, y en este orden.

```
cambio pedido → spec.md del área → SPEC.md (§5/§6/§11) → plan.md → tasks.md → código → prueba → estado en §5
```

Se descartan spec-first (la especificación envejece justo antes de sustentarla) y spec-as-source (exige una batería de pruebas que un ciclo no alcanza). Justificación completa en `sdd-flujo-de-trabajo.md` §3.

### 2.2 Artefactos por área

| Archivo | Etapa | Contiene | Prohibido |
|---|---|---|---|
| `specs/<área>/spec.md` | Especificación | Requisitos EARS con origen y criterio de aceptación | Nombres de tecnología |
| `specs/<área>/plan.md` | Plan técnico | Módulo, tablas, endpoints, herramientas del agente que cubren cada requisito | Decidir comportamiento nuevo: eso vuelve al spec |
| `specs/<área>/tasks.md` | Tareas | `T-nnn` de una sesión de trabajo cada una, con el REQ que satisface y cómo se comprueba | Tareas sin REQ. **Excepción:** una tarea de infraestructura cita en su lugar la AD o el principio que habilita |

Hoy solo existen los `spec.md`. `plan.md` y `tasks.md` se crean al entrar cada área en implementación (§10).

### 2.3 Formato de requisito

```markdown
### REQ-<ÁREA>-nn

**Requisito:** <frase EARS, sujeto EL SISTEMA>

**Origen:** <CUN / RN / R-nn / decisión>
**Tipo:** ubicuo | dirigido por evento | dirigido por estado | no deseado | opcional | complejo

**Criterio de aceptación**
DADO …
CUANDO …
ENTONCES …
```

Patrones EARS: `EL SISTEMA…` · `CUANDO…` · `MIENTRAS…` · `SI… ENTONCES…` · `DONDE…` · combinados en ese orden.

### 2.4 Identificadores

| Prefijo | Qué identifica | Dónde se define |
|---|---|---|
| `REQ-<ÁREA>-nn` | Requisito | `specs/<área>/spec.md` |
| `R-nn` | Regla de producto (no está en el Entregable 1) | `REPLANTEO.md` §8 |
| `D-nn` | Decisión de producto abierta o resuelta | `REPLANTEO.md` §9 |
| `PT-n` | Decisión técnica abierta | `PROPUESTA-TECNICA.md` §12 |
| `DP-nn` | Decisión provisional: vigente, pero marcada para revisarse | Este archivo, §8 |
| `AD-nn` | Decisión arquitectónica | `PROPUESTA-TECNICA.md` §3.4 |
| `INC-nn` | Inconsistencia entre documentos | Este archivo, §9 |
| `T-nnn` | Tarea de implementación | `specs/<área>/tasks.md` |

**Los identificadores son inmutables.** Un requisito que muere se marca `RETIRADO` con fecha y motivo; su número no se reutiliza.

---

## 3. Constitución — principios no negociables

Cada principio prohíbe algo concreto. Si un requisito, un diseño o un código los contradice, gana el principio hasta que el equipo lo cambie aquí.

| # | Principio | Origen |
|---|---|---|
| P-01 | El agente no toca datos sino a través de **herramientas tipadas**. No escribe SQL ni ejecuta código | AD-04 |
| P-02 | **Ninguna regla de negocio se evalúa dentro de un prompt.** RN-CAL-01, RN-INF-01, RN-INF-02, RN-OP-03 son código determinista | AD-05 |
| P-03 | **Toda acción con efecto externo exige confirmación previa** que muestre la acción exacta, sus datos y qué es irreversible | RN-ER-03 |
| P-04 | **El permiso se evalúa en el servidor** con la identidad del usuario, nunca con lo que diga el modelo | RN-OP-01, RN-OP-04 |
| P-05 | **Toda fecha se guarda y se muestra con zona horaria** | Propuesta §8 |
| P-06 | **El proveedor del modelo vive detrás de una interfaz propia**; ningún SDK de proveedor fuera de la capa de agentes | AD-06 |
| P-07 | **Toda invocación de herramienta es idempotente y queda auditada** con argumentos, resultado y costo | Propuesta §7.2 |
| P-08 | **Correo: solo `gmail.send`, nunca lectura del buzón** | R-31, REQ-ACC-07 |
| P-09 | **Ninguna respuesta de un tercero cambia un estado por sí sola**; llega como propuesta | R-16 |
| P-10 | **Lo marcado como personal no es visible para la empresa** que paga la cuenta | R-22 |
| P-11 | **No hay camino manual paralelo al asistente.** Cuando no responde, lo pedido queda en cola, visible como en espera, sin crear ni enviar nada; lo existente sigue consultable; al volver, lo encolado pasa por la confirmación de siempre. **Alcance:** solo la caída del asistente. Un permiso de integración que falta se rige por REQ-ACC-08, y uno de sensor por R-9. **Excepción provisional:** los controles sobre algo que ya existe funcionan sin el asistente (DP-01) | R-42 |

---

## 4. Arquitectura y stack

Detalle y justificación en `PROPUESTA-TECNICA.md`. Resumen de lo que condiciona el código:

| Capa | Decisión | Estado |
|---|---|---|
| Estilo | Monolito modular + capa de agentes; dos procesos (API y trabajador) | AD-01, decidido |
| Lenguaje | TypeScript en todo el monorepo, Node.js LTS | AD-02, decidido el 2026-10-22 (PT-1) |
| Backend | NestJS + Prisma (con Prisma Migrate) | Decidido |
| Contratos | Esquemas zod en `packages/contratos`, compartidos por la API, el agente y los clientes | AD-08, decidido |
| Datos | PostgreSQL + pgvector · Redis · S3 compatible (MinIO en desarrollo) | Decidido |
| Cola | BullMQ sobre Redis | Decidido |
| Agentes | LangGraph.js, con interrupción para confirmación (P-03) | Decidido |
| Escrituras | Toda escritura con efecto pasa por una **Operación** que se propone, se confirma y se ejecuta una vez | AD-09, decidido |
| Agenda | Google Calendar como fuente de verdad, con `evento_agenda` como réplica | AD-10, decidido |
| Autenticación | Credenciales propias + JWT; Google solo como integración | Alineado con `06-acceso` |
| Móvil | React Native + Expo + TypeScript | Decidido |
| Web | Next.js + TypeScript, tres columnas 72 / 528 / 840 | Decidido — `design/ARQUITECTURA-VISUAL-WEB.md` |
| Monorepo | pnpm workspaces + Turborepo: `apps/api`, `apps/web`, `apps/movil`, `packages/contratos` | Decidido |
| Pruebas | Vitest (API con SWC) · Supertest · Playwright | Decidido |
| Despliegue | PaaS con contenedores; GitHub Actions + Docker | Decidido |

Módulos de dominio: Identidad y perfil · Agenda · Planificación · Tareas · Equipos y reuniones · Comunicaciones · Resúmenes. **Un módulo solo llama a otro por su interfaz pública.**

---

## 5. Mapa de especificaciones

Estado por columna: **—** no existe · **borrador** · **vigente** · **parcial** · **ok**.

| Área | Archivo | CUN | Plataforma | Plan | REQ | Spec | Diseño | Plan técnico | Tareas | Código | Pruebas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Captura | `specs/01-captura/spec.md` | 01, 03 | Móvil | G / P | CAP-01…24 (24) | vigente | parcial | — | — | — | — |
| Agenda | `specs/02-agenda/spec.md` | 01 | Móvil | G | CUN01-01…12 (12) | vigente | parcial (jerarquía anterior) | aprobado | T-012…T-021 (T-012, T-014 a T-016 y T-020 hechas; T-013 contra el simulado) | 1 REQ implementado (CUN01-09) y 6 en curso | 7 de 12 REQ con prueba |
| Jornada | `specs/02-jornada/spec.md` | 02 | Móvil | P | CUN02-01…24 (24) | vigente | — | — | — | — | — |
| Tareas / delegación | `specs/03-tareas/spec.md` | 07, 09 | Web (gerente) + móvil (colaborador) | E | CUN07-01…17 (17) | vigente | parcial (jerarquía anterior) | — | — | — | — |
| Comunicaciones | `specs/04-comunicaciones/spec.md` | 04 | Móvil + web | P | CUN04-01…15 (15) | vigente | — | — | — | — | — |
| Encargo | `specs/04-comunicaciones/spec.md` §9 | 07, 09 | Web + móvil | E | ENC-01…13 (7 vigentes, 6 retirados por D-17) | vigente | parcial (Encargos, Correo) | — | — | — | — |
| Equipos | `specs/05-equipos/spec.md` | 05 | Web | E | CUN05-01…16 (16) | vigente | desfasado (INC-07) | — | — | — | — |
| Acceso | `specs/06-acceso/spec.md` | — (sistema) | Web (móvil pendiente) | Todos | ACC-01…14 (14) | vigente | parcial | aprobado, revisado por D-17 | T-001…T-011, T-022, T-023 (T-001 a T-008, T-010, T-011 y T-022 a T-024 hechas) | 11 de 14 REQ implementados, 2 en curso | 13 de 14 REQ con prueba |
| **Total** | | | | | **135 (129 vigentes)** | | | | | | |

**Glosario:** `specs/glosario.md`. Una definición por término, y tres conflictos de vocabulario abiertos (INC-12).
**Trazabilidad:** `specs/trazabilidad.md`, generada con `python tools/trazabilidad.py`. Con `--check` falla si un requisito falta de la tabla, aparece sin spec, no tiene origen o figura como implementado sin prueba. Es la semilla del smoke test.

---

## 6. Cobertura del modelo del negocio

| CUN | Nombre | Actor | Especificado en | Estado |
|---|---|---|---|---|
| CUN-01 | Gestionar agenda personal | Usuario | 02-agenda, 01-captura | Especificado |
| CUN-02 | Planificar jornada | Usuario | 02-jornada | Especificado |
| CUN-03 | Gestionar tareas personales | Usuario | 01-captura (solo captura) | **Parcial**: falta consultar, modificar, completar |
| CUN-04 | Comunicaciones asistidas | Usuario | 04-comunicaciones | Especificado |
| CUN-05 | Consultar disponibilidad de equipo | Gerente | 05-equipos | Especificado |
| CUN-06 | Coordinar reunión | Gerente | — | **Sin especificar** (desbloqueado desde RN-CAL-01) |
| CUN-07 | Delegar tarea | Gerente | 03-tareas | Especificado |
| CUN-08 | Seguimiento de tareas delegadas | Gerente | — | **Sin especificar** |
| CUN-09 | Gestionar tarea asignada | Colaborador (con cuenta, D-17) | 03-tareas §7, ENC, ACC-13 | **Especificado** en la aplicación móvil: recibir, responder y recibir la decisión del líder |
| CUN-10 | Obtener resumen de reunión | ¿? (D-4) | — | **Bloqueado** por D-4 |
| CUN-11 | Compromiso → tarea | Gerente | — | Candidato (D-1) |

---

## 7. Reglas de producto vigentes

`R-1` a `R-46`, definidas en `REPLANTEO.md` §8. Son posteriores al Entregable 1 y obligan al diseño y al código igual que una RN.

**Decididas en sesión pero aún no escritas como requisito** (`REPLANTEO.md` §10): frontera Gratuito/Personal, nota de voz ≤ 5 min, la llamada es *marcar*, Evento de Agenda gana *realizado* y *duración real*, hilo de comentarios por Tarea, tres puertas del ciclo de vuelta. Cada una necesita su `REQ` antes de implementarse.

---

## 8. Decisiones abiertas

Bloquean requisitos o tareas. Cuando una se resuelve: se tacha aquí, se anota en §11 y se aplica en el spec afectado.

| # | Decisión | Bloquea |
|---|---|---|
| ~~PT-1~~ | ~~Backend en Python/FastAPI o TypeScript/NestJS~~ **Resuelta el 2026-10-22: TypeScript + NestJS** | — |
| PT-2 | ¿Voz en la primera versión? | REQ-CAP-09…13 |
| PT-3 | Correo real con usuarios de prueba o simulado | CUN-04, ENC |
| PT-5 / D-5 | Plan Personal: ¿se modela o se declara visión? | Alcance de 02-jornada, 01-captura |
| PT-6 / D-7 | Cifras de los límites del Plan Gratuito | Contador y aviso de límite; 01-captura, 02-jornada |
| D-1 | ¿Entra CUN-11? | Puente reuniones → trabajo |
| D-2 | Escritorio: ¿reemplaza o se suma a la web? | Número de clientes |
| D-3 | ¿Entra EN-09 Documento (CUN-12, CUN-13)? | Modelo de datos |
| D-4 | Actor de CUN-10 | CUN-10 entero |
| D-8 | Participante externo como entidad | REQ-CAP-08, CUN04-13/14, CUN05 §3 |
| D-9 | EN-03 como «período» | REQ-CUN02-23 |
| D-11 | ¿EN-10 Gasto acoplado a la actividad? | — |
| D-12 | Supuestos S-3, S-4, S-5 | Reparto por plan |
| D-16 | Categorías con ámbito | REQ-CUN02-19 |
| — | Duración por defecto de un compromiso (1 h propuesta) · H-AG-01 | REQ-CUN01-01 |
| ~~D-17~~ | **Resuelta el 2026-10-22 por el equipo: el colaborador tiene cuenta.** Reemplaza `REPLANTEO.md` §4.7 (el colaborador sin cuenta) y en parte §4.8. (a) **Rol propio, `colaborador`**, limitado a sus tareas asignadas, sus hilos y su perfil, sin las funciones del Plan Personal. (b) **Plataforma: móvil**, donde llegan las notificaciones; la web queda para más adelante. (c) **El correo solo avisa**: toda respuesta se da en la aplicación, y no hay botones, enlaces de formulario ni respuestas por correo. (d) Lo que el colaborador responde llega al líder como propuesta (R-16); el líder confirma o modifica la tarea, y el resultado vuelve al colaborador como notificación. Afecta a `03-tareas` §7, al encargo de `04-comunicaciones`, a `05-equipos` §3 y a `06-acceso` | Fase 4; rol en T-004 |
| D-18 | **Precio del colaborador.** El argumento de costo de §4.7 vuelve: cada colaborador ocupa ahora una cuenta. ¿Asiento a precio completo, asiento reducido o incluido en el plan? No bloquea el desarrollo | Modelo comercial |
| **DP-04** | **Provisional, revisable.** Si un token de renovación recién rotado vuelve a usarse **dentro de 30 segundos**, se trata como una petición duplicada (dos pestañas, dos cargas seguidas) y no como un robo: se emiten tokens de la misma sesión. Fuera de ese margen, o si la sesión ya se cerró, se sigue cerrando toda la sesión. **Para cambiarla:** `MARGEN_REUTILIZACION_MS` en `apps/api/src/identidad/autenticacion.service.ts` | REQ-ACC-02 · T-024 |
| **DP-03** | **Provisional, revisable.** El correo de aviso al colaborador sale desde la dirección de la plataforma, no desde el Gmail del gerente. Así la delegación no necesita `gmail.send`, que solo queda para el correo asistido (CUN-04) | REQ-CUN07-16 |
| **DP-02** | **Provisional, revisable.** Alternativas ante un conflicto: misma duración, dentro de la banda horaria, el mismo día primero y por cercanía a la hora pedida, sin sábado ni domingo, hasta tres y como mucho siete días adelante; cada 15 minutos, sin solaparse entre sí y nunca en el pasado (añadido en T-016). Sale del cuadro `CUN-01 / Móvil / FA-01 / 01`. **Para cambiarla:** es una función pura; basta con su lista en `specs/02-agenda/plan.md` §9 y sus pruebas | REQ-CUN01-05 |
| — | **Hallazgos de agenda** H-AG-03 a H-AG-09: eventos de todo el día, recurrentes, eventos donde se es invitado, calendario principal, comprobar de nuevo al confirmar, caducidad de las propuestas y renovación de la ventana de la réplica | `specs/02-agenda/plan.md` §9 |
| — | **Hallazgos de acceso** H-ACC-01 a H-ACC-05: alta de cuentas, política de contraseña, duración de la sesión, efecto del cambio de zona horaria, vista por rol | `specs/06-acceso/plan.md` §8 |
| — | Atributos nuevos de EN-02: disparo por lugar, recurrencia y vigencia | REQ-CAP-15, REQ-CAP-17 |
| **DP-01** | **Provisional, revisable.** Los controles directos sobre algo que ya existe («Hecho», confirmar un bloque, cancelar) **funcionan sin el asistente**, también en modo degradado, con su confirmación previa cuando tienen efecto externo (P-03). No necesitan el modelo (AD-05). **No es un camino manual:** crear o redactar algo nuevo sigue pasando por el agente. **Para revertirla:** quitar la excepción de P-11 y cambiar la última línea del criterio de REQ-CUN01-11 y REQ-CUN02-24 a «queda en espera». La lectura estricta, que la premisa (§1) favorecía, se descartó por ahora el 2026-10-22 | REQ-CUN01-11, REQ-CUN02-24 |
| — | **Modo degradado:** ¿se puede retirar algo de la cola antes de que el asistente vuelva? | REQ-CAP-24, CUN01-11, CUN02-24, CUN07-09, CUN04-15 |
| — | **Decidido, pendiente de aval:** las expresiones de tiempo relativas de algo encolado («mañana») se resuelven respecto del momento de la captura, no del procesamiento | REQ-CAP-24 |

---

## 9. Inconsistencias detectadas

Encontradas al construir este archivo. **No se corrigieron**: cada una es una decisión del equipo. Al resolverse se marca ~~tachada~~ con fecha.

| # | Inconsistencia | Dónde | Propuesta |
|---|---|---|---|
| ~~INC-01~~ | ~~R-42 elimina el camino manual paralelo, pero siete requisitos y `design/CONTEXTO.md` lo siguen exigiendo~~ **Resuelta el 2026-10-22.** R-42 cubre solo la caída del asistente (P-11). Cinco REQ pasan a encolar; CUN01-08 se alinea con REQ-ACC-08 y CAP-20 con R-9. También se corrigieron `CONTEXTO.md`, `ARQUITECTURA-VISUAL-WEB.md` §8 y §13, y `PROPUESTA-TECNICA.md` §5 y §7.5 | — | — |
| INC-02 | `design/CONTEXTO.md` describe **siete secciones** web; R-32 fija tres | `CONTEXTO.md` §Jerarquía de la web; `PROPUESTA-TECNICA.md` §6 «Pantallas mínimas» | Actualizar los dos a Agenda · Tareas · Actividad |
| ~~INC-03~~ | ~~REQ-ACC-05 todavía habla de «la zona horaria y la franja»~~ **Resuelta el 2026-10-22**: se quitó «y la franja» | — | — |
| ~~INC-04~~ | ~~REQ-CUN01-11 cita como origen la «constitución del proyecto», que no existía~~ **Resuelta el 2026-10-22** con INC-01: ahora cita R-42 y P-11 | — | — |
| INC-05 | Dos áreas con el mismo número: `02-agenda` y `02-jornada`; `03-tareas` cubre CUN-07, no CUN-03 | `specs/` | Renumerar al entrar en implementación, o declarar la numeración como no ordinal |
| ~~INC-06~~ | ~~`04-comunicaciones` tiene dos secciones `## 7`~~ **Resuelta el 2026-10-22**: la del encargo pasó a ser la §9 | — | — |
| INC-07 | Los ocho cuadros de CUN-05 se generaron con la versión anterior de RN-CAL-01 | `specs/05-equipos/spec.md` §6 | Regenerar los cuadros |
| ~~INC-08~~ | ~~`05-equipos` §6 numera dos puntos «2.»~~ **Resuelta el 2026-10-22**: se renumeró y se aclaró que la zona horaria ya la recoge ACC-04; solo falta declararla en EN-01 del Entregable 1 | — | — |
| ~~INC-09~~ | ~~`02-jornada` §10 sigue citando D-10~~ **Resuelta el 2026-10-22**: ahora cita D-16 | — | — |
| INC-10 | La segunda oración de RN-CAL-01 y el criterio de terminado de RN-INF-02 están aprobados pero no incorporados al Entregable 1 | `05-equipos` §1, `03-tareas` §6 | Actualizar el Entregable 1 |
| INC-11 | **El diseño puede seguir mostrando el camino manual.** El script `14-cuadros-web-v2.js` todavía genera «Delegar a mano» en `Blancos / 03`, aunque el cuadro ya se rehízo en Figma; si se vuelve a ejecutar, se pierde la corrección. `17-cuadros-movil-v2.js` declara `Excepciones / 02 Asistente no disponible → banner y camino manual operativo` | `design/figma/14-…`, `17-…`; archivo de Figma | Revisar el cuadro móvil en Figma y alinear los dos scripts con P-11 |
| ~~INC-13~~ | ~~`PROPUESTA-TECNICA.md` §4.1 proponía entrar con OAuth de Google y Microsoft; `06-acceso` fija credenciales propias y solo Google como integración~~ **Resuelta el 2026-10-22** a favor de la especificación, al aplicar PT-1. Microsoft queda fuera de esta versión | — | — |
| INC-14 | **El diseño va por detrás de D-17.** Los cuadros `WEB-v2 / Correo / 01–02` y el recorrido del encargo dibujan el colaborador sin cuenta, con botones y formulario en el correo. No existe ningún cuadro móvil del colaborador | Archivo de Figma; `design/ARQUITECTURA-VISUAL-WEB.md`; `design/CONTEXTO.md` | Rehacer el correo como solo aviso y diseñar las pantallas del colaborador en el móvil antes de la fase 4 |
| INC-15 | **Las pantallas de acceso se construyeron sin ver Figma.** Los cuadros `WEB-v2 / Acceso / 01–02` no tienen script en el repositorio, y el conector de Figma necesita autorización. Se usaron la especificación, los tokens y `design/CONTEXTO.md` | `apps/web/src/app/entrar`, `primer-ingreso`; archivo de Figma | Autorizar el conector de Figma (`/mcp`) y comparar; o revisarlo el equipo a ojo |
| INC-12 | **Vocabulario con dos sentidos.** «Compromiso» (evento con hora en EN-02, y algo acordado en una reunión en CUN-10/11), «actividad» (tarea en el Entregable 1, y la sección de lo que pasó) y «jornada» frente a «período» | `specs/glosario.md` §6, C-1 a C-3 | C-1 antes de especificar CUN-10; C-2 ya tiene regla de redacción; C-3 depende de D-9 |

---

## 10. Fases y estado

| Fase | Contenido | CUN | Estado |
|---|---|---|---|
| 0 | **Base SDD**: este archivo, `AGENTS.md`, glosario, trazabilidad, resolver PT-1 e INC-01 | — | **Cerrada el 2026-10-22** |
| 1 | Acceso, modelo de datos, agenda y tareas personales: dominio, API y Operaciones (AD-09), sin agente. La interfaz solo consulta y ofrece los controles de DP-01; no hay formularios de creación (R-42) | 01, 03 + ACC | **En curso.** Planes aprobados, 23 tareas, T-001 a T-005, T-010, T-011, T-020 (en web), T-023, T-006, T-016, T-012, T-007 y T-022 hechas. **Google conectado con una cuenta real.** T-008 y T-024 hechas. T-013 hecha contra el simulado: **falta habilitar la API de Google Calendar** en Google Cloud para probarla con la cuenta real. T-014 y T-015 hechas: la API ya consulta la agenda. Siguiente: la agenda en la web, y T-017 cuando se decida H-AG-01 |
| 2 | Capa de agente: intención, herramientas, confirmación | 01, 03 vía conversación + CAP | Especificado, sin plan |
| 3 | Planificación de jornada | 02 | Especificado |
| 4 | Equipos: disponibilidad, coordinación, delegación, seguimiento. Desde D-17, también la aplicación móvil del colaborador | 05 a 09 | Parcial (faltan 06 y 08); diseño desfasado (INC-14) |
| 5 | Comunicaciones asistidas y resúmenes | 04, 10 | Parcial (10 bloqueado) |

**Orden acordado el 2026-10-22, para tener pantallas antes:** T-004 → T-005 → T-010 → T-011 (primeras pantallas web) → **T-023** (armazón web, añadida a pedido del equipo) → T-020 (el móvil arranca) → T-006 → T-016 → T-012 → resto de agenda. La parte de Google (T-007, T-008, T-013, T-022) entra cuando estén las credenciales de Google Cloud.

**Siguiente paso concreto:** T-020, el andamiaje del móvil con Expo. Antes conviene contrastar las pantallas de acceso con Figma (INC-15). La duración por defecto (H-AG-01) tiene que estar decidida antes de T-017.

---

## 11. Registro de cambios

Una línea por cambio, la más reciente arriba. Formato: `fecha · versión · qué cambió · archivos tocados · quién`.
La versión sube así: **mayor** cuando cambia un principio de §3 o el alcance de una fase; **menor** cuando se añade, retira o reescribe un requisito; **parche** para correcciones de redacción o de estado.

| Fecha | Versión | Cambio | Archivos | Quién |
|---|---|---|---|---|
| 2026-10-22 | 2.10.0 | **T-015 hecha: consulta de la agenda.** `GET /agenda/eventos?desde=&hasta=` y `GET /agenda/eventos/:id`, con `@RequiereGoogle('calendario')` y sincronización bajo demanda pasados 2 minutos. Contrato `EventoAgenda` con horas en ISO 8601 con desfase y zona IANA aparte. Si Google no responde, se muestra la última copia. **CUN01-09 implementado**; CUN01-08 y CUN01-11 en curso. 153 pruebas | `apps/api/src/agenda`, `apps/api/src/app.module.ts`, `apps/api/test/agenda`, `packages/contratos`, `specs/02-agenda/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.9.0 | **T-014 hecha: réplica de la agenda.** Tablas `evento_agenda` y `sincronizacion_calendario` (sexta migración), en el filtro por organización. Sincronización completa (−30 a +365 días) e incremental con `syncToken`, vuelta a empezar ante el `410`, y lo borrado en Google queda `cancelado` (R-25). **Proceso trabajador** con BullMQ 6.3.11 sobre Redis: cada 5 minutos, un trabajo por perfil conectado. Hallazgo nuevo **H-AG-09** (renovar la ventana cada 30 días) y cuatro ajustes al plan §4. Redis entra en la integración continua. CUN01-09 y CUN01-10 en curso. 143 pruebas | `apps/api/prisma`, `apps/api/src/agenda`, `apps/api/src/trabajador*.ts`, `apps/api/src/plataforma/aislamiento.ts`, `apps/api/test`, `apps/api/vitest.config.mts`, `apps/api/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.github/workflows/ci.yml`, `AGENTS.md`, `specs/02-agenda`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.8.1 | **T-013 hecha contra el simulado.** Puerto `ProveedorCalendario` con implementación sobre Google Calendar (vía `ClienteGoogle`, sin SDK) y otra simulada que cuenta llamadas. El contrato es código compartido: lo ejecutan la prueba y el script `probar-calendario` contra Google. **La prueba real falló con `403 SERVICE_DISABLED`: la API de Google Calendar no está habilitada en el proyecto de Google Cloud.** 131 pruebas | `apps/api/src/integraciones/calendario`, `apps/api/src/cli/probar-calendario.ts`, `apps/api/test/calendario`, `apps/api/package.json`, `specs/02-agenda/tasks.md` | Claude |
| 2026-10-22 | 2.8.0 | **T-008 hecha.** `ClienteGoogle`, el único punto que llama a Google: comprueba el permiso, renueva el acceso, y ante un permiso retirado lo marca, avisa una sola vez y no reintenta; `@RequiereGoogle` bloquea antes de ejecutar. ACC-08 y ACC-09 implementados. **T-024, nueva y hecha:** la auditoría mostró una sesión cerrada por dos renovaciones simultáneas (227 ms); margen de gracia de 30 s para duplicados (DP-04, provisional) y quinta migración. 121 pruebas | `apps/api/src/integraciones`, `apps/api/src/identidad/autenticacion.service.ts`, `apps/api/prisma`, `apps/api/test`, `packages/contratos`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.7.0 | **T-007 y T-022 hechas: conexión con Google, probada con una cuenta real.** Permisos por alcance con su explicación; enlace firmado de 10 minutos (ajuste del plan: `POST /integraciones/google/enlace`); tokens cifrados con AES-256-GCM; el colaborador solo ve el calendario; ninguna lectura de Gmail en el código. Pantalla en Ajustes y aviso al volver. **Defecto hallado en la prueba real y corregido:** las cookies `SameSite=Strict` perdían la sesión al volver de Google; ahora `Lax`. ACC-06, 07 y 14 implementados. 108 pruebas | `apps/api/src/integraciones`, `apps/api/prisma`, `apps/api/test`, `packages/contratos`, `apps/web`, `.env.example`, `.github/workflows/ci.yml`, `turbo.json`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Equipo (Google Cloud), implementado por Claude |
| 2026-10-22 | 2.6.0 | **T-012 hecha: Operaciones (AD-09).** Tabla `operacion`; proponer, confirmar, descartar y listar; registro de ejecutores por tipo; confirmación idempotente con reclamación atómica (ajuste del plan §3.2, sin SQL escrito a mano); desenlaces ejecutada, no confirmable, vuelve a propuesta (H-AG-07) y fallida. `Operacion` entra en el filtro por organización. CUN01-03 en curso. **Lo que queda de la fase 1 depende de Google** (T-007 y siguientes). 97 pruebas | `apps/api/prisma`, `apps/api/src/operaciones`, `apps/api/test/operaciones`, `apps/api/test/plataforma`, `packages/contratos`, `specs/02-agenda/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.5.1 | **T-016 hecha.** Funciones puras `detectarConflictos()` y `generarAlternativas()` según DP-02, con manejo propio de la hora local por zona IANA. Se precisa DP-02: horarios cada 15 minutos, alternativas sin solaparse entre sí y nunca en el pasado. CUN01-02 y CUN01-05 en curso (falta la Operación, T-017 y T-018). 11 pruebas unitarias; 86 en total | `apps/api/src/agenda/dominio`, `specs/02-agenda/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.5.0 | **T-006 hecha.** `GET /perfil`, solo lectura y también para el colaborador; ninguna ruta para cambiar correo, plan, rol o dar de baja. ACC-12 implementado, ACC-10 en curso (falta cambiar la zona, T-009). La web muestra el perfil en Ajustes. 75 pruebas | `apps/api/src/identidad/perfil.controller.ts`, `apps/api/test/acceso/perfil.spec.ts`, `packages/contratos`, `apps/web`, `specs/06-acceso/tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.4.1 | **T-020 hecha en web.** `apps/movil` con Expo SDK 57 (React Native 0.86.3); la app consulta la API y valida con `contratos`. Pruebas de extremo a extremo del móvil con Playwright sobre Expo web (propuesta técnica §4.1). Falta probarla en un teléfono. Dos excepciones de auditoría documentadas, sin versión corregida publicada (`node-forge` y `braces`, herramientas de desarrollo). 71 pruebas | `apps/movil`, `pnpm-workspace.yaml`, `.gitignore`, `apps/web/playwright.config.ts`, `PROPUESTA-TECNICA.md`, `AGENTS.md`, `specs/02-agenda/tasks.md` | Claude |
| 2026-10-22 | 2.4.0 | **T-023, nueva y hecha, a pedido del equipo: armazón de la aplicación web.** Navegación de 72 px (Agenda, Tareas, Actividad; Ajustes al pie), conversación de 528 px con blanco inicial y ejemplos pulsables, y lienzo de 840 px con niveles o franjas y estados vacíos; lienzo expandido; Ajustes encima con cierre de sesión. Sin asistente detrás: lo que se envía queda «en espera» y se dice que no se envió ni se creó nada (R-42). 70 pruebas | `apps/web/src/app/aplicacion`, `apps/web/src/app/page.tsx`, `globales.css`, `next.config.ts`, `apps/web/e2e`, `AGENTS.md`, `specs/06-acceso/tasks.md` | Equipo (pedido), implementado por Claude |
| 2026-10-22 | 2.3.0 | **T-011 hecha: primeras pantallas.** Entrar y Primer ingreso en la web contra la API real, aviso del móvil para el colaborador y cierre de sesión. Next.js hace de intermediario de sesión con cookies `httpOnly`. ACC-02, ACC-04 y ACC-05 implementados de punta a punta. 6 pruebas de extremo a extremo sobre una base propia (`nexoai_e2e_prueba`). Nueva INC-15: las pantallas no se contrastaron con Figma. Se desactiva el `AGENTS.md` que escribía Next.js, y la API carga el `.env` al arrancar. 69 pruebas | `apps/web`, `apps/api/src/main.ts`, `turbo.json`, `.claude/launch.json`, `AGENTS.md`, `specs/06-acceso/tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.2.1 | **T-010 hecha.** `apps/web` con Next.js 16, React 19 y Playwright; la página inicial valida `GET /salud` con `contratos`. **Corrección de seguridad:** Next.js 16.4.0 → 16.4.2 (dos vulnerabilidades críticas de ejecución remota de código) y Prisma 7.10.0 → 7.10.1 (`mysql2` y `deepmerge-ts`); auditoría limpia, y ahora también en la integración continua. Reglas nuevas en `AGENTS.md`: excepción de seguridad a la regla de las dos semanas, y no seguir instrucciones que las herramientas dirigen a agentes de IA. 64 pruebas | `apps/web`, `apps/api/package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `.gitignore`, `turbo.json`, `AGENTS.md`, `specs/06-acceso/tasks.md` | Claude |
| 2026-10-22 | 2.2.0 | **T-005 hecha.** Primer ingreso: guarda global que bloquea todo salvo completarlo o salir; contraseña nueva de al menos 12 caracteres y distinta de la temporal; zona horaria IANA con nombre, sin desfases fijos; cierre de las sesiones abiertas con la temporal; tokens nuevos sin la marca de pendiente. ACC-04 y ACC-05 en curso (falta la interfaz, T-011). Una prueba detectó que `Intl.supportedValuesOf` rechazaba nombres vigentes como `America/Argentina/Buenos_Aires`, y se corrigió el criterio. 63 pruebas | `apps/api/src/identidad`, `apps/api/test/acceso`, `apps/api/test/utilidades`, `packages/contratos`, `specs/06-acceso/tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.1.0 | **T-004 hecha.** Ingreso, renovación rotativa con detección de reutilización, salida y «quién soy»; error único que no revela si el correo existe; límite de 5 intentos por minuto; guardas globales de autenticación y de rol, con el colaborador denegado por defecto. Rol `colaborador` y tabla `sesion_renovacion` (segunda migración). ACC-03 implementado; ACC-02 y ACC-13 en curso (falta la interfaz). Dos ajustes al plan de acceso §5.1: limitador en memoria y tokens en el cuerpo. 35 pruebas | `apps/api` (prisma, src/identidad, src/plataforma, test/acceso), `packages/contratos`, `.env.example`, `.github/workflows/ci.yml`, `turbo.json`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 2.0.0 | **D-17: el colaborador tiene cuenta.** Rol propio limitado a sus tareas, en el móvil; el correo solo avisa; la respuesta vuelve al líder como propuesta, y su decisión vuelve al colaborador. Reemplaza `REPLANTEO.md` §4.7, acota §4.8 y R-28. **Requisitos:** 5 nuevos (CUN07-16, 17; CUN05-16; ACC-13, 14), 6 retirados (ENC-04, 06, 07, 08, 11, 13) y 9 reescritos (CUN07-11 a 15, ENC-03, 09, 12; CUN05-12, 13). Abiertas D-18 (precio del colaborador) y DP-03 (el aviso sale desde la plataforma); INC-14 (el diseño va por detrás); INC-06 resuelta. **Nuevo orden de tareas** para tener pantallas antes: T-011 ya no incluye Google, que pasa a la nueva T-022 | `SPEC.md`, `REPLANTEO.md` (notas), `specs/03-tareas`, `04-comunicaciones`, `05-equipos`, `06-acceso` (spec, plan, tasks), `specs/glosario.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py` | Equipo (D-17 y orden), redactado por Claude |
| 2026-10-22 | 1.2.1 | **T-003 hecha** (habilita P-04). Separación entre organizaciones como extensión de Prisma, que cubre lecturas, escrituras, búsquedas por clave única y transacciones; `PrismaService` y `ContextoSolicitud`. La aplicación bajo prueba usa siempre la base de prueba. Tres reglas nuevas en `AGENTS.md`. 18 pruebas en la API | `apps/api/src/plataforma`, `apps/api/src/identidad/contexto.ts`, `apps/api/test/plataforma`, `apps/api/vitest.config.mts`, `AGENTS.md`, `specs/06-acceso/tasks.md` | Claude |
| 2026-10-22 | 1.2.0 | **T-002 hecha. Primer requisito implementado: REQ-ACC-01.** Prisma 7 con la migración inicial (`organizacion`, `perfil_usuario`, `evento_auditoria`), alta de cuentas por script con argon2id y auditoría, semilla de desarrollo idempotente, y base `nexoai_prueba` que se vacía y se migra en cada ejecución de las pruebas. PostgreSQL de Docker pasa al puerto 5433 por un PostgreSQL local en el 5432. Integración continua con servicio de PostgreSQL. 10 pruebas | `apps/api` (prisma, src/identidad, src/plataforma, src/cli, test), `packages/contratos/src/acceso.ts`, `docker-compose.yml`, `infra/postgres`, `.env.example`, `.github/workflows/ci.yml`, `turbo.json`, `AGENTS.md`, `README.md`, `specs/06-acceso/tasks.md`, `specs/trazabilidad.md` | Claude |
| 2026-10-22 | 1.1.0 | **Planes de acceso y agenda aprobados por el equipo**, con sus hallazgos tal como están. Primeros `tasks.md`: T-001 a T-011 (acceso y base técnica) y T-012 a T-021 (agenda), anotados en la trazabilidad. Las tareas de infraestructura citan su AD en lugar de un REQ (§2.2). **T-001 hecha**: monorepo con pnpm y Turborepo, `packages/contratos`, `apps/api` con `GET /salud`, Vitest con SWC, docker-compose, integración continua y `verificar`. `--check` ahora detecta también tareas citadas que no existen. Se desactiva el bloque que Turborepo escribía en `AGENTS.md` | `SPEC.md`, `AGENTS.md`, `README.md`, `specs/06-acceso/tasks.md`, `specs/02-agenda/tasks.md`, `specs/*/plan.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py`, raíz del monorepo, `apps/api`, `packages/contratos` | Equipo (aprobación), redactado e implementado por Claude |
| 2026-10-22 | 1.0.0 | **Fase 0 cerrada; empieza la fase 1.** PT-1 se resuelve con TypeScript + NestJS: la propuesta técnica pasa a Prisma, BullMQ, LangGraph.js, zod y Vitest, y gana AD-08 (contratos zod), AD-09 (Operaciones) y AD-10 (Google como fuente de verdad). La autenticación se alinea con `06-acceso` (INC-13). Se redefine el alcance de la fase 1 para que sea compatible con R-42. Primeros `plan.md` de 06-acceso y 02-agenda, con DP-02 provisional y 13 hallazgos devueltos a sus especificaciones | `PROPUESTA-TECNICA.md`, `SPEC.md`, `AGENTS.md`, `specs/06-acceso/plan.md`, `specs/06-acceso/spec.md`, `specs/02-agenda/plan.md`, `specs/02-agenda/spec.md` | Equipo (PT-1), redactado por Claude |
| 2026-10-22 | 0.3.0 | **Fase 0 casi cerrada.** Glosario con 44 términos y 3 conflictos (INC-12). Trazabilidad de 130 requisitos generada por `tools/trazabilidad.py`, con `--check` probado. **DP-01**: los botones directos sobre algo que ya existe se mantienen, de forma provisional y revisable, y se ajustan los criterios de CUN01-11 y CUN02-24. Se resuelven INC-03, 08 y 09 | `SPEC.md`, `AGENTS.md`, `specs/glosario.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py`, `specs/02-agenda`, `02-jornada`, `05-equipos`, `06-acceso` | Equipo (DP-01), redactado por Claude |
| 2026-10-22 | 0.2.1 | Se registra la **premisa del producto** en §1: la facilidad está en el agente. Con ella se cierra la pregunta de §8: en modo degradado, los controles directos también se encolan. El criterio queda explícito en CUN01-11 y CUN02-24 | `SPEC.md`, `specs/02-agenda`, `specs/02-jornada` | Equipo, redactado por Claude |
| 2026-10-22 | 0.2.0 | **Resuelta INC-01** (y con ella INC-04). P-11 fija el alcance de R-42: solo la caída del asistente. Se reescriben siete REQ: CAP-24, CUN01-11, CUN02-24, CUN07-09 y CUN04-15 pasan a encolar; CUN01-08 se alinea con ACC-08; CAP-20 con R-9. Se retira la decisión 5 de `02-agenda` y se quita el doble camino del diseño y de la propuesta técnica. Abiertas en §8: tres preguntas sobre el modo degradado. Nueva INC-11 | `specs/01-captura`, `02-agenda`, `02-jornada`, `03-tareas` (incluida la tabla de diferencias con móvil), `04-comunicaciones`; `design/CONTEXTO.md`, `design/ARQUITECTURA-VISUAL-WEB.md`, `PROPUESTA-TECNICA.md`, `SPEC.md` | Claude |
| 2026-10-22 | 0.1.0 | Creación de la especificación base: método, constitución (P-01…P-11), mapa de 8 áreas y 130 requisitos, cobertura CUN, decisiones abiertas y 10 inconsistencias. Copia de la propuesta técnica al proyecto | `SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `PROPUESTA-TECNICA.md` | Claude |
