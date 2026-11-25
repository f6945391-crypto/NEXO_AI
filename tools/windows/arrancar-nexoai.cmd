@echo off
chcp 65001 >nul
setlocal
rem Vive en tools\windows: la raiz del repositorio esta dos carpetas arriba
cd /d "%~dp0..\.."
if not exist "_local" mkdir "_local"
set "PNPM=npx pnpm@12.10.1"

echo ======================================================
echo  NexoAI - arrancar
echo  Se abren tres ventanas: API, trabajador y web.
echo  Los registros quedan en _local\api.log, _local\trabajador.log y _local\web.log
echo ======================================================

docker compose up -d >nul 2>&1

echo Arrancando la API en el puerto 3000...
start "NexoAI API" powershell -NoExit -Command "cd '%CD%'; node apps/api/dist/main.js 2>&1 | Tee-Object -FilePath _local/api.log"
timeout /t 2 >nul
echo Arrancando el trabajador...
start "NexoAI trabajador" powershell -NoExit -Command "cd '%CD%'; node apps/api/dist/trabajador.js 2>&1 | Tee-Object -FilePath _local/trabajador.log"
timeout /t 2 >nul
echo Arrancando la web en el puerto 3001...
start "NexoAI web" powershell -NoExit -Command "cd '%CD%'; npx pnpm@12.10.1 --filter @nexoai/web dev 2>&1 | Tee-Object -FilePath _local/web.log"

echo.
echo Abre http://localhost:3001 en el navegador.
echo Para parar todo, cierra las tres ventanas.
echo.
pause
