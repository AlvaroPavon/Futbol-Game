import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Users, Crown, Play, ArrowLeft, Send } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Room = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Initialize room data from localStorage if available
    const storedRoom = localStorage.getItem('current_room');
    if (storedRoom) {
      try {
        const roomData = JSON.parse(storedRoom);
        setRoom(roomData);
        setLoading(false);
      } catch (e) {
        console.error('Error parsing stored room:', e);
      }
    }

    if (socket && connected) {
      // Listen for room updates
      socket.on('room_updated', (data) => {
        console.log('Room updated:', data);
        if (data.room) {
          setRoom(data.room);
          setLoading(false);
        }
      });

      socket.on('player_joined', (data) => {
        console.log('Player joined:', data);
        if (data.room) {
          setRoom(data.room);
          setLoading(false);
        }
        if (data.player && data.player.username) {
          toast({
            title: "Jugador se unió",
            description: `${data.player.username} se unió a la sala`
          });
        }
      });

      socket.on('player_left', (data) => {
        console.log('Player left:', data);
        if (data.room) {
          setRoom(data.room);
        }
        toast({
          title: "Jugador se fue",
          description: `${data.username || 'Un jugador'} abandonó la sala`
        });
      });

      socket.on('chat_message', (data) => {
        setMessages(prev => [...prev, data]);
      });

      socket.on('game_started', (data) => {
        toast({
          title: "¡Juego iniciado!",
          description: "El partido está comenzando..."
        });
        navigate(`/game/${roomId}`);
      });

      return () => {
        socket.off('room_updated');
        socket.off('player_joined');
        socket.off('player_left');
        socket.off('chat_message');
        socket.off('game_started');
      };
    }
  }, [socket, connected, navigate, user, roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !connected) return;

    socket.emit('chat_message', { message: newMessage });
    setNewMessage('');
  };

  const handleChangeTeam = (team) => {
    if (socket && connected) {
      socket.emit('change_team', { team });
      toast({
        title: "Equipo cambiado",
        description: `Te uniste al equipo ${team === 'red' ? 'rojo' : 'azul'}`
      });
    }
  };

  const handleReady = () => {
    if (socket && connected) {
      const currentPlayer = room?.players?.find(p => p.username === user.username);
      socket.emit('player_ready', { ready: !currentPlayer?.ready });
    }
  };

  const handleStartGame = () => {
    if (!socket || !connected) return;

    const playingPlayers = room?.players?.filter(p => p.team !== 'spectator') || [];
    const allReady = playingPlayers.every(p => p.ready);
    
    if (!allReady) {
      toast({
        title: "No todos están listos",
        description: "Espera a que todos los jugadores estén listos",
        variant: "destructive"
      });
      return;
    }

    socket.emit('start_game', { roomId });
  };

  const handleLeaveRoom = () => {
    if (socket && connected) {
      socket.emit('leave_room', { roomId });
    }
    navigate('/lobby');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando sala...</div>
      </div>
    );
  }

  const redTeam = room.players?.filter(p => p.team === 'red') || [];
  const blueTeam = room.players?.filter(p => p.team === 'blue') || [];
  const isHost = room.host === user?.username;
  const currentPlayer = room.players?.find(p => p.username === user?.username);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveRoom}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Salir
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚽</div>
              <h1 className="text-2xl font-bold text-white">{room.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <Button
                onClick={handleStartGame}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Comenzar Partido
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Red Team */}
              <Card className="bg-red-900 bg-opacity-30 border-red-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                    🔴 Equipo Rojo
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleChangeTeam('red')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={!connected}
                  >
                    Unirse
                  </Button>
                </div>
                <div className="space-y-2">
                  {redTeam.map((player, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 bg-opacity-50 px-3 py-2 rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {player.username === room.host && <Crown className="w-4 h-4 text-yellow-400" />}
                        <span className="text-white font-medium">{player.username}</span>
                      </div>
                      {player.ready && <span className="text-green-400 text-sm">✓ Listo</span>}
                    </div>
                  ))}
                  {redTeam.length === 0 && (
                    <p className="text-slate-400 text-center py-4">Sin jugadores</p>
                  )}
                </div>
              </Card>

              {/* Blue Team */}
              <Card className="bg-blue-900 bg-opacity-30 border-blue-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                    🔵 Equipo Azul
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleChangeTeam('blue')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!connected}
                  >
                    Unirse
                  </Button>
                </div>
                <div className="space-y-2">
                  {blueTeam.map((player, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 bg-opacity-50 px-3 py-2 rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {player.username === room.host && <Crown className="w-4 h-4 text-yellow-400" />}
                        <span className="text-white font-medium">{player.username}</span>
                      </div>
                      {player.ready && <span className="text-green-400 text-sm">✓ Listo</span>}
                    </div>
                  ))}
                  {blueTeam.length === 0 && (
                    <p className="text-slate-400 text-center py-4">Sin jugadores</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Ready Button */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">¿Estás listo?</h4>
                  <p className="text-slate-400 text-sm">Marca como listo cuando estés preparado</p>
                </div>
                <Button
                  onClick={handleReady}
                  disabled={!connected || currentPlayer?.team === 'spectator'}
                  className={`${currentPlayer?.ready ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {currentPlayer?.ready ? 'No listo' : 'Listo'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Chat Section */}
          <Card className="bg-slate-800 border-slate-700 p-4 h-[600px] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              💬 Chat
            </h3>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="bg-slate-700 bg-opacity-50 px-3 py-2 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400 font-semibold text-sm">{msg.player}</span>
                    <span className="text-slate-500 text-xs">
                      {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white text-sm">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="bg-slate-700 border-slate-600 text-white"
                maxLength={200}
                disabled={!connected}
              />
              <Button type="submit" size="icon" className="bg-green-600 hover:bg-green-700" disabled={!connected}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Room;
