import math
from typing import List, Dict
import asyncio

class GameEngine:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.running = False
        
        # Game constants - horizontal field
        self.CANVAS_WIDTH = 1400  # Wider field
        self.CANVAS_HEIGHT = 600  # Height
        self.PLAYER_RADIUS = 20
        self.BALL_RADIUS = 12
        self.PLAYER_SPEED = 4
        self.BALL_FRICTION = 0.98
        self.KICK_POWER = 15
        self.PUSH_POWER = 8  # Power for pushing other players
        self.KICK_DISTANCE = self.PLAYER_RADIUS + self.BALL_RADIUS + 5
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
        
    def add_player(self, player_id: str, username: str, team: str):
        """Add a player to the game"""
        # Determine spawn position based on team - horizontal field
        # Red team on the left, Blue team on the right
        team_count = len([p for p in self.players.values() if p['team'] == team])
        
        if team == 'red':
            # Red team starts on the LEFT side
            x = 200
            y = 150 + team_count * 100  # Vertical spacing
        else:
            # Blue team starts on the RIGHT side
            x = self.CANVAS_WIDTH - 200
            y = 150 + team_count * 100
            
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
        self.player_inputs[player_id] = {'keys': {}, 'kick': False}
        
    def remove_player(self, player_id: str):
        """Remove a player from the game"""
        if player_id in self.players:
            del self.players[player_id]
        if player_id in self.player_inputs:
            del self.player_inputs[player_id]
            
    def update_player_input(self, player_id: str, keys: dict, kick: bool = False):
        """Update player input"""
        if player_id in self.player_inputs:
            self.player_inputs[player_id] = {'keys': keys, 'kick': kick}
            
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
                    
                player['vx'] = dx * self.PLAYER_SPEED
                player['vy'] = dy * self.PLAYER_SPEED
                
                # Handle kick (with kickoff restrictions)
                if self.player_inputs[player_id]['kick']:
                    # Check kickoff restrictions
                    can_kick = True
                    if self.kickoff_team and not self.ball_touched:
                        # Only the kickoff team can touch the ball first
                        if player['team'] != self.kickoff_team:
                            can_kick = False
                    
                    if can_kick:
                        kicked = self.kick_ball(player)
                        if kicked and not self.ball_touched:
                            self.ball_touched = True  # First touch made
                            if self.ball_touched:
                                self.kickoff_team = None  # Clear kickoff restrictions
                    
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
        
        # Ball collision with top and bottom walls
        if self.ball['y'] - self.BALL_RADIUS < 0:
            self.ball['vy'] *= -0.8
            self.ball['y'] = self.BALL_RADIUS
        elif self.ball['y'] + self.BALL_RADIUS > self.CANVAS_HEIGHT:
            self.ball['vy'] *= -0.8
            self.ball['y'] = self.CANVAS_HEIGHT - self.BALL_RADIUS
            
        # Check goals (left and right side for horizontal field)
        goal_top = (self.CANVAS_HEIGHT - self.GOAL_HEIGHT) / 2
        goal_bottom = goal_top + self.GOAL_HEIGHT
        goal_scored = None
        
        # LEFT goal (RED defends this side - BLUE scores here)
        if self.ball['x'] - self.BALL_RADIUS < 0:
            if self.ball['y'] > goal_top and self.ball['y'] < goal_bottom:
                self.score['blue'] += 1
                goal_scored = 'blue'
                # Blue scored, so RED gets kickoff
                self.reset_positions_for_kickoff('blue')
            else:
                self.ball['vx'] *= -0.8
                self.ball['x'] = self.BALL_RADIUS
                
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
                
        return goal_scored
        
    def kick_ball(self, player: dict):
        """Player kicks the ball with improved power"""
        dx = self.ball['x'] - player['x']
        dy = self.ball['y'] - player['y']
        dist = math.sqrt(dx * dx + dy * dy)
        
        if dist < self.KICK_DISTANCE:
            if dist > 0:
                # Normalize direction
                nx = dx / dist
                ny = dy / dist
                
                # Add player velocity to kick
                kick_power = self.KICK_POWER
                player_speed = math.sqrt(player['vx']**2 + player['vy']**2)
                
                # Bonus power if player is moving
                total_power = kick_power + player_speed * 0.5
                
                self.ball['vx'] = nx * total_power
                self.ball['vy'] = ny * total_power
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
        return {
            'players': list(self.players.values()),
            'ball': self.ball,
            'score': self.score,
            'time': self.time_remaining,
            'kickoff_team': self.kickoff_team,
            'ball_touched': self.ball_touched
        }
