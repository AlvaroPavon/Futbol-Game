import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const username = localStorage.getItem('haxball_username');
    const userId = localStorage.getItem('haxball_user_id');
    const token = localStorage.getItem('haxball_token');

    if (username && userId && token) {
      setUser({ id: userId, username, token });
    }
    setLoading(false);
  }, []);

  const login = async (username) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username });
      const { id, username: userName, token } = response.data;
      
      localStorage.setItem('haxball_username', userName);
      localStorage.setItem('haxball_user_id', id);
      localStorage.setItem('haxball_token', token);
      
      setUser({ id, username: userName, token });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('haxball_username');
    localStorage.removeItem('haxball_user_id');
    localStorage.removeItem('haxball_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
