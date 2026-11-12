@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if not exist "_local" mkdir "_local"
set "LOG=%CD%\_local\pruebas.log"
set "PNPM=npx pnpm@12.10.1"
rem Prisma deja en segundo plano un proceso de telemetria que hereda el log y lo bloquea.
set "CHECKPOINT_DISABLE=1"

echo ======================================================
echo  NexoAI - pruebas
echo  El detalle completo queda en _local\pruebas.log
echo ======================================================
echo NexoAI pruebas - %DATE% %TIME% > "%LOG%"

docker compose up -d >> "%LOG%" 2>&1

echo.
echo [1/3] Navegadores de Playwright ^(solo la primera vez tarda^)
echo ===== 1 playwright install ===== >> "%LOG%"
call npx playwright install chromium >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       ERROR al instalar los navegadores. Mira el log.
) else (
  echo       ok
)

echo [2/3] Pruebas ^(vitest de api y contratos, Playwright de web y movil^)
echo ===== 2 pnpm test ===== >> "%LOG%"
call %PNPM% test >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       HAY FALLOS. Estan en _local\pruebas.log
) else (
  echo       todo pasa
)

echo [3/3] Trazabilidad
echo ===== 3 trazabilidad ===== >> "%LOG%"
python tools\trazabilidad.py --check >> "%LOG%" 2>&1
if errorlevel 1 (
  echo       FALLO. Mira el log.
) else (
  echo       ok
)

echo.
echo Terminado. Resultado completo en _local\pruebas.log
echo.
pause
