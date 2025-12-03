# HaxBall Game - API Contracts & Integration Plan

## 1. MOCK DATA TO REPLACE

### Frontend Mock Data (mockData.js)
- **mockRooms**: Será reemplazado por datos en tiempo real desde el servidor vía WebSocket
- **mockMessages**: Chat en tiempo real a través de Socket.IO
- **mockUser**: Autenticación simple almacenada en MongoDB

## 2. API CONTRACTS

### REST API Endpoints (FastAPI)

#### Authentication
```
POST /api/auth/register
Body: { username: string }
Response: { user_id: string, username: string, token: string }

POST /api/auth/login
Body: { username: string }
Response: { user_id: string, username: string, token: string }
```

#### Rooms (Initial fetch only, real-time updates via WebSocket)
```
GET /api/rooms
Response: { rooms: Room[] }

POST /api/rooms
Body: { name: string, maxPlayers: number, host: string }
Response: { room: Room }
```

### WebSocket Events (Socket.IO)

#### Client → Server
```
'join_lobby' - Unirse al lobby para recibir actualizaciones de salas
'create_room' - { name, maxPlayers, host }
'join_room' - { roomId, username }
'leave_room' - { roomId, username }
'change_team' - { roomId, team: 'red' | 'blue' }
'player_ready' - { roomId, ready: boolean }
'start_game' - { roomId }
'chat_message' - { roomId, message }
'player_input' - { roomId, keys, action }
```

#### Server → Client
```
'room_list_update' - { rooms: Room[] }
'room_updated' - { room: Room }
'player_joined' - { player, room }
'player_left' - { playerId, room }
'chat_message' - { player, message, timestamp }
'game_started' - { roomId }
'game_state' - { players, ball, score, time } (60 FPS)
'goal_scored' - { team, score }
'game_over' - { winner, finalScore }
```

## 3. DATA MODELS (MongoDB)

### User
```python
{
  _id: ObjectId,
  username: string (unique),
  created_at: datetime,
  stats: {
    wins: int,
    losses: int,
    goals: int,
    assists: int
  }
}
```

### Room
```python
{
  _id: ObjectId,
  room_id: string (unique),
  name: string,
  host: string,
  max_players: int,
  current_players: int,
  status: 'waiting' | 'playing' | 'finished',
  players: [
    {
      user_id: string,
      username: string,
      team: 'red' | 'blue' | 'spectator',
      ready: boolean
    }
  ],
  game_state: {
    score: { red: int, blue: int },
    time_remaining: int
  },
  created_at: datetime
}
```

### GameSession
```python
{
  _id: ObjectId,
  room_id: string,
  start_time: datetime,
  end_time: datetime,
  winner: 'red' | 'blue' | 'draw',
  final_score: { red: int, blue: int },
  player_stats: [
    {
      user_id: string,
      username: string,
      team: string,
      goals: int,
      assists: int
    }
  ]
}
```

## 4. BACKEND IMPLEMENTATION PLAN

### Phase 1: Basic Structure
- Setup python-socketio with FastAPI
- Create MongoDB models (User, Room, GameSession)
- Implement basic authentication (simple username-based)

### Phase 2: Room Management
- REST endpoints for rooms
- WebSocket room join/leave
- Real-time room updates
- Chat system

### Phase 3: Game Logic
- Physics engine on server (authoritative)
- Game state synchronization (60 FPS)
- Collision detection
- Goal detection
- Score tracking

### Phase 4: Frontend Integration
- Replace mock data with WebSocket connections
- Update components to use Socket.IO client
- Handle reconnection logic
- Display real-time updates

## 5. FRONTEND CHANGES NEEDED

### Files to modify:
1. **App.js** - Add Socket.IO provider/context
2. **Lobby.jsx** - Connect to WebSocket, listen for room updates
3. **Room.jsx** - Real-time player updates, chat integration
4. **Game.jsx** - Receive game state from server instead of local physics
5. **Login.jsx** - Call backend authentication API

### New files to create:
- **src/services/socket.js** - Socket.IO client configuration
- **src/contexts/AuthContext.jsx** - Authentication state management
- **src/contexts/SocketContext.jsx** - WebSocket connection management

## 6. TECHNOLOGY STACK

### Backend
- FastAPI (REST endpoints)
- python-socketio (WebSocket)
- Motor (async MongoDB driver)
- Simple JWT for authentication

### Frontend
- socket.io-client (WebSocket client)
- React Context (state management)
- Existing setup (React Router, Shadcn UI)

## 7. DEPLOYMENT CONSIDERATIONS

- WebSocket port configuration (8001)
- CORS settings for Socket.IO
- Frontend environment variable for WebSocket URL
- MongoDB connection pooling
- Game state cleanup for disconnected players
