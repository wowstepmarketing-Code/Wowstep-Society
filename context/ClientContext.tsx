
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { GrowthPhase, Milestone, MilestoneStatus, UserRole, CRMLead } from '../types';
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
  nextMilestone: string;
  nextMilestoneDue: string;
  owner: string;
  lastClientReplyAt: string;
  niche?: string;
  location?: string;
}

interface ClientContextValue {
  clients: SocietyClient[];
  selectedClientId: string;
  selectedClient: SocietyClient;
  milestones: Milestone[];
  leads: CRMLead[];
  documents: any[];
  upgradeRequests: any[];
  revenueHistory: any[];
  companyMetrics: any[];
  loading: boolean;
  setSelectedClientId: (id: string) => void;
  updateClientPhase: (id: string, phase: GrowthPhase) => void;
  updateClientHealthScore: (id: string, healthScore: number) => void;
  updateMilestoneStatus: (clientId: string, milestoneId: string, status: MilestoneStatus) => void;
  deleteDocument: (id: string) => Promise<void>;
  getClientById: (id: string) => SocietyClient | undefined;
  getClientMilestones: (clientId: string) => Milestone[];
  refreshClients: () => Promise<void>;
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
  nextMilestone: '',
  nextMilestoneDue: '',
  owner: '',
  lastClientReplyAt: '',
};

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading: authLoading } = useAuth();

  const onboardingComplete = !!profile?.onboarding_complete;
  const isAdmin = profile?.role === UserRole.ADMIN;

  const [clients, setClients] = useState<SocietyClient[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [companyMetrics, setCompanyMetrics] = useState<any[]>([]);
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
          .select('id,name,phase,revenue,progress,niche,location,created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        companyRows = data ?? [];
      } else {
        const { data, error } = await supabase
          .from('memberships')
          .select('company_id, companies (id,name,phase,revenue,progress,niche,location,created_at)')
          .eq('user_id', session.user.id);

        if (error) throw error;
        companyRows = (data ?? []).map((m: any) => m.companies).filter(Boolean);
      }

      // 2) Fetch milestones for these companies
      const companyIds = companyRows.map((c) => c.id);
      let dbMilestones: Milestone[] = [];
      if (companyIds.length > 0) {
        const { data: milestoneData, error: msError } = await supabase
          .from('milestones')
          .select('id,company_id,phase,title,description,weight,status,due_date,owner_role')
          .in('company_id', companyIds);

        if (msError) throw msError;

        dbMilestones = (milestoneData ?? []).map((ms: any) => ({
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
      }

      // 3) Fetch memberships to find owners/PMs
      let membershipRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: mData } = await supabase
          .from('memberships')
          .select('company_id, role, profiles(full_name)')
          .in('company_id', companyIds);
        membershipRows = mData ?? [];
      }

      // 4) Fetch leads
      let leadRows: CRMLead[] = [];
      if (companyIds.length > 0) {
        const { data: lData } = await supabase
          .from('leads')
          .select('id, company_id, name, company_name, value, stage')
          .in('company_id', companyIds);
        
        leadRows = (lData ?? []).map((l: any) => ({
          id: l.id,
          name: l.name,
          company: l.company_name,
          value: Number(l.value),
          stage: l.stage as any,
          company_id: l.company_id
        }));
      }

      // 5) Fetch documents
      let docRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: dData } = await supabase
          .from('company_documents')
          .select('*')
          .in('company_id', companyIds);
        docRows = dData ?? [];
      }

      // 6) Fetch upgrade requests
      let upgradeRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: uData } = await supabase
          .from('upgrade_requests')
          .select('*')
          .in('company_id', companyIds);
        upgradeRows = uData ?? [];
      }
      
      // 7) Fetch revenue history
      let revenueRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: rData } = await supabase
          .from('revenue_history')
          .select('*')
          .in('company_id', companyIds)
          .order('created_at', { ascending: true });
        revenueRows = rData ?? [];
      }

      // 8) Fetch company metrics
      let metricRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: mData } = await supabase
          .from('company_metrics')
          .select('*')
          .in('company_id', companyIds)
          .order('recorded_at', { ascending: true });
        metricRows = mData ?? [];
      }

      // 7) Fetch last activity (latest message)
      let lastActivityRows: any[] = [];
      if (companyIds.length > 0) {
        const { data: laData } = await supabase
          .from('company_messages')
          .select('company_id, created_at')
          .in('company_id', companyIds)
          .order('created_at', { ascending: false });
        lastActivityRows = laData ?? [];
      }

      const societyClients: SocietyClient[] = (companyRows || []).map((c: any) => {
        const clientMilestones = dbMilestones.filter(m => m.clientId === c.id);
        const nextMs = clientMilestones.find(m => m.status !== 'completed') || clientMilestones[clientMilestones.length - 1];
        const owner = (membershipRows.find(m => m.company_id === c.id && (m.role === 'owner' || m.role === 'pm'))?.profiles as any)?.full_name || 'Unassigned';
        
        // Derived Health Score: (Completed / Total) * 100 for current phase
        const phaseMs = clientMilestones.filter(m => m.phase === c.phase);
        const completedMs = phaseMs.filter(m => m.status === 'completed').length;
        const healthScore = phaseMs.length > 0 ? Math.round((completedMs / phaseMs.length) * 100) : 100;

        // Last Activity
        const lastMsg = lastActivityRows.find(la => la.company_id === c.id);
        const lastClientReplyAt = lastMsg?.created_at || c.created_at;

        return {
          id: c.id,
          name: c.name,
          phase: (c.phase ?? GrowthPhase.START) as GrowthPhase,
          mrr: Number(c.revenue ?? 0),
          ltv: Number(c.revenue ?? 0) * 12, // Simple LTV estimation
          healthScore,
          upgradeReadiness: Number(c.progress ?? 0),
          status: Number(c.progress ?? 0) > 80 ? 'Platinum' : Number(c.progress ?? 0) > 40 ? 'Growth' : 'Stable',
          nextMilestone: nextMs?.title || 'Initial Setup',
          nextMilestoneDue: nextMs?.dueDate || new Date().toISOString(),
          owner,
          lastClientReplyAt,
          niche: c.niche,
          location: c.location
        };
      });

      setClients(societyClients);
      setMilestones(dbMilestones);
      setLeads(leadRows);
      setDocuments(docRows);
      setUpgradeRequests(upgradeRows);
      setRevenueHistory(revenueRows);
      setCompanyMetrics(metricRows);

      // Set selected client safely
      if (societyClients.length > 0) {
        setSelectedClientIdState((prev) => {
          if (prev && societyClients.some((c) => c.id === prev)) return prev;
          return societyClients[0].id;
        });
      } else {
        setSelectedClientIdState('');
      }
    } catch (err) {
      console.error('Failed to sync client data:', err);
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

  const updateMilestoneStatus = async (clientId: string, milestoneId: string, status: MilestoneStatus) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // 1. Calculate updated states
    const updatedMilestones = milestones.map((m) => 
      (m.id === milestoneId && m.clientId === clientId ? { ...m, status } : m)
    );
    const finalMilestones = unlockEligibleMilestones(updatedMilestones, clientId, client.phase);
    const newProgress = computePhaseProgress(finalMilestones, clientId, client.phase);

    // 2. Optimistic updates
    setMilestones(finalMilestones);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, upgradeReadiness: newProgress } : c));

    try {
      // 3. Identify newly unlocked milestones to persist them too
      const newlyUnlocked = finalMilestones.filter(m => {
        const original = milestones.find(o => o.id === m.id);
        return original && original.status === 'locked' && m.status === 'in-progress';
      });

      const persistPromises = [
        supabase.from('milestones').update({ status }).eq('id', milestoneId),
        supabase.from('companies').update({ progress: newProgress }).eq('id', clientId)
      ];

      newlyUnlocked.forEach(m => {
        persistPromises.push(supabase.from('milestones').update({ status: 'in-progress' }).eq('id', m.id));
      });

      const results = await Promise.all(persistPromises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;

    } catch (err) {
      console.error('Failed to sync milestone update:', err);
      // Re-sync with server on error
      refreshClients();
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;

      // 1. Delete from storage if storage_path exists
      if (doc.storage_path) {
        await supabase.storage.from('documents').remove([doc.storage_path]);
      }

      // 2. Delete from DB
      const { error } = await supabase.from('company_documents').delete().eq('id', id);
      if (error) throw error;

      // 3. Update local state
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
      throw err;
    }
  };

  const updateClientPhase = async (id: string, phase: GrowthPhase) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, phase } : c)));
    setMilestones((prev) => unlockEligibleMilestones(prev, id, phase));

    try {
      await supabase.from('companies').update({ phase }).eq('id', id);
    } catch (err) {
      console.error('Failed to update company phase:', err);
    }
  };

  const updateClientHealthScore = (id: string, healthScore: number) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, healthScore: clamp(healthScore) } : c)));
  };

  const value: ClientContextValue = {
    clients,
    selectedClientId,
    selectedClient,
    milestones,
    leads,
    documents,
    upgradeRequests,
    revenueHistory,
    companyMetrics,
    loading,
    setSelectedClientId,
    updateClientPhase,
    updateClientHealthScore,
    updateMilestoneStatus,
    deleteDocument,
    getClientById,
    getClientMilestones,
    refreshClients,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within a ClientProvider');
  return ctx;
}
