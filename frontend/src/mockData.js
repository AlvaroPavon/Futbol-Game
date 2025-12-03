// Mock data for initial development
export const mockRooms = [
  {
    id: '1',
    name: 'Sala Pro',
    host: 'Player1',
    players: 4,
    maxPlayers: 6,
    status: 'waiting',
    map: 'Classic'
  },
  {
    id: '2',
    name: 'Principiantes',
    host: 'NoobMaster',
    players: 2,
    maxPlayers: 6,
    status: 'waiting',
    map: 'Classic'
  },
  {
    id: '3',
    name: 'Sala Competitiva',
    host: 'ProGamer',
    players: 6,
    maxPlayers: 6,
    status: 'playing',
    map: 'Classic'
  }
];

export const mockMessages = [
  { id: 1, player: 'Player1', message: '¡Hola a todos!', timestamp: Date.now() - 60000 },
  { id: 2, player: 'Player2', message: 'GG', timestamp: Date.now() - 30000 },
  { id: 3, player: 'Player3', message: 'Listo para jugar', timestamp: Date.now() - 10000 }
];

export const mockUser = {
  id: 'user123',
  username: 'Player1',
  stats: {
    wins: 45,
    losses: 23,
    goals: 156
  }
};