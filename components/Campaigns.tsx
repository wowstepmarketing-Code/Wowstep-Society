import React, { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import { Campaign } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getStrategyAdvice } from '../lib/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Campaigns: React.FC = () => {
  const { selectedClient } = useClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  // New Campaign State
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'Meta' as any,
    spend: '',
    revenue: '',
    status: 'active' as any,
    ctr: '',
    cpc: '',
    conversion_rate: '',
    cpm: '',
    impressions: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchCampaigns = async () => {
    if (selectedClient.id === 'loading') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', selectedClient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [selectedClient.id]);

  const handleOptimize = async () => {
    if (campaigns.length === 0) return;
    setOptimizing(true);
    setAiAdvice(null);
    
    const summary = campaigns.map(c => 
      `${c.name} (${c.platform}): Spend $${c.spend}, Revenue $${c.revenue}, CTR ${c.ctr ?? 0}%, CPC $${c.cpc ?? 0}, Conv ${c.conversion_rate ?? 0}%, CPM $${c.cpm ?? 0}, Imp ${c.impressions ?? 0}`
    ).join('. ');

    const res = await getStrategyAdvice(
      selectedClient.name, 
      selectedClient.phase, 
      `Analyze media deployment efficiency. Focus on ROI, CTR, and CPC. Suggest where to reallocate budget for maximum growth. Context: ${summary}`
    );
    
    setAiAdvice(res);
    setOptimizing(false);
  };

  const openAddModal = () => {
    setEditingCampaign(null);
    setFormData({
      name: '', platform: 'Meta', spend: '', revenue: '', status: 'active',
      ctr: '', cpc: '', conversion_rate: '', cpm: '', impressions: ''
    });
    setShowModal(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      platform: campaign.platform,
      spend: campaign.spend.toString(),
      revenue: campaign.revenue.toString(),
      status: campaign.status,
      ctr: (campaign.ctr || '').toString(),
      cpc: (campaign.cpc || '').toString(),
      conversion_rate: (campaign.conversion_rate || '').toString(),
      cpm: (campaign.cpm || '').toString(),
      impressions: (campaign.impressions || '').toString()
    });
    setShowModal(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        company_id: selectedClient.id,
        name: formData.name,
        platform: formData.platform,
        spend: Number(formData.spend) || 0,
        revenue: Number(formData.revenue) || 0,
        status: formData.status,
        ctr: Number(formData.ctr) || 0,
        cpc: Number(formData.cpc) || 0,
        conversion_rate: Number(formData.conversion_rate) || 0,
        cpm: Number(formData.cpm) || 0,
        impressions: Number(formData.impressions) || 0
      };

      if (editingCampaign) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaigns').insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to save campaign:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Decommission this strategic unit? Data history will be lost.")) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      fetchCampaigns();
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  const calculateTotalSpend = () => campaigns.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
  const calculateTotalRevenue = () => campaigns.reduce((acc, c) => acc + (Number(c.revenue) || 0), 0);
  const calculateROAS = () => {
    const spend = calculateTotalSpend();
    if (spend === 0) return 0;
    return (calculateTotalRevenue() / spend).toFixed(2);
  };

  const calculateAvgMetric = (key: keyof Campaign) => {
    if (campaigns.length === 0) return '0.00';
    const total = campaigns.reduce((acc, c) => acc + (Number(c[key]) || 0), 0);
    return (total / campaigns.length).toFixed(2);
  };

  const chartData = campaigns.map(c => ({
    name: c.name,
    roas: Number((Number(c.revenue) / (Number(c.spend) || 1)).toFixed(2)),
    spend: c.spend
  })).slice(0, 8);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.4em] bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20">Media Desk</span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Media Deployment</h1>
          <p className="text-gray-400 mt-1">High-fidelity oversight of global market acquisition channels.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={openAddModal}
            className="px-6 py-3 bg-white/5 text-white border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 text-sm shadow-xl"
          >
            Launch Strategic Unit
          </button>
          <button 
            onClick={handleOptimize}
            disabled={optimizing || campaigns.length === 0}
            className="px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-xl hover:brightness-110 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {optimizing ? <div className="w-4 h-4 border-2 border-brand-black/20 border-t-brand-black rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" /></svg>}
            AI Optimization Pulse
          </button>
        </div>
      </div>

      {aiAdvice && (
        <div className="bg-brand-gold/10 border border-brand-gold/30 p-10 rounded-[3rem] relative overflow-hidden group animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-brand-gold/5">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-gold" />
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold border border-brand-gold/30">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 15.05a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" /></svg>
             </div>
             <span className="text-[11px] font-bold text-brand-gold uppercase tracking-[0.5em]">Society Intelligence Directive</span>
          </div>
          <p className="text-2xl font-heading font-medium text-white leading-relaxed italic">"{aiAdvice}"</p>
        </div>
      )}

      {/* Deployment KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Total Spend</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">${calculateTotalSpend().toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Global ROAS</p>
          <h3 className="text-2xl font-heading font-bold text-brand-green tracking-tighter tabular-nums">{calculateROAS()}x</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Avg. CTR</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">{calculateAvgMetric('ctr')}%</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Avg. CPC</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">${calculateAvgMetric('cpc')}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Avg. Conv.</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">{calculateAvgMetric('conversion_rate')}%</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Avg. CPM</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">${calculateAvgMetric('cpm')}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-green/30 transition-all shadow-xl group">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 group-hover:text-brand-green transition-colors">Total Imp.</p>
          <h3 className="text-2xl font-heading font-bold text-white tracking-tighter tabular-nums">{(campaigns.reduce((a, b) => a + (Number(b.impressions) || 0), 0)).toLocaleString()}</h3>
        </div>
      </div>

      {/* Visual Analysis */}
      {campaigns.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-heading font-bold text-white">Efficiency Manifest</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Comparative ROAS performance by unit</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-brand-green rounded-sm" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Return on Ad Spend</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}x`} />
                <Tooltip 
                   cursor={{fill: '#ffffff05'}}
                   contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.roas >= 2 ? '#064E3B' : '#444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaign Ledger */}
      <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
           <h3 className="text-xl font-heading font-bold text-white">Campaign Execution Ledger</h3>
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/10">
             {campaigns.length} Strategic Units Active
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.03] border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.4em] text-gray-500">
              <tr>
                <th className="px-10 py-6">Unit Designation</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Spend</th>
                <th className="px-10 py-6 text-right">Impressions</th>
                <th className="px-10 py-6 text-right">CTR</th>
                <th className="px-10 py-6 text-right">CPM</th>
                <th className="px-10 py-6 text-right">CPC</th>
                <th className="px-10 py-6 text-right">Conv. Rate</th>
                <th className="px-10 py-6 text-right">ROAS</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-10 py-10"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : campaigns.length > 0 ? campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-8">
                    <div className="font-bold text-white group-hover:text-brand-green transition-colors text-lg tracking-tight">{c.name}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{c.platform}</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-brand-green shadow-[0_0_10px_rgba(6,78,59,0.5)]' : 'bg-gray-700'}`} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.status}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">${Number(c.spend).toLocaleString()}</td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">{Number(c.impressions ?? 0).toLocaleString()}</td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">{c.ctr ?? '0.00'}%</td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">${c.cpm ?? '0.00'}</td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">${c.cpc ?? '0.00'}</td>
                  <td className="px-10 py-8 text-right font-mono text-gray-400 text-sm tabular-nums">{c.conversion_rate ?? '0.00'}%</td>
                  <td className="px-10 py-8 text-right font-bold text-brand-green tabular-nums">{(Number(c.revenue) / (Number(c.spend) || 1)).toFixed(2)}x</td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(c)} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-brand-green/40 hover:text-brand-green transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-red-500/40 hover:text-red-500 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-10 py-24 text-center text-gray-600 font-bold uppercase tracking-[0.4em] text-xs">No media deployment data currently synchronized.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistence Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-brand-black border border-white/10 rounded-[2.5rem] p-12 w-full max-w-3xl shadow-2xl shadow-brand-green/10 max-h-[90vh] overflow-y-auto relative">
             <div className="flex justify-between items-start mb-10">
               <div>
                 <h2 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">
                   {editingCampaign ? 'Synchronize Unit' : 'Deploy Strategic Unit'}
                 </h2>
                 <p className="text-gray-500 text-sm">Update campaign performance metrics for sovereign audit.</p>
               </div>
               <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white p-2">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <form onSubmit={handleSaveCampaign} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Unit Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Q4 Elite Positioning"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Network Designation</label>
                    <select 
                      value={formData.platform}
                      onChange={(e) => setFormData({...formData, platform: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all appearance-none"
                    >
                      <option value="Meta">Meta Ads</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Google">Google Search</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="LinkedIn">LinkedIn</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Attributed Spend ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.spend}
                      onChange={(e) => setFormData({...formData, spend: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Attributed Revenue ($)</label>
                    <input 
                      type="number"
                      value={formData.revenue}
                      onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Impressions</label>
                    <input 
                      type="number"
                      value={formData.impressions}
                      onChange={(e) => setFormData({...formData, impressions: e.target.value})}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">CPM ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.cpm}
                      onChange={(e) => setFormData({...formData, cpm: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">CTR (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.ctr}
                      onChange={(e) => setFormData({...formData, ctr: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">CPC ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.cpc}
                      onChange={(e) => setFormData({...formData, cpc: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 mb-2 block">Conv. Rate (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.conversion_rate}
                      onChange={(e) => setFormData({...formData, conversion_rate: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 bg-white/5 text-gray-500 font-bold rounded-2xl hover:text-white transition-all border border-white/5"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-[2] py-4 bg-brand-green text-white font-bold rounded-2xl shadow-xl shadow-brand-green/20 hover:bg-brand-darkGreen transition-all disabled:opacity-50"
                  >
                    {saving ? 'Synchronizing...' : 'Finalize Manifest'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;