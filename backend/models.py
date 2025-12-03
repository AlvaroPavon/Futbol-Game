from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid

# User Models
class UserStats(BaseModel):
    wins: int = 0
    losses: int = 0
    goals: int = 0
    assists: int = 0

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    stats: UserStats = Field(default_factory=UserStats)

class UserCreate(BaseModel):
    username: str

class UserResponse(BaseModel):
    id: str
    username: str
    token: str

# Room Models
class PlayerInRoom(BaseModel):
    user_id: str
    username: str
    team: Literal['red', 'blue', 'spectator'] = 'spectator'
    ready: bool = False

class GameState(BaseModel):
    score: dict = {'red': 0, 'blue': 0}
    time_remaining: int = 600  # 10 minutes

class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    name: str
    host: str
    max_players: int = 6
    current_players: int = 0
    status: Literal['waiting', 'playing', 'finished'] = 'waiting'
    players: List[PlayerInRoom] = []
    game_state: GameState = Field(default_factory=GameState)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RoomCreate(BaseModel):
    name: str
    max_players: int = 6
    host: str

class RoomResponse(BaseModel):
    id: str
    room_id: str
    name: str
    host: str
    max_players: int
    current_players: int
    status: str
    players: List[PlayerInRoom]

# Game Session Models
class PlayerStats(BaseModel):
    user_id: str
    username: str
    team: str
    goals: int = 0
    assists: int = 0

class GameSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    winner: Optional[Literal['red', 'blue', 'draw']] = None
    final_score: dict = {'red': 0, 'blue': 0}
    player_stats: List[PlayerStats] = []

# Game Physics Models
class Vector2D(BaseModel):
    x: float
    y: float

class Player(BaseModel):
    id: int
    x: float
    y: float
    vx: float = 0
    vy: float = 0
    team: str
    name: str

class Ball(BaseModel):
    x: float
    y: float
    vx: float = 0
    vy: float = 0

class GameStateUpdate(BaseModel):
    players: List[Player]
    ball: Ball
    score: dict
    time: int
