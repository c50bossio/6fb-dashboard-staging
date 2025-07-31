'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (auth.isAuthenticated()) {
        const userData = await auth.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token might be invalid, clear it
      await auth.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await auth.login(credentials);
      
      // Get user data after successful login
      const userData = await auth.getCurrentUser();
      setUser(userData);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await auth.register(userData);
      
      // Get user data after successful registration
      const userInfo = await auth.getCurrentUser();
      setUser(userInfo);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if API call fails
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && auth.isAuthenticated(),
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}