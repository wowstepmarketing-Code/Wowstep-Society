
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useClient } from '../context/ClientContext';
import { getAnalyticsInsight } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';
import { Campaign } from '../types';

const Analytics: React.FC = () => {
  const { selectedClient } = useClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchCampaigns = async () => {
    if (!selectedClient.id || selectedClient.id === 'loading') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', selectedClient.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [selectedClient.id]);

  const chartData = useMemo(() => {
    if (campaigns.length === 0) return [];
    // Group by date or just show campaigns
    return campaigns.map(c => ({
      name: c.name,
      spend: Number(c.spend),
      revenue: Number(c.revenue),
      impressions: c.impressions || 0
    }));
  }, [campaigns]);

  const stats = useMemo(() => {
    const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + Number(c.revenue), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';

    return [
      { label: 'Total Ad Spend', val: `$${(totalSpend / 1000).toFixed(1)}k`, change: 'Live' },
      { label: 'Total Revenue', val: `$${(totalRevenue / 1000).toFixed(1)}k`, change: 'Live' },
      { label: 'Avg ROAS', val: `${avgRoas}x`, change: 'Live' },
      { label: 'Total Impressions', val: `${(totalImpressions / 1000).toFixed(1)}k`, change: 'Live' }
    ];
  }, [campaigns]);

  const generateInsight = async () => {
    setLoadingInsight(true);
    const metricsSummary = campaigns.map(c => `${c.name}: $${c.spend} spend, $${c.revenue} revenue`).join('. ');
    const res = await getAnalyticsInsight(selectedClient.name, metricsSummary || "No active campaigns found.");
    setInsight(res);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Executive Analytics</h1>
          <p className="text-gray-400 mt-1">High-level brand performance and market impact metrics.</p>
        </div>
        <button 
          onClick={generateInsight}
          disabled={loadingInsight}
          className="px-6 py-2.5 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-darkGreen transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50 flex items-center gap-2"
        >
          {loadingInsight ? (
            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          )}
          Generate Strategic Narrative
        </button>
      </div>

      {insight && (
        <div className="bg-gradient-to-br from-brand-green/30 to-black border border-brand-green/40 p-8 rounded-3xl relative overflow-hidden group animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-green" />
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 15.05a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" /></svg>
             </div>
             <span className="text-[11px] font-bold text-brand-green uppercase tracking-[0.4em]">Society Intelligence Executive Summary</span>
          </div>
          <p className="text-xl font-heading font-medium text-white leading-relaxed max-w-4xl">
            "{insight}"
          </p>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-green/10 blur-3xl rounded-full" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-heading font-bold mb-8">Campaign Spend vs Revenue</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{fill: '#ffffff05'}}
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Bar dataKey="spend" fill="#064E3B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-heading font-bold mb-8">Impression Trajectory</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="impressions" stroke="#064E3B" strokeWidth={3} dot={{ fill: '#064E3B', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {stats.map((stat, i) => (
           <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-brand-green/30 transition-colors">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{stat.val}</span>
                <span className={`text-[10px] font-bold ${stat.change === 'Live' ? 'text-brand-green' : 'text-red-500'}`}>{stat.change}</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Analytics;
