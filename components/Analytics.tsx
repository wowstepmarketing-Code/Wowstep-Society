
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useClient } from '../context/ClientContext';
import { getAnalyticsInsight } from '../lib/gemini';
import { useMemo } from 'react';

const Analytics: React.FC = () => {
  const { selectedClient, companyMetrics } = useClient();
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const clientMetrics = useMemo(() => {
    const metrics = companyMetrics.filter(m => m.company_id === selectedClient.id);
    if (metrics.length > 0) {
      // Group by date/name for the chart
      // For simplicity, let's assume we have 'reach' and 'conv' metrics
      const grouped: any[] = [];
      metrics.forEach(m => {
        const date = new Date(m.recorded_at).toLocaleDateString([], { weekday: 'short' });
        let entry = grouped.find(g => g.name === date);
        if (!entry) {
          entry = { name: date, reach: 0, conv: 0 };
          grouped.push(entry);
        }
        if (m.metric_name === 'reach') entry.reach = m.metric_value;
        if (m.metric_name === 'conv') entry.conv = m.metric_value;
      });
      return grouped;
    }
    // Fallback
    return [
      { name: 'Mon', reach: 4000, conv: 2400 },
      { name: 'Tue', reach: 3000, conv: 1398 },
      { name: 'Wed', reach: 2000, conv: 9800 },
      { name: 'Thu', reach: 2780, conv: 3908 },
      { name: 'Fri', reach: 1890, conv: 4800 },
      { name: 'Sat', reach: 2390, conv: 3800 },
      { name: 'Sun', reach: 3490, conv: 4300 },
    ];
  }, [companyMetrics, selectedClient.id]);

  const summaryStats = useMemo(() => {
    const metrics = companyMetrics.filter(m => m.company_id === selectedClient.id);
    const getVal = (name: string, fallback: string) => {
      const m = metrics.filter(x => x.metric_name === name).pop();
      return m ? m.metric_value.toLocaleString() : fallback;
    };
    return [
      { label: 'Total Visits', val: getVal('total_visits', '284.5k'), change: '+14%' },
      { label: 'Avg Session', val: getVal('avg_session', '4m 32s'), change: '+2%' },
      { label: 'Bounce Rate', val: getVal('bounce_rate', '24.8%'), change: '-5%' },
      { label: 'Brand Loyalty', val: getVal('brand_loyalty', '88/100'), change: '+12' }
    ];
  }, [companyMetrics, selectedClient.id]);

  const generateInsight = async () => {
    setLoadingInsight(true);
    const metricsSummary = "Growth trend rising, reach peaking at 4000 on Mondays, conversion spike on Wednesdays.";
    const res = await getAnalyticsInsight(selectedClient.name, metricsSummary);
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
          <h3 className="text-xl font-heading font-bold mb-8">Brand Reach Efficiency</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{fill: '#ffffff05'}}
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Bar dataKey="reach" fill="#064E3B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-heading font-bold mb-8">Conversion Narrative</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="conv" stroke="#064E3B" strokeWidth={3} dot={{ fill: '#064E3B', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {summaryStats.map((stat, i) => (
           <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-brand-green/30 transition-colors">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{stat.val}</span>
                <span className={`text-[10px] font-bold ${stat.change.startsWith('+') ? 'text-brand-green' : 'text-red-500'}`}>{stat.change}</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Analytics;
