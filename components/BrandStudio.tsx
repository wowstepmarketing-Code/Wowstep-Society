import React, { useState } from 'react';
import { generateBrandAsset, generateBrandVideo, generateCopywriting } from '../lib/gemini';
import { useClient } from '../context/ClientContext';

const BrandStudio: React.FC = () => {
  const { selectedClient } = useClient();
  const [tab, setTab] = useState<'visual' | 'cinema' | 'copy'>('visual');
  const [prompt, setPrompt] = useState('');
  const [copyTarget, setCopyTarget] = useState('Executive Summary');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messages = [
    "Calibrating brand aesthetics...",
    "Synthesizing luxury textures...",
    "Rendering cinematic presence...",
    "Aligning with market authority...",
    "Finalizing executive vision..."
  ];

  const ensureApiKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
          return true; // Assume success after opening
        }
        return true;
      }
    } catch (e) {
      console.warn("API Key selection utility not fully available.");
    }
    return true;
  };

  const handleAiError = async (err: any) => {
    console.error("Studio AI Error Detail:", err);
    
    // Determine if this is a permission/billing error
    const code = err?.code || err?.error?.code || err?.status;
    const msg = (err?.message || err?.error?.message || "").toLowerCase();
    const status = err?.status || err?.error?.status;

    const isPermission = 
      code === 403 || 
      status === "PERMISSION_DENIED" || 
      msg.includes("permission") || 
      msg.includes("not have permission") ||
      msg.includes("403");

    if (isPermission) {
      setError("Strategic access denied. This usually means a paid API key from a billing-enabled GCP project is required for high-fidelity generation.");
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.openSelectKey === 'function') {
          // Trigger the key selection dialog again
          await aistudio.openSelectKey();
        }
      } catch (e) {}
    } else if (msg.includes("requested entity was not found")) {
      setError("Resource synchronization failed. Please re-select your strategic API key.");
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.openSelectKey === 'function') {
          await aistudio.openSelectKey();
        }
      } catch (e) {}
    } else {
      setError("Neural architect failure. Please re-attempt strategic entry.");
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setError(null);
    await ensureApiKey();
    
    setLoading(true);
    setResultUrl(null);
    let i = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[i % messages.length]);
      i++;
    }, 2500);

    try {
      const url = await generateBrandAsset(prompt);
      if (!url) throw new Error("Manifestation failed.");
      setResultUrl(url);
    } catch (err: any) {
      await handleAiError(err);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;
    setError(null);
    await ensureApiKey();

    setLoading(true);
    setResultUrl(null);
    let i = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[i % messages.length]);
      i++;
    }, 4000);

    try {
      const url = await generateBrandVideo(prompt);
      if (!url) throw new Error("Manifestation failed.");
      setResultUrl(url);
    } catch (err: any) {
      await handleAiError(err);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleGenerateCopy = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setLoading(true);
    setCopyResult(null);
    setLoadingMessage("Architecting elite narrative...");
    try {
      const text = await generateCopywriting(selectedClient.name, copyTarget, prompt);
      setCopyResult(text);
    } catch (err: any) {
      await handleAiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/10">
        <div>
          <div className="flex items-center gap-4 mb-4">
             <span className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.4em] bg-brand-gold/10 px-4 py-1.5 rounded-full border border-brand-gold/20 shadow-lg shadow-brand-gold/5">Creative Lab</span>
             <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
          </div>
          <h1 className="text-5xl font-heading font-bold text-white tracking-tighter leading-none">Brand Studio.</h1>
          <p className="text-gray-500 mt-4 text-xl font-medium max-w-2xl">
            Manifesting high-fidelity visual and cinematic authority for <span className="text-white font-bold">{selectedClient.name}</span>.
          </p>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
          <button 
            onClick={() => { setTab('visual'); setResultUrl(null); setCopyResult(null); setError(null); }}
            className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${tab === 'visual' ? 'bg-brand-green text-white shadow-xl shadow-brand-green/20' : 'text-gray-500 hover:text-white'}`}
          >
            Visual Lab
          </button>
          <button 
            onClick={() => { setTab('cinema'); setResultUrl(null); setCopyResult(null); setError(null); }}
            className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${tab === 'cinema' ? 'bg-brand-green text-white shadow-xl shadow-brand-green/20' : 'text-gray-500 hover:text-white'}`}
          >
            Cinema Lab
          </button>
          <button 
            onClick={() => { setTab('copy'); setResultUrl(null); setCopyResult(null); setError(null); }}
            className={`px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${tab === 'copy' ? 'bg-brand-green text-white shadow-xl shadow-brand-green/20' : 'text-gray-500 hover:text-white'}`}
          >
            Copy Lab
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[600px]">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md shadow-2xl">
            <h3 className="text-2xl font-heading font-bold text-white mb-8 tracking-tight">Manifestation Brief</h3>
            
            {tab === 'copy' && (
              <div className="mb-8">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3">Narrative Objective</label>
                <select 
                  value={copyTarget}
                  onChange={(e) => setCopyTarget(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-green outline-none transition-all"
                >
                  <option value="Executive Summary">Executive Summary</option>
                  <option value="Luxury Ad Copy">Luxury Ad Copy</option>
                  <option value="Brand Mission">Brand Mission</option>
                  <option value="Investor Pitch">Investor Pitch</option>
                </select>
              </div>
            )}

            <div className="mb-8">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3">Creative Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  tab === 'visual' ? "e.g., A minimalist luxury logo with gold accents for a tech brand..." : 
                  tab === 'cinema' ? "e.g., A cinematic tracking shot of a luxury storefront at dusk..." :
                  "e.g., We are expanding into the European luxury market with our new product line..."
                }
                className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-6 text-sm text-white focus:outline-none focus:border-brand-green transition-all min-h-[200px] resize-none leading-relaxed placeholder:text-gray-700"
              />
            </div>

            {error && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 text-center animate-in shake-1">
                {error}
                <div className="mt-2">
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline opacity-70 hover:opacity-100">Project Billing Required</a>
                </div>
              </div>
            )}
            
            <button
              disabled={loading || !prompt.trim()}
              onClick={tab === 'visual' ? handleGenerateImage : tab === 'cinema' ? handleGenerateVideo : handleGenerateCopy}
              className="w-full py-5 rounded-2xl bg-brand-green text-white text-[12px] font-bold uppercase tracking-[0.4em] hover:bg-brand-darkGreen transition-all shadow-2xl shadow-brand-green/30 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Initializing...' : `Manifest ${tab === 'visual' ? 'Visual' : tab === 'cinema' ? 'Cinema' : 'Narrative'}`}
            </button>
            <p className="mt-8 text-[11px] text-gray-600 italic text-center leading-relaxed font-medium">
              {tab === 'cinema' ? 
                "Cinematic rendering uses Veo-3.1 Global Engines. High-fidelity output." :
                tab === 'copy' ? "Powered by Society Intelligence for strategic brand alignment." :
                "Visual assets generated with 2K potential for executive review."
              }
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white/[0.03] border border-white/10 rounded-[3.5rem] overflow-hidden relative group shadow-2xl">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl z-20">
              <div className="w-20 h-20 border-2 border-brand-green border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(6,78,59,0.3)]" />
              <p className="text-white font-bold tracking-[0.5em] uppercase text-[11px] animate-pulse">{loadingMessage}</p>
            </div>
          ) : resultUrl || copyResult ? (
            <div className="h-full w-full flex items-center justify-center p-12 bg-black/40">
              {tab === 'visual' && resultUrl ? (
                <img src={resultUrl} alt="Generated Asset" className="max-w-full max-h-full rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-700" />
              ) : tab === 'cinema' && resultUrl ? (
                <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-full rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-700" />
              ) : tab === 'copy' && copyResult ? (
                <div className="max-w-2xl bg-black/60 border border-white/10 p-16 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-green" />
                  <div className="flex items-center gap-4 mb-8">
                    <span className="text-[11px] font-bold text-brand-green uppercase tracking-[0.5em]">Society Neural Copywriter</span>
                  </div>
                  <p className="text-3xl font-heading font-medium text-white leading-relaxed italic">
                    "{copyResult}"
                  </p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(copyResult || '')}
                    className="mt-12 px-6 py-3 bg-white/5 rounded-xl text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-all border border-white/5 hover:border-white/20"
                  >
                    Copy Intelligence
                  </button>
                </div>
              ) : null}
              {resultUrl && (
                <div className="absolute bottom-10 right-10 flex gap-4">
                  <a 
                    href={resultUrl} 
                    download={`wow-society-${tab}-${Date.now()}`}
                    className="bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-2xl text-[10px] font-bold text-white uppercase tracking-[0.2em] hover:bg-brand-green transition-all shadow-2xl"
                  >
                    Download Master Asset
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-10 opacity-50">
               <div className="w-32 h-32 bg-brand-green/10 border border-brand-green/30 rounded-full flex items-center justify-center mb-10 shadow-inner">
                 <svg className="w-12 h-12 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                 </svg>
               </div>
               <h3 className="text-2xl font-heading font-bold text-white tracking-tight">Creative Void</h3>
               <p className="text-gray-500 text-lg max-w-sm mt-4 font-medium leading-relaxed">
                 Enter your strategic brief to the left to manifest high-fidelity brand units using neural creative engines.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandStudio;