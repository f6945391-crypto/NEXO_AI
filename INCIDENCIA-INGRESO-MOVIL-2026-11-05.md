# Incidencia — no se podía entrar desde el celular ni desde la PC

**Fecha:** 5 de noviembre de 2026 · **Rama:** `modificacion/vision-nexoai` en `9f9f18a` · **Cuenta:** `personal@nexoai.test`
**Resultado:** resuelta. No hubo defecto en el código, ni en la cuenta, ni en la contraseña guardada.

---

## 1. Qué pasaba

| Síntoma | Causa real |
|---|---|
| Expo Go no abría el proyecto | El celular tenía **Expo Go para el SDK 58**. El proyecto usa el **SDK 57** («Project is incompatible with this version of Expo Go») |
| El celular llegaba a la pantalla de entrada, pero no entraba | La computadora pasó del Wi-Fi de la universidad al punto de acceso del celular («Galaxy A23»), y su IP cambió de `10.100.225.174` a `192.168.219.57`. La dirección de la API queda fija dentro de la app al armarla (`EXPO_PUBLIC_API_URL`), así que el celular seguía llamando a una IP que ya no existía |
| Tras relanzar Expo, el celular seguía sin cargar | Con la caché limpia, la primera carga arma la app desde cero y tarda. Había que cerrar el proyecto en Expo Go y volver a escanear el QR |
| En la PC (web), unas veces entraba y otras no | La contraseña llegaba distinta según cómo se escribía. Probablemente el navegador rellenaba una contraseña vieja guardada, o se perdía la «ñ». Los registros muestran, con la misma cuenta, ingresos correctos (19:47 y 20:33) entre intentos fallidos |
| `npx` daba «la ejecución de scripts está deshabilitada» | PowerShell bloquea `npx.ps1`. No se cambió esa política de seguridad |
| Expo preguntaba por otro puerto | Docker ocupa el 8081 |

## 2. Cómo se diagnosticó

1. **Registro de Expo:** apareció el error del SDK 58 y, más tarde, la carga correcta con un Expo Go compatible.
2. **Auditoría de la base** (`evento_auditoria`): había `ingreso` correctos y un `ingreso.fallido`. La cuenta funcionaba.
3. **Prueba directa a la API** con la misma cuenta: por `localhost`, 200. Por la IP vieja, sin respuesta.
4. **`ipconfig`:** la IP del Wi-Fi había cambiado a `192.168.219.57`, en la red del celular.
5. **Registro de la web:** con la misma cuenta, ingresos correctos y fallidos alternados.
6. **Firewall:** Node.js ya estaba permitido en redes públicas. No era la causa.

## 3. Qué se hizo

| Acción | Detalle |
|---|---|
| Relanzar Expo con la IP nueva y la caché limpia | `$env:EXPO_PUBLIC_API_URL = 'http://192.168.219.57:3000'; npx.cmd pnpm@12.10.1 --filter @nexoai/movil start -- --port 8082 --clear` |
| Usar `npx.cmd` en vez de `npx` | Evita el bloqueo de scripts de PowerShell sin tocar su política |
| Metro en el puerto 8082 | Docker usa el 8081 |
| En el celular | Expo Go del SDK 57 (expo.dev/go); cerrar el proyecto y volver a escanear el QR |
| En la PC | Escribir la contraseña a mano, sin el autocompletado del navegador |

**No se cambió:** código, base de datos, contraseña ni configuración de seguridad.

## 4. Para la próxima vez

- **Si la computadora cambia de red, cambia su IP.** Hay que relanzar Expo con la IP nueva (`ipconfig`, adaptador Wi-Fi) y volver a escanear el QR.
- El celular y la computadora tienen que estar en la misma red. Si la red de la universidad aísla a los equipos, sirve el punto de acceso del celular.
- Para comprobar la conexión, abre en el celular `http://<IP>:3000/salud`: tiene que responder.
- Expo Go del **SDK 57**: el de la tienda trae otra versión.
