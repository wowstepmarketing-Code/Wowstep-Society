import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { UserRole } from './types';
import { ICONS } from './constants';
import { ClientProvider, useClient } from './context/ClientContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import ProtectedRoute from './routes/ProtectedRoute';
import OnboardingGate from './routes/OnboardingGate';
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
import LiveVisionRoom from './components/LiveVisionRoom';
import BrandStudio from './components/BrandStudio';
import Campaigns from './components/Campaigns';

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
  clients: SocietyClient[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
}> = ({ currentPath, profile, signOut, onItemClick, clients, selectedClientId, setSelectedClientId }) => (
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

    {/* Mobile Company Selector */}
    {clients.length > 1 && (
      <div className="lg:hidden mb-6 px-2">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 ml-1">Active Entity</p>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white text-xs px-3 py-2.5 rounded-lg outline-none cursor-pointer hover:border-brand-green/40 transition-all"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-brand-black text-white">
              {c.name}
            </option>
          ))}
        </select>
      </div>
    )}

    <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
      <div onClick={onItemClick}>
        <SidebarItem to="/dashboard" label="Command Center" icon={<ICONS.Dashboard />} active={currentPath === '/dashboard'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/vision" label="Vision Room" icon={<ICONS.Vision />} active={currentPath === '/vision'} />
      </div>
      <div onClick={onItemClick}>
        <SidebarItem to="/studio" label="Brand Studio" icon={<ICONS.Studio />} active={currentPath === '/studio'} />
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

      {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.TEAM) && (
        <div onClick={onItemClick}>
          <SidebarItem to="/strategy" label="Strategy Board" icon={<ICONS.Strategy />} active={currentPath === '/strategy'} />
        </div>
      )}

      {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.TEAM) && (
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

      {profile?.role === UserRole.ADMIN && (
        <div className="pt-6 mt-6 border-t border-white/10">
          <div onClick={onItemClick}>
            <SidebarItem to="/admin" label="Admin Control" icon={<ICONS.Settings />} active={currentPath === '/admin'} />
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
  const { profile, signOut, networkError } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-brand-black font-sans overflow-hidden">
      {/* NETWORK ERROR BANNER */}
      {networkError && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-2 px-4 z-[100] text-center flex items-center justify-center gap-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Connectivity Interrupted: Supabase project may be paused or unreachable.
        </div>
      )}

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
        <SidebarContent 
          currentPath={currentPath} 
          profile={profile} 
          signOut={signOut} 
          clients={clients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
        />
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
          clients={clients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
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

            <div className="flex items-center gap-6">
              <h2 className="text-base sm:text-lg font-heading font-semibold text-white">
                {currentPath === '/dashboard' && 'Command Center'}
                {currentPath === '/vision' && 'Vision Room'}
                {currentPath === '/studio' && 'Brand Studio'}
                {currentPath === '/campaigns' && 'Media Deployment'}
                {currentPath === '/roadmap' && 'Evolution Roadmap'}
                {currentPath === '/analytics' && 'Executive Analytics'}
                {currentPath === '/crm' && 'CRM Pipeline'}
                {currentPath === '/messages' && 'Intelligence Hub'}
                {currentPath === '/strategy' && 'Strategy Board'}
                {currentPath === '/documents' && 'Document Hub'}
                {currentPath === '/admin' && 'Wowstep Admin Control'}
              </h2>

              {clients.length > 1 && (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="hidden md:block bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-lg outline-none cursor-pointer hover:border-brand-green/40 transition-all"
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/10">
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

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
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
              <OnboardingGate>
                <Onboarding />
              </OnboardingGate>
            } />
            
            <Route path="/dashboard" element={
              <OnboardingGate>
                <AppLayout><Dashboard /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/vision" element={
              <OnboardingGate>
                <AppLayout><LiveVisionRoom /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/studio" element={
              <OnboardingGate>
                <AppLayout><BrandStudio /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/campaigns" element={
              <OnboardingGate>
                <AppLayout><Campaigns /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/roadmap" element={
              <OnboardingGate>
                <AppLayout><Roadmap /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/analytics" element={
              <OnboardingGate>
                <AppLayout><Analytics /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/crm" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEAM]}>
                <OnboardingGate>
                  <AppLayout><CRM /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <OnboardingGate>
                <AppLayout><Messaging /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/strategy" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEAM]}>
                <OnboardingGate>
                  <AppLayout><StrategyBoard /></AppLayout>
                </OnboardingGate>
              </ProtectedRoute>
            } />
            
            <Route path="/documents" element={
              <OnboardingGate>
                <AppLayout><DocumentHub /></AppLayout>
              </OnboardingGate>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <OnboardingGate>
                  <AppLayout><AdminDashboard /></AppLayout>
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