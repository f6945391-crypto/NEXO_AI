# Acceso — especificación

**Qué cubre:** entrar a la aplicación y conceder los permisos de los que depende el asistente. **No es un caso de uso del negocio**: es un requisito del sistema, así que no añade ni modifica ningún CUN del Entregable 1.

**Vale para los dos planes.** El acceso es universal; lo que cambia es dónde aterrizas.

---

## 1. Cuentas y roles

**REQ-ACC-01** · Ubicuo — Las cuentas se crean en el sistema con su rol asignado. La aplicación no ofrece registro abierto.

**REQ-ACC-02** · CUANDO una persona entra con credenciales válidas, el sistema la lleva a la vista que corresponde a su rol.

**REQ-ACC-03** · SI las credenciales no son válidas, ENTONCES el sistema lo dice sin revelar si el correo existe.

**REQ-ACC-04** · CUANDO una cuenta entra por primera vez, el sistema le pide contraseña nueva y **zona horaria** antes de dejarla continuar.

> **Corregido.** La versión anterior pedía además la franja horaria de trabajo, lo que contradecía `05-equipos` §49 —«no se añade horario laboral al Perfil de Usuario, la banda es de la plataforma»—. Resuelto a favor de 05-equipos (R-44): la banda 08:00–20:00 es de la plataforma y no se pregunta.

**REQ-ACC-05** · Ubicuo — La zona horaria recogida en REQ-ACC-04 es la que usa RN-CAL-01 para elegir la hora de una reunión. El sistema no la deduce del navegador sin confirmarla.

> **Corregido el 22 de octubre de 2026 (INC-03).** Decía «la zona horaria y la franja», pero REQ-ACC-04 ya no recoge la franja (R-44).

**REQ-ACC-10** · Ubicuo — La zona horaria recogida en REQ-ACC-04 **se puede modificar después** desde Perfil y horario. Es el único dato del perfil que el usuario cambia.

**REQ-ACC-11** · CUANDO el usuario cambia su zona horaria, el sistema le muestra qué compromisos quedan a otra hora antes de aplicar el cambio, y no mueve nada hasta que lo confirma.

**REQ-ACC-12** · Ubicuo — El usuario no administra su cuenta: no cambia su correo, no se da de baja y no cambia de plan. Esas tres cosas las decide la organización que creó la cuenta (R-45).

**REQ-ACC-13** · MIENTRAS una cuenta tenga el rol colaborador, el sistema solo le muestra las tareas que tiene asignadas, sus hilos y su perfil, y solo en la aplicación móvil. *(D-17, 22 de octubre de 2026)*

**REQ-ACC-14** · DONDE la cuenta tiene el rol colaborador, el sistema solo le ofrece conectar el calendario de Google, para compartir su disponibilidad, y nunca el envío de correo. *(D-17, 22 de octubre de 2026)*

---

## 2. Permisos de Google

**REQ-ACC-06** · CUANDO la cuenta ha completado el primer ingreso, el sistema ofrece conectar Google explicando, permiso por permiso, qué pide y para qué sirve.

**REQ-ACC-07** · Ubicuo — El sistema solicita exactamente dos permisos: ver y editar el calendario, y enviar correo en nombre del usuario. Nunca lectura del buzón.

**REQ-ACC-08** · MIENTRAS la cuenta no haya conectado Google, el asistente captura y organiza, pero no agenda ni envía correo, y lo dice al intentarlo.

**REQ-ACC-09** · SI el permiso caduca o se revoca, ENTONCES el sistema deja de intentar esas acciones y avisa una sola vez, sin reintentar en bucle.

---

## 3. Lo que este flujo NO hace

- **No registra usuarios nuevos.** Las cuentas vienen dadas.
- **No invita compañeros desde la aplicación.** Desde D-17 el colaborador sí tiene cuenta, pero la crea la organización, como cualquier otra (REQ-ACC-01). Cómo se cobra cada cuenta de colaborador está pendiente (D-18).
- **No deduce la zona horaria.** La pregunta, porque de ella depende una regla de negocio.

---

## 4. Diseño

`WEB-v2 / Acceso / 01 Entrada`, `02 Primer ingreso`, `03 Conectar Google`.

**Pendiente:** la variante móvil del mismo flujo, que es igual y más estrecha, y la pantalla de contraseña olvidada.

---

## 5. Decisiones detectadas al escribir `plan.md` · 22 de octubre de 2026

Pendientes de revisión. Lo que asume el plan mientras tanto está en `plan.md` §8.

| # | Decisión | Afecta |
|---|---|---|
| H-ACC-01 | Las cuentas se crean con un script de alta; no hay interfaz de administración en la fase 1 | REQ-ACC-01 |
| H-ACC-02 | Contraseña de 12 caracteres como mínimo | REQ-ACC-04 |
| H-ACC-03 | Sesión: 15 minutos de acceso y 30 días de renovación | REQ-ACC-02 |
| H-ACC-04 | Cambiar de zona horaria no mueve los compromisos: solo cambia la hora con que se muestran | REQ-ACC-11 |
| H-ACC-05 | La vista de cada rol la decide el cliente según el diseño de Acceso | REQ-ACC-02 |
| H-ACC-06 | «Solo en la aplicación móvil» lo aplica el cliente: la web redirige al colaborador al móvil | REQ-ACC-13 |
