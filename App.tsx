import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { UserRole } from './types';
import { ICONS } from './constants';
import { ClientProvider, useClient } from './context/ClientContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import ProtectedRoute from './routes/ProtectedRoute';
import OnboardingGate from './routes/OnboardingGate';
import RoleRoute from './routes/RoleRoute';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';

import Dashboard from './components/Dashboard';
import Roadmap from './components/Roadmap';
import CRM from './components/CRM';
import Analytics from './components/Analytics';
import Messaging from './components/Messaging';
import StrategyBoard from './components/StrategyBoard';
import DocumentHub from './components/DocumentHub';
import AdminDashboard from './components/AdminDashboard';
import AdminApprovals from './components/AdminApprovals';
import LiveVisionRoom from './components/LiveVisionRoom';
import Campaigns from './components/Campaigns';
import Profile from './components/Profile';

const SidebarItem: React.FC<{ to: string; label: string; icon: React.ReactNode; active?: boolean }> = ({ to, label, icon, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
      active 
        ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

const SidebarContent: React.FC<{ 
  currentPath: string; 
  profile: any; 
  signOut: () => void;
  onItemClick?: () => void;
}> = ({ currentPath, profile, signOut, onItemClick }) => (
  <div className="flex flex-col h-full">
    <div className="mb-10 px-2">
      <div className="text-2xl font-heading font-bold tracking-tighter text-white flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-brand-green text-white flex items-center justify-center text-xs">
          WS
        </div>
        WOWSOCIETY
      </div>
      <div className="text-[10px] font-bold tracking-[0.2em] mt-1 ml-10 uppercase text-brand-green">
        Intelligence Lab
      </div>
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
      <div onClick={onItemClick}>
        <SidebarItem to="/dashboard" label="Command Center" icon={<ICONS.Dashboard />} active={currentPath === '/dashboard'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/vision" label="Vision Room" icon={<ICONS.Vision />} active={currentPath === '/vision'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/campaigns" label="Media Deployment" icon={<ICONS.Campaigns />} active={currentPath === '/campaigns'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/roadmap" label="Growth Roadmap" icon={<ICONS.Growth />} active={currentPath === '/roadmap'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/analytics" label="Analytics" icon={<ICONS.Analytics />} active={currentPath === '/analytics'} />
      </div>

      {(profile?.role !== UserRole.CLIENT) && (
        <div onClick={onItemClick}>
          <SidebarItem to="/strategy" label="Strategy Board" icon={<ICONS.Strategy />} active={currentPath === '/strategy'} />
        </div>
      )}

      {(profile?.role !== UserRole.CLIENT) && (
        <div onClick={onItemClick}>
          <SidebarItem to="/crm" label="CRM Pipeline" icon={<ICONS.CRM />} active={currentPath === '/crm'} />
        </div>
      )}

      <div onClick={onItemClick}>
        <SidebarItem to="/messages" label="Intelligence Hub" icon={<ICONS.Messages />} active={currentPath === '/messages'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/documents" label="Document Hub" icon={<ICONS.Documents />} active={currentPath === '/documents'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/profile" label="Executive Profile" icon={<ICONS.Profile />} active={currentPath === '/profile'} />
      </div>

      {profile?.role === UserRole.ADMIN && (
        <div className="pt-6 mt-6 border-t border-white/10 space-y-1">
          <div onClick={onItemClick}>
            <SidebarItem to="/admin" label="Admin Control" icon={<ICONS.Settings />} active={currentPath === '/admin'} />
          </div>
          <div onClick={onItemClick}>
            <SidebarItem to="/admin/approvals" label="Approvals" icon={<ICONS.Growth />} active={currentPath === '/admin/approvals'} />
          </div>
        </div>
      )}
    </nav>

    <div className="mt-auto pt-6 border-t border-white/10">
      <div className="flex items-center gap-3 px-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-bold border border-white/20">
          {profile?.full_name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{profile?.full_name ?? 'User'}</p>
          <p className="text-xs text-gray-500 truncate capitalize">{profile?.role?.toLowerCase()}</p>
        </div>
      </div>
      <button 
        onClick={signOut}
        className="text-gray-400 hover:text-white text-xs font-bold transition-colors"
      >
        Sign out
      </button>
    </div>
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { clients, selectedClient, selectedClientId, setSelectedClientId } = useClient();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-brand-black font-sans overflow-hidden">
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR (desktop) */}
      <aside className="hidden lg:flex w-64 border-r border-white/10 flex-col p-6 bg-brand-black z-20">
        <SidebarContent currentPath={currentPath} profile={profile} signOut={signOut} />
      </aside>

      {/* SIDEBAR (mobile drawer) */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 border-r border-white/10 bg-brand-black z-50 p-6 transform transition-transform lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-heading font-bold tracking-tighter text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center text-xs">WS</div>
            WOWSOCIETY
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <SidebarContent 
          currentPath={currentPath} 
          profile={profile} 
          signOut={signOut} 
          onItemClick={() => setMobileOpen(false)} 
        />
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 h-16 border-b border-white/10 bg-brand-black/80 backdrop-blur-md z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* hamburger só no mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-300 hover:text-white"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 sm:gap-6">
              <h2 className="text-sm sm:text-lg font-heading font-semibold text-white truncate max-w-[100px] sm:max-w-none">
                {currentPath === '/dashboard' && 'Command Center'}
                {currentPath === '/vision' && 'Vision Room'}
                {currentPath === '/campaigns' && 'Media Deployment'}
                {currentPath === '/roadmap' && 'Evolution Roadmap'}
                {currentPath === '/analytics' && 'Executive Analytics'}
                {currentPath === '/crm' && 'CRM Pipeline'}
                {currentPath === '/messages' && 'Intelligence Hub'}
                {currentPath === '/strategy' && 'Strategy Board'}
                {currentPath === '/documents' && 'Document Hub'}
                {currentPath === '/profile' && 'Executive Profile'}
                {currentPath === '/admin' && 'Wowstep Admin Control'}
                {currentPath === '/admin/approvals' && 'Executive Approvals'}
              </h2>

              {clients.length > 1 && (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white text-[10px] sm:text-xs px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg outline-none cursor-pointer hover:border-brand-green/40 transition-all max-w-[80px] sm:max-w-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-brand-black text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-brand-green/30 bg-brand-green/10">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="hidden sm:inline text-[10px] font-bold tracking-widest uppercase text-brand-green">
                {selectedClient.phase} Phase
              </span>
            </div>
            
            <button className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ClientProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <Onboarding />
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Dashboard /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/vision" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><LiveVisionRoom /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Campaigns /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/roadmap" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Roadmap /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Analytics /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/crm" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <RoleRoute allow={[UserRole.ADMIN, UserRole.MANAGER, UserRole.SOCIAL_MEDIA, UserRole.TRAFFIC, UserRole.DESIGN]}>
                    <AppLayout><CRM /></AppLayout>
                  </RoleRoute>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Messaging /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/strategy" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <RoleRoute allow={[UserRole.ADMIN, UserRole.MANAGER, UserRole.SOCIAL_MEDIA, UserRole.TRAFFIC, UserRole.DESIGN]}>
                    <AppLayout><StrategyBoard /></AppLayout>
                  </RoleRoute>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/documents" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><DocumentHub /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <AppLayout><Profile /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <RoleRoute allow={[UserRole.ADMIN]}>
                    <AppLayout><AdminDashboard /></AppLayout>
                  </RoleRoute>
                </OnboardingGate>
              </ProtectedRoute>
            } />

            <Route path="/admin/approvals" element={
              <ProtectedRoute>
                <OnboardingGate>
                  <RoleRoute allow={[UserRole.ADMIN]}>
                    <AppLayout><AdminApprovals /></AppLayout>
                  </RoleRoute>
                </OnboardingGate>
              </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </ClientProvider>
    </AuthProvider>
  );
};

export default App;