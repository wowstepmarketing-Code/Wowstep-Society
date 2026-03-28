import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no profile, we assume ProtectedRoute will handle it, but for safety:
  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Admin users bypass onboarding requirements
  if (profile.role === UserRole.ADMIN) {
    if (location.pathname === '/onboarding') {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  const isOnboardingRoute = location.pathname === '/onboarding';
  const incomplete = !profile.onboarding_complete;

  // Force onboarding if incomplete
  if (incomplete && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to dashboard if onboarding is already complete but user is on the onboarding page
  if (!incomplete && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGate;
