export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  trialStartDate: Date;
  trialEndDate: Date;
  isTrialActive: boolean;
  isTrialExpired: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}