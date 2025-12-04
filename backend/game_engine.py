import math
from typing import List, Dict
import asyncio
import random
import time

class PowerUp:
    """Power-up item that spawns on the field"""
    def __init__(self, x: float, y: float, powerup_type: str):
        self.x = x
        self.y = y
        self.type = powerup_type
        self.radius = 15
        self.spawn_time = time.time()
        
    def to_dict(self):
        return {
            'x': self.x,
            'y': self.y,
            'type': self.type,
            'radius': self.radius
        }

class GameEngine:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.running = False
        
        # Game constants - horizontal field
        self.CANVAS_WIDTH = 1400  # Wider field
        self.CANVAS_HEIGHT = 600  # Height
        self.PLAYER_RADIUS = 20
        self.BALL_RADIUS = 12
        self.PLAYER_SPEED = 2.5  # Reducido de 4 a 2.5 para mejor control
        self.BALL_FRICTION = 0.98
        self.KICK_POWER = 15
        self.PUSH_POWER = 20  # Aumentado a 20 para alejar más (antes 15)
        self.KICK_DISTANCE = self.PLAYER_RADIUS + self.BALL_RADIUS + 5
        self.PUSH_DISTANCE = 60  # Distancia para empujar jugadores
        self.GOAL_HEIGHT = 150  # Goal height (vertical)
        self.KICKOFF_RADIUS = 80  # Radius of center circle
        
        # Game state
        self.players = {}
        self.player_initial_positions = {}  # Store initial positions
        self.ball = {
            'x': self.CANVAS_WIDTH / 2,
            'y': self.CANVAS_HEIGHT / 2,
            'vx': 0,
            'vy': 0
        }
        self.score = {'red': 0, 'blue': 0}
        self.time_remaining = 600  # 10 minutes in seconds
        self.player_inputs = {}  # Store player inputs
        self.kickoff_team = 'red'  # Red team starts with kickoff
        self.ball_touched = False  # Has the ball been touched after kickoff
        self.game_started = False  # Track if game has started
        self.paused = False  # Game pause state
        self.player_animations = {}  # Track player animations
        
        # Power-ups system
        self.powerups = []  # Active power-ups on field
        self.player_powerups = {}  # Active power-ups per player {player_id: {'type': str, 'expires': float}}
        self.last_powerup_spawn = time.time()
        self.powerup_spawn_interval = 25  # Spawn power-up every 25 seconds (antes 15)
        self.powerup_duration = 10  # Power-up dura 10 segundos en el jugador
        self.powerup_field_duration = 20  # Power-up dura 20 segundos en el campo (antes 30)
        self.powerup_types = [
            'super_kick',    # Disparo más fuerte (2x)
            'mega_push',     # Empuje más fuerte (2x)
            'speed_boost',   # Velocidad aumentada (1.5x)
            'giant',         # Jugador más grande (más fácil empujar)
        ]
        
    def add_player(self, player_id: str, username: str, team: str):
        """Add a player to the game"""
        # Determine spawn position based on team - horizontal field
        # Red team on the left, Blue team on the right
        team_count = len([p for p in self.players.values() if p['team'] == team])
        
        # Centro vertical del campo
        center_y = self.CANVAS_HEIGHT / 2
        
        if team == 'red':
            # Red team starts on the LEFT side, centrado verticalmente
            x = 250
            # Distribuir jugadores verticalmente alrededor del centro
            # Si es el primer jugador, va al centro
            # Los siguientes se distribuyen arriba y abajo
            if team_count == 0:
                y = center_y
            elif team_count % 2 == 1:
                y = center_y - (team_count // 2 + 1) * 80
            else:
                y = center_y + (team_count // 2) * 80
        else:
            # Blue team starts on the RIGHT side, centrado verticalmente
            x = self.CANVAS_WIDTH - 250
            if team_count == 0:
                y = center_y
            elif team_count % 2 == 1:
                y = center_y - (team_count // 2 + 1) * 80
            else:
                y = center_y + (team_count // 2) * 80
            
        self.players[player_id] = {
            'id': len(self.players) + 1,
            'x': x,
            'y': y,
            'vx': 0,
            'vy': 0,
            'team': team,
            'name': username
        }
        
        # Store initial position for resets
        self.player_initial_positions[player_id] = {'x': x, 'y': y}
        self.player_inputs[player_id] = {'keys': {}, 'kick': False, 'push': False}
        
    def remove_player(self, player_id: str):
        """Remove a player from the game"""
        if player_id in self.players:
            del self.players[player_id]
        if player_id in self.player_inputs:
            del self.player_inputs[player_id]
            
    def update_player_input(self, player_id: str, keys: dict, kick: bool = False, push: bool = False):
        """Update player input"""
        if player_id in self.player_inputs:
            self.player_inputs[player_id] = {'keys': keys, 'kick': kick, 'push': push}
            
    def update_physics(self, delta_time: float = 1/60):
        """Update game physics"""
        # Update player positions based on inputs
        for player_id, player in self.players.items():
            if player_id in self.player_inputs:
                keys = self.player_inputs[player_id]['keys']
                dx, dy = 0, 0
                
                if keys.get('w') or keys.get('ArrowUp'):
                    dy -= 1
                if keys.get('s') or keys.get('ArrowDown'):
                    dy += 1
                if keys.get('a') or keys.get('ArrowLeft'):
                    dx -= 1
                if keys.get('d') or keys.get('ArrowRight'):
                    dx += 1
                    
                # Normalize diagonal movement
                if dx != 0 and dy != 0:
                    dx *= 0.707
                    dy *= 0.707
                
                # Apply speed with power-up bonus
                speed = self.PLAYER_SPEED
                if player_id in self.player_powerups:
                    if self.player_powerups[player_id]['type'] == 'speed_boost':
                        speed *= 1.5  # 50% más rápido
                    
                player['vx'] = dx * speed
                player['vy'] = dy * speed
                
                # Handle push - intent system: always consume, but only works if close
                if self.player_inputs[player_id]['push']:
                    self.push_players(player_id, player)
                    self.player_inputs[player_id]['push'] = False
                
                # Handle kick - intent system: always consume, but only works if close
                if self.player_inputs[player_id]['kick']:
                    # Check kickoff restrictions
                    can_kick = True
                    if self.kickoff_team and not self.ball_touched:
                        # Only the kickoff team can touch the ball first
                        if player['team'] != self.kickoff_team:
                            can_kick = False
                    
                    if can_kick:
                        kicked = self.kick_ball(player, player_id)
                        if kicked and not self.ball_touched:
                            self.ball_touched = True  # First touch made
                            if self.ball_touched:
                                self.kickoff_team = None  # Clear kickoff restrictions
                    
                    # Always consume the kick input (intent system)
                    self.player_inputs[player_id]['kick'] = False
                    
            # Update player position
            new_x = player['x'] + player['vx']
            new_y = player['y'] + player['vy']
            
            # Check kickoff restrictions - opposing team cannot enter center circle
            if self.kickoff_team and not self.ball_touched:
                if player['team'] != self.kickoff_team:
                    # Calculate distance from center
                    center_x = self.CANVAS_WIDTH / 2
                    center_y = self.CANVAS_HEIGHT / 2
                    dist_to_center = math.sqrt((new_x - center_x)**2 + (new_y - center_y)**2)
                    
                    # Don't allow entry into kickoff circle
                    if dist_to_center < self.KICKOFF_RADIUS + self.PLAYER_RADIUS:
                        # Push player back outside the circle
                        angle = math.atan2(new_y - center_y, new_x - center_x)
                        new_x = center_x + math.cos(angle) * (self.KICKOFF_RADIUS + self.PLAYER_RADIUS)
                        new_y = center_y + math.sin(angle) * (self.KICKOFF_RADIUS + self.PLAYER_RADIUS)
                        player['vx'] = 0
                        player['vy'] = 0
            
            # Check collision with other players
            can_move = True
            for other_id, other in self.players.items():
                if other_id != player_id:
                    dx = new_x - other['x']
                    dy = new_y - other['y']
                    dist = math.sqrt(dx * dx + dy * dy)
                    
                    if dist < self.PLAYER_RADIUS * 2:
                        # Collision detected - push both players apart
                        can_move = False
                        overlap = self.PLAYER_RADIUS * 2 - dist
                        if dist > 0:
                            # Push away
                            push_x = (dx / dist) * overlap * 0.5
                            push_y = (dy / dist) * overlap * 0.5
                            
                            player['x'] += push_x
                            player['y'] += push_y
                            other['x'] -= push_x
                            other['y'] -= push_y
                            
                            # Apply friction
                            player['vx'] *= 0.8
                            player['vy'] *= 0.8
            
            if can_move:
                player['x'] = new_x
                player['y'] = new_y
            
            # Apply friction
            player['vx'] *= 0.92
            player['vy'] *= 0.92
            
            # Keep player in bounds
            player['x'] = max(self.PLAYER_RADIUS, min(self.CANVAS_WIDTH - self.PLAYER_RADIUS, player['x']))
            player['y'] = max(self.PLAYER_RADIUS, min(self.CANVAS_HEIGHT - self.PLAYER_RADIUS, player['y']))
            
        # Update ball with improved physics
        self.ball['x'] += self.ball['vx']
        self.ball['y'] += self.ball['vy']
        self.ball['vx'] *= self.BALL_FRICTION
        self.ball['vy'] *= self.BALL_FRICTION
        
        # Define goal boundaries
        goal_top = (self.CANVAS_HEIGHT - self.GOAL_HEIGHT) / 2
        goal_bottom = goal_top + self.GOAL_HEIGHT
        goal_depth = 30  # Same as GOAL_DEPTH in frontend
        
        # Ball collision with top and bottom walls
        # BUT: handle goal post collisions separately
        if self.ball['y'] - self.BALL_RADIUS < 0:
            self.ball['vy'] *= -0.8
            self.ball['y'] = self.BALL_RADIUS
        elif self.ball['y'] + self.BALL_RADIUS > self.CANVAS_HEIGHT:
            self.ball['vy'] *= -0.8
            self.ball['y'] = self.CANVAS_HEIGHT - self.BALL_RADIUS
            
        # Check goals (left and right side for horizontal field)
        goal_scored = None
        
        # LEFT goal (RED defends this side - BLUE scores here)
        if self.ball['x'] - self.BALL_RADIUS < 0:
            # Check if ball is within goal vertical bounds
            if self.ball['y'] > goal_top and self.ball['y'] < goal_bottom:
                self.score['blue'] += 1
                goal_scored = 'blue'
                # Blue scored, so RED gets kickoff
                self.reset_positions_for_kickoff('blue')
            else:
                # Ball hit the wall outside the goal - bounce back
                self.ball['vx'] *= -0.8
                self.ball['x'] = self.BALL_RADIUS
        
        # LEFT goal - TOP POST collision (solid boundary)
        if self.ball['x'] <= goal_depth and self.ball['x'] >= 0:
            # Ball is in the goal area depth
            if self.ball['y'] - self.BALL_RADIUS < goal_top and self.ball['y'] + self.BALL_RADIUS > goal_top - 10:
                # Ball hit top post
                self.ball['vy'] *= -0.8
                self.ball['y'] = goal_top - self.BALL_RADIUS
        
        # LEFT goal - BOTTOM POST collision (solid boundary)
        if self.ball['x'] <= goal_depth and self.ball['x'] >= 0:
            if self.ball['y'] + self.BALL_RADIUS > goal_bottom and self.ball['y'] - self.BALL_RADIUS < goal_bottom + 10:
                # Ball hit bottom post
                self.ball['vy'] *= -0.8
                self.ball['y'] = goal_bottom + self.BALL_RADIUS
                
        # RIGHT goal (BLUE defends this side - RED scores here)
        if self.ball['x'] + self.BALL_RADIUS > self.CANVAS_WIDTH:
            if self.ball['y'] > goal_top and self.ball['y'] < goal_bottom:
                self.score['red'] += 1
                goal_scored = 'red'
                # Red scored, so BLUE gets kickoff
                self.reset_positions_for_kickoff('red')
            else:
                self.ball['vx'] *= -0.8
                self.ball['x'] = self.CANVAS_WIDTH - self.BALL_RADIUS
        
        # RIGHT goal - TOP POST collision (solid boundary)
        if self.ball['x'] >= self.CANVAS_WIDTH - goal_depth and self.ball['x'] <= self.CANVAS_WIDTH:
            if self.ball['y'] - self.BALL_RADIUS < goal_top and self.ball['y'] + self.BALL_RADIUS > goal_top - 10:
                # Ball hit top post
                self.ball['vy'] *= -0.8
                self.ball['y'] = goal_top - self.BALL_RADIUS
        
        # RIGHT goal - BOTTOM POST collision (solid boundary)
        if self.ball['x'] >= self.CANVAS_WIDTH - goal_depth and self.ball['x'] <= self.CANVAS_WIDTH:
            if self.ball['y'] + self.BALL_RADIUS > goal_bottom and self.ball['y'] - self.BALL_RADIUS < goal_bottom + 10:
                # Ball hit bottom post
                self.ball['vy'] *= -0.8
                self.ball['y'] = goal_bottom + self.BALL_RADIUS
                
        # Ball collision with players - improved physics
        for player in self.players.values():
            dx = self.ball['x'] - player['x']
            dy = self.ball['y'] - player['y']
            dist = math.sqrt(dx * dx + dy * dy)
            
            if dist < self.PLAYER_RADIUS + self.BALL_RADIUS:
                # Collision response with momentum transfer
                if dist > 0:
                    # Normalize
                    nx = dx / dist
                    ny = dy / dist
                    
                    # Relative velocity
                    dvx = self.ball['vx'] - player['vx']
                    dvy = self.ball['vy'] - player['vy']
                    
                    # Velocity along normal
                    dvn = dvx * nx + dvy * ny
                    
                    # Don't process if moving apart
                    if dvn < 0:
                        # Bounce coefficient
                        bounce = 1.5
                        
                        # Apply impulse
                        self.ball['vx'] += -dvn * nx * bounce + player['vx'] * 0.5
                        self.ball['vy'] += -dvn * ny * bounce + player['vy'] * 0.5
                        
                        # Separate ball from player
                        overlap = self.PLAYER_RADIUS + self.BALL_RADIUS - dist
                        self.ball['x'] += nx * overlap
                        self.ball['y'] += ny * overlap
        
        # Update power-ups system
        self.update_powerups()
        
        # Check power-up collection
        for player_id, player in self.players.items():
            for powerup in self.powerups[:]:  # Copy list to allow removal
                dx = player['x'] - powerup.x
                dy = player['y'] - powerup.y
                dist = math.sqrt(dx * dx + dy * dy)
                
                if dist < self.PLAYER_RADIUS + powerup.radius:
                    # Player collected the power-up
                    self.collect_powerup(player_id, powerup)
                    self.powerups.remove(powerup)
                    break
                
        return goal_scored
        
    def push_players(self, pusher_id: str, pusher: dict):
        """Push nearby players away"""
        push_radius = self.PUSH_DISTANCE  # Use defined push distance
        
        # Set push animation
        self.player_animations[pusher_id] = {'type': 'push', 'frame': 0}
        
        # Calculate push power with power-up bonus
        push_power = self.PUSH_POWER
        if pusher_id in self.player_powerups:
            if self.player_powerups[pusher_id]['type'] == 'mega_push':
                push_power *= 2  # Doble de fuerza!
        
        pushed_someone = False
        for other_id, other in self.players.items():
            if other_id != pusher_id:
                dx = other['x'] - pusher['x']
                dy = other['y'] - pusher['y']
                dist = math.sqrt(dx * dx + dy * dy)
                
                if dist < push_radius and dist > 0:
                    pushed_someone = True
                    # Calculate push direction
                    nx = dx / dist
                    ny = dy / dist
                    
                    # Apply push force (stronger if closer)
                    push_strength = push_power * (1 - dist / push_radius)
                    
                    # Add push velocity to other player
                    other['vx'] += nx * push_strength
                    other['vy'] += ny * push_strength
                    
                    # Pusher gets slight recoil
                    pusher['vx'] -= nx * push_strength * 0.2
                    pusher['vy'] -= ny * push_strength * 0.2
        
        return pushed_someone
    
    def kick_ball(self, player: dict, player_id: str):
        """Player kicks the ball - works while moving or stationary"""
        dx = self.ball['x'] - player['x']
        dy = self.ball['y'] - player['y']
        dist = math.sqrt(dx * dx + dy * dy)
        
        # Only kick if close enough (intent system - button press accepted always, but only works if close)
        if dist < self.KICK_DISTANCE:
            if dist > 0:
                # Set kick animation
                self.player_animations[player_id] = {'type': 'kick', 'frame': 0}
                
                # Normalize direction
                nx = dx / dist
                ny = dy / dist
                
                # Calculate kick power with player velocity bonus
                kick_power = self.KICK_POWER
                
                # Apply power-up bonus
                if player_id in self.player_powerups:
                    if self.player_powerups[player_id]['type'] == 'super_kick':
                        kick_power *= 2.0  # Doble de potencia!
                
                player_speed = math.sqrt(player['vx']**2 + player['vy']**2)
                
                # Add player velocity to kick direction for more realistic physics
                # This makes shooting while running more powerful
                total_power = kick_power + player_speed * 0.8
                
                # Apply kick velocity
                self.ball['vx'] = nx * total_power + player['vx'] * 0.3
                self.ball['vy'] = ny * total_power + player['vy'] * 0.3
                return True
        return False
            
    def reset_ball(self):
        """Reset ball to center"""
        self.ball['x'] = self.CANVAS_WIDTH / 2
        self.ball['y'] = self.CANVAS_HEIGHT / 2
        self.ball['vx'] = 0
        self.ball['vy'] = 0
        
    def reset_positions_for_kickoff(self, scoring_team: str):
        """Reset all players to initial positions for kickoff"""
        # Reset all players to their starting positions
        for player_id, player in self.players.items():
            if player_id in self.player_initial_positions:
                initial_pos = self.player_initial_positions[player_id]
                player['x'] = initial_pos['x']
                player['y'] = initial_pos['y']
                player['vx'] = 0
                player['vy'] = 0
        
        # Reset ball to center
        self.reset_ball()
        
        # Set kickoff team (opposite of who scored)
        self.kickoff_team = 'blue' if scoring_team == 'red' else 'red'
        self.ball_touched = False
        
    def get_game_state(self):
        """Get current game state"""
        # Update animations
        for player_id in list(self.player_animations.keys()):
            anim = self.player_animations[player_id]
            anim['frame'] += 1
            # Remove animation after 10 frames (about 0.16 seconds at 60fps)
            if anim['frame'] > 10:
                del self.player_animations[player_id]
        
        # Prepare animations with player names for frontend
        animations_with_names = {}
        for player_id, anim in self.player_animations.items():
            if player_id in self.players:
                player_name = self.players[player_id]['name']
                animations_with_names[player_name] = anim
        
        # Prepare player powerups for frontend
        player_powerups_for_frontend = {}
        for player_id, powerup_data in self.player_powerups.items():
            if player_id in self.players:
                player_name = self.players[player_id]['name']
                player_powerups_for_frontend[player_name] = powerup_data['type']
        
        return {
            'players': list(self.players.values()),
            'ball': self.ball,
            'score': self.score,
            'time': self.time_remaining,
            'kickoff_team': self.kickoff_team,
            'ball_touched': self.ball_touched,
            'animations': animations_with_names,
            'powerups': [p.to_dict() for p in self.powerups],
            'player_powerups': player_powerups_for_frontend
        }
    
    def update_powerups(self):
        """Update power-ups: spawn new ones and expire old ones"""
        current_time = time.time()
        
        # Spawn new power-up if it's time
        if current_time - self.last_powerup_spawn > self.powerup_spawn_interval:
            self.spawn_powerup()
            self.last_powerup_spawn = current_time
        
        # Remove old power-ups (after 30 seconds)
        self.powerups = [p for p in self.powerups if current_time - p.spawn_time < 30]
        
        # Expire player power-ups
        for player_id in list(self.player_powerups.keys()):
            if current_time > self.player_powerups[player_id]['expires']:
                del self.player_powerups[player_id]
    
    def spawn_powerup(self):
        """Spawn a random power-up at a random location"""
        # Random position avoiding goal areas
        margin = 100
        x = random.randint(margin, self.CANVAS_WIDTH - margin)
        y = random.randint(margin, self.CANVAS_HEIGHT - margin)
        
        # Random type
        powerup_type = random.choice(self.powerup_types)
        
        powerup = PowerUp(x, y, powerup_type)
        self.powerups.append(powerup)
    
    def collect_powerup(self, player_id: str, powerup: PowerUp):
        """Player collects a power-up"""
        # Give power-up to player for 10 seconds
        self.player_powerups[player_id] = {
            'type': powerup.type,
            'expires': time.time() + 10  # 10 seconds duration
        }
