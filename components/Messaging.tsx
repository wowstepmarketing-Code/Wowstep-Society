
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import { getStrategyAdvice } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';

type ChatMode = 'AI' | 'TEAM';
type Msg = { id: string; company_id: string; sender_id: string; body: string; created_at: string; sender_name?: string };

const ChannelItem: React.FC<{ label: string; active?: boolean; locked?: boolean; onClick: () => void }> = ({ label, active, locked, onClick }) => (
  <div 
    onClick={!locked ? onClick : undefined}
    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
    active ? 'bg-brand-green/20 text-brand-green font-bold shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'
  } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className="flex items-center gap-3">
      <span className="text-gray-600 font-normal">#</span>
      <span className="text-sm">{label}</span>
    </div>
    {locked && <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
  </div>
);

const Messaging: React.FC = () => {
  const { user, profile } = useAuth();
  const { selectedClient, clients, setSelectedClientId } = useClient();
  const [mode, setMode] = useState<ChatMode>('AI');
  const [msgInput, setMsgInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AI Chat State
  const [aiChat, setAiChat] = useState<{id: string, sender: string, content: string, time: string}[]>([]);

  useEffect(() => {
    if (mode === 'AI' && aiChat.length === 0 && selectedClient.id !== 'loading') {
      setAiChat([
        { id: '1', sender: 'Society AI', content: `Welcome back, ${user?.name || 'Partner'}. Your strategic roadmap for ${selectedClient.name} is under review. How can I assist with your ${selectedClient.phase} phase objectives today?`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }
  }, [selectedClient.id, mode, user?.name]);

  // Team Chat State
  const [teamMessages, setTeamMessages] = useState<Msg[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiChat, teamMessages, mode]);

  // --- Real-time Team Messaging Logic ---
  const loadTeamMessages = async () => {
    if (!selectedClient.id || selectedClient.id === 'loading') return;
    setTeamLoading(true);
    const { data, error } = await supabase
      .from('company_messages')
      .select('*, profiles(full_name)')
      .eq('company_id', selectedClient.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const formatted = data.map(m => ({
        ...m,
        sender_name: m.profiles?.full_name || 'Team Member'
      }));
      setTeamMessages(formatted);
    }
    setTeamLoading(false);
  };

  useEffect(() => {
    if (mode === 'TEAM') {
      loadTeamMessages();
      
      const channel = supabase
        .channel(`company-messages:${selectedClient.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'company_messages', filter: `company_id=eq.${selectedClient.id}` },
          async (payload) => {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', payload.new.sender_id).single();
            const newMsg = { ...payload.new, sender_name: data?.full_name || 'Team Member' } as Msg;
            setTeamMessages(prev => [...prev, newMsg]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedClient.id, mode]);

  const send = async () => {
    if (!msgInput.trim()) return;

    if (mode === 'AI') {
      const userMessage = { 
        id: Date.now().toString(), 
        sender: user?.name || 'User', 
        content: msgInput, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };

      setAiChat(prev => [...prev, userMessage]);
      setMsgInput('');
      setAiLoading(true);

      const advice = await getStrategyAdvice(selectedClient.name, selectedClient.phase, msgInput);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'Society AI',
        content: advice,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setAiChat(prev => [...prev, aiMessage]);
      setAiLoading(false);
    } else {
      const body = msgInput.trim();
      setMsgInput('');
      const { error } = await supabase.from('company_messages').insert({
        company_id: selectedClient.id,
        sender_id: user?.id,
        body
      });
      if (error) console.error("Message dispatch failed:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar: Strategic & Operational Channels */}
      <div className="w-72 border-r border-white/10 p-6 space-y-8 bg-black/40 backdrop-blur-sm hidden md:flex flex-col">
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-4">Strategic Intelligence</h3>
          <div className="space-y-1">
            <ChannelItem label="society-ai" active={mode === 'AI'} onClick={() => setMode('AI')} />
            <ChannelItem label="market-insights" locked onClick={() => {}} />
            <ChannelItem label="elite-leadership" locked onClick={() => {}} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-4">Executive Rooms</h3>
          <div className="space-y-1 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClientId(c.id);
                  setMode('TEAM');
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all flex flex-col ${
                  mode === 'TEAM' && selectedClient.id === c.id
                    ? 'bg-brand-green/20 text-brand-green font-bold border-l-2 border-brand-green'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-sm truncate">{c.name}</span>
                <span className="text-[9px] uppercase tracking-widest text-gray-600">{c.phase} Phase</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="pt-6 border-t border-white/5">
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-4">Live Presence</h3>
          <div className="space-y-3">
             <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-brand-green/20 border border-brand-green flex items-center justify-center text-xs font-bold text-brand-green">S</div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-black" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Society AI</p>
                  <p className="text-[9px] text-gray-500 uppercase">Strategic Core</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Communication Interface */}
      <div className="flex-1 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${mode === 'AI' ? 'bg-brand-green animate-pulse shadow-[0_0_10px_rgba(6,78,59,0.5)]' : 'bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'}`} />
            <div>
              <h2 className="font-bold text-white tracking-tight">
                {mode === 'AI' ? 'Society AI Strategy Advisor' : `${selectedClient.name} • Executive Room`}
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {mode === 'AI' ? 'Direct Neural Strategy Link' : 'Secure Operational Channel'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {teamLoading && <div className="w-5 h-5 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />}
            <button className="text-[10px] font-bold text-gray-500 hover:text-white tracking-widest uppercase transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">Vault Archives</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar" ref={scrollRef}>
          {mode === 'AI' ? (
            aiChat.map((m) => (
              <div key={m.id} className={`flex gap-4 group animate-in slide-in-from-bottom-2 duration-300 ${m.sender === 'Society AI' ? 'justify-start' : 'flex-row-reverse'}`}>
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white border transition-all shadow-sm ${
                  m.sender === 'Society AI' 
                    ? 'bg-brand-green/20 border-brand-green/30 text-brand-green' 
                    : 'bg-white/5 border-white/10 text-white'
                }`}>
                  {m.sender.charAt(0)}
                </div>
                <div className={`flex-1 max-w-xl ${m.sender === 'Society AI' ? '' : 'text-right'}`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${m.sender === 'Society AI' ? '' : 'flex-row-reverse'}`}>
                    <span className="font-bold text-white text-sm">{m.sender}</span>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{m.time}</span>
                  </div>
                  <div className={`text-sm text-gray-300 leading-relaxed bg-white/5 px-5 py-3 rounded-2xl border border-white/5 shadow-inner ${
                    m.sender === 'Society AI' ? 'rounded-tl-none border-l-brand-green/50' : 'rounded-tr-none border-r-brand-green/50'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          ) : (
            teamMessages.length > 0 ? teamMessages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex gap-4 group animate-in slide-in-from-bottom-2 duration-300 ${isMine ? 'flex-row-reverse' : 'justify-start'}`}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white border transition-all shadow-sm ${
                    isMine ? 'bg-brand-green/10 border-brand-green/30 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                  }`}>
                    {m.sender_name?.charAt(0) || 'U'}
                  </div>
                  <div className={`flex-1 max-w-xl ${isMine ? 'text-right' : ''}`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <span className="font-bold text-white text-sm">{m.sender_name}</span>
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`text-sm text-gray-300 leading-relaxed px-5 py-3 rounded-2xl border border-white/5 shadow-inner ${
                      isMine ? 'bg-brand-green/5 rounded-tr-none border-r-brand-green/30' : 'bg-white/[0.02] rounded-tl-none border-l-white/20'
                    }`}>
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p className="text-sm font-bold uppercase tracking-widest">Secure Room Empty</p>
                <p className="text-xs mt-2">Initialize the operational cycle by sending a message.</p>
              </div>
            )
          )}
          {aiLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20" />
              <div className="flex-1 space-y-2 max-w-sm">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-10 bg-white/5 rounded w-full" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={msgInput}
              disabled={aiLoading || teamLoading}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={mode === 'AI' ? "Request strategic alignment..." : "Message team / client..."}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-600 pr-32 shadow-xl disabled:opacity-50"
            />
            <div className="absolute right-4 flex items-center gap-4 text-gray-500">
               <button className="hover:text-brand-green transition-colors hidden sm:block"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
               <button onClick={send} disabled={aiLoading || teamLoading || !msgInput.trim()} className="p-2 bg-brand-green rounded-xl text-white hover:bg-brand-darkGreen transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50">
                  {(aiLoading || teamLoading) ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messaging;
