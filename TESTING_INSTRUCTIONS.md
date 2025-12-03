# Instrucciones de Testing - Haxball Clone

## ✅ Características Implementadas

### 1. Animaciones de Kick y Push
**Archivos modificados:**
- `/app/backend/game_engine.py` - Sistema de animaciones en el backend
- `/app/frontend/src/pages/Game.jsx` - Renderizado de animaciones en el frontend

**Qué hace:**
- **Animación de Kick**: Círculo blanco expandiéndose cuando presionas ESPACIO o X
- **Animación de Push**: Efecto de ráfaga amarilla cuando presionas SHIFT o E

### 2. Fix: Retorno al Lobby después del Partido
**Estado:** Ya estaba implementado
**Cómo funciona:** Cuando el tiempo llega a 0, el backend emite `game_over` y el frontend redirige automáticamente al lobby después de 5 segundos

### 3. Fix: Funcionalidad de Pausa
**Estado:** Ya estaba implementado
**Cómo funciona:** El botón de pausa congela el juego (física y timer) mientras mantiene la visualización

### 4. Fix: Unirse a Partidas en Progreso
**Estado:** Ya estaba implementado
**Cómo funciona:** Los jugadores pueden unirse a salas incluso si el estado es 'playing'

---

## 🧪 Cómo Probar

### Probar Animaciones:

1. **Inicia sesión**:
   - Ve a tu sitio web
   - Haz clic en "¡Jugar Ahora!"
   - Ingresa un nombre de usuario

2. **Crea una sala**:
   - Haz clic en "Crear Sala"
   - Dale un nombre a tu sala
   - Únete a un equipo (rojo o azul)

3. **Inicia el juego**:
   - Haz clic en "Iniciar Juego"

4. **Prueba las animaciones**:
   - **Kick**: Presiona ESPACIO o X cerca del balón → Deberías ver un círculo blanco expandiéndose
   - **Push**: Presiona SHIFT o E → Deberías ver un efecto de ráfaga amarilla con múltiples círculos

### Probar Pausa:

1. Durante un juego, haz clic en el botón de pausa (⏸)
2. Verifica que:
   - El timer se detiene
   - Los jugadores no se mueven
   - El balón se detiene
   - Aparece "PAUSADO" en pantalla
3. Haz clic de nuevo para reanudar

### Probar Retorno al Lobby:

1. Inicia un juego y espera a que el timer llegue a 0:00
2. Deberías ver:
   - Un toast mostrando el resultado ("¡Juego Terminado!")
   - Después de 5 segundos, automáticamente regresas a la sala

### Probar Unirse a Partida en Progreso:

1. Usuario A crea una sala e inicia un partido
2. Usuario B intenta unirse a esa misma sala desde el lobby
3. Usuario B debería poder unirse exitosamente

---

## 🔧 Notas Técnicas

### Configuración de Nginx (para tu VPS):
Asegúrate de que tu configuración de Nginx incluya:

```nginx
location /api/ {
    proxy_pass http://localhost:8001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /socket.io/ {
    proxy_pass http://localhost:8001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Dependencias Corregidas:
El archivo `package.json` ya fue corregido en sesiones anteriores. Si encuentras errores de build:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

---

## 📝 Controles del Juego

- **WASD o Flechas**: Mover jugador
- **ESPACIO o X**: Patear el balón
- **SHIFT o E**: Empujar a otros jugadores

---

## 🐛 Si Encuentras Problemas

1. **El juego no carga**: Verifica que los servicios backend y frontend estén corriendo
2. **No veo animaciones**: Asegúrate de estar cerca del balón o de otros jugadores
3. **Problemas de conexión**: Revisa la configuración de Nginx y que el puerto 8001 esté accesible

---

## ✅ Estado del Código

Todo el código está implementado y funcionando correctamente en el entorno de desarrollo. Las animaciones se activan correctamente y todos los sistemas de juego están operativos.
