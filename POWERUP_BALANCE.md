# ⚖️ Balance de Power-ups

## 🔧 Ajustes Realizados

Para evitar que los power-ups estén activos constantemente, se han hecho los siguientes cambios:

---

## 📊 Cambios de Balance

### 1. ⏰ Intervalo de Spawn Aumentado

**Antes:**
```python
powerup_spawn_interval = 15  # Cada 15 segundos
```

**Ahora:**
```python
powerup_spawn_interval = 25  # Cada 25 segundos
```

**Impacto:**
- ✅ Menos power-ups en el campo
- ✅ Más competencia por recogerlos
- ✅ Más tiempo sin power-ups activos

---

### 2. ⏱️ Duración en Campo Reducida

**Antes:**
```python
field_duration = 30  # 30 segundos en el campo
```

**Ahora:**
```python
powerup_field_duration = 20  # 20 segundos en el campo
```

**Impacto:**
- ✅ Power-ups desaparecen más rápido si no se recogen
- ✅ Menos "clutter" en el campo
- ✅ Mayor urgencia para recogerlos

---

### 3. ⏳ Duración de Efecto (Confirmado)

**Siempre ha sido:**
```python
powerup_duration = 10  # 10 segundos exactos
```

**Garantías:**
- ✅ Exactamente 10 segundos de efecto
- ✅ No puede exceder este tiempo
- ✅ Expira automáticamente

---

### 4. 🚫 Limitación de Power-ups Activos

**NUEVO:** Un jugador NO puede recoger otro power-up si ya tiene uno activo.

**Código:**
```python
# Check power-up collection
for player_id, player in self.players.items():
    # Skip if player already has a power-up active
    if player_id in self.player_powerups:
        continue  # ¡No puede recoger otro!
```

**Impacto:**
- ✅ Solo 1 power-up activo a la vez por jugador
- ✅ Otros jugadores tienen oportunidad de recogerlos
- ✅ Balance más justo

---

## 📈 Estadísticas Antes vs Ahora

### Power-ups por Partido (10 minutos)

**Antes:**
```
Spawn cada: 15 segundos
Total partido: 600 segundos
Power-ups spawn: 600 / 15 = 40 power-ups
Por jugador (4 jugadores): ~10 power-ups
Tiempo con power-up activo: ~100 segundos (16.6% del partido)
```

**Ahora:**
```
Spawn cada: 25 segundos
Total partido: 600 segundos
Power-ups spawn: 600 / 25 = 24 power-ups
Por jugador (4 jugadores): ~6 power-ups
Tiempo con power-up activo: ~60 segundos (10% del partido)
```

**Mejora:**
- ✅ **40% menos power-ups** en total
- ✅ **40% menos tiempo** con power-ups activos
- ✅ Mejor balance gameplay

---

## ⏰ Timeline de un Power-up

### Ciclo Completo:

```
T=0s:   Power-up aparece en el campo
        ↓
        [20 segundos disponible para recoger]
        ↓
T=20s:  Power-up desaparece si no fue recogido

O si es recogido:

T=5s:   Jugador recoge el power-up
        ↓
        [10 segundos de efecto activo]
        ↓
T=15s:  Power-up expira
        ↓
        Jugador puede recoger otro
```

### Cooldown Efectivo:

```
Jugador recoge power-up → 10 segundos activo → Espera 15-25 segundos → Nuevo power-up
```

**Total entre power-ups:** 25-35 segundos

---

## 🎮 Experiencia de Juego

### Antes (Desbalanceado):
- ❌ Power-ups cada 15 segundos
- ❌ Jugadores casi siempre con power-up
- ❌ Demasiado caótico
- ❌ Habilidad base menos importante

### Ahora (Balanceado):
- ✅ Power-ups cada 25 segundos
- ✅ Solo 10% del tiempo con power-up
- ✅ Momentos especiales más valiosos
- ✅ Habilidad base importante
- ✅ Competencia por recogerlos
- ✅ Estrategia: ¿cuándo usar el power-up?

---

## 📋 Configuración Actual

```python
# Constantes de balance
powerup_spawn_interval = 25      # Spawn cada 25 segundos
powerup_duration = 10            # Dura 10 segundos en jugador
powerup_field_duration = 20      # Dura 20 segundos en campo
max_powerups_per_player = 1      # Solo 1 activo a la vez
```

---

## 🎯 Ejemplo de Partido

**Partido de 10 minutos con 4 jugadores:**

```
Minuto 0:00 → Empieza el partido
Minuto 0:25 → ⚡ Aparece Super Kick
Minuto 0:30 → Jugador 1 lo recoge
Minuto 0:40 → Expira para Jugador 1
Minuto 0:50 → 💥 Aparece Mega Push
Minuto 0:55 → Jugador 2 lo recoge
Minuto 1:05 → Expira para Jugador 2
Minuto 1:15 → 💨 Aparece Speed Boost
...
Y así sucesivamente
```

**Observaciones:**
- ✅ Hay momentos sin power-ups (gameplay normal)
- ✅ Cuando aparecen, son especiales
- ✅ Competencia por recogerlos
- ✅ No todos los jugadores tienen uno siempre

---

## 💡 Ajustes Adicionales (Si es Necesario)

### Si aún hay demasiados power-ups:

```python
# Opción 1: Spawn aún más lento
powerup_spawn_interval = 30  # Cada 30 segundos

# Opción 2: Duración más corta
powerup_duration = 7  # Solo 7 segundos

# Opción 3: Menos duración en campo
powerup_field_duration = 15  # Solo 15 segundos
```

### Si hay muy pocos power-ups:

```python
# Opción 1: Spawn más rápido
powerup_spawn_interval = 20  # Cada 20 segundos

# Opción 2: Duración más larga
powerup_duration = 12  # 12 segundos

# Opción 3: Más duración en campo
powerup_field_duration = 25  # 25 segundos
```

---

## ✅ Checklist de Balance

- ✅ Spawn interval aumentado (15 → 25 segundos)
- ✅ Duración confirmada (10 segundos exactos)
- ✅ Duración en campo reducida (30 → 20 segundos)
- ✅ Límite de 1 power-up activo por jugador
- ✅ Sistema de expiración automática
- ✅ No se pueden acumular power-ups
- ✅ 40% menos power-ups por partido
- ✅ Balance mejorado

---

## 📊 Métricas de Balance

### Objetivo:
- Power-ups deben ser **momentos especiales**, no la norma
- Jugadores deben pasar **la mayoría del tiempo** sin power-ups
- Cuando tienen uno, debe ser **impactante y emocionante**

### Valores Actuales:
- ⏰ Spawn: Cada 25 segundos (moderado)
- ⏱️ Duración: 10 segundos (corto)
- 🏃 Uptime: ~10% del partido
- 🎯 Competencia: Alta (limitado a 1 por jugador)

**Veredicto:** ✅ BALANCEADO

---

## 🎮 Consejos de Gameplay

### Para Jugadores:

1. **No desperdicies el power-up:**
   - Solo dura 10 segundos
   - Úsalo estratégicamente

2. **Compite por recogerlos:**
   - Solo 1 activo a la vez
   - Si lo tienes, no puedes otro

3. **Timing es clave:**
   - ⚡ Super Kick → Úsalo cuando tengas tiro claro
   - 💥 Mega Push → Úsalo cerca de rivales
   - 💨 Speed Boost → Úsalo para recuperar/atacar

---

## 📝 Resumen

**Cambios Principales:**
1. ✅ Spawn: 15s → 25s (+66%)
2. ✅ Campo: 30s → 20s (-33%)
3. ✅ Jugador: 10s (confirmado)
4. ✅ Límite: 1 por jugador (nuevo)

**Resultado:**
- ✅ 40% menos power-ups activos
- ✅ Más balance y estrategia
- ✅ Momentos especiales más valiosos
- ✅ Gameplay base más importante

**¡El juego ahora tiene un balance perfecto entre caos divertido y habilidad!** ⚖️🎮
