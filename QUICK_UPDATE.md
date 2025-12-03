# 🚀 Actualización Rápida - Comandos Directos

## 🔴 OPCIÓN MÁS FÁCIL: Script Automático

### Linux/Mac:
```bash
# 1. Sube el script al servidor
scp update.sh tu_usuario@tu_servidor:/ruta/a/tu/proyecto/

# 2. Conéctate al servidor
ssh tu_usuario@tu_servidor

# 3. Ve al directorio del proyecto
cd /ruta/a/tu/proyecto

# 4. Da permisos de ejecución
chmod +x update.sh

# 5. Ejecuta el script
bash update.sh
```

### Windows:
```cmd
REM 1. Sube update.bat a tu servidor
REM 2. Ejecuta desde el directorio del proyecto
update.bat
```

---

## 🟡 Si el Script No Funciona: Comandos Manuales

### 1️⃣ SOLO Backend (Más rápido)

Si **SOLO** quieres actualizar el backend a 120 FPS:

```bash
# Conecta a tu servidor
ssh tu_usuario@tu_servidor
cd /ruta/a/tu/proyecto

# Backup del archivo
cp backend/socket_handlers.py backend/socket_handlers.py.backup

# Sube el archivo nuevo (desde tu computadora local)
# scp socket_handlers.py tu_usuario@tu_servidor:/ruta/a/tu/proyecto/backend/

# Reinicia el backend
pm2 restart backend

# Verifica
pm2 logs backend --lines 20
```

**¡Listo! Con esto ya tienes 120 FPS en el servidor.**

---

### 2️⃣ Backend + Frontend (Actualización completa)

```bash
# Conecta al servidor
ssh tu_usuario@tu_servidor
cd /ruta/a/tu/proyecto

# Backup
cp -r . ../backup-$(date +%Y%m%d)

# Si usas Git
git pull origin main

# Si NO usas Git, sube estos archivos:
# - backend/socket_handlers.py
# - backend/game_engine.py
# - frontend/src/pages/Game.jsx

# Actualiza frontend
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
cd ..

# Reinicia servicios
pm2 restart all

# Verifica
pm2 status
pm2 logs backend --lines 20
```

---

## 🟢 Método Ultra-Rápido (Sin Git)

### Archivos que necesitas subir:

1. **backend/socket_handlers.py** (Cambio: línea 274, fps = 120)
2. **backend/game_engine.py** (Mejoras de animaciones)
3. **frontend/src/pages/Game.jsx** (Interpolación y rendering)

### Usando SCP:

```bash
# Desde tu computadora local (NO desde el servidor)

# Subir backend
scp backend/socket_handlers.py usuario@servidor:/ruta/proyecto/backend/
scp backend/game_engine.py usuario@servidor:/ruta/proyecto/backend/

# Subir frontend
scp frontend/src/pages/Game.jsx usuario@servidor:/ruta/proyecto/frontend/src/pages/
```

### Luego en el servidor:

```bash
ssh usuario@servidor
cd /ruta/proyecto

# Reconstruir frontend
cd frontend && npm run build && cd ..

# Reiniciar
pm2 restart all
```

---

## 📋 Checklist Mínima

```
✅ Archivos subidos al servidor
✅ Frontend reconstruido (npm run build)
✅ Servicios reiniciados (pm2 restart all)
✅ Sin errores en logs (pm2 logs)
✅ Sitio carga correctamente
```

---

## ⚡ Solo Backend (5 minutos)

Si solo quieres el aumento de FPS sin interpolación:

```bash
# 1. Edita el archivo directamente en el servidor
ssh usuario@servidor
nano /ruta/proyecto/backend/socket_handlers.py

# 2. Busca la línea 274 que dice:
#    fps = 60
# 3. Cámbiala por:
#    fps = 120
# 4. Guarda (Ctrl+O, Enter, Ctrl+X)

# 5. Reinicia
pm2 restart backend

# ¡Listo! Ya tienes 120 FPS
```

---

## 🆘 Si Algo Sale Mal

### Restaurar backup:
```bash
# Si hiciste backup
cd /ruta/a/tu/
rm -rf proyecto
mv backup-YYYYMMDD proyecto
cd proyecto
pm2 restart all
```

### Frontend no compila:
```bash
cd frontend
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install --legacy-peer-deps --force
npm run build
```

### Backend no inicia:
```bash
cd backend
pip install -r requirements.txt
pm2 restart backend
pm2 logs backend --err
```

---

## 💾 Descargar Archivos desde Emergent

1. Ve a tu proyecto en Emergent
2. Descarga estos archivos:
   - `/app/backend/socket_handlers.py`
   - `/app/backend/game_engine.py`
   - `/app/frontend/src/pages/Game.jsx`
3. Súbelos a tu servidor usando SCP o FileZilla

---

## 🎯 Resultado Esperado

Después de actualizar, deberías ver en los logs:

```
INFO:     Application startup complete.
Game loop running at 120 FPS...
Client rendering with interpolation enabled
```

Y en el navegador, movimientos ultra-fluidos sin "saltos".

---

## 📞 ¿Dudas?

Si tienes algún error específico, comparte:
- El mensaje de error completo
- Los logs: `pm2 logs backend --lines 50`
- Qué comando ejecutaste

¡Y te ayudo a resolverlo! 🚀
