import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const animationFrameRef = useRef(null);
  const lastGameStateRef = useRef(null);
  const previousGameStateRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  
  const [gameState, setGameState] = useState({
    score: { red: 0, blue: 0 },
    time: 600, // 10 minutes in seconds
    isPaused: false,
    gameOver: false
  });

  // Game constants - horizontal field
  const CANVAS_WIDTH = 1400;
  const CANVAS_HEIGHT = 600;
  const PLAYER_RADIUS = 20;
  const BALL_RADIUS = 12;

  const renderGame = useCallback((ctx, gameStateData) => {
    const { players = [], ball, score, kickoff_team, ball_touched, animations = {} } = gameStateData;

    if (!ball) return;
    
    const isKickoff = kickoff_team && !ball_touched;

    // Clear canvas
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw field lines - HORIZONTAL FIELD
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Outer boundary
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line (vertical for horizontal field)
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
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

    // Goals - HORIZONTAL (on left and right sides)
    const GOAL_HEIGHT = 150;
    const GOAL_DEPTH = 30;
    const goalTop = (CANVAS_HEIGHT - GOAL_HEIGHT) / 2;
    
    // LEFT goal area (RED defends this)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(0, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    
    // Left goal line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, goalTop);
    ctx.lineTo(0, goalTop + GOAL_HEIGHT);
    ctx.stroke();
    
    // RIGHT goal area (BLUE defends this)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(CANVAS_WIDTH - GOAL_DEPTH, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fillRect(CANVAS_WIDTH - GOAL_DEPTH, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    
    // Right goal line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH, goalTop);
    ctx.lineTo(CANVAS_WIDTH, goalTop + GOAL_HEIGHT);
    ctx.stroke();

    // Draw kickoff indicator
    if (isKickoff) {
      // Highlight center circle for kickoff
      ctx.strokeStyle = kickoff_team === 'red' ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Display kickoff message
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 - 40, 240, 40);
      
      ctx.fillStyle = kickoff_team === 'red' ? '#ef4444' : '#3b82f6';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Saque: Equipo ${kickoff_team === 'red' ? 'ROJO' : 'AZUL'}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    }

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

    // Draw animations - now using player names as keys
    if (animations && typeof animations === 'object') {
      Object.entries(animations).forEach(([playerName, anim]) => {
        // Find player by name
        const player = players.find(p => p.name === playerName);
        
        if (!player) return;
        
        // Animation progress (0 to 1)
        const progress = Math.min(anim.frame / 10, 1);
        const fadeOut = 1 - progress;
        
        if (anim.type === 'kick') {
          // Expanding circle for kick animation
          const kickRadius = PLAYER_RADIUS + (20 * progress);
          ctx.strokeStyle = `rgba(255, 255, 255, ${fadeOut * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x, player.y, kickRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Add a flash effect
          ctx.fillStyle = `rgba(255, 255, 255, ${fadeOut * 0.3})`;
          ctx.beginPath();
          ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        } else if (anim.type === 'push') {
          // Radial burst effect for push
          const pushRadius = PLAYER_RADIUS + (30 * progress);
          
          // Multiple expanding circles
          for (let i = 0; i < 3; i++) {
            const delay = i * 0.2;
            const adjustedProgress = Math.max(0, progress - delay);
            const adjustedFadeOut = 1 - adjustedProgress;
            const radius = PLAYER_RADIUS + (pushRadius * adjustedProgress);
            
            if (adjustedProgress > 0) {
              ctx.strokeStyle = `rgba(255, 200, 0, ${adjustedFadeOut * 0.6})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          
          // Yellow tint on player
          ctx.fillStyle = `rgba(255, 200, 0, ${fadeOut * 0.4})`;
          ctx.beginPath();
          ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw score at the top center
    if (score) {
      // Score background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 80, 10, 160, 50);
      
      // Red team score
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(score.red || 0, CANVAS_WIDTH / 2 - 15, 45);
      
      // Separator
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('-', CANVAS_WIDTH / 2, 45);
      
      // Blue team score
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'left';
      ctx.fillText(score.blue || 0, CANVAS_WIDTH / 2 + 15, 45);
    }
  }, [user, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, BALL_RADIUS]);

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
        const isKick = key === ' ' || key === 'x';
        const isPush = key === 'shift' || key === 'e';
        
        socket.emit('player_input', { 
          keys: keysPressed.current,
          kick: isKick,
          push: isPush
        });
      }
      
      // Prevent default for special keys
      if (key === ' ' || key === 'x' || key === 'shift' || key === 'e') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      
      // Send input to server
      if (socket && connected) {
        socket.emit('player_input', { 
          keys: keysPressed.current,
          kick: false,
          push: false
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Listen for game state updates from server
    if (socket && connected) {
      socket.on('game_state', (gameStateFromServer) => {
        renderGame(ctx, gameStateFromServer);
        setGameState(prev => ({
          ...prev,
          score: gameStateFromServer.score || prev.score,
          time: Math.floor(gameStateFromServer.time || prev.time)
        }));
      });

      socket.on('goal_scored', (data) => {
        console.log('Goal scored:', data);
        setGameState(prev => ({
          ...prev,
          score: data.score
        }));
        toast({
          title: `¡GOL para equipo ${data.team === 'red' ? 'ROJO' : 'AZUL'}!`,
          description: `Marcador: ${data.score.red} - ${data.score.blue}`,
          duration: 3000
        });
      });

      socket.on('game_over', (data) => {
        console.log('Game over received:', data);
        setGameState(prev => ({ ...prev, gameOver: true, isPaused: true }));
        const winnerText = data.winner === 'draw' ? 'Empate' : 
                          `Ganó el equipo ${data.winner === 'red' ? 'Rojo' : 'Azul'}`;
        toast({
          title: "¡Juego Terminado!",
          description: `${winnerText} - ${data.finalScore.red}:${data.finalScore.blue}`,
          duration: 5000
        });
        setTimeout(() => {
          console.log('Navigating back to room:', roomId);
          navigate(`/room/${roomId}`, { replace: true });
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
  }, [socket, connected, navigate, roomId, renderGame]);

  const handleLeave = () => {
    navigate(`/room/${roomId}`);
  };

  const togglePause = () => {
    if (socket && connected) {
      const newPauseState = !gameState.isPaused;
      setGameState(prev => ({ ...prev, isPaused: newPauseState }));
      socket.emit('toggle_pause', { roomId, paused: newPauseState });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-[1400px] mb-4 flex items-center justify-between">
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
          width={1400}
          height={600}
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
          <span className="font-bold">Controles:</span> WASD o Flechas = mover | ESPACIO o X = patear | SHIFT o E = empujar
        </p>
      </div>
    </div>
  );
};

export default Game;
