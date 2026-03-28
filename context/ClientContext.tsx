
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { GrowthPhase, Milestone, MilestoneStatus, UserRole, CRMLead, UpgradeRequest, RevenueData } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { unlockEligibleMilestones, computePhaseProgress } from '../engine/milestones';

export type ClientStatus = 'Attention' | 'Stable' | 'Growth' | 'Platinum';

export interface SocietyClient {
  id: string;
  name: string;
  phase: GrowthPhase;
  mrr: number;
  ltv: number;
  healthScore: number;
  upgradeReadiness: number;
  status: ClientStatus;
  niche: string;
  location: string;
  nextMilestone: string;
  nextMilestoneDue: string;
  owner: string;
  ownerId: string;
  lastClientReplyAt: string;
}

interface ClientContextValue {
  clients: SocietyClient[];
  selectedClientId: string;
  selectedClient: SocietyClient;
  milestones: Milestone[];
  leads: CRMLead[];
  upgradeRequests: UpgradeRequest[];
  revenueHistory: RevenueData[];
  loading: boolean;
  setSelectedClientId: (id: string) => void;
  updateClientPhase: (id: string, phase: GrowthPhase) => void;
  updateClientHealthScore: (id: string, healthScore: number) => void;
  updateMilestoneStatus: (clientId: string, milestoneId: string, status: MilestoneStatus) => void;
  getClientById: (id: string) => SocietyClient | undefined;
  getClientMilestones: (clientId: string) => Milestone[];
  refreshClients: () => Promise<void>;
  fetchUpgradeRequests: () => Promise<void>;
  requestUpgrade: (reason?: string) => Promise<void>;
  approveUpgrade: (requestId: string) => Promise<void>;
  denyUpgrade: (requestId: string, reason?: string) => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const DEFAULT_CLIENT: SocietyClient = {
  id: 'loading',
  name: 'Syncing Data...',
  phase: GrowthPhase.START,
  mrr: 0,
  ltv: 0,
  healthScore: 0,
  upgradeReadiness: 0,
  status: 'Stable',
  niche: '',
  location: '',
  nextMilestone: '',
  nextMilestoneDue: '',
  owner: '',
  ownerId: '',
  lastClientReplyAt: '',
};

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading: authLoading } = useAuth();

  const onboardingComplete = !!profile?.onboarding_complete;
  const isAdmin = profile?.role === UserRole.ADMIN;

  const [clients, setClients] = useState<SocietyClient[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<RevenueData[]>([]);
  const [selectedClientId, setSelectedClientIdState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refreshClients = async () => {
    if (!session?.user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1) Fetch companies (ADMIN sees all; others see memberships)
      let companyRows: any[] = [];

      if (isAdmin) {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        companyRows = data ?? [];
      } else {
        const { data, error } = await supabase
          .from('memberships')
          .select('company_id, companies (*)')
          .eq('user_id', session.user.id);

        if (error) throw error;
        companyRows = (data ?? []).map((m: any) => m.companies).filter(Boolean);
      }

      // 2) Fetch owner names separately to avoid PGRST200 foreign key resolution issues
      const ownerIds = Array.from(new Set(companyRows.map((c: any) => c.owner_id).filter(Boolean)));
      const ownerMap: { [key: string]: string } = {};

      if (ownerIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds);
        
        if (!profileError && profiles) {
          profiles.forEach((p: any) => {
            ownerMap[p.id] = p.full_name;
          });
        }
      }

      const societyClients: SocietyClient[] = (companyRows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phase: (c.phase ?? GrowthPhase.START) as GrowthPhase,
        mrr: Number(c.revenue ?? 0),
        ltv: Number(c.ltv ?? 0),
        healthScore: Number(c.health_score ?? 100),
        upgradeReadiness: Number(c.progress ?? 0),
        status: c.status ?? 'Growth',
        niche: c.niche ?? '',
        location: c.location ?? '',
        nextMilestone: 'Calculating...',
        nextMilestoneDue: new Date().toISOString(),
        owner: ownerMap[c.owner_id] || 'Unassigned',
        ownerId: c.owner_id ?? '',
        lastClientReplyAt: c.last_client_reply_at ?? new Date().toISOString(),
      }));

      // 3) Fetch milestones, leads, upgrade requests, and revenue for these companies
      let dbMilestones: Milestone[] = [];
      let dbLeads: CRMLead[] = [];
      let dbUpgrades: UpgradeRequest[] = [];
      let dbRevenue: RevenueData[] = [];

      if (societyClients.length > 0) {
        const companyIds = societyClients.map((c) => c.id);
        
        // Parallel fetch for better performance
        const [msRes, leadsRes, upgradesRes, revRes] = await Promise.all([
          supabase.from('milestones').select('*').in('company_id', companyIds),
          supabase.from('leads').select('*').in('company_id', companyIds),
          supabase.from('upgrade_requests').select('*').in('company_id', companyIds).order('created_at', { ascending: false }),
          supabase.from('revenue_history').select('*').in('company_id', companyIds).order('month', { ascending: true })
        ]);

        if (msRes.error) throw msRes.error;
        dbMilestones = (msRes.data ?? []).map((ms: any) => ({
          id: ms.id,
          clientId: ms.company_id,
          phase: ms.phase as GrowthPhase,
          title: ms.title,
          description: ms.description,
          weight: ms.weight,
          status: ms.status as MilestoneStatus,
          dueDate: ms.due_date,
          ownerRole: ms.owner_role ? (String(ms.owner_role).toUpperCase() as any) : undefined,
        }));

        dbLeads = leadsRes.data ?? [];
        dbUpgrades = upgradesRes.data ?? [];
        dbRevenue = revRes.data ?? [];
      }

      const finalClients = societyClients.map((c) => {
        const clientMilestones = dbMilestones.filter(m => m.clientId === c.id && m.phase === c.phase);
        const nextMs = clientMilestones.find(m => m.status === 'in-progress') || 
                      clientMilestones.find(m => m.status === 'locked') || 
                      clientMilestones[0];

        return {
          ...c,
          nextMilestone: nextMs?.title || 'No active milestones',
          nextMilestoneDue: nextMs?.dueDate || new Date().toISOString(),
        };
      });

      setClients(finalClients);
      setMilestones(dbMilestones);
      setLeads(dbLeads);
      setUpgradeRequests(dbUpgrades);
      setRevenueHistory(dbRevenue);

      // Set selected client safely
      if (finalClients.length > 0) {
        setSelectedClientIdState((prev) => {
          if (prev && finalClients.some((c) => c.id === prev)) return prev;
          return finalClients[0].id;
        });
      } else {
        setSelectedClientIdState('');
      }
    } catch (err) {
      console.error('Failed to sync client data:', err);
      // Fallback to empty state instead of crashing
      setClients([]);
      setMilestones([]);
      setLeads([]);
      setUpgradeRequests([]);
      setRevenueHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      setLoading(false);
      return;
    }

    refreshClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboardingComplete, authLoading, profile?.role]);

  const getClientById = (id: string) => clients.find((c) => c.id === id);
  const getClientMilestones = (clientId: string) => milestones.filter((m) => m.clientId === clientId);

  const selectedClient = useMemo(
    () => getClientById(selectedClientId) ?? clients[0] ?? DEFAULT_CLIENT,
    [clients, selectedClientId]
  );

  const setSelectedClientId = (id: string) => {
    if (clients.some((c) => c.id === id)) setSelectedClientIdState(id);
  };

  const updateClientPhase = async (id: string, phase: GrowthPhase) => {
    try {
      const { error } = await supabase.from('companies').update({ phase }).eq('id', id);
      if (error) throw error;
      await refreshClients();
    } catch (err) {
      console.error('Failed to update client phase:', err);
    }
  };

  const updateClientHealthScore = async (id: string, healthScore: number) => {
    try {
      const { error } = await supabase.from('companies').update({ health_score: healthScore }).eq('id', id);
      if (error) throw error;
      await refreshClients();
    } catch (err) {
      console.error('Failed to update health score:', err);
    }
  };

  const updateMilestoneStatus = async (clientId: string, milestoneId: string, status: MilestoneStatus) => {
    try {
      // 1) Persist milestone status change
      const { error: msError } = await supabase.from('milestones').update({ status }).eq('id', milestoneId);
      if (msError) throw msError;

      // 2) Fetch updated milestones for this company
      const { data: updated, error: fetchError } = await supabase
        .from('milestones')
        .select('*')
        .eq('company_id', clientId);
      
      if (fetchError) throw fetchError;

      if (updated) {
        // 3) Map and handle unlocking logic
        const mapped = updated.map((ms: any) => ({
          id: ms.id,
          clientId: ms.company_id,
          phase: ms.phase as GrowthPhase,
          title: ms.title,
          description: ms.description,
          weight: ms.weight,
          status: ms.status as MilestoneStatus,
          dueDate: ms.due_date,
          ownerRole: ms.owner_role ? (String(ms.owner_role).toUpperCase() as any) : undefined,
        }));

        const client = clients.find((c) => c.id === clientId);
        const finalMilestones = client ? unlockEligibleMilestones(mapped, clientId, client.phase) : mapped;
        
        setMilestones(finalMilestones);

        // 4) Re-calculate and persist progress
        if (client) {
          const progress = computePhaseProgress(finalMilestones, clientId, client.phase);
          const { error: compError } = await supabase.from('companies').update({ progress }).eq('id', clientId);
          if (compError) throw compError;

          // 5) Update local client state
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, upgradeReadiness: progress } : c));
        }
      }
    } catch (err) {
      console.error('Failed to update milestone or progress:', err);
      await refreshClients();
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('upgrade_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpgradeRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch upgrade requests:', err);
    }
  };

  const requestUpgrade = async (reason?: string) => {
    if (!selectedClientId || !session?.user) return;
    try {
      const nextPhase = selectedClient.phase === GrowthPhase.START ? GrowthPhase.SCALE : GrowthPhase.ELITE;
      const { error } = await supabase.from('upgrade_requests').insert({
        company_id: selectedClientId,
        requested_by: session.user.id,
        current_phase: selectedClient.phase,
        requested_phase: nextPhase,
        reason: reason
      });
      if (error) throw error;
      await fetchUpgradeRequests();
    } catch (err) {
      console.error('Failed to request upgrade:', err);
    }
  };

  const approveUpgrade = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('approve_upgrade', { p_request_id: requestId });
      if (error) throw error;
      await fetchUpgradeRequests();
    } catch (err) {
      console.error('Failed to approve upgrade:', err);
    }
  };

  const denyUpgrade = async (requestId: string, reason?: string) => {
    try {
      const { error } = await supabase.rpc('deny_upgrade', { p_request_id: requestId, p_reason: reason });
      if (error) throw error;
      await fetchUpgradeRequests();
    } catch (err) {
      console.error('Failed to deny upgrade:', err);
    }
  };

  const value: ClientContextValue = {
    clients,
    selectedClientId,
    selectedClient,
    milestones,
    leads,
    upgradeRequests,
    revenueHistory,
    loading,
    setSelectedClientId,
    updateClientPhase,
    updateClientHealthScore,
    updateMilestoneStatus,
    getClientById,
    getClientMilestones,
    refreshClients,
    fetchUpgradeRequests,
    requestUpgrade,
    approveUpgrade,
    denyUpgrade,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within a ClientProvider');
  return ctx;
}
