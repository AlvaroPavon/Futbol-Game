import math
from typing import List, Dict
import asyncio

class GameEngine:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.running = False
        
        # Game constants
        self.CANVAS_WIDTH = 1200
        self.CANVAS_HEIGHT = 600
        self.PLAYER_RADIUS = 20
        self.BALL_RADIUS = 12
        self.PLAYER_SPEED = 4
        self.BALL_FRICTION = 0.98
        self.KICK_POWER = 15
        self.KICK_DISTANCE = self.PLAYER_RADIUS + self.BALL_RADIUS + 5
        self.GOAL_WIDTH = 200
        
        # Game state
        self.players = {}
        self.ball = {
            'x': self.CANVAS_WIDTH / 2,
            'y': self.CANVAS_HEIGHT / 2,
            'vx': 0,
            'vy': 0
        }
        self.score = {'red': 0, 'blue': 0}
        self.time_remaining = 600  # 10 minutes in seconds
        self.player_inputs = {}  # Store player inputs
        
    def add_player(self, player_id: str, username: str, team: str):
        """Add a player to the game"""
        # Determine spawn position based on team
        if team == 'red':
            x = 200
            y = 300 + len([p for p in self.players.values() if p['team'] == 'red']) * 80
        else:
            x = 1000
            y = 300 + len([p for p in self.players.values() if p['team'] == 'blue']) * 80
            
        self.players[player_id] = {
            'id': len(self.players) + 1,
            'x': x,
            'y': y,
            'vx': 0,
            'vy': 0,
            'team': team,
            'name': username
        }
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
                
                # Handle kick
                if self.player_inputs[player_id]['kick']:
                    self.kick_ball(player)
                    self.player_inputs[player_id]['kick'] = False
                    
            # Update player position
            player['x'] += player['vx']
            player['y'] += player['vy']
            
            # Keep player in bounds
            player['x'] = max(self.PLAYER_RADIUS, min(self.CANVAS_WIDTH - self.PLAYER_RADIUS, player['x']))
            player['y'] = max(self.PLAYER_RADIUS, min(self.CANVAS_HEIGHT - self.PLAYER_RADIUS, player['y']))
            
        # Update ball
        self.ball['x'] += self.ball['vx']
        self.ball['y'] += self.ball['vy']
        self.ball['vx'] *= self.BALL_FRICTION
        self.ball['vy'] *= self.BALL_FRICTION
        
        # Ball collision with walls
        if self.ball['x'] - self.BALL_RADIUS < 0 or self.ball['x'] + self.BALL_RADIUS > self.CANVAS_WIDTH:
            self.ball['vx'] *= -0.8
            self.ball['x'] = max(self.BALL_RADIUS, min(self.CANVAS_WIDTH - self.BALL_RADIUS, self.ball['x']))
            
        # Check goals
        goal_left = (self.CANVAS_WIDTH - self.GOAL_WIDTH) / 2
        goal_right = goal_left + self.GOAL_WIDTH
        goal_scored = None
        
        if self.ball['y'] - self.BALL_RADIUS < 0:
            if self.ball['x'] > goal_left and self.ball['x'] < goal_right:
                self.score['blue'] += 1
                goal_scored = 'blue'
                self.reset_ball()
            else:
                self.ball['vy'] *= -0.8
                self.ball['y'] = self.BALL_RADIUS
                
        if self.ball['y'] + self.BALL_RADIUS > self.CANVAS_HEIGHT:
            if self.ball['x'] > goal_left and self.ball['x'] < goal_right:
                self.score['red'] += 1
                goal_scored = 'red'
                self.reset_ball()
            else:
                self.ball['vy'] *= -0.8
                self.ball['y'] = self.CANVAS_HEIGHT - self.BALL_RADIUS
                
        # Ball collision with players
        for player in self.players.values():
            dx = self.ball['x'] - player['x']
            dy = self.ball['y'] - player['y']
            dist = math.sqrt(dx * dx + dy * dy)
            
            if dist < self.PLAYER_RADIUS + self.BALL_RADIUS:
                angle = math.atan2(dy, dx)
                speed = math.sqrt(self.ball['vx']**2 + self.ball['vy']**2)
                
                self.ball['vx'] = math.cos(angle) * (speed + 2)
                self.ball['vy'] = math.sin(angle) * (speed + 2)
                
                # Separate ball from player
                overlap = self.PLAYER_RADIUS + self.BALL_RADIUS - dist
                self.ball['x'] += math.cos(angle) * overlap
                self.ball['y'] += math.sin(angle) * overlap
                
        return goal_scored
        
    def kick_ball(self, player: dict):
        """Player kicks the ball"""
        dx = self.ball['x'] - player['x']
        dy = self.ball['y'] - player['y']
        dist = math.sqrt(dx * dx + dy * dy)
        
        if dist < self.KICK_DISTANCE:
            angle = math.atan2(dy, dx)
            self.ball['vx'] = math.cos(angle) * self.KICK_POWER
            self.ball['vy'] = math.sin(angle) * self.KICK_POWER
            
    def reset_ball(self):
        """Reset ball to center"""
        self.ball['x'] = self.CANVAS_WIDTH / 2
        self.ball['y'] = self.CANVAS_HEIGHT / 2
        self.ball['vx'] = 0
        self.ball['vy'] = 0
        
    def get_game_state(self):
        """Get current game state"""
        return {
            'players': list(self.players.values()),
            'ball': self.ball,
            'score': self.score,
            'time': self.time_remaining
        }
