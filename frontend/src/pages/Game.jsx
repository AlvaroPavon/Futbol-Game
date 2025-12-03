import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';

const Game = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const keysPressed = useRef({});
  
  const [gameState, setGameState] = useState({
    score: { red: 0, blue: 0 },
    time: 600, // 10 minutes in seconds
    isPaused: false,
    gameOver: false
  });

  // Game constants
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 600;
  const PLAYER_RADIUS = 20;
  const BALL_RADIUS = 12;
  const PLAYER_SPEED = 4;
  const BALL_FRICTION = 0.98;
  const KICK_POWER = 15;
  const KICK_DISTANCE = PLAYER_RADIUS + BALL_RADIUS + 5;

  // Game objects
  const gameObjects = useRef({
    players: [
      { id: 1, x: 200, y: 300, vx: 0, vy: 0, team: 'red', name: 'P1' },
      { id: 2, x: 400, y: 200, vx: 0, vy: 0, team: 'red', name: 'P2' },
      { id: 3, x: 400, y: 400, vx: 0, vy: 0, team: 'red', name: 'P3' },
      { id: 4, x: 1000, y: 300, vx: 0, vy: 0, team: 'blue', name: 'P4' },
      { id: 5, x: 800, y: 200, vx: 0, vy: 0, team: 'blue', name: 'P5' },
      { id: 6, x: 800, y: 400, vx: 0, vy: 0, team: 'blue', name: 'P6' },
    ],
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0 },
    controlledPlayer: 1
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Keyboard controls
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      
      // Send input to server
      if (socket && connected) {
        socket.emit('player_input', { 
          keys: keysPressed.current,
          kick: key === ' ' || key === 'x'
        });
      }
      
      // Kick with space or x
      if (key === ' ' || key === 'x') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      
      // Send input to server
      if (socket && connected) {
        socket.emit('player_input', { 
          keys: keysPressed.current
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Listen for game state updates from server
    if (socket && connected) {
      socket.on('game_state', (gameState) => {
        renderGame(ctx, gameState);
        setGameState(prev => ({
          ...prev,
          score: gameState.score,
          time: Math.floor(gameState.time)
        }));
      });

      socket.on('goal_scored', (data) => {
        toast({
          title: `¡GOL para ${data.team === 'red' ? 'Rojo' : 'Azul'}!`,
          description: `Marcador: ${data.score.red} - ${data.score.blue}`
        });
      });

      socket.on('game_over', (data) => {
        setGameState(prev => ({ ...prev, gameOver: true }));
        const winnerText = data.winner === 'draw' ? 'Empate' : 
                          `Ganó el equipo ${data.winner === 'red' ? 'Rojo' : 'Azul'}`;
        toast({
          title: "¡Juego Terminado!",
          description: `${winnerText} - ${data.finalScore.red}:${data.finalScore.blue}`
        });
        setTimeout(() => {
          navigate(`/room/${roomId}`);
        }, 5000);
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (socket) {
        socket.off('game_state');
        socket.off('goal_scored');
        socket.off('game_over');
      }
    };
  }, [socket, connected, navigate, roomId]);

  const renderGame = (ctx, gameStateData) => {
    const { players = [], ball, score } = gameStateData;

    if (!ball) return;

    // Clear canvas
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw field lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Outer boundary
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Goals
    const GOAL_WIDTH = 200;
    const GOAL_DEPTH = 30;
    const goalLeft = (CANVAS_WIDTH - GOAL_WIDTH) / 2;
    
    // Top goal area (RED defends this)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(goalLeft, 0, GOAL_WIDTH, GOAL_DEPTH);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(goalLeft, 0, GOAL_WIDTH, GOAL_DEPTH);
    
    // Top goal line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(goalLeft, 0);
    ctx.lineTo(goalLeft + GOAL_WIDTH, 0);
    ctx.stroke();
    
    // Bottom goal area (BLUE defends this)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(goalLeft, CANVAS_HEIGHT - GOAL_DEPTH, GOAL_WIDTH, GOAL_DEPTH);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(goalLeft, CANVAS_HEIGHT - GOAL_DEPTH, GOAL_WIDTH, GOAL_DEPTH);
    
    // Bottom goal line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(goalLeft, CANVAS_HEIGHT);
    ctx.lineTo(goalLeft + GOAL_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();

    // Draw players
    players.forEach(p => {
      const isControlled = p.name === user?.username;
      
      // Player circle
      ctx.fillStyle = p.team === 'red' ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Border
      ctx.strokeStyle = isControlled ? '#fbbf24' : p.team === 'red' ? '#991b1b' : '#1e3a8a';
      ctx.lineWidth = isControlled ? 4 : 2;
      ctx.stroke();

      // Player name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y + 5);
    });

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.score.red} - ${gameState.score.blue}`, CANVAS_WIDTH / 2, 50);
  };

  const handleLeave = () => {
    navigate(`/room/${roomId}`);
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-[1200px] mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
          className="border-slate-600 text-white hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Salir del Juego
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="text-white text-xl font-bold">
            ⏱️ {Math.floor(gameState.time / 60)}:{(gameState.time % 60).toString().padStart(2, '0')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-slate-700 rounded-lg shadow-2xl"
        />
        
        {gameState.isPaused && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-4xl font-bold">PAUSADO</div>
          </div>
        )}
      </div>

      {/* Controls Info */}
      <div className="mt-4 bg-slate-800 px-6 py-3 rounded-lg">
        <p className="text-white text-center">
          <span className="font-bold">Controles:</span> WASD o Flechas para mover | ESPACIO o X para patear
        </p>
      </div>
    </div>
  );
};

export default Game;
