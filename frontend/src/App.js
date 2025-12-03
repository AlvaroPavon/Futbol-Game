import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import Game from "./pages/Game";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/room/:roomId" element={<Room />} />
              <Route path="/game/:roomId" element={<Game />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
