import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Users, Play, Plus, LogOut, RefreshCw } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Lobby = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (socket && connected) {
      // Join lobby to receive room updates
      socket.emit('join_lobby');

      // Listen for room list updates
      socket.on('room_list_update', (data) => {
        setRooms(data.rooms);
      });

      // Listen for room created
      socket.on('room_created', (data) => {
        navigate(`/room/${data.room.id}`);
      });

      return () => {
        socket.off('room_list_update');
        socket.off('room_created');
      };
    }
  }, [socket, connected, navigate, user]);

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la sala",
        variant: "destructive"
      });
      return;
    }

    if (socket && connected) {
      socket.emit('create_room', {
        name: newRoomName,
        maxPlayers: maxPlayers,
        host: user.username
      });

      setIsCreateDialogOpen(false);
      setNewRoomName('');
      
      toast({
        title: "¡Sala Creada!",
        description: `Sala "${newRoomName}" creada exitosamente`
      });
    } else {
      toast({
        title: "Error de conexión",
        description: "No hay conexión con el servidor",
        variant: "destructive"
      });
    }
  };

  const handleJoinRoom = (room) => {
    if (room.status === 'playing') {
      toast({
        title: "Sala en juego",
        description: "Esta sala ya está jugando",
        variant: "destructive"
      });
      return;
    }

    if (room.players >= room.maxPlayers) {
      toast({
        title: "Sala llena",
        description: "Esta sala está llena",
        variant: "destructive"
      });
      return;
    }

    if (socket && connected) {
      socket.emit('join_room', {
        roomId: room.id,
        username: user.username
      });
      navigate(`/room/${room.id}`);
    } else {
      toast({
        title: "Error de conexión",
        description: "No hay conexión con el servidor",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const refreshRooms = () => {
    if (socket && connected) {
      socket.emit('join_lobby');
      toast({
        title: "Actualizando...",
        description: "Buscando salas disponibles"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚽</div>
            <h1 className="text-2xl font-bold text-white">HaxBall Lobby</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">{user?.username}</span>
              {!connected && <span className="text-red-400 text-xs ml-2">(Desconectado)</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Salas Disponibles</h2>
          <div className="flex gap-3">
            <Button
              onClick={refreshRooms}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Sala
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Sala</DialogTitle>
                  <DialogDescription>
                    Configura tu sala y espera a que otros jugadores se unan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre de la Sala</label>
                    <Input
                      placeholder="Mi Sala Pro"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Jugadores Máximos</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    >
                      <option value={4}>4 jugadores (2v2)</option>
                      <option value={6}>6 jugadores (3v3)</option>
                      <option value={8}>8 jugadores (4v4)</option>
                    </select>
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full bg-green-600 hover:bg-green-700">
                    Crear Sala
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="bg-slate-800 border-slate-700 hover:border-green-500 transition-all transform hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="truncate">{room.name}</span>
                  {room.status === 'playing' && (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">En juego</span>
                  )}
                  {room.status === 'waiting' && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Esperando</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Host:</span>
                    <span className="text-white font-semibold">{room.host}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Jugadores:</span>
                    <span className="text-white font-semibold flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.players}/{room.maxPlayers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Mapa:</span>
                    <span className="text-white font-semibold">{room.map}</span>
                  </div>
                  <Button
                    onClick={() => handleJoinRoom(room)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                    disabled={room.status === 'playing' || room.players >= room.maxPlayers}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Unirse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚽</div>
            <p className="text-slate-400 text-lg">No hay salas disponibles</p>
            <p className="text-slate-500 mt-2">¡Crea una nueva sala para comenzar!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;