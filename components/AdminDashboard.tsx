
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GrowthPhase } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useClient } from '../context/ClientContext';

type CompanyRow = {
  id: string;
  name: string;
  phase: GrowthPhase | string;
  revenue: number | null;
  progress: number | null;
  healthScore?: number;
  lastActivity?: string;
  created_at?: string;
  owner?: string;
  ownerId?: string;
};

type UpgradeRequestRow = {
  id: string;
  company_id: string;
  from_phase: string;
  to_phase: string;
  status: string;
  note: string | null;
  created_at: string;
  company_name?: string;
};

const PHASES: GrowthPhase[] = [GrowthPhase.START, GrowthPhase.SCALE, GrowthPhase.ELITE];

/**
 * Modular component for managing individual brand entities in the executive ledger.
 */
// Fix: Removed duplicate AdminCompanyRow declaration from bottom of file
const AdminCompanyRow: React.FC<{ company: CompanyRow; onSaved: () => void }> = ({ company, onSaved }) => {
  const [busy, setBusy] = useState(false);
  const [ownerName, setOwnerName] = useState(company.owner || 'Unassigned');
  const { setSelectedClientId } = useClient();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOwner = async () => {
      if (ownerName === 'Unassigned' && company.ownerId) {
        try {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', company.ownerId)
            .single();
          
          if (ownerProfile?.full_name) {
            setOwnerName(ownerProfile.full_name);
          }
        } catch (err) {
          console.error("Failed to fetch owner profile:", err);
        }
      }
    };
    fetchOwner();
  }, [company.owner, company.ownerId]);

  const updatePhase = async (nextPhase: GrowthPhase) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ phase: nextPhase })
        .eq('id', company.id);

      if (error) throw error;
      onSaved();
    } catch (e) {
      console.error("Phase transition failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const viewCompany = (path = '/dashboard') => {
    setSelectedClientId(company.id);
    navigate(path);
  };

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="py-6">
        <div className="font-bold text-white group-hover:text-brand-green transition-colors">
          {company.name}
        </div>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-3">
          <span>Owner: {ownerName}</span>
          <div className="flex items-center gap-2">
            <Link to={`/messages?company=${company.id}`} className="text-gray-600 hover:text-brand-green transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </Link>
            <Link to={`/documents?company=${company.id}`} className="text-gray-600 hover:text-brand-green transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
            </Link>
          </div>
        </div>
      </td>
      <td className="py-6">
        <span className={`text-[9px] font-bold px-3 py-1 rounded-full border tracking-widest ${
          String(company.phase).toUpperCase() === 'ELITE' ? 'border-brand-gold/40 text-brand-gold bg-brand-gold/5' :
          String(company.phase).toUpperCase() === 'SCALE' ? 'border-brand-green/40 text-brand-green bg-brand-green/5' :
          'border-gray-700 text-gray-500 bg-white/5'
        }`}>
          {String(company.phase).toUpperCase()}
        </span>
      </td>
      <td className="py-6">
        <div className="flex items-center gap-3">
           <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-brand-green transition-all duration-700" style={{ width: `${company.progress || 0}%` }} />
           </div>
           <span className="text-[10px] font-bold text-gray-500">{Math.round(company.progress || 0)}%</span>
        </div>
      </td>
      <td className="py-6">
        <div className="text-white font-bold text-xs">
          ${(company.revenue || 0).toLocaleString()}
        </div>
      </td>
      <td className="py-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            (company.healthScore || 0) > 80 ? 'bg-brand-green' :
            (company.healthScore || 0) > 40 ? 'bg-brand-gold' : 'bg-red-500'
          }`} />
          <span className="text-white font-bold text-xs">{company.healthScore || 0}</span>
        </div>
      </td>
      <td className="py-6">
        <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
          {company.lastActivity ? new Date(company.lastActivity).toLocaleDateString() : 'N/A'}
        </div>
      </td>
      <td className="py-6 text-right">
        <div className="inline-flex items-center gap-3">
          <button
            onClick={viewCompany}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            View
          </button>
          <select
            value={String(company.phase).toUpperCase()}
            onChange={(e) => updatePhase(e.target.value as GrowthPhase)}
            disabled={busy}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-brand-green transition-all appearance-none cursor-pointer"
          >
            {PHASES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  );
};

const AdminDashboard: React.FC = () => {
  const { clients, upgradeRequests, refreshClients, approveUpgrade, denyUpgrade, loading } = useClient();
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [reqErr, setReqErr] = useState<string | null>(null);

  const pendingRequests = useMemo(() => {
    return upgradeRequests
      .filter(r => r.status === 'pending')
      .map(r => ({
        ...r,
        company_name: clients.find(c => c.id === r.company_id)?.name || r.company_id
      }));
  }, [upgradeRequests, clients]);

  const totals = useMemo(() => {
    const totalRevenue = clients.reduce((acc, c) => acc + (c.mrr || 0), 0);
    const startCount = clients.filter(c => String(c.phase).toUpperCase() === 'START').length;
    const scaleCount = clients.filter(c => String(c.phase).toUpperCase() === 'SCALE').length;
    const eliteCount = clients.filter(c => String(c.phase).toUpperCase() === 'ELITE').length;
    return { totalRevenue, startCount, scaleCount, eliteCount };
  }, [clients]);

  const approve = async (id: string) => {
    setDecidingId(id);
    try {
      await approveUpgrade(id);
    } catch (e: any) {
      setReqErr(e?.message || 'Failed to approve.');
    } finally {
      setDecidingId(null);
    }
  };

  const deny = async (id: string) => {
    setDecidingId(id);
    try {
      await denyUpgrade(id, 'Denied by admin.');
    } catch (e: any) {
      setReqErr(e?.message || 'Failed to deny.');
    } finally {
      setDecidingId(null);
    }
  };

  const formattedCompanies = useMemo(() => {
    return clients.map(c => ({
      ...c,
      healthScore: c.healthScore || 0,
      lastActivity: c.lastActivity || undefined
    }));
  }, [clients]);

  const [briefing, setBriefing] = useState('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', niche: '', location: '', revenue: 0 });

  const generateBriefing = async () => {
    setLoadingBriefing(true);
    const res = "Global ecosystem briefing is currently unavailable. Portfolio metrics are stabilizing.";
    setBriefing(res);
    setLoadingBriefing(false);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) return;
    
    try {
      const { data, error } = await supabase.from('companies').insert({
        name: newCompany.name,
        niche: newCompany.niche,
        location: newCompany.location,
        revenue: newCompany.revenue,
        phase: GrowthPhase.START,
        status: 'Growth'
      }).select().single();

      if (error) throw error;

      // Also create a membership for the current user as owner
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('memberships').insert({
          company_id: data.id,
          user_id: userData.user.id,
          role: 'owner'
        });
      }

      setIsAdding(false);
      setNewCompany({ name: '', niche: '', location: '', revenue: 0 });
      await refreshClients();
    } catch (err) {
      console.error('Failed to add company:', err);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-heading font-bold text-white tracking-tight">Admin Control</h1>
          <p className="text-gray-400 mt-1">Sovereign portfolio visibility and entity evolution.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link 
            to="/admin/approvals"
            className="w-full sm:w-auto px-5 py-2.5 bg-white/5 text-white font-bold rounded-lg border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Company Approvals
          </Link>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-darkGreen transition-all shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Company
          </button>
          <button 
            onClick={generateBriefing}
            disabled={loadingBriefing}
            className="w-full sm:w-auto px-5 py-2.5 bg-white/5 text-white font-bold rounded-lg border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            {loadingBriefing ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            Briefing
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-black border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Register New Entity</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Company Name</label>
                <input 
                  type="text" 
                  required
                  value={newCompany.name}
                  onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Niche / Industry</label>
                <input 
                  type="text" 
                  value={newCompany.niche}
                  onChange={e => setNewCompany({...newCompany, niche: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. SaaS, E-commerce"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Location</label>
                <input 
                  type="text" 
                  value={newCompany.location}
                  onChange={e => setNewCompany({...newCompany, location: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. New York, Remote"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Starting MRR ($)</label>
                <input 
                  type="number" 
                  value={newCompany.revenue}
                  onChange={e => setNewCompany({...newCompany, revenue: Number(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-6 py-3 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-darkGreen transition-all"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {briefing && (
        <div className="bg-gradient-to-br from-brand-green/20 to-black border border-brand-green/30 p-8 rounded-3xl relative overflow-hidden group animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green" />
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 15.05a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" /></svg>
             </div>
             <span className="text-[11px] font-bold text-brand-green uppercase tracking-[0.4em]">Society Master Intelligence Briefing</span>
          </div>
          <p className="text-xl font-heading font-medium text-white leading-relaxed max-w-5xl whitespace-pre-wrap">
            {briefing}
          </p>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-green/10 blur-3xl rounded-full" />
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-2xl p-4 sm:p-6">
          <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">Portfolio Revenue (MRR)</p>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">
            ${Math.round(totals.totalRevenue).toLocaleString()}
          </h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Start Phase</p>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">{totals.startCount}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Scale Phase</p>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">{totals.scaleCount}</h3>
        </div>
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 sm:p-6">
          <p className="text-[10px] font-bold text-brand-gold uppercase tracking-widest mb-1">Elite Phase</p>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">{totals.eliteCount}</h3>
        </div>
      </div>

      {/* Upgrade Requests UI Block */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-heading font-bold text-white">Upgrade Requests</h3>
          <button
            onClick={refreshClients}
            className="px-4 py-2 text-xs font-bold border border-white/10 rounded-lg hover:bg-white/5 transition-all text-gray-400 hover:text-white uppercase tracking-widest"
          >
            Refresh Requests
          </button>
        </div>

        {reqErr && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            {reqErr}
          </div>
        )}

        {pendingRequests.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 italic">No pending evolution petitions found.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/30 border border-white/10 rounded-xl p-4 hover:border-brand-green/30 transition-all">
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{r.company_name}</p>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                    {r.from_phase} → <span className="text-brand-green font-bold">{r.to_phase}</span> • {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.note && <p className="text-gray-400 text-xs mt-2 italic leading-relaxed">"{r.note}"</p>}
                </div>

                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => deny(r.id)}
                    disabled={decidingId === r.id}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-bold border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 uppercase tracking-widest disabled:opacity-50"
                  >
                    {decidingId === r.id ? '...' : 'Deny'}
                  </button>
                  <button
                    onClick={() => approve(r.id)}
                    disabled={decidingId === r.id}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-brand-green text-white rounded-lg hover:bg-brand-darkGreen uppercase tracking-widest shadow-lg shadow-brand-green/20 disabled:opacity-50"
                  >
                    {decidingId === r.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase Control Ledger UI Block */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl sm:rounded-[2rem] p-4 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-heading font-bold text-white tracking-tight">Company Phase Control</h3>
          <button
            onClick={refreshClients}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all w-full sm:w-auto"
          >
            Refresh Ledger
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold border-b border-white/5">
              <tr>
                <th className="py-5">Entity</th>
                <th className="py-5">Growth Tier</th>
                <th className="py-5">Upgrade Progress</th>
                <th className="py-5">MRR</th>
                <th className="py-5">Health</th>
                <th className="py-5">Last Activity</th>
                <th className="py-5 text-right">Strategic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-600 animate-pulse">Syncing executive assets...</td>
                </tr>
              ) : formattedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-600 italic">No companies managed in portfolio.</td>
                </tr>
              ) : (
                formattedCompanies.map((c) => (
                  <AdminCompanyRow key={c.id} company={c as any} onSaved={refreshClients} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
