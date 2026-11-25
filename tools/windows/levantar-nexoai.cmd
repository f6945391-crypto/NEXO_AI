@echo off
chcp 65001 >nul
setlocal
rem Vive en tools\windows: la raiz del repositorio esta dos carpetas arriba
cd /d "%~dp0..\.."
if not exist "_local" mkdir "_local"
set "LOG=%CD%\_local\levantar.log"
set "PNPM=npx pnpm@12.10.1"
rem Prisma deja en segundo plano un proceso de telemetria que hereda el log y lo bloquea:
rem los pasos siguientes no podian escribir y el script decia "ok" sin haberlos ejecutado.
set "CHECKPOINT_DISABLE=1"

echo ======================================================
echo  NexoAI - preparar el entorno local
echo  El detalle completo queda en _local\levantar.log
echo ======================================================
echo NexoAI levantar - %DATE% %TIME% > "%LOG%"

echo.
echo [1/10] Docker
echo ===== 1 docker version ===== >> "%LOG%"
docker version >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR: Docker no responde. Abre Docker Desktop, espera a que arranque y vuelve a ejecutar esto.
  goto :fallo
)
echo       ok

echo [2/10] Postgres y Redis
echo ===== 2 docker compose up -d ===== >> "%LOG%"
docker compose up -d >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR: no se pudieron levantar los servicios. Mira el log.
  goto :fallo
)
echo       ok  ^(postgres en 5433, redis en 6379^)

echo [3/10] Archivo .env
echo ===== 3 .env ===== >> "%LOG%"
if not exist ".env" (
  copy ".env.example" ".env" >> "%LOG%" 2>&1
  echo       creado desde .env.example
) else (
  echo       ya existe, no se toca
)

echo [4/10] Dependencias
echo ===== 4 pnpm install ===== >> "%LOG%"
call %PNPM% install >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR al instalar. Mira el log.
  goto :fallo
)
echo       ok

echo [5/10] Cliente de Prisma
echo ===== 5 prisma generate ===== >> "%LOG%"
call %PNPM% --filter @nexoai/api generar >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR al generar el cliente de Prisma. Mira el log.
  goto :fallo
)
echo       ok

echo [6/10] Migraciones ^(incluye la nueva: tareas^)
echo ===== 6 prisma migrate deploy ===== >> "%LOG%"
call %PNPM% --filter @nexoai/api migrar >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR al migrar. Mira el log.
  goto :fallo
)
echo       ok

echo [7/10] Compilacion
echo ===== 7 build ===== >> "%LOG%"
call %PNPM% build >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR al compilar. Mira el log.
  goto :fallo
)
echo       ok

echo [8/10] Semilla ^(organizacion y cuentas de desarrollo; idempotente^)
echo ===== 8 semilla ===== >> "%LOG%"
call %PNPM% --filter @nexoai/api semilla >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR en la semilla. Mira el log.
  goto :fallo
)
echo       ok

echo [9/10] Typecheck
echo ===== 9 typecheck ===== >> "%LOG%"
call %PNPM% typecheck >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       FALLO el typecheck. Mira el log. Sigo con el resto.
) else (
  echo       ok
)

echo [10/10] Trazabilidad
echo ===== 10 trazabilidad ===== >> "%LOG%"
python tools\trazabilidad.py --check >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       FALLO la trazabilidad. Mira el log.
) else (
  echo       ok
)

echo.
echo ======================================================
echo  Listo. Ahora:
echo    tools\windows\arrancar-nexoai.cmd   para levantar API, trabajador y web
echo    tools\windows\probar-nexoai.cmd     para verificar todo ^(tipos, compilacion, pruebas y trazabilidad^)
echo ======================================================
goto :fin

:fallo
echo.
echo Se detuvo. El error esta al final de _local\levantar.log

:fin
echo.
pause
