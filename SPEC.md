# NexoAI — Especificación base

**Qué es este archivo:** la fuente de verdad del proyecto y el índice de todas las demás especificaciones. Es un documento **vivo**: cambia cada vez que cambia el proyecto, y cambia **antes** que el código.
**Método:** Spec-Driven Development, modo **spec-anchored** (§2).
**Equipo:** Franco, Aixa, Vasco · Curso de Diseño de Software · Entregable 2
**Versión:** 2.18.3 · **Última actualización:** 29 de octubre de 2026 · Registro completo en §11

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
| Clientes | **Web y móvil para todos los perfiles** (23 de octubre de 2026). El móvil está pensado para la captura y el día a día; la web, para la coordinación y el seguimiento. **Para el hito del presentable se muestra el reparto original:** el gerente en la web; usuarios personales y colaboradores en el móvil (§10). La extensión llega después |
| Estructura de interfaz | Tres secciones en las dos plataformas: **Agenda · Tareas · Actividad**; la captura es una capa, Ajustes va al pie (R-32, R-36) |
| Colaborador | **Tiene cuenta** y usa el agente como el **Plan Empresarial** sobre lo suyo, desde la web o el móvil. **No asigna tareas a otros**: eso solo lo hace el responsable del equipo. Su respuesta a una tarea vuelve al líder como propuesta (D-17) |
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
| Proveedor del modelo | **Simulado por ahora**, detrás de la interfaz propia (P-06). Sin proveedor configurado, el asistente cuenta como no disponible (P-11). **Para probar: Groq, nivel gratuito**, con un adaptador compatible con la API de OpenAI | Decidido el 2026-10-24; Groq para probar, el 2026-10-29 |
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
| Captura | `specs/01-captura/spec.md` | 01, 03 | Móvil | G / P | CAP-01…24 (24) | vigente; sin voz en la primera versión (PT-2) | parcial | en `07-agente` (aprobado) | T-031 a T-035 | — | — |
| Agenda | `specs/02-agenda/spec.md` | 01 | Móvil (y web: nivel Hoy, T-025) | G | CUN01-01…13 (13) | vigente | parcial (jerarquía anterior) | aprobado | T-012…T-021 y T-025 (todas hechas) | 10 REQ implementados (CUN01-02 a 10 y 12) y 1 en curso (CUN01-11, falta el agente); CUN01-01 y 13 son de la fase 2 | 11 de 13 REQ con prueba |
| Jornada | `specs/02-jornada/spec.md` | 02 | Móvil | P | CUN02-01…24 (24) | vigente | — | — | — | — | — |
| Tareas / delegación | `specs/03-tareas/spec.md` | 07, 08, 09 | Web y móvil, para el gerente y el colaborador | E | CUN07-01…19 y CUN08-01…07 (26) | vigente; §8 (CUN-08) en **borrador** | parcial (jerarquía anterior) | — | — | — | — |
| Comunicaciones | `specs/04-comunicaciones/spec.md` | 04 | Móvil + web | P | CUN04-01…15 (15) | vigente | — | — | — | — | — |
| Encargo | `specs/04-comunicaciones/spec.md` §9 | 07, 09 | Web + móvil | E | ENC-01…13 (7 vigentes, 6 retirados por D-17) | vigente | parcial (Encargos, Correo) | — | — | — | — |
| Equipos | `specs/05-equipos/spec.md` | 05 | Web | E | CUN05-01…17 (17) | vigente | desfasado (INC-07) | — | — | — | — |
| Acceso | `specs/06-acceso/spec.md` | — (sistema) | Web (móvil pendiente) | Todos | ACC-01…17 (17) | vigente | parcial | aprobado, revisado por D-17 | T-001…T-011, T-022 a T-028 (todas hechas) | 15 de 17 REQ implementados; ACC-16 y 17 son de la fase 4 | 15 de 17 REQ con prueba |
| Agente | `specs/07-agente/spec.md` | 01, 03 (transversal) | Web y móvil | Todos | AGT-01…02 (2) | vigente | — | aprobado | T-029 a T-036 (pendientes) | — | — |
| **Total** | | | | | **151 (145 vigentes)** | | | | | | |

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
| CUN-06 | Coordinar reunión | Gerente y cualquier miembro del equipo (REQ-CUN05-17) | — | **Sin especificar** (desbloqueado desde RN-CAL-01) |
| CUN-07 | Delegar tarea | Gerente | 03-tareas | Especificado |
| CUN-08 | Seguimiento de tareas delegadas | Responsable del equipo | 03-tareas §8 | **Borrador** del 2026-10-23: estado del equipo, resumen, reporte y retrasos, solo para el responsable |
| CUN-09 | Gestionar tarea asignada | Colaborador (con cuenta, D-17) | 03-tareas §7, ENC, ACC-13 | **Especificado** en la web y en el móvil: recibir, responder y recibir la decisión del líder |
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
| ~~PT-2~~ | ~~¿Voz en la primera versión?~~ **Resuelta el 2026-10-24 por el equipo: no.** Solo texto; REQ-CAP-09 a 13 siguen especificados, sin plan | — |
| — | **Proveedor del modelo real.** Decidido el 2026-10-24 por el equipo: **simulado por ahora**. **El 2026-10-29, para probar sin pagar: Groq en su nivel gratuito**, con un adaptador que sirve también para Cerebras, OpenRouter y Ollama. Sigue abierto cuál se usa fuera de las pruebas. Hallazgo nuevo **H-AGT-13**: límite bajo por minuto y datos en servidores de Groq | T-036 |
| — | **Hallazgos del agente** H-AGT-01 a H-AGT-12, **aceptados por el equipo el 2026-10-25 tal como están**: sin proveedor el asistente cuenta como no disponible, guion de demostración del simulado, cuándo «no responde», lo que estaba en espera y no es una acción, cierre de la conversación, un solo modelo, sin respuesta en flujo, sin presupuesto por usuario, tres motivos de espera, tope de cuatro llamadas, quién resuelve «el viernes» y qué ve el proveedor de la agenda | `specs/07-agente/plan.md` §13 |
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
| ~~—~~ | ~~Duración por defecto de un compromiso (1 h propuesta) · H-AG-01~~ **Resuelta el 2026-10-22 por el equipo: una hora** | — |
| ~~D-17~~ | **Resuelta el 2026-10-22 por el equipo: el colaborador tiene cuenta.** Reemplaza `REPLANTEO.md` §4.7 (el colaborador sin cuenta) y en parte §4.8. (a) ~~**Rol propio, `colaborador`**, limitado a sus tareas asignadas, sus hilos y su perfil, sin las funciones del Plan Personal.~~ **Enmendada el 2026-10-23 por el equipo: el plan y el rol se separan.** El colaborador tiene en la práctica el **Plan Empresarial** (agente, agenda, tareas propias, plan del día, correo asistido); el rol `colaborador` solo le quita la **autoridad para asignar tareas a otros**, que es del responsable del equipo (REQ-ACC-13, 14 y 15). (b) ~~**Plataforma: móvil**, donde llegan las notificaciones; la web queda para más adelante.~~ **Enmendada el 2026-10-23 por el equipo: web y móvil, para el colaborador y para el gerente.** Para el hito del presentable se mantiene el reparto original; la extensión se completa después (2026-10-24). (c) **El correo solo avisa**: toda respuesta se da en la aplicación, y no hay botones, enlaces de formulario ni respuestas por correo. (d) Lo que el colaborador responde llega al líder como propuesta (R-16); el líder confirma o modifica la tarea, y el resultado vuelve al colaborador como notificación. Afecta a `03-tareas` §7, al encargo de `04-comunicaciones`, a `05-equipos` §3 y a `06-acceso` | Fase 4; rol en T-004 |
| — | **Las dos plataformas para los dos perfiles (D-17 b, enmendada el 2026-10-23). Después del hito (2026-10-24).** Falta decidir: (1) qué parte de la coordinación (delegar, seguimiento, disponibilidad) tiene el gerente en el móvil; (2) cómo es la vista web del colaborador. Mientras tanto, la web sigue mostrando al colaborador el aviso de `/solo-movil`, provisional | Diseño de la fase 4 (INC-14); retirar `/solo-movil` |
| D-18 | **Precio del colaborador.** El argumento de costo de §4.7 vuelve: cada colaborador ocupa ahora una cuenta, **y desde el 2026-10-23 es casi un asiento completo del Plan Empresarial**. ¿Asiento a precio completo, asiento reducido o incluido en el plan? No bloquea el desarrollo | Modelo comercial |
| ~~—~~ | ~~**El rango del colaborador (D-17 a enmendada).**~~ **Resuelta el 2026-10-23 por el equipo**, con referencias de Jira, Trello y una empresa jerárquica: (1) ve la disponibilidad del equipo y convoca reuniones (REQ-CUN05-17); (2) le pide algo a un compañero como **petición** que este acepta o rechaza (REQ-CUN07-18); (3) le propone tareas al responsable, que decide (REQ-CUN07-19); (4) el rol va **por equipo** (REQ-ACC-16); (5) el responsable ve de cada miembro libre / ocupado y las tareas del equipo, nunca lo demás ni lo personal (REQ-ACC-17). **Lo diferencial del responsable:** ver el trabajo del equipo en conjunto (CUN-08, en borrador) | — |
| — | **Seguimiento del equipo (CUN-08, borrador).** Decididas el 2026-10-23: ~~H-SEG-01~~ solo «atrasada», con su contexto en el reporte; ~~H-SEG-02~~ como mucho cinco puntos en la conversación, y el reporte completo, sin recortar; ~~H-SEG-04~~ reportes programados solo como posibilidad futura, sin implementar. **Sigue abierta** H-SEG-03 en parte: el formato es web y PDF, pero falta decidir quién más puede leer un reporte. **Formato del reporte aprobado por el equipo**: `design/reporte-equipo-muestra.html` | `specs/03-tareas/spec.md` §8; fase 4 |
| — | **Rol por equipo (REQ-ACC-16).** Hoy el rol está en la cuenta y T-026 lo usa así. El modelo de equipos de la fase 4 tiene que llevar la autoridad por equipo, y `@SoloResponsable()` comprobar el equipo afectado | Fase 4; `specs/06-acceso/plan.md` §5.5 |
| **DP-04** | **Provisional, revisable.** Si un token de renovación recién rotado vuelve a usarse **dentro de 30 segundos**, se trata como una petición duplicada (dos pestañas, dos cargas seguidas) y no como un robo: se emiten tokens de la misma sesión. Fuera de ese margen, o si la sesión ya se cerró, se sigue cerrando toda la sesión. **Para cambiarla:** `MARGEN_REUTILIZACION_MS` en `apps/api/src/identidad/autenticacion.service.ts` | REQ-ACC-02 · T-024 |
| **DP-03** | **Provisional, revisable.** El correo de aviso al colaborador sale desde la dirección de la plataforma, no desde el Gmail del gerente. Así la delegación no necesita `gmail.send`, que solo queda para el correo asistido (CUN-04) | REQ-CUN07-16 |
| **DP-02** | **Provisional, revisable.** Alternativas ante un conflicto: misma duración, dentro de la banda horaria, el mismo día primero y por cercanía a la hora pedida, sin sábado ni domingo, hasta tres y como mucho siete días adelante; cada 15 minutos, sin solaparse entre sí y nunca en el pasado (añadido en T-016). Sale del cuadro `CUN-01 / Móvil / FA-01 / 01`. **Para cambiarla:** es una función pura; basta con su lista en `specs/02-agenda/plan.md` §9 y sus pruebas | REQ-CUN01-05 |
| — | **Hallazgos de agenda** H-AG-03 a H-AG-11: eventos de todo el día, recurrentes, eventos donde se es invitado, calendario principal, comprobar de nuevo al confirmar, caducidad de las propuestas, renovación de la ventana de la réplica, en la web a dónde lleva el estado vacío, y si se avisa a los invitados al mover o cancelar | `specs/02-agenda/plan.md` §9 |
| **H-WEB-01** | **Cómo se adapta la web a pantallas pequeñas.** El diseño solo define 1440×900 (`design/ARQUITECTURA-VISUAL-WEB.md`: 72 · 528 · 840), y ninguna especificación dice qué pasa en un portátil pequeño, una tableta o un teléfono. **Lo que hace hoy el código (T-023), sin haberse decidido:** la conversación baja hasta 300 px y el lienzo hasta 340; por debajo de unos 712 px aparece desplazamiento horizontal; el lienzo ampliado oculta la conversación. **Opciones:** (a) la web es solo de escritorio y declara un ancho mínimo, con aviso o envío al móvil por debajo de él; (b) por debajo de cierto ancho, la conversación pasa a ser una capa sobre el lienzo, como en el móvil (R-36); (c) diseño adaptable completo hasta el teléfono. Detectado al revisar T-025 | Diseño de la web en anchos menores de 1440 px; cuadros `WEB-v2` |
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
| INC-14 | **El diseño va por detrás de D-17.** Los cuadros `WEB-v2 / Correo / 01–02` y el recorrido del encargo dibujan el colaborador sin cuenta, con botones y formulario en el correo. No existe ningún cuadro del colaborador, **ni móvil ni web** (desde el 23 de octubre de 2026 usa las dos), ni de la coordinación del gerente en el móvil | Archivo de Figma; `design/ARQUITECTURA-VISUAL-WEB.md`; `design/CONTEXTO.md` | Rehacer el correo como solo aviso y diseñar las pantallas del colaborador en el móvil antes de la fase 4 |
| INC-15 | **Las pantallas de acceso se construyeron sin ver Figma**, y el acceso móvil (T-028) tampoco tendrá cuadros con que compararse. Los cuadros `WEB-v2 / Acceso / 01–02` no tienen script en el repositorio, y el conector de Figma necesita autorización. Se usaron la especificación, los tokens y `design/CONTEXTO.md` | `apps/web/src/app/entrar`, `primer-ingreso`; archivo de Figma | Autorizar el conector de Figma (`/mcp`) y comparar; o revisarlo el equipo a ojo |
| INC-12 | **Vocabulario con dos sentidos.** «Compromiso» (evento con hora en EN-02, y algo acordado en una reunión en CUN-10/11), «actividad» (tarea en el Entregable 1, y la sección de lo que pasó) y «jornada» frente a «período» | `specs/glosario.md` §6, C-1 a C-3 | C-1 antes de especificar CUN-10; C-2 ya tiene regla de redacción; C-3 depende de D-9 |

---

## 10. Fases y estado

| Fase | Contenido | CUN | Estado |
|---|---|---|---|
| 0 | **Base SDD**: este archivo, `AGENTS.md`, glosario, trazabilidad, resolver PT-1 e INC-01 | — | **Cerrada el 2026-10-22** |
| 1 | Acceso, modelo de datos, agenda y tareas personales: dominio, API y Operaciones (AD-09), sin agente. La interfaz solo consulta y ofrece los controles de DP-01; no hay formularios de creación (R-42) | 01, 03 + ACC | **En curso.** Planes aprobados, 23 tareas, T-001 a T-005, T-010, T-011, T-020 (en web), T-023, T-006, T-016, T-012, T-007 y T-022 hechas. **Google conectado con una cuenta real.** T-008 y T-024 hechas. T-013 a T-015 hechas, **con la lectura real probada**: la API ya consulta la agenda. T-025 hecha: **la web muestra la agenda de hoy con los compromisos reales**. **T-017 hecha: registrar un compromiso** con la duración por defecto de una hora (H-AG-01). **T-018 hecha:** conflicto con su causa y alternativas, y nueva comprobación al confirmar. **T-019 hecha:** modificar y cancelar compromisos; cancelar también como control directo. **T-009 y T-027 hechas:** cambio de zona horaria, también desde Ajustes en la web, con los compromisos que se verán a otra hora. De la fase 1 quedan T-021 (agenda en el móvil) y las tareas personales (CUN-03, sin especificar entero) |
| 2 | Capa de agente: intención, herramientas, confirmación | 01, 03 vía conversación + CAP | **Plan aprobado el 2026-10-25. T-029 hecha: puerto del proveedor, simulado y no configurado. Groq elegido para probar (2026-10-29); T-036 se adelanta tras T-032.** Sin voz (PT-2), proveedor simulado por ahora, solo agenda y la tarea en espera. Área nueva `specs/07-agente` con REQ-AGT-01 y 02 propuestos, y REQ-CUN01-13 nuevo. Tareas T-029 a T-036 |
| 3 | Planificación de jornada | 02 | Especificado |
| 4 | Equipos: disponibilidad, coordinación, delegación, seguimiento. Desde D-17, también la aplicación móvil del colaborador | 05 a 09 | Parcial (falta 06; 08 en borrador); diseño desfasado (INC-14) |
| 5 | Comunicaciones asistidas y resúmenes | 04, 10 | Parcial (10 bloqueado) |

**Orden acordado el 2026-10-22, para tener pantallas antes:** T-004 → T-005 → T-010 → T-011 (primeras pantallas web) → **T-023** (armazón web, añadida a pedido del equipo) → T-020 (el móvil arranca) → T-006 → T-016 → T-012 → resto de agenda. La parte de Google (T-007, T-008, T-013, T-022) entra cuando estén las credenciales de Google Cloud.

### Hito del presentable (Entregable 2)

**Acordado el 2026-10-24 por el equipo.** Para presentar el proyecto se muestra el reparto original de plataformas. La extensión a las dos plataformas para los dos perfiles (D-17 b enmendada) queda para después del hito.

| Perfil | Plataforma | Qué se muestra | Tareas | Estado |
|---|---|---|---|---|
| Gerente / responsable del equipo | **Web** | Entrar y primer ingreso; agenda de hoy con los compromisos reales de Google; Ajustes con los permisos de Google y el cambio de zona horaria; la conversación en espera (R-42) | T-011, T-022, T-023, T-025, T-027 | **Hecho** |
| Usuario personal y colaborador | **Móvil** | Entrar y primer ingreso; agenda de hoy con su zona; cancelar un compromiso con su confirmación; la capa de captura en espera | T-028 → T-021 | **Hecho y probado en un teléfono Android** |
| Los dos | API | Registrar, modificar y cancelar compromisos como Operaciones, aunque sin agente no hay pantalla que los cree (R-42) | T-012 a T-019 | Hecho |

**Fuera del hito:** el agente (fase 2), la delegación y el seguimiento del equipo (fase 4, CUN-08 en borrador), y la vista móvil del gerente. La API ya deja al colaborador usar la web (T-026), pero el hito no lo muestra.

**Siguiente paso concreto:** T-030 → T-031 → T-032 → T-036 → T-033 → T-034 → T-035 (`specs/07-agente/tasks.md`). Sigue pendiente contrastar web y móvil con Figma (INC-15) y especificar las tareas personales (CUN-03). Sigue pendiente que el equipo revise H-AG-09, H-AG-10 y H-WEB-01. Sigue pendiente contrastar las pantallas de acceso con Figma (INC-15).

---

## 11. Registro de cambios

Una línea por cambio, la más reciente arriba. Formato: `fecha · versión · qué cambió · archivos tocados · quién`.
La versión sube así: **mayor** cuando cambia un principio de §3 o el alcance de una fase; **menor** cuando se añade, retira o reescribe un requisito; **parche** para correcciones de redacción o de estado.

| Fecha | Versión | Cambio | Archivos | Quién |
|---|---|---|---|---|
| 2026-10-29 | 2.18.3 | **Groq, en su nivel gratuito, elegido por el equipo para probar el agente sin pagar.** Plan §3.1: un adaptador compatible con la API de OpenAI, sin SDK, configurado en `.env` (`MODELO_URL`, `MODELO_NOMBRE`, `MODELO_CLAVE`, `MODELO_PRECIOS`), que sirve también para Cerebras, OpenRouter y Ollama. T-036 se reescribe y se adelanta tras T-032. Hallazgo nuevo **H-AGT-13**: el 429 del nivel gratuito cuenta como no disponible, y se prueba con un calendario sin datos personales. Sin cambios de código | `SPEC.md`, `specs/07-agente/spec.md`, `plan.md`, `tasks.md`, `.env.example` | Equipo (Groq), redactado por Claude |
| 2026-10-25 | 2.18.2 | **T-029 hecha: puerto del proveedor de modelo.** `ProveedorModelo` con `ModeloSimulado` (guion de frases, fechas relativas en la zona de la referencia) y `ModeloNoConfigurado` (siempre no disponible, H-AGT-01); `LlamadorModelo` con 30 s, dos reintentos y el registro de cada llamada con su costo; selección con `MODELO_PROVEEDOR`. Contrato compartido para el proveedor real. Una prueba impide el SDK de un proveedor fuera de `src/agente/modelo/` (P-06). LangGraph.js 1.4.21 y `@langchain/core` 1.2.17. Ajuste del plan: el guion es TypeScript. 20 pruebas nuevas; 211 en total, `verificar` completo en verde. `agenda.sincronizacion-periodica` (T-014) falló una vez por tiempo con todo en marcha | `apps/api/src/agente`, `apps/api/src/app.module.ts`, `apps/api/test/agente`, `apps/api/package.json`, `pnpm-lock.yaml`, `.env.example`, `specs/07-agente/plan.md`, `tasks.md`, `SPEC.md` | Claude |
| 2026-10-25 | 2.18.1 | **El equipo aprueba el plan del agente** con REQ-AGT-01, REQ-AGT-02, REQ-CUN01-13 y los hallazgos H-AGT-01 a 12 tal como están. Empieza T-029 | `SPEC.md`, `specs/07-agente/` | Equipo (aprobación), registrado por Claude |
| 2026-10-24 | 2.18.0 | **Fase 2: plan del agente propuesto.** Decisiones del equipo: **PT-2 resuelta, sin voz**; **proveedor del modelo simulado por ahora**; **solo agenda, y una tarea queda en espera** hasta CUN-03. Área nueva `specs/07-agente` con su spec (REQ-AGT-01 contexto de la conversación y REQ-AGT-02 lo que todavía no hace, los dos propuestos), `plan.md` y `tasks.md` (T-029 a T-036). Nuevo **REQ-CUN01-13**: la consulta por conversación responde con la agenda tal como está. Doce hallazgos H-AGT y tres decisiones nuevas en `02-agenda`. Decisiones de captura en `01-captura` §11. Sin cambios de código. 151 requisitos | `SPEC.md`, `specs/07-agente/`, `specs/02-agenda/spec.md`, `specs/01-captura/spec.md`, `specs/glosario.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py`, `PROPUESTA-TECNICA.md`, `AGENTS.md` | Equipo (decisiones), redactado por Claude |
| 2026-10-24 | 2.17.4 | **El equipo prueba el móvil en un teléfono Android** con Expo Go, contra la API de desarrollo por la IP del equipo: T-028 y T-021 quedan probadas. El hito del presentable queda completo también en el teléfono. Expo Go para el SDK 57 se instala desde expo.dev/go, porque la tienda ya trae el 58 | `SPEC.md`, `specs/06-acceso/tasks.md`, `specs/02-agenda/tasks.md` | Equipo (prueba), registrado por Claude |
| 2026-10-24 | 2.17.3 | **T-021 hecha en Expo web: la agenda en el móvil.** Hoy con el huso, los compromisos en la zona del perfil y su marca de cancelado o invitado; el detalle de cada uno, con «Cancelar compromiso» y su tarjeta de confirmación en los propios y vigentes; la capa de captura, desde el estado vacío y desde el asa, que deja lo pedido en espera. **CUN01-06, 10 y 12 implementados**: con T-028, **el hito del presentable queda completo** en el navegador. No se pudo contrastar con Figma (INC-15) y falta probarlo en un teléfono. 191 pruebas, `verificar` completo en verde | `apps/movil`, `specs/02-agenda/plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Claude |
| 2026-10-24 | 2.17.2 | **T-028 hecha en Expo web: acceso en el móvil.** Entrar y Primer ingreso con los textos de la web, la zona buscada en una lista o la del teléfono; la sesión en el almacenamiento seguro y su renovación; las tres secciones con Ajustes y «Cerrar sesión». La API admite solo los orígenes de `CORS_ORIGENES`. Las pruebas del móvil tienen su propia API y su base (`nexoai_e2e_movil_prueba`). Falta probarlo en un teléfono. 188 pruebas, `verificar` completo en verde | `apps/movil`, `apps/api/src/main.ts`, `apps/api/src/plataforma/cors.ts`, `apps/api/test/plataforma/cors.spec.ts`, `apps/web/e2e/arrancar-api.mjs`, `turbo.json`, `.env.example`, `AGENTS.md`, `specs/06-acceso/plan.md`, `tasks.md`, `SPEC.md` | Claude |
| 2026-10-24 | 2.17.1 | **Corrección de seguridad, a mitad de T-028.** Tres vulnerabilidades altas publicadas el 11 y el 22 de octubre: `zod` 4.6.5 → 4.6.6 en contratos y API; `body-parser` 2.4.0 y `multer` 2.5.0 forzadas en `pnpm-workspace.yaml`, porque llegan dentro de NestJS. La `zod` 3 de la CLI de Expo queda como excepción documentada: no hay corrección en esa línea y es una herramienta de desarrollo. Auditoría limpia y 157 pruebas de la API en verde. El mismo commit lleva `expo-secure-store` 57.0.4, que T-028 instaló justo antes | `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/api/package.json`, `packages/contratos/package.json`, `apps/movil/package.json`, `SPEC.md` | Claude |
| 2026-10-24 | 2.17.0 | **Hito del presentable acordado por el equipo:** el gerente en la web y los usuarios personales y colaboradores en el móvil, como en el reparto original; la extensión a las dos plataformas (D-17 b) queda para después. Nueva §10 «Hito del presentable». **T-028, nueva: acceso en el móvil**, detectada al empezar T-021, que ahora depende de ella. Plan de acceso §5.6 con lo que cambia en Android: sesión en el almacenamiento seguro del teléfono, CORS solo para orígenes listados (Expo web en desarrollo), Google conectado desde la web en desarrollo e IP del equipo en `EXPO_PUBLIC_API_URL`. INC-15 se amplía al acceso móvil. Sin cambios de código | `SPEC.md`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/02-agenda/tasks.md`, `specs/trazabilidad.md` | Equipo (hito), redactado por Claude |
| 2026-10-23 | 2.16.6 | **T-027 hecha: cambiar la zona horaria desde Ajustes, en la web.** «Cambiar zona horaria» → selector → tarjeta de confirmación con los compromisos que se verán a otra hora → confirmar o cancelar. La tarjeta es la de la API; tras confirmar, la página se vuelve a pedir con `refresh()` y la agenda llega en la zona nueva. La lista de zonas se comparte con el primer ingreso. 184 pruebas, `verificar` completo en verde | `apps/web`, `specs/06-acceso/tasks.md`, `SPEC.md` | Equipo (pedido), implementado por Claude |
| 2026-10-23 | 2.16.5 | **T-027, nueva, a pedido del equipo: cambiar la zona horaria desde Ajustes, en la web.** Usa la Operación de T-009 como control directo y muestra su tarjeta de confirmación; plan de acceso §5.3 ampliado. Especificación antes del código | `SPEC.md`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md` | Equipo (pedido), redactado por Claude |
| 2026-10-23 | 2.16.4 | **T-009 hecha: cambio de zona horaria.** Operación `perfil.cambiar_zona_horaria` (agente y control directo): la tarjeta dice la zona actual y la nueva y qué compromisos futuros se verán a otra hora, con su hora antes y después (como mucho diez, y cuántos más). Al confirmar cambia solo la zona del perfil y queda en la auditoría; los compromisos no se mueven (H-ACC-04). Cinco ajustes al plan §5.3. **ACC-10 y ACC-11 implementados**: Acceso completo para la fase 1. Sin pantalla todavía. 183 pruebas, `verificar` completo en verde | `apps/api/src/identidad`, `apps/api/test/acceso/zona-horaria.spec.ts`, `packages/contratos/src/acceso.ts`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Claude |
| 2026-10-23 | 2.16.3 | **T-019 hecha: modificar y cancelar compromisos.** `agenda.modificar` (solo el agente) y `agenda.cancelar` (también control directo, DP-01), sobre la instancia elegida (H-AG-04). Un compromiso ajeno o ya cancelado se rechaza al proponer, con su explicación y sin llamar a Google (H-AG-05). Modificar conserva la duración, muestra el antes y el ahora, y comparte con registrar la revisión de horario: conflicto, alternativas y nueva comprobación al confirmar. Cancelar deja el compromiso `cancelado` en la réplica (R-25). Hallazgo nuevo **H-AG-11**: no se avisa a los invitados al mover o cancelar. **CUN01-02 y CUN01-04 implementados**; CUN01-06 en curso (falta la pantalla, T-021). 178 pruebas, `verificar` completo en verde | `apps/api/src/agenda`, `apps/api/test/agenda`, `apps/api/test/utilidades/fechas.ts`, `packages/contratos`, `specs/02-agenda/spec.md`, `plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Claude |
| 2026-10-23 | 2.16.2 | **T-018 hecha: conflicto al proponer y al confirmar.** La tarjeta de confirmación lleva `conflicto` con los eventos que chocan y hasta tres alternativas de DP-02; elegir una es proponer de nuevo. Al confirmar se vuelve a sincronizar y comprobar, y si apareció un choque no se escribe nada y se propone de nuevo (H-AG-07). **CUN01-05 implementado.** Se corrige un defecto de las pruebas de T-017, que usaban una fecha fija. 171 pruebas, `verificar` completo en verde | `apps/api/src/agenda/registrar-compromiso.ts`, `apps/api/test/agenda/registrar.spec.ts`, `packages/contratos/src/operaciones.ts`, `specs/02-agenda/plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Claude |
| 2026-10-23 | 2.16.1 | **El equipo aprueba el formato del reporte del equipo** tal como está en la muestra: queda como referencia de REQ-CUN08-04 | `SPEC.md`, `specs/03-tareas/spec.md` | Equipo (aprobación), redactado por Claude |
| 2026-10-23 | 2.16.0 | **Decididas H-SEG-01, 02 y 04, y H-SEG-03 en parte.** Solo existe «atrasada». El resumen en la conversación lleva como mucho cinco puntos clave; **el reporte es completo**, se ve en la web y se descarga en PDF, y se entiende solo (equipo, período, zona horaria y cómo se calcularon las cifras). Se reescriben REQ-CUN08-03 y 04, y se añade **REQ-CUN08-07**: al terminar un reporte, la conversación muestra solo su síntesis y el acceso al documento. Los reportes programados quedan como posibilidad, sin implementar. Muestra del formato con datos inventados | `SPEC.md`, `specs/03-tareas/spec.md`, `specs/trazabilidad.md`, `design/reporte-equipo-muestra.html` | Equipo (decisiones), redactado por Claude |
| 2026-10-23 | 2.15.0 | **Resuelto el rango del colaborador** con las cinco respuestas del equipo, contrastadas con Jira, Trello y una empresa jerárquica: 6 requisitos nuevos (REQ-CUN05-17, REQ-CUN07-18 y 19, REQ-ACC-16 y 17). **CUN-08 en borrador** (`03-tareas` §8): solo el responsable ve el trabajo del equipo en conjunto, con un **resumen** breve en la conversación y un **reporte** con formato para compartir; los retrasos los calcula el código (P-02) y nada se envía sin pedirlo. 6 requisitos (REQ-CUN08-01 a 06) y cuatro decisiones abiertas (H-SEG-01 a 04). Glosario: **petición**, **resumen del equipo** y **reporte del equipo**; el gerente es responsable por equipo. 147 requisitos | `SPEC.md`, `specs/03-tareas/spec.md`, `specs/05-equipos/spec.md`, `specs/06-acceso/spec.md`, `plan.md`, `specs/glosario.md`, `specs/trazabilidad.md`, `tools/trazabilidad.py` | Equipo (decisiones), redactado por Claude |
| 2026-10-23 | 2.14.1 | **T-026 hecha: el colaborador con el Plan Empresarial, sin autoridad para delegar.** Toda ruta declara `@SobreLoPropio()` o `@SoloResponsable()`, y al colaborador se le cierran las del responsable y las que no declaran nada; una prueba recorre los controladores y exige la marca. Los tipos de Operación pueden ser `soloResponsable` (ajuste del plan §5.5: la delegación llegará por `POST /operaciones`). Google ofrece los dos permisos a toda cuenta; la web retira `/solo-movil` y muestra la aplicación entera al colaborador, sin «Encargadas». **ACC-13, 14 y 15 implementados.** 168 pruebas, `verificar` completo en verde | `apps/api/src/identidad`, `apps/api/src/operaciones`, `apps/api/src/integraciones`, `apps/api/src/agenda/agenda.controller.ts`, `apps/api/test`, `apps/web`, `specs/06-acceso/plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Claude |
| 2026-10-23 | 2.14.0 | **D-17 (a) enmendada por el equipo: el plan y el rol se separan.** El colaborador usa el agente como el Plan Empresarial; solo el responsable del equipo asigna tareas. Se reescriben REQ-ACC-13 (todo lo suyo, y de lo ajeno solo lo asignado) y REQ-ACC-14 (los dos permisos de Google, también el correo), y se añade **REQ-ACC-15** (el colaborador no asigna ni delega). Se precisa REQ-CUN07-04. D-18 pasa a ser casi un asiento completo, y quedan abiertas en §8 cinco preguntas sobre el rango. Nueva **T-026** para el código: hoy el servidor le niega todo por defecto. 136 requisitos | `SPEC.md`, `specs/06-acceso/spec.md`, `plan.md`, `tasks.md`, `specs/03-tareas/spec.md`, `specs/glosario.md`, `specs/trazabilidad.md` | Equipo (decisión), redactado por Claude |
| 2026-10-23 | 2.13.0 | **D-17 (b) enmendada por el equipo: los dos perfiles, gerente y colaborador, usan la web y el móvil.** Se reescribe REQ-ACC-13 (quita «y solo en la aplicación móvil»), se retira H-ACC-06 y se ajustan REQ-CUN07-16 (la notificación llega a la aplicación, web o móvil), `03-tareas`, `04-comunicaciones`, el glosario y §1, §5 y §6. Queda abierto en §8 qué coordinación tiene el gerente en el móvil y cómo es la vista web del colaborador; INC-14 se amplía. **Sin cambios de código:** el aviso `/solo-movil` sigue como provisional hasta la vista web del colaborador (fase 4) | `SPEC.md`, `specs/06-acceso/spec.md`, `plan.md`, `tasks.md`, `specs/03-tareas/spec.md`, `specs/04-comunicaciones/spec.md`, `specs/glosario.md` | Equipo (decisión), redactado por Claude |
| 2026-10-22 | 2.12.0 | **H-AG-01 resuelta por el equipo: la duración por defecto es una hora.** Se precisa el criterio de REQ-CUN01-01 y se cierra la decisión 1 del spec. **T-017 hecha: registrar un compromiso** con la Operación `agenda.registrar`: sincroniza antes de mirar los solapes, guarda la carga completada (fin por defecto y zona del perfil), un solape impide confirmar, y al confirmar crea el evento en Google y guarda en la réplica lo devuelto. Ajustes en Operaciones: `DATOS_FALTANTES` con campos, origen limitado (`ORIGEN_NO_PERMITIDO`: crear no es un control directo, R-42) y propuesta con carga completada. **CUN01-03, 07 y 08 implementados.** 164 pruebas | `apps/api/src/agenda`, `apps/api/src/operaciones`, `apps/api/src/plataforma/errores.ts`, `apps/api/test/agenda`, `packages/contratos`, `specs/02-agenda/spec.md`, `plan.md`, `tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Equipo (H-AG-01), implementado por Claude |
| 2026-10-22 | 2.11.0 | **T-025 hecha: la agenda de hoy en la web.** El nivel Hoy muestra los compromisos del día en la zona del perfil, con la zona visible («Hora de Lima (GMT-5)»), los de todo el día primero, los de otra zona con su hora allí, y cancelados e invitados marcados. Estado vacío que lleva a la conversación (H-AG-10). Probada a mano con un evento real del calendario de `personal@nexoai.test`; esa prueba destapó que la lista salía centrada y encogida (Chrome aplica `place-items` a un bloque), ya corregido. La API admite `CALENDARIO_SIMULADO=1` fuera de producción para las pruebas de extremo a extremo. 155 pruebas, `verificar` completo en verde | `apps/web`, `apps/api/src/integraciones`, `specs/02-agenda/tasks.md`, `specs/trazabilidad.md`, `SPEC.md` | Equipo (pedido), implementado por Claude |
| 2026-10-22 | 2.10.3 | **Hallazgo H-WEB-01, a pedido del equipo:** cómo se adapta la web a pantallas pequeñas. El diseño solo define 1440×900, y T-023 había asumido «solo escritorio» sin registrarlo como decisión. Queda abierto en §8 con lo que hace hoy el código y tres opciones | `SPEC.md`, `specs/06-acceso/tasks.md` | Equipo (pedido), redactado por Claude |
| 2026-10-22 | 2.10.2 | **T-025, nueva, a pedido del equipo: la agenda de hoy en la web** (REQ-CUN01-10 y 12 en la web; el móvil sigue en T-021). Hallazgo nuevo **H-AG-10**: la web no tiene capa de captura, así que el estado vacío lleva a la barra de entrada de la conversación. CUN01-12 pasa a en curso. **Desvío del método, corregido aquí:** el código de T-025 se empezó antes que su tarea; esta entrada deja la especificación al día antes de probarlo y hacer su commit. Se actualiza el «siguiente paso» de §10, que seguía en T-020 | `SPEC.md`, `specs/02-agenda/spec.md`, `plan.md`, `tasks.md`, `specs/trazabilidad.md` | Equipo (pedido), redactado por Claude |
| 2026-10-22 | 2.10.1 | **T-013: lectura real probada** con `personal@nexoai.test`, tras habilitar el equipo la API de Google Calendar en Google Cloud (el 403 `SERVICE_DISABLED` de 2.8.1). La sincronización completa guarda su token y `GET /agenda/eventos` responde de punta a punta | `specs/02-agenda/tasks.md`, `SPEC.md` | Equipo (Google Cloud), comprobado por Claude |
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
