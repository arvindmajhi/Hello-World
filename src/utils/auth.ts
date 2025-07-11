import { addDays, isAfter } from 'date-fns';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';

// Mock storage functions (in a real app, this would be handled by a backend)
const USERS_STORAGE_KEY = 'auth_users';
const CURRENT_USER_KEY = 'current_user';

export const getStoredUsers = (): User[] => {
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : [];
};

export const saveUser = (user: User): void => {
  const users = getStoredUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  if (!userJson) return null;
  
  const user = JSON.parse(userJson);
  // Convert date strings back to Date objects
  user.createdAt = new Date(user.createdAt);
  user.trialStartDate = new Date(user.trialStartDate);
  user.trialEndDate = new Date(user.trialEndDate);
  
  return user;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const createUser = (credentials: RegisterCredentials): User => {
  const now = new Date();
  const trialEndDate = addDays(now, 7); // 7-day trial
  
  const user: User = {
    id: Math.random().toString(36).substr(2, 9),
    email: credentials.email,
    name: credentials.name,
    createdAt: now,
    trialStartDate: now,
    trialEndDate,
    isTrialActive: true,
    isTrialExpired: false,
  };
  
  return user;
};

export const updateTrialStatus = (user: User): User => {
  const now = new Date();
  const isTrialExpired = isAfter(now, user.trialEndDate);
  
  return {
    ...user,
    isTrialActive: !isTrialExpired,
    isTrialExpired,
  };
};

export const authenticateUser = (credentials: LoginCredentials): User | null => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === credentials.email);
  
  if (!user) return null;
  
  // In a real app, you'd verify the password hash
  // For this demo, we'll assume password is correct if user exists
  
  return updateTrialStatus(user);
};

export const registerUser = (credentials: RegisterCredentials): User => {
  const users = getStoredUsers();
  const existingUser = users.find(u => u.email === credentials.email);
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  if (credentials.password !== credentials.confirmPassword) {
    throw new Error('Passwords do not match');
  }
  
  const user = createUser(credentials);
  saveUser(user);
  
  return user;
};

export const logoutUser = (): void => {
  setCurrentUser(null);
};