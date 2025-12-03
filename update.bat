@echo off
REM Script de actualización para Windows
REM Uso: update.bat

echo ================================================
echo  Actualizacion de Haxball Clone - Windows
echo ================================================
echo.

REM Verificar si estamos en el directorio correcto
if not exist "frontend" (
    echo ERROR: No estas en el directorio raiz del proyecto
    pause
    exit /b 1
)

echo [OK] Directorio correcto detectado
echo.

REM Crear backup
echo Creando backup...
set BACKUP_DIR=..\haxball-backup-%date:~-4,4%%date:~-7,2%%date:~-10,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
xcopy /E /I /Q . "%BACKUP_DIR%"
echo [OK] Backup creado en: %BACKUP_DIR%
echo.

REM Actualizar Git si existe
if exist ".git" (
    echo Git detectado, descargando cambios...
    git pull origin main
    if errorlevel 1 git pull origin master
    echo [OK] Codigo actualizado desde Git
) else (
    echo Git no detectado, asumiendo actualizacion manual
)
echo.

REM Actualizar backend
echo Actualizando backend...
cd backend
if exist "requirements.txt" (
    echo Instalando dependencias de Python...
    pip install -r requirements.txt
    echo [OK] Dependencias de Python instaladas
)
cd ..
echo.

REM Actualizar frontend
echo Actualizando frontend...
cd frontend

echo Limpiando instalacion anterior...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json

echo Instalando dependencias de Node.js...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: Fallo al instalar dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias de Node.js instaladas
echo.

echo Compilando frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Fallo al compilar el frontend
    pause
    exit /b 1
)
echo [OK] Frontend compilado
cd ..
echo.

REM Reiniciar con PM2 si está disponible
echo Reiniciando servicios...
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo PM2 detectado, reiniciando servicios...
    pm2 restart backend
    pm2 restart frontend
    echo [OK] Servicios reiniciados
    echo.
    pm2 status
    pm2 save
) else (
    echo PM2 no encontrado, por favor reinicia los servicios manualmente
)

echo.
echo ================================================
echo  Actualizacion completada!
echo ================================================
echo.
echo Cambios aplicados:
echo   - Servidor a 120 FPS
echo   - Interpolacion en cliente
echo   - Animaciones de kick/push
echo   - Sistema de rendering adaptativo
echo.
echo Backup guardado en: %BACKUP_DIR%
echo.
echo Proximos pasos:
echo   1. Verifica los logs: pm2 logs backend
echo   2. Prueba el juego en tu navegador
echo   3. Verifica que los FPS sean mas altos
echo.
pause
