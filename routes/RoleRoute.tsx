import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const RoleRoute: React.FC<{ allow: UserRole[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { profile, loading } = useAuth();

  if (loading) return (
    <div className="h-screen bg-brand-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!profile) return <Navigate to="/login" replace />;
  
  if (!allow.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;