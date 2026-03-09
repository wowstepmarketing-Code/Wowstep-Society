
import React, { useState } from 'react';
import { useClient } from '../context/ClientContext';
import { generateLeadOutreach } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';

const CRM: React.FC = () => {
  const { selectedClient, leads, refreshClients } = useClient();
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'] as const;
  const [generating, setGenerating] = useState<string | null>(null);
  const [script, setScript] = useState<{leadId: string, content: string} | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filter leads for the selected client
  const clientLeads = leads.filter(l => (l as any).company_id === selectedClient.id);

  const handleAIOutreach = async (leadId: string, leadName: string, company: string) => {
    setGenerating(leadId);
    const text = await generateLeadOutreach(selectedClient.name, leadName, company);
    setScript({ leadId, content: text });
    setGenerating(null);
  };

  const updateLeadStage = async (leadId: string, newStage: typeof stages[number]) => {
    setUpdating(leadId);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);
      if (error) throw error;
      // Refresh context
      await refreshClients();
    } catch (e) {
      console.error("Failed to update lead stage:", e);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">Lead Pipeline</h1>
          <p className="text-gray-400 mt-1">Manage executive relationships and brand growth opportunities.</p>
        </div>
        <button className="px-6 py-2.5 bg-brand-green text-white font-bold rounded-lg hover:bg-brand-darkGreen transition-colors w-full sm:w-auto">
          Add New Opportunity
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-8">
        <div className="flex gap-6 h-full min-w-[1200px]">
          {stages.map((stage) => (
            <div key={stage} className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-xl p-4 min-w-[250px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{stage.replace('-', ' ')}</h3>
                <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white">
                  {clientLeads.filter(l => l.stage === stage).length}
                </span>
              </div>
              <div className="space-y-4 flex-1">
                {clientLeads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-green/40 transition-all cursor-grab active:cursor-grabbing group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-white text-sm group-hover:text-brand-green transition-colors">{lead.name}</p>
                      <div className="relative group/menu">
                        <button className="text-gray-600 hover:text-white p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-brand-black border border-white/10 rounded-lg shadow-xl hidden group-hover/menu:block z-20">
                          {stages.map(s => (
                            <button
                              key={s}
                              onClick={() => updateLeadStage(lead.id, s)}
                              disabled={updating === lead.id}
                              className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors ${lead.stage === s ? 'text-brand-green' : 'text-gray-400'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
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
