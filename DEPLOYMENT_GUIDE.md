# 📦 Guía de Actualización para tu Servidor VPS

## 🔄 Pasos para Actualizar tu Servidor

### Opción 1: Si usas Git (Recomendado)

#### 1. Conecta a tu servidor VPS
```bash
ssh tu_usuario@tu_servidor
cd /ruta/a/tu/proyecto
```

#### 2. Respalda la versión actual (por seguridad)
```bash
# Crea un backup del código actual
cp -r . ../haxball-backup-$(date +%Y%m%d)
```

#### 3. Descarga los últimos cambios
```bash
# Si ya tienes git configurado
git pull origin main
# O el branch que estés usando
```

#### 4. Instala dependencias del backend (si hay cambios)
```bash
cd backend
pip install -r requirements.txt
cd ..
```

#### 5. Actualiza el frontend
```bash
cd frontend

# Limpia instalación anterior
rm -rf node_modules package-lock.json

# Instala dependencias
npm install --legacy-peer-deps

# Compila el frontend
npm run build

cd ..
```

#### 6. Reinicia los servicios con PM2
```bash
# Reinicia el backend
pm2 restart backend

# Reinicia el frontend (si lo sirves con PM2)
pm2 restart frontend

# O si usas solo Nginx para servir archivos estáticos, solo reinicia el backend
```

#### 7. Verifica que todo esté funcionando
```bash
# Ver logs del backend
pm2 logs backend --lines 50

# Verificar estado de los procesos
pm2 status
```

---

### Opción 2: Si NO usas Git (Actualización Manual)

#### 1. Descarga los archivos desde Emergent

**A. Descargar archivos modificados:**

Ve a tu proyecto en Emergent y descarga estos archivos:

**Backend:**
- `/app/backend/socket_handlers.py`
- `/app/backend/game_engine.py`

**Frontend:**
- `/app/frontend/src/pages/Game.jsx`

#### 2. Conecta a tu servidor y haz backup
```bash
ssh tu_usuario@tu_servidor
cd /ruta/a/tu/proyecto

# Backup de archivos que vas a reemplazar
cp backend/socket_handlers.py backend/socket_handlers.py.backup
cp backend/game_engine.py backend/game_engine.py.backup
cp frontend/src/pages/Game.jsx frontend/src/pages/Game.jsx.backup
```

#### 3. Sube los archivos nuevos

**Usando SCP desde tu computadora local:**
```bash
# Desde tu computadora local (no el servidor)
scp socket_handlers.py tu_usuario@tu_servidor:/ruta/a/tu/proyecto/backend/
scp game_engine.py tu_usuario@tu_servidor:/ruta/a/tu/proyecto/backend/
scp Game.jsx tu_usuario@tu_servidor:/ruta/a/tu/proyecto/frontend/src/pages/
```

**O usando SFTP/FileZilla:**
- Conecta por SFTP
- Reemplaza los archivos uno por uno

#### 4. Reconstruye el frontend
```bash
# Conéctate al servidor
ssh tu_usuario@tu_servidor
cd /ruta/a/tu/proyecto/frontend

# Reconstruye
npm run build
```

#### 5. Reinicia los servicios
```bash
pm2 restart backend
# Si es necesario
pm2 restart frontend
```

---

## 🔍 Verificación Post-Actualización

### 1. Verifica que los servicios estén corriendo
```bash
pm2 status
```

**Deberías ver algo como:**
```
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ mode        │ ↺       │ status  │ cpu      │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ backend    │ fork        │ 0       │ online  │ 5%       │
│ 1   │ frontend   │ fork        │ 0       │ online  │ 0%       │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### 2. Revisa los logs del backend
```bash
pm2 logs backend --lines 50
```

**Busca estas líneas confirmando 120 FPS:**
```
INFO:     Application startup complete.
Game loop running at 120 FPS...
```

### 3. Prueba en el navegador
```bash
# Abre tu sitio
https://tu-dominio.com
```

**Verifica:**
- ✅ El juego carga correctamente
- ✅ Los movimientos son más fluidos
- ✅ No hay errores en la consola del navegador (F12)

---

## 🐛 Solución de Problemas

### Problema: "Module not found" o errores de importación

**Solución:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Problema: Backend no inicia

**Verifica logs:**
```bash
pm2 logs backend --err --lines 100
```

**Posible solución:**
```bash
cd backend
pip install -r requirements.txt
pm2 restart backend
```

### Problema: Frontend no compila

**Error común: "conflicting peer dependencies"**

**Solución:**
```bash
cd frontend
rm -rf node_modules package-lock.json .next
npm install --legacy-peer-deps --force
npm run build
```

### Problema: "Cannot connect to backend"

**Verifica Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

**Revisa la configuración de Nginx:**
```nginx
# Debe tener estas secciones:
location /api/ {
    proxy_pass http://localhost:8001/;
    ...
}

location /socket.io/ {
    proxy_pass http://localhost:8001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    ...
}
```

---

## 📊 Verificar que las Mejoras de 120 FPS están Activas

### En el navegador (F12 → Console):

```javascript
// Pega esto en la consola del navegador
let lastTime = performance.now();
let fps = 0;
let frames = 0;

function measureFPS() {
    const now = performance.now();
    frames++;
    if (now >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (now - lastTime));
        console.log(`🎮 FPS actual: ${fps}`);
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(measureFPS);
}

measureFPS();
```

**Deberías ver:**
- Monitor 60Hz: ~60 FPS
- Monitor 120Hz: ~120 FPS
- Monitor 144Hz: ~144 FPS

---

## 🚀 Comandos Rápidos de Referencia

```bash
# Ver estado de servicios
pm2 status

# Reiniciar todo
pm2 restart all

# Ver logs en tiempo real
pm2 logs

# Guardar configuración de PM2
pm2 save

# Configurar PM2 para auto-inicio en boot
pm2 startup
```

---

## 📝 Checklist de Actualización

- [ ] Backup realizado
- [ ] Código actualizado (git pull o manual)
- [ ] Frontend reconstruido (npm run build)
- [ ] Backend reiniciado (pm2 restart backend)
- [ ] Frontend reiniciado (si aplica)
- [ ] Logs revisados (sin errores)
- [ ] Sitio probado en navegador
- [ ] Mejoras de 120 FPS verificadas

---

## 💡 Recomendación

Si es tu primera vez actualizando, te recomiendo:

1. **Prueba primero en un entorno de desarrollo** o en una copia del sitio
2. **Haz el update durante horas de bajo tráfico**
3. **Ten el backup a mano** por si necesitas revertir
4. **Prueba todas las funcionalidades** antes de dar por terminado

---

## 📞 Si Necesitas Ayuda

Si encuentras algún error específico, compárteme:
1. El mensaje de error completo
2. Los logs de PM2 (`pm2 logs backend --lines 50`)
3. Qué comando ejecutaste cuando ocurrió el error

¡Y te ayudaré a resolverlo! 🚀
