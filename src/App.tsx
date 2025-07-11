import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;