import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const RoleRoute: React.FC<{ allow: UserRole[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allow.includes(profile.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default RoleRoute;