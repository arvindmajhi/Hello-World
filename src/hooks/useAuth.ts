import { useState, useEffect, useCallback } from 'react';
import { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth';
import {
  getCurrentUser,
  setCurrentUser,
  authenticateUser,
  registerUser,
  logoutUser,
  updateTrialStatus,
  saveUser,
} from '../utils/auth';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const updatedUser = updateTrialStatus(user);
      saveUser(updatedUser);
      setCurrentUser(updatedUser);
      setAuthState({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      const user = authenticateUser(credentials);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      setCurrentUser(user);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    try {
      const user = registerUser(credentials);
      setCurrentUser(user);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
  };
};