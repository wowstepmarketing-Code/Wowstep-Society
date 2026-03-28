
import React, { useState, useEffect } from 'react';
import { useClient } from '../context/ClientContext';
import { generateLeadOutreach } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';
import { CRMLead } from '../types';

const CRM: React.FC = () => {
  const { selectedClient } = useClient();
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'] as const;
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [script, setScript] = useState<{leadId: string, content: string} | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', company: '', value: 0 });

  const fetchLeads = async () => {
    if (!selectedClient.id || selectedClient.id === 'loading') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', selectedClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedClient.id]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.company) return;
    
    try {
      const { error } = await supabase.from('leads').insert({
        company_id: selectedClient.id,
        name: newLead.name,
        company: newLead.company,
        value: newLead.value,
        stage: 'new'
      });
      if (error) throw error;
      setIsAdding(false);
      setNewLead({ name: '', company: '', value: 0 });
      fetchLeads();
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  const handleAIOutreach = async (leadId: string, leadName: string, company: string) => {
    setGenerating(leadId);
    const text = await generateLeadOutreach(selectedClient.name, leadName, company);
    setScript({ leadId, content: text });
    setGenerating(null);
  };

  const updateLeadStage = async (leadId: string, stage: CRMLead['stage']) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l));
    try {
      const { error } = await supabase.from('leads').update({ stage }).eq('id', leadId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update lead stage:', err);
      fetchLeads(); // Rollback
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">Lead Pipeline</h1>
          <p className="text-gray-400 mt-1">Manage executive relationships and brand growth opportunities.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto px-6 py-2.5 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-darkGreen transition-colors flex items-center justify-center"
        >
          Add New Opportunity
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-black border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">New Opportunity</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Lead Name</label>
                <input 
                  type="text" 
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Company</label>
                <input 
                  type="text" 
                  required
                  value={newLead.company}
                  onChange={e => setNewLead({...newLead, company: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Estimated Value ($)</label>
                <input 
                  type="number" 
                  value={newLead.value}
                  onChange={e => setNewLead({...newLead, value: Number(e.target.value)})}
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
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-8 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-[1500px]">
          {stages.map((stage) => (
            <div key={stage} className="w-[280px] sm:w-[320px] flex flex-col bg-white/[0.02] border border-white/5 rounded-xl p-4 shrink-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{stage.replace('-', ' ')}</h3>
                <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              <div className="space-y-4 flex-1">
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-green/40 transition-all cursor-grab active:cursor-grabbing group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-white text-sm group-hover:text-brand-green transition-colors">{lead.name}</p>
                      <button className="text-gray-600 hover:text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{lead.company}</p>
                    
                    {script?.leadId === lead.id && (
                      <div className="mb-3 p-3 bg-brand-green/10 border border-brand-green/30 rounded-lg text-[10px] text-gray-300 italic animate-in zoom-in-95">
                        <p className="font-bold text-brand-green uppercase mb-1">AI Strategic Outreach:</p>
                        {script.content}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex gap-2">
                         <span className="text-xs font-bold text-white">${lead.value.toLocaleString()}</span>
                         <button 
                          onClick={() => handleAIOutreach(lead.id, lead.name, lead.company)}
                          disabled={generating === lead.id}
                          className="text-[9px] font-bold text-brand-green uppercase tracking-widest hover:underline disabled:opacity-50"
                         >
                           {generating === lead.id ? 'Generating...' : 'AI Outreach'}
                         </button>
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-brand-green border border-black flex items-center justify-center text-[10px] font-bold">JW</div>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2 rounded-lg border border-dashed border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 hover:border-white/20 transition-all">
                  + Add Lead
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CRM;
