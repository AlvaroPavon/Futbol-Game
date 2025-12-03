from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from typing import List
from models import User, UserCreate, UserResponse, Room, RoomCreate, RoomResponse
from socket_handlers import SocketManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create Socket Manager
socket_manager = SocketManager(sio, db)

# Create FastAPI app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Authentication endpoints
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if username exists
        existing_user = await db.users.find_one({"username": user_data.username})
        if existing_user:
            return {"error": "Username already exists"}
        
        # Create user
        user = User(username=user_data.username)
        await db.users.insert_one(user.dict())
        
        # Generate simple token (in production, use JWT)
        token = f"token_{user.id}"
        
        return UserResponse(
            id=user.id,
            username=user.username,
            token=token
        )
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return {"error": str(e)}

@api_router.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserCreate):
    """Login user"""
    try:
        # Find user
        user_dict = await db.users.find_one({"username": user_data.username})
        
        if not user_dict:
            # Create new user if doesn't exist
            user = User(username=user_data.username)
            await db.users.insert_one(user.dict())
            user_dict = user.dict()
        
        # Generate token
        token = f"token_{user_dict['id']}"
        
        return UserResponse(
            id=user_dict['id'],
            username=user_dict['username'],
            token=token
        )
    except Exception as e:
        logger.error(f"Error logging in: {e}")
        return {"error": str(e)}

# Room endpoints
@api_router.get("/rooms")
async def get_rooms():
    """Get all rooms"""
    try:
        rooms = list(socket_manager.rooms.values())
        return {"rooms": [socket_manager.room_to_dict(room) for room in rooms]}
    except Exception as e:
        logger.error(f"Error getting rooms: {e}")
        return {"error": str(e)}

@api_router.get("/")
async def root():
    return {"message": "HaxBall API - WebSocket game server running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    
# Export socket_app as the main ASGI application
app = socket_app