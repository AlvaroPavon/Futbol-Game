import socketio
import asyncio
from typing import Dict
from models import Room, PlayerInRoom, GameState
from game_engine import GameEngine
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

class SocketManager:
    def __init__(self, sio: socketio.AsyncServer, db: AsyncIOMotorDatabase):
        self.sio = sio
        self.db = db
        self.rooms: Dict[str, Room] = {}  # In-memory room storage
        self.game_engines: Dict[str, GameEngine] = {}  # Game engines for active games
        self.game_tasks: Dict[str, asyncio.Task] = {}  # Game loop tasks
        self.setup_handlers()
        
    def setup_handlers(self):
        """Setup all socket event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            logger.info(f'Client connected: {sid}')
            
        @self.sio.event
        async def disconnect(sid):
            logger.info(f'Client disconnected: {sid}')
            # Handle player disconnect
            await self.handle_player_disconnect(sid)
            
        @self.sio.on('join_lobby')
        async def join_lobby(sid):
            """Client joins lobby to receive room updates"""
            await self.sio.enter_room(sid, 'lobby')
            # Send current room list
            room_list = [self.room_to_dict(room) for room in self.rooms.values()]
            await self.sio.emit('room_list_update', {'rooms': room_list}, room=sid)
            
        @self.sio.on('create_room')
        async def create_room(sid, data):
            """Create a new game room"""
            try:
                room_id = data['name'].replace(' ', '_') + '_' + sid[:6]
                
                room = Room(
                    room_id=room_id,
                    name=data['name'],
                    host=data['host'],
                    max_players=data.get('maxPlayers', 6),
                    current_players=1,
                    status='waiting',
                    players=[PlayerInRoom(
                        user_id=sid,
                        username=data['host'],
                        team='spectator',
                        ready=False
                    )]
                )
                
                self.rooms[room_id] = room
                
                # Store session data
                await self.sio.save_session(sid, {'username': data['host'], 'room_id': room_id})
                
                # Join room
                await self.sio.enter_room(sid, room_id)
                
                # Notify lobby
                await self.sio.emit('room_list_update', 
                                  {'rooms': [self.room_to_dict(r) for r in self.rooms.values()]}, 
                                  room='lobby')
                
                # Send room data to creator
                await self.sio.emit('room_created', {'room': self.room_to_dict(room)}, room=sid)
                
                logger.info(f'Room created: {room_id}')
            except Exception as e:
                logger.error(f'Error creating room: {e}')
                await self.sio.emit('error', {'message': str(e)}, room=sid)
                
        @self.sio.on('join_room')
        async def join_room(sid, data):
            """Join an existing room"""
            try:
                room_id = data['roomId']
                username = data['username']
                
                if room_id not in self.rooms:
                    await self.sio.emit('error', {'message': 'Room not found'}, room=sid)
                    return
                    
                room = self.rooms[room_id]
                
                if room.current_players >= room.max_players:
                    await self.sio.emit('error', {'message': 'Room is full'}, room=sid)
                    return
                    
                # Add player to room
                room.players.append(PlayerInRoom(
                    user_id=sid,
                    username=username,
                    team='spectator',
                    ready=False
                ))
                room.current_players += 1
                
                # Save session
                await self.sio.save_session(sid, {'username': username, 'room_id': room_id})
                
                # Join socket room
                await self.sio.enter_room(sid, room_id)
                
                # Notify room
                await self.sio.emit('player_joined', 
                                  {'player': {'username': username}, 'room': self.room_to_dict(room)}, 
                                  room=room_id)
                
                # Update lobby
                await self.sio.emit('room_list_update', 
                                  {'rooms': [self.room_to_dict(r) for r in self.rooms.values()]}, 
                                  room='lobby')
                
                logger.info(f'Player {username} joined room {room_id}')
            except Exception as e:
                logger.error(f'Error joining room: {e}')
                await self.sio.emit('error', {'message': str(e)}, room=sid)
                
        @self.sio.on('leave_room')
        async def leave_room(sid, data):
            """Leave current room"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                
                if room_id and room_id in self.rooms:
                    await self.remove_player_from_room(sid, room_id)
            except Exception as e:
                logger.error(f'Error leaving room: {e}')
                
        @self.sio.on('change_team')
        async def change_team(sid, data):
            """Change player team"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                team = data['team']
                
                if room_id and room_id in self.rooms:
                    room = self.rooms[room_id]
                    for player in room.players:
                        if player.user_id == sid:
                            player.team = team
                            break
                            
                    await self.sio.emit('room_updated', {'room': self.room_to_dict(room)}, room=room_id)
            except Exception as e:
                logger.error(f'Error changing team: {e}')
                
        @self.sio.on('player_ready')
        async def player_ready(sid, data):
            """Toggle player ready status"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                
                if room_id and room_id in self.rooms:
                    room = self.rooms[room_id]
                    for player in room.players:
                        if player.user_id == sid:
                            player.ready = data.get('ready', True)
                            break
                            
                    await self.sio.emit('room_updated', {'room': self.room_to_dict(room)}, room=room_id)
            except Exception as e:
                logger.error(f'Error updating ready status: {e}')
                
        @self.sio.on('start_game')
        async def start_game(sid, data):
            """Start the game"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                
                if room_id and room_id in self.rooms:
                    room = self.rooms[room_id]
                    
                    # Check if player is host
                    if room.host != session.get('username'):
                        await self.sio.emit('error', {'message': 'Only host can start game'}, room=sid)
                        return
                        
                    # Check if all players are ready
                    if not all(p.ready for p in room.players if p.team != 'spectator'):
                        await self.sio.emit('error', {'message': 'Not all players are ready'}, room=sid)
                        return
                        
                    # Start game
                    room.status = 'playing'
                    
                    # Create game engine
                    engine = GameEngine(room_id)
                    for player in room.players:
                        if player.team != 'spectator':
                            engine.add_player(player.user_id, player.username, player.team)
                            
                    self.game_engines[room_id] = engine
                    
                    # Start game loop
                    task = asyncio.create_task(self.game_loop(room_id))
                    self.game_tasks[room_id] = task
                    
                    await self.sio.emit('game_started', {'roomId': room_id}, room=room_id)
                    logger.info(f'Game started in room {room_id}')
            except Exception as e:
                logger.error(f'Error starting game: {e}')
                
        @self.sio.on('player_input')
        async def player_input(sid, data):
            """Handle player input during game"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                
                if room_id and room_id in self.game_engines:
                    engine = self.game_engines[room_id]
                    engine.update_player_input(
                        sid, 
                        data.get('keys', {}), 
                        data.get('kick', False),
                        data.get('push', False)
                    )
            except Exception as e:
                logger.error(f'Error handling player input: {e}')
                
        @self.sio.on('toggle_pause')
        async def toggle_pause(sid, data):
            """Toggle game pause"""
            try:
                session = await self.sio.get_session(sid)
                room_id = data.get('roomId')
                paused = data.get('paused', False)
                
                if room_id and room_id in self.game_engines:
                    engine = self.game_engines[room_id]
                    engine.paused = paused
                    await self.sio.emit('game_paused', {'paused': paused}, room=room_id)
                    logger.info(f'Game {"paused" if paused else "resumed"} in room {room_id}')
            except Exception as e:
                logger.error(f'Error toggling pause: {e}')
        
        @self.sio.on('chat_message')
        async def chat_message(sid, data):
            """Handle chat messages"""
            try:
                session = await self.sio.get_session(sid)
                room_id = session.get('room_id')
                username = session.get('username')
                
                if room_id:
                    message_data = {
                        'player': username,
                        'message': data['message'],
                        'timestamp': asyncio.get_event_loop().time()
                    }
                    await self.sio.emit('chat_message', message_data, room=room_id)
            except Exception as e:
                logger.error(f'Error sending chat message: {e}')
                
    async def game_loop(self, room_id: str):
        """Main game loop - runs at 60 FPS"""
        engine = self.game_engines[room_id]
        fps = 60
        frame_time = 1 / fps
        
        try:
            while room_id in self.game_engines:
                start_time = asyncio.get_event_loop().time()
                
                # Update physics
                goal_scored = engine.update_physics(frame_time)
                
                # Send game state to all players
                game_state = engine.get_game_state()
                await self.sio.emit('game_state', game_state, room=room_id)
                
                # Handle goal scored
                if goal_scored:
                    await self.sio.emit('goal_scored', 
                                      {'team': goal_scored, 'score': engine.score}, 
                                      room=room_id)
                    
                # Update time
                engine.time_remaining -= frame_time
                
                # Check if game is over
                if engine.time_remaining <= 0:
                    await self.end_game(room_id)
                    break
                    
                # Sleep to maintain FPS
                elapsed = asyncio.get_event_loop().time() - start_time
                sleep_time = max(0, frame_time - elapsed)
                await asyncio.sleep(sleep_time)
                
        except asyncio.CancelledError:
            logger.info(f'Game loop cancelled for room {room_id}')
        except Exception as e:
            logger.error(f'Error in game loop: {e}')
            
    async def end_game(self, room_id: str):
        """End the game and cleanup"""
        try:
            if room_id in self.game_engines:
                engine = self.game_engines[room_id]
                
                # Determine winner
                if engine.score['red'] > engine.score['blue']:
                    winner = 'red'
                elif engine.score['blue'] > engine.score['red']:
                    winner = 'blue'
                else:
                    winner = 'draw'
                    
                # Notify players
                await self.sio.emit('game_over', 
                                  {'winner': winner, 'finalScore': engine.score}, 
                                  room=room_id)
                
                # Cleanup
                del self.game_engines[room_id]
                if room_id in self.game_tasks:
                    self.game_tasks[room_id].cancel()
                    del self.game_tasks[room_id]
                    
                # Reset room status
                if room_id in self.rooms:
                    self.rooms[room_id].status = 'waiting'
                    for player in self.rooms[room_id].players:
                        player.ready = False
                        
                logger.info(f'Game ended in room {room_id}, winner: {winner}')
        except Exception as e:
            logger.error(f'Error ending game: {e}')
            
    async def handle_player_disconnect(self, sid: str):
        """Handle player disconnect"""
        try:
            session = await self.sio.get_session(sid)
            room_id = session.get('room_id') if session else None
            
            if room_id and room_id in self.rooms:
                await self.remove_player_from_room(sid, room_id)
        except Exception as e:
            logger.error(f'Error handling disconnect: {e}')
            
    async def remove_player_from_room(self, sid: str, room_id: str):
        """Remove player from room"""
        try:
            room = self.rooms[room_id]
            session = await self.sio.get_session(sid)
            username = session.get('username') if session else 'Unknown'
            
            # Remove player
            room.players = [p for p in room.players if p.user_id != sid]
            room.current_players -= 1
            
            # Remove from game engine if playing
            if room_id in self.game_engines:
                self.game_engines[room_id].remove_player(sid)
            
            # Leave socket room
            await self.sio.leave_room(sid, room_id)
            
            # If room is empty, delete it
            if room.current_players == 0:
                del self.rooms[room_id]
                if room_id in self.game_engines:
                    del self.game_engines[room_id]
                if room_id in self.game_tasks:
                    self.game_tasks[room_id].cancel()
                    del self.game_tasks[room_id]
            else:
                # Notify room
                await self.sio.emit('player_left', 
                                  {'playerId': sid, 'username': username, 'room': self.room_to_dict(room)}, 
                                  room=room_id)
                
            # Update lobby
            await self.sio.emit('room_list_update', 
                              {'rooms': [self.room_to_dict(r) for r in self.rooms.values()]}, 
                              room='lobby')
                              
            logger.info(f'Player {username} left room {room_id}')
        except Exception as e:
            logger.error(f'Error removing player from room: {e}')
            
    def room_to_dict(self, room: Room) -> dict:
        """Convert room to dict for JSON serialization"""
        return {
            'id': room.room_id,
            'name': room.name,
            'host': room.host,
            'players': [
                {
                    'user_id': p.user_id,
                    'username': p.username,
                    'team': p.team,
                    'ready': p.ready
                } for p in room.players
            ],
            'current_players': room.current_players,
            'maxPlayers': room.max_players,
            'status': room.status,
            'map': 'Classic'
        }
