import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Users, Trophy, Zap } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-green-700 relative overflow-hidden">
      {/* Soccer field pattern background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-4 border-white rounded-full"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-white"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 bg-black bg-opacity-30">
        <div className="text-3xl font-bold text-white tracking-wider">
          HaxBall<span className="text-yellow-400">⚽</span>
        </div>
        <div className="flex gap-6">
          <button className="text-white hover:text-yellow-400 transition-colors font-medium">Inicio</button>
          <button className="text-white hover:text-yellow-400 transition-colors font-medium">Noticias</button>
          <button className="text-white hover:text-yellow-400 transition-colors font-medium">Jugar</button>
          <button className="text-white hover:text-yellow-400 transition-colors font-medium">Comunidad</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-20 pb-32">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-8xl font-black text-white drop-shadow-2xl" style={{
            textShadow: '4px 4px 0 #ff6b6b, 8px 8px 0 #1e3a8a'
          }}>
            HaxBall
          </h1>
          <div className="text-7xl mt-2">⚽</div>
        </div>

        {/* Description */}
        <div className="bg-slate-800 bg-opacity-80 backdrop-blur-sm px-8 py-6 rounded-2xl max-w-2xl mb-8">
          <p className="text-white text-center text-xl leading-relaxed">
            HaxBall es un juego de fútbol multijugador basado en física donde el trabajo en equipo es la clave.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => navigate('/login')}
          size="lg"
          className="bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white text-2xl px-12 py-8 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200 font-bold"
        >
          ¡Jugar Ahora!
        </Button>

        {/* Animated players */}
        <div className="absolute bottom-20 left-20 w-16 h-16 bg-red-500 rounded-full border-4 border-red-800 animate-bounce shadow-xl"></div>
        <div className="absolute bottom-32 right-32 w-16 h-16 bg-blue-500 rounded-full border-4 border-blue-800 animate-bounce shadow-xl" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-white rounded-full border-4 border-gray-300 animate-pulse shadow-xl"></div>
      </div>

      {/* Features */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 px-8 pb-20 max-w-6xl mx-auto">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm p-6 rounded-xl shadow-xl transform hover:scale-105 transition-all">
          <div className="flex justify-center mb-4">
            <Users className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-center mb-2 text-gray-800">Multijugador</h3>
          <p className="text-center text-gray-600">Juega con hasta 6 jugadores en tiempo real</p>
        </div>

        <div className="bg-white bg-opacity-90 backdrop-blur-sm p-6 rounded-xl shadow-xl transform hover:scale-105 transition-all">
          <div className="flex justify-center mb-4">
            <Zap className="w-12 h-12 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-center mb-2 text-gray-800">Física Realista</h3>
          <p className="text-center text-gray-600">Motor de física avanzado para jugabilidad fluida</p>
        </div>

        <div className="bg-white bg-opacity-90 backdrop-blur-sm p-6 rounded-xl shadow-xl transform hover:scale-105 transition-all">
          <div className="flex justify-center mb-4">
            <Trophy className="w-12 h-12 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-center mb-2 text-gray-800">Competitivo</h3>
          <p className="text-center text-gray-600">Compite y mejora tus habilidades</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;