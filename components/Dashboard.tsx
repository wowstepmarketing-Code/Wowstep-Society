
import React, { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMarketTrends, getGrowthForecast, getLocalMarketIntelligence, isGeminiEnabled } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';
import { useMemo } from 'react';

const StatCard: React.FC<{ title: string; value: string; sub: string; trend?: string }> = ({ title, value, sub, trend }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 hover:border-brand-green/50 transition-all duration-500 group hover:shadow-2xl hover:shadow-brand-green/5">
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 group-hover:text-brand-green transition-colors">{title}</p>
    <div className="flex items-end gap-3">
      <h3 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tighter tabular-nums">{value}</h3>
      {trend && <span className="text-brand-green text-sm font-bold pb-1 bg-brand-green/10 px-2 rounded mb-1">{trend}</span>}
    </div>
    <p className="text-[11px] text-gray-500 mt-2 font-medium tracking-wide">{sub}</p>
  </div>
);

const LocationIntelligence: React.FC<{ brand: string; location: string; niche: string }> = ({ brand, location, niche }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ text: string; sources: any[] } | null>(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      if (!location || !isGeminiEnabled) return;
      setLoading(true);
      const res = await getLocalMarketIntelligence(brand, location, niche);
      setData(res);
      setLoading(false);
    };
    fetchLocationData();
  }, [location, brand, niche]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center border border-brand-green/30">
            <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="text-xl font-heading font-bold text-white tracking-tight">Geospatial Awareness</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-green/10 rounded-full border border-brand-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-[9px] font-bold text-brand-green uppercase tracking-[0.2em]">Maps Grounding</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-20 bg-white/5 rounded w-full" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="text-sm text-gray-400 leading-relaxed font-medium">
            {data.text}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((chunk: any, i: number) => (
              chunk.maps && (
                <a 
                  key={i} 
                  href={chunk.maps.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-300 hover:border-brand-green/50 hover:bg-brand-green/5 transition-all truncate"
                >
                  <svg className="w-3 h-3 text-brand-green" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  {chunk.maps.title || "Market Node"}
                </a>
              )
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Awaiting location sync</p>
        </div>
      )}
    </div>
  );
};

const NeuralTrendWatch: React.FC<{ niche: string; brand: string }> = ({ niche, brand }) => {
  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<{ text: string, sources: any[] }>({ text: '', sources: [] });

  useEffect(() => {
    const fetchTrends = async () => {
      if (!isGeminiEnabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await getMarketTrends(niche || "Luxury Strategy", brand);
      setIntelligence(res);
      setLoading(false);
    };
    fetchTrends();
  }, [niche, brand]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden h-full shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center border border-brand-gold/30">
             <div className="w-2 h-2 rounded-full bg-brand-gold animate-ping" />
          </div>
          <h3 className="text-xl font-heading font-bold tracking-tight text-white">Neural Trend Watch</h3>
        </div>
        <span className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.2em] bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">Live Intelligence</span>
      </div>

      {loading ? (
        <div className="space-y-4 py-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-24 bg-white/5 rounded w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-400 leading-relaxed font-medium">
            {intelligence.text}
          </div>
          
          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Strategic Verification</p>
            <div className="flex flex-wrap gap-2">
              {intelligence.sources.length > 0 ? intelligence.sources.map((chunk: any, i: number) => (
                chunk.web && (
                  <a 
                    key={i} 
                    href={chunk.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-gold/5 border border-brand-gold/20 rounded-xl text-[10px] font-bold text-brand-gold hover:bg-brand-gold/10 transition-all truncate"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    {chunk.web.title || "Source Intelligence"}
                  </a>
                )
              )) : (
                <span className="text-[10px] text-gray-600 italic font-bold">INTERNAL PROCESSING ONLY</span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-brand-gold/5 blur-[80px] rounded-full pointer-events-none" />
    </div>
  );
};

const StrategicForecast: React.FC<{ brand: string, mrr: number }> = ({ brand, mrr }) => {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<string | null>(null);

  const generateForecast = async () => {
    setLoading(true);
    const metrics = `Current MRR: $${mrr}. Trend: Aggressive Scaling.`;
    const res = await getGrowthForecast(brand, metrics);
    setForecast(res);
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-brand-green/20 via-black to-black border border-brand-green/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden h-full shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-heading font-bold text-white tracking-tight">Executive Forecasting</h3>
        <button 
          onClick={generateForecast}
          disabled={loading}
          className="px-5 py-2 bg-brand-green text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl border border-brand-green/50 hover:bg-brand-darkGreen transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-brand-green/20"
        >
          {loading ? 'Synthesizing...' : 'Project ROI'}
        </button>
      </div>

      {forecast ? (
        <div className="text-sm text-gray-400 leading-relaxed font-medium animate-in fade-in duration-700 whitespace-pre-line bg-white/5 p-6 rounded-2xl border border-white/5">
          {forecast}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
           <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
           <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Awaiting Executive Directive</p>
        </div>
      )}
      <div className="absolute -left-12 -top-12 w-48 h-48 bg-brand-green/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { selectedClient, milestones, leads, upgradeRequests, revenueHistory, getClientMilestones, refreshClients, requestUpgrade: contextRequestUpgrade } = useClient();
  const clientMilestones = getClientMilestones(selectedClient.id);
  const clientLeads = leads.filter(l => (l as any).company_id === selectedClient.id);
  const qualifiedLeads = clientLeads.filter(l => ['qualified', 'proposal', 'closed'].includes(l.stage)).length;
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  const clientRevenue = useMemo(() => {
    const history = revenueHistory.filter(h => h.company_id === selectedClient.id);
    if (history.length > 0) return history;
    // Fallback if no history yet
    return [
      { month: 'Jan', revenue: selectedClient.mrr * 0.6 },
      { month: 'Feb', revenue: selectedClient.mrr * 0.7 },
      { month: 'Mar', revenue: selectedClient.mrr * 0.8 },
      { month: 'Apr', revenue: selectedClient.mrr * 0.9 },
      { month: 'May', revenue: selectedClient.mrr },
    ];
  }, [revenueHistory, selectedClient.id, selectedClient.mrr]);

  // Phase Upgrade Request Logic
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMsg, setReqMsg] = useState<string | null>(null);

  const phase = String(selectedClient.phase).toUpperCase();
  const progress = Math.round(selectedClient.upgradeReadiness || 0);

  // Check if there's already a pending request
  const pendingRequest = upgradeRequests.find(r => r.company_id === selectedClient.id && r.status === 'pending');

  // regra simples: >= 80% e não ELITE e sem pedido pendente
  const canRequestUpgrade = phase !== 'ELITE' && progress >= 80 && !pendingRequest;

  const requestUpgrade = async () => {
    setReqBusy(true);
    setReqMsg(null);
    try {
      await contextRequestUpgrade(`Progress: ${progress}%. Requesting next phase.`);
      setReqMsg('Upgrade request sent to Wowstep Leadership.');
    } catch (e: any) {
      setReqMsg(e?.message || 'Could not send upgrade request.');
    } finally {
      setReqBusy(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-4 mb-3">
             <span className="text-[11px] font-bold text-brand-green uppercase tracking-[0.4em] bg-brand-green/10 px-4 py-1.5 rounded-full border border-brand-green/20">Executive Command</span>
             <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
             <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{time} EST</span>
          </div>
          <h1 className="text-3xl sm:text-6xl font-heading font-bold text-white tracking-tighter leading-none">Command Center.</h1>
          <p className="text-gray-500 mt-4 text-base sm:text-xl font-medium">
            Strategic ecosystem for <span className="text-white font-bold">{selectedClient.name}</span> currently optimizing in <span className="text-brand-green font-bold uppercase tracking-widest">{selectedClient.phase}</span>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-8 py-4 bg-brand-green text-white font-bold rounded-2xl hover:bg-brand-darkGreen transition-all shadow-2xl shadow-brand-green/20 active:scale-95 text-xs uppercase tracking-widest w-full sm:w-auto">
            Audit Strategy
          </button>
          <button className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-colors active:scale-95 text-xs uppercase tracking-widest w-full sm:w-auto">
            Evolution Board
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="relative p-5 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] bg-gradient-to-br from-brand-green/20 via-black to-brand-black border border-white/10 overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 group-hover:rotate-12 transform">
           <svg className="w-32 h-32 sm:w-64 sm:h-64 text-brand-green" fill="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
        
        <div className="max-w-3xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-white">Strategic Readiness</h3>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-3xl sm:text-4xl font-heading font-bold text-brand-green tabular-nums">{progress}%</div>
            </div>

            {canRequestUpgrade ? (
              <button
                onClick={requestUpgrade}
                disabled={reqBusy}
                className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                {reqBusy ? 'Requesting…' : 'Request Upgrade'}
              </button>
            ) : pendingRequest ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">Upgrade Pending Review</span>
              </div>
            ) : null}
          </div>
          
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-brand-green to-brand-green/40 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(6,78,59,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {reqMsg && (
            <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand-green bg-brand-green/10 border border-brand-green/20 rounded-xl p-3 animate-in fade-in">
              {reqMsg}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
             <div>
               <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Active Phase</p>
               <p className="text-white font-bold text-sm uppercase">{selectedClient.phase}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Health Metric</p>
               <p className="text-white font-bold text-sm">{selectedClient.healthScore}/100</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Target MRR</p>
               <p className="text-white font-bold text-sm">UP NEXT: $250k</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Session Integrity</p>
               <p className="text-brand-green font-bold text-sm">ENCRYPTED</p>
             </div>
          </div>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <StatCard 
          title="Consolidated MRR" 
          value={`$${(selectedClient.mrr / 1000).toFixed(0)}k`} 
          sub="Quarterly Momentum Shift"
          trend="+14.2%"
        />
        <StatCard 
          title="Lead Velocity" 
          value={String(qualifiedLeads)} 
          sub="Qualified Pipeline Units"
          trend={qualifiedLeads > 0 ? "+100%" : "0%"}
        />
        <StatCard 
          title="Authority Score" 
          value={`${selectedClient.healthScore}`} 
          sub="Global Market Perception"
          trend="+0.8"
        />
      </div>

      {/* Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <NeuralTrendWatch niche={(selectedClient as any).niche} brand={selectedClient.name} />
        <LocationIntelligence brand={selectedClient.name} location={(selectedClient as any).location} niche={(selectedClient as any).niche} />
        <StrategicForecast brand={selectedClient.name} mrr={selectedClient.mrr} />
      </div>

      {/* Revenue Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-12">
            <div>
              <h3 className="text-xl sm:text-2xl font-heading font-bold tracking-tight text-white">Revenue Trajectory</h3>
              <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">Sovereign financial overview of growth cycles.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[10px] px-4 py-2 bg-brand-green/20 border border-brand-green/30 rounded-xl font-bold text-brand-green uppercase tracking-widest">Quarterly View</span>
            </div>
          </div>
          <div className="h-[300px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientRevenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#064E3B" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#064E3B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis dataKey="month" stroke="#444" fontSize={11} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
                  itemStyle={{ color: '#064E3B', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#064E3B" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestone Vertical Feed */}
        <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 backdrop-blur-md relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-brand-green/5 blur-[100px] rounded-full" />
          <h3 className="text-xl sm:text-2xl font-heading font-bold mb-10 tracking-tight text-white">Active Objectives</h3>
          <div className="space-y-6">
            {clientMilestones.length > 0 ? clientMilestones.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center gap-5 group cursor-pointer">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  m.status === 'completed' 
                    ? 'bg-brand-green/20 border-brand-green/40 text-brand-green' 
                    : m.status === 'in-progress'
                      ? 'bg-brand-green border-brand-green text-white shadow-xl shadow-brand-green/40 scale-110'
                      : 'bg-white/5 border-white/10 text-gray-700'
                }`}>
                  {m.status === 'completed' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  {m.status === 'in-progress' && <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />}
                  {m.status === 'locked' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate transition-colors ${m.status === 'locked' ? 'text-gray-600' : 'text-white group-hover:text-brand-green'}`}>
                    {m.title}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold mt-1">{m.phase}</p>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30">
                <p className="text-xs font-bold uppercase tracking-widest">No Active Milestones</p>
              </div>
            )}
          </div>
          <button className="w-full mt-12 py-5 rounded-2xl border border-white/10 text-[11px] font-bold uppercase tracking-[0.4em] text-gray-500 hover:text-white hover:bg-brand-green/10 hover:border-brand-green/50 transition-all shadow-xl">
            Open Evolution Board
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
