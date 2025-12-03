import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre de usuario",
        variant: "destructive"
      });
      return;
    }

    if (username.length < 3) {
      toast({
        title: "Error",
        description: "El nombre debe tener al menos 3 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Mock login - store username in localStorage
    setTimeout(() => {
      localStorage.setItem('haxball_username', username);
      localStorage.setItem('haxball_user_id', 'user_' + Date.now());
      toast({
        title: "¡Bienvenido!",
        description: `Hola ${username}, iniciando sesión...`
      });
      setTimeout(() => {
        navigate('/lobby');
      }, 500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-green-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border-4 border-white rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border-4 border-white rounded-full"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="text-6xl mb-2">⚽</div>
          <CardTitle className="text-3xl font-bold text-green-700">HaxBall</CardTitle>
          <CardDescription className="text-base">Ingresa tu nombre para comenzar a jugar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-700">
                Nombre de Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu nombre..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-base"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Ingresando...' : 'Ingresar al Lobby'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Controles del juego:</p>
            <p className="mt-2">🎮 Movimiento: WASD o Flechas</p>
            <p>⚽ Patear: Espacio o X</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;