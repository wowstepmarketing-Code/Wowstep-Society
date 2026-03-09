import React, { useMemo } from 'react';
import { GrowthPhase } from '../types';
import { useClient } from '../context/ClientContext';
import { getPhaseCompletionStats } from '../engine/milestones';

/**
 * Renders a specific growth phase card with progress metrics and milestone list.
 */
const PhaseSection: React.FC<{
  phase: GrowthPhase;
  current: GrowthPhase;
  description: string;
  items: string[];
  stats?: { total: number; completed: number; inProgress: number; locked: number };
  milestones?: { id: string; title: string; status: 'completed' | 'in-progress' | 'locked' }[];
}> = ({ phase, current, description, items, stats, milestones }) => {
  const isCompleted =
    (phase === GrowthPhase.START && current !== GrowthPhase.START) ||
    (phase === GrowthPhase.SCALE && current === GrowthPhase.ELITE);
  const isActive = current === phase;
  const isLocked = !isCompleted && !isActive;

  return (
    <div
      className={`relative p-8 rounded-2xl border transition-all duration-500 overflow-hidden ${
        isActive
          ? 'bg-brand-green/10 border-brand-green ring-1 ring-brand-green shadow-2xl shadow-brand-green/20 scale-[1.02]'
          : isCompleted
          ? 'bg-white/5 border-white/20 opacity-70'
          : 'bg-white/5 border-white/5 opacity-40 grayscale'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${isActive ? 'text-brand-green' : 'text-gray-500'}`}>
            Phase {phase === GrowthPhase.START ? '01' : phase === GrowthPhase.SCALE ? '02' : '03'}
          </span>
          <h2 className="text-3xl font-heading font-bold mt-1 text-white">{phase}</h2>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Milestones</span>
              <span className="text-[10px] font-bold text-white">{stats.completed}/{stats.total}</span>
            </div>
          )}

          <div
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
              isActive
                ? 'bg-brand-green text-white border-brand-green'
                : isCompleted
                ? 'bg-white/10 text-gray-400 border-white/10'
                : 'bg-transparent text-gray-600 border-white/5'
            }`}
          >
            {isCompleted ? 'Completed' : isActive ? 'Current Focus' : 'Locked'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <p className="text-gray-400 mb-8 leading-relaxed text-sm">
            {description}
          </p>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-green' : isCompleted ? 'bg-gray-500' : 'bg-gray-700'}`} />
                <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-gray-500'}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Milestone Feed */}
        <div className="bg-black/20 rounded-xl p-6 border border-white/5 space-y-4">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">Live Progress Feed</p>
          {milestones && milestones.length > 0 ? (
            milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      m.status === 'completed'
                        ? 'bg-brand-green'
                        : m.status === 'in-progress'
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-gray-700'
                    }`}
                  />
                  <span className={`text-xs truncate font-medium ${m.status === 'locked' ? 'text-gray-600' : 'text-white'}`}>
                    {m.title}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex-shrink-0">
                  {m.status.replace('-', ' ')}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-gray-600 italic">No specific milestones tracked for this phase yet.</p>
            </div>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="absolute inset-0 bg-brand-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase">Elite Level Required</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Roadmap: React.FC = () => {
  const { selectedClient, milestones: allMilestones } = useClient();

  // Helper function to get stats and milestones for a specific phase
  const getPhaseData = (phase: GrowthPhase) => {
    const stats = getPhaseCompletionStats(allMilestones, selectedClient.id, phase);
    const ms = allMilestones
      .filter((m) => m.clientId === selectedClient.id && m.phase === phase)
      .map((m) => ({ id: m.id, title: m.title, status: m.status }));
    return { stats, ms };
  };

  const startData = useMemo(() => getPhaseData(GrowthPhase.START), [allMilestones, selectedClient.id]);
  const scaleData = useMemo(() => getPhaseData(GrowthPhase.SCALE), [allMilestones, selectedClient.id]);
  const eliteData = useMemo(() => getPhaseData(GrowthPhase.ELITE), [allMilestones, selectedClient.id]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">Evolution Roadmap.</h1>
          <p className="text-gray-400 mt-2 text-base sm:text-lg">
            A structured strategic journey from establishing brand foundations to achieving global leadership authority.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Intelligence</p>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold">{selectedClient.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            <span className="text-brand-green font-bold text-xs uppercase">{selectedClient.phase}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <PhaseSection
          phase={GrowthPhase.START}
          current={selectedClient.phase}
          description="Laying the bedrock of your brand identity and establishing a clean, authoritative digital presence. This phase focuses on internal clarity before external scaling."
          items={['Positioning Refinement', 'Brand Identity Direction', 'Strategic Content Foundation', 'Digital Ecosystem Setup']}
          stats={startData.stats}
          milestones={startData.ms}
        />
        <PhaseSection
          phase={GrowthPhase.SCALE}
          current={selectedClient.phase}
          description="Accelerating authority through high-performance campaigns, sophisticated funnels, and advanced storytelling. We shift from foundation to active market acquisition."
          items={['Authority Building Campaigns', 'Funnel Optimization', 'Cross-Platform Scaling', 'Executive Branding Strategy']}
          stats={scaleData.stats}
          milestones={scaleData.ms}
        />
        <PhaseSection
          phase={GrowthPhase.ELITE}
          current={selectedClient.phase}
          description="Unlocking the peak of brand influence. National/International expansion, premium PR, and legacy industry leadership. This is where market dominance is solidified."
          items={['Public Relations Dominance', 'Multilingual Authority (PT/EN)', 'Market Expansion Strategy', 'Legacy Brand Leadership']}
          stats={eliteData.stats}
          milestones={eliteData.ms}
        />
      </div>
    </div>
  );
};

export default Roadmap;