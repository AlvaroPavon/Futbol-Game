import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Pause, Play } from 'lucide-react';

const Game = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
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
      keysPressed.current[e.key.toLowerCase()] = true;
      
      // Kick with space or x
      if (e.key === ' ' || e.key.toLowerCase() === 'x') {
        e.preventDefault();
        kickBall();
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Start game loop
    startGameLoop(ctx);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const startGameLoop = (ctx) => {
    const loop = () => {
      if (!gameState.isPaused && !gameState.gameOver) {
        updateGame();
        renderGame(ctx);
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const updateGame = () => {
    const { players, ball, controlledPlayer } = gameObjects.current;
    const player = players.find(p => p.id === controlledPlayer);

    if (player) {
      // Player movement
      const keys = keysPressed.current;
      let dx = 0, dy = 0;

      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      player.vx = dx * PLAYER_SPEED;
      player.vy = dy * PLAYER_SPEED;

      // Update player position
      player.x += player.vx;
      player.y += player.vy;

      // Keep player in bounds
      player.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, player.y));
    }

    // Simple AI for other players
    players.forEach(p => {
      if (p.id !== controlledPlayer) {
        // Move towards ball
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 50) {
          p.vx = (dx / dist) * PLAYER_SPEED * 0.7;
          p.vy = (dy / dist) * PLAYER_SPEED * 0.7;
        } else {
          p.vx *= 0.9;
          p.vy *= 0.9;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Keep in bounds
        p.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, p.x));
        p.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, p.y));
      }
    });

    // Update ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;

    // Ball collision with walls
    if (ball.x - BALL_RADIUS < 0 || ball.x + BALL_RADIUS > CANVAS_WIDTH) {
      ball.vx *= -0.8;
      ball.x = Math.max(BALL_RADIUS, Math.min(CANVAS_WIDTH - BALL_RADIUS, ball.x));
    }
    
    // Check goals (top and bottom)
    const GOAL_WIDTH = 200;
    const goalLeft = (CANVAS_WIDTH - GOAL_WIDTH) / 2;
    const goalRight = goalLeft + GOAL_WIDTH;

    if (ball.y - BALL_RADIUS < 0) {
      if (ball.x > goalLeft && ball.x < goalRight) {
        // Goal for blue team
        setGameState(prev => ({ ...prev, score: { ...prev.score, blue: prev.score.blue + 1 } }));
        resetBall();
      } else {
        ball.vy *= -0.8;
        ball.y = BALL_RADIUS;
      }
    }
    
    if (ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
      if (ball.x > goalLeft && ball.x < goalRight) {
        // Goal for red team
        setGameState(prev => ({ ...prev, score: { ...prev.score, red: prev.score.red + 1 } }));
        resetBall();
      } else {
        ball.vy *= -0.8;
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
      }
    }

    // Ball collision with players
    players.forEach(p => {
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < PLAYER_RADIUS + BALL_RADIUS) {
        // Collision response
        const angle = Math.atan2(dy, dx);
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        
        ball.vx = Math.cos(angle) * (speed + 2);
        ball.vy = Math.sin(angle) * (speed + 2);
        
        // Separate ball from player
        const overlap = PLAYER_RADIUS + BALL_RADIUS - dist;
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;
      }
    });
  };

  const kickBall = () => {
    const { players, ball, controlledPlayer } = gameObjects.current;
    const player = players.find(p => p.id === controlledPlayer);
    
    if (!player) return;

    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < KICK_DISTANCE) {
      const angle = Math.atan2(dy, dx);
      ball.vx = Math.cos(angle) * KICK_POWER;
      ball.vy = Math.sin(angle) * KICK_POWER;
    }
  };

  const resetBall = () => {
    const { ball } = gameObjects.current;
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
  };

  const renderGame = (ctx) => {
    const { players, ball } = gameObjects.current;

    // Clear canvas
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw field lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    const GOAL_WIDTH = 200;
    const goalLeft = (CANVAS_WIDTH - GOAL_WIDTH) / 2;
    
    // Top goal (blue)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fillRect(goalLeft, 0, GOAL_WIDTH, 5);
    ctx.strokeRect(goalLeft, 0, GOAL_WIDTH, 40);
    
    // Bottom goal (red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.fillRect(goalLeft, CANVAS_HEIGHT - 5, GOAL_WIDTH, 5);
    ctx.strokeRect(goalLeft, CANVAS_HEIGHT - 40, GOAL_WIDTH, 40);

    // Draw players
    players.forEach(p => {
      const isControlled = p.id === gameObjects.current.controlledPlayer;
      
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
