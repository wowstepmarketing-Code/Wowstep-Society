
import React, { useMemo, useState } from 'react';
import { GrowthPhase, UserRole, MilestoneStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import { suggestNextObjective, generateStrategicRoadmap } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';

const StrategyBoard: React.FC = () => {
  const { profile } = useAuth();
  const { selectedClient, getClientMilestones, updateMilestoneStatus, refreshClients } = useClient();
  const [phaseFilter, setPhaseFilter] = useState<GrowthPhase | 'ALL'>('ALL');
  
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [architecting, setArchitecting] = useState(false);

  const milestones = useMemo(() => {
    const all = getClientMilestones(selectedClient.id);
    if (phaseFilter === 'ALL') return all;
    return all.filter((m) => m.phase === phaseFilter);
  }, [getClientMilestones, selectedClient.id, phaseFilter]);

  const isAdmin = profile?.role === UserRole.ADMIN;

  const cycleStatus = (current: MilestoneStatus): MilestoneStatus => {
    if (current === 'locked') return 'in-progress';
    if (current === 'in-progress') return 'completed';
    return 'completed';
  };

  const statusDot = (status: MilestoneStatus) => {
    if (status === 'completed') return 'bg-brand-green shadow-[0_0_10px_rgba(6,78,59,0.5)]';
    if (status === 'in-progress') return 'bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-gray-700';
  };

  const statusLabel = (status: MilestoneStatus) => {
    if (status === 'completed') return 'Completed';
    if (status === 'in-progress') return 'In Progress';
    return 'Locked';
  };

  const handleSuggest = async () => {
    setLoadingSuggestion(true);
    const res = await suggestNextObjective(selectedClient.name, selectedClient.phase);
    setSuggestion(res);
    setLoadingSuggestion(false);
  };

  const handleArchitectRoadmap = async () => {
    if (!isAdmin) return;
    if (!confirm(`Manifest custom AI roadmap for ${selectedClient.name}? Existing phase milestones will persist.`)) return;
    
    setArchitecting(true);
    try {
      const niche = (selectedClient as any).niche || "Luxury Growth";
      const roadmap = await generateStrategicRoadmap(selectedClient.name, niche, selectedClient.phase);
      
      if (roadmap && roadmap.length > 0) {
        const toInsert = roadmap.map((item: any) => ({
          company_id: selectedClient.id,
          phase: selectedClient.phase,
          title: item.title,
          description: item.description,
          weight: item.weight,
          status: 'locked'
        }));

        const { error } = await supabase.from('milestones').insert(toInsert);
        if (error) throw error;
        await refreshClients();
      }
    } catch (err) {
      console.error("Strategy manifestation failed:", err);
      alert("Neural architect failure. Re-attempt protocol.");
    } finally {
      setArchitecting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Strategy Board</h1>
          <p className="text-gray-400 mt-1">
            Milestone tracking and execution alignment for <span className="text-white font-bold">{selectedClient.name}</span>.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {isAdmin && (
            <button 
              onClick={handleArchitectRoadmap}
              disabled={architecting}
              className="px-4 py-2 text-xs font-bold border border-brand-green/30 text-brand-green rounded-lg hover:bg-brand-green/10 transition-all flex items-center gap-2"
            >
              {architecting ? (
                <div className="w-3 h-3 border-2 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              )}
              Manifest AI Roadmap
            </button>
          )}

          <button 
            onClick={handleSuggest}
            disabled={loadingSuggestion}
            className="px-4 py-2 text-xs font-bold bg-brand-green text-white rounded-lg hover:bg-brand-darkGreen transition-all flex items-center gap-2 shadow-lg shadow-brand-green/20 disabled:opacity-50"
          >
            {loadingSuggestion ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            Society Advice
          </button>

          <div className="px-3 py-2 text-xs font-bold border border-white/10 rounded-lg bg-white/5">
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as any)}
              className="bg-transparent text-gray-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Phases</option>
              <option value={GrowthPhase.START}>Start</option>
              <option value={GrowthPhase.SCALE}>Scale</option>
              <option value={GrowthPhase.ELITE}>Elite</option>
            </select>
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="bg-gradient-to-r from-brand-green/20 to-black border border-brand-green/30 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-20 h-20 text-brand-green" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 15.05a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" /></svg>
          </div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-brand-green font-bold text-[10px] uppercase tracking-[0.3em]">AI Strategic Insight</span>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            </div>
            <button onClick={() => setSuggestion(null)} className="text-gray-600 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <h4 className="text-white font-bold text-lg mb-1 relative z-10">{suggestion.title}</h4>
          <p className="text-gray-400 text-sm italic relative z-10">{suggestion.description}</p>
          <div className="mt-4 flex items-center gap-4 relative z-10">
            <button className="text-[10px] font-bold text-brand-green uppercase tracking-widest hover:underline">
              Adopt Objective
            </button>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Priority Score: {suggestion.weight}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {milestones.length > 0 ? milestones.map((m) => {
          const isLocked = m.status === 'locked';
          const canChangeThis = isAdmin && !isLocked;

          return (
            <div
              key={m.id}
              className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all duration-300 shadow-xl overflow-hidden"
            >
              {m.status === 'completed' && (
                 <div className="absolute top-0 right-0 w-24 h-24 -mt-12 -mr-12 bg-brand-green opacity-5 rounded-full" />
              )}
              
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                    m.status === 'completed' ? 'border-brand-green/30 text-brand-green bg-brand-green/5' : 'border-white/5 text-gray-500 bg-white/5'
                  }`}
                >
                  {m.phase}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {statusLabel(m.status)}
                  </span>
                  <div className={`w-2.5 h-2.5 rounded-full ${statusDot(m.status)}`} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-green transition-colors">{m.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 h-12 overflow-hidden text-ellipsis line-clamp-3">
                {m.description ??
                  `Strategic objective for the ${m.phase} phase.`}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-brand-green border border-black flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    {profile?.full_name?.charAt(0) || 'E'}
                  </div>
                  {/* Fixed: changed owner_role to ownerRole to match Milestone type */}
                  {m.ownerRole && (
                    <div className="w-7 h-7 rounded-full bg-white/10 border border-black flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {/* Fixed: changed owner_role to ownerRole to match Milestone type */}
                      {m.ownerRole.charAt(0)}
                    </div>
                  )}
                </div>

                <button
                  className={`text-[10px] font-bold uppercase tracking-widest transition-all ${
                    m.status === 'completed'
                      ? 'text-brand-green'
                      : canChangeThis
                      ? 'text-gray-400 hover:text-white hover:scale-105'
                      : 'text-gray-600'
                  }`}
                  onClick={() => {
                    if (!canChangeThis) return;
                    updateMilestoneStatus(selectedClient.id, m.id, cycleStatus(m.status));
                  }}
                >
                  {m.status === 'completed' ? 'Archived Results' : canChangeThis ? 'Advance Status' : 'Locked Objective'}
                </button>
              </div>

              {isLocked && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <svg
                    className="w-10 h-10 text-brand-green/40 mb-3 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white px-4 py-1.5 bg-brand-green/20 rounded-full border border-brand-green/30">
                    Dependencies Pending
                  </span>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-700 mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Strategic Void Encountered</p>
            <p className="text-gray-600 text-sm mt-2 max-w-xs">No active milestones for this filter. Use the AI Architect to manifest a new strategy.</p>
            {isAdmin && (
              <button 
                onClick={handleArchitectRoadmap}
                className="mt-8 px-6 py-2.5 bg-brand-green text-white font-bold rounded-xl shadow-lg shadow-brand-green/20"
              >
                Manifest First Roadmap
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyBoard;
