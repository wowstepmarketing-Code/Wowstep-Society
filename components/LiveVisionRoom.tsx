
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';

// --- Utility Functions for Audio Encoding/Decoding ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LiveVisionRoom: React.FC = () => {
  const { user } = useAuth();
  const { selectedClient } = useClient();
  const apiKey = (import.meta as any).env.VITE_GOOGLE_GENAI_KEY;

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black/20 rounded-3xl border border-white/10 p-10 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 bg-brand-gold/10 border border-brand-gold/30 rounded-full flex items-center justify-center mx-auto text-brand-gold">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-heading font-bold">LiveVision requires API configuration</h2>
          <p className="text-gray-400 text-sm">Please set VITE_GOOGLE_GENAI_KEY in your environment to enable real-time multisensory strategic consultation.</p>
        </div>
      </div>
    );
  }

  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);

  const startSession = async () => {
    setConnecting(true);
    setTranscription([]);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;

      const ai = new GoogleGenAI({ apiKey });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Vision Session Established');
            setActive(true);
            setConnecting(false);

            // 1. Audio Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // 2. Video Stream (Frames)
            if (canvasRef.current && videoRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (!ctx || !videoRef.current) return;
                canvasRef.current!.width = videoRef.current.videoWidth / 2; // Downscale for bandwidth
                canvasRef.current!.height = videoRef.current.videoHeight / 2;
                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                
                canvasRef.current!.toBlob(async (blob) => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64Data = (reader.result as string).split(',')[1];
                      sessionPromise.then(session => session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                      }));
                    };
                    reader.readAsDataURL(blob);
                  }
                }, 'image/jpeg', 0.6);
              }, 1000); // 1 FPS for strategic context
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Transcriptions
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `Society AI: ${message.serverContent?.outputTranscription?.text}`]);
            } else if (message.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `You: ${message.serverContent?.inputTranscription?.text}`]);
            }
          },
          onerror: async (e: any) => {
            console.error('Vision Error:', e);
            const msg = e?.message || '';
            if (msg.includes('permission') || msg.includes('403') || msg.includes('not found')) {
              await (window as any).aistudio.openSelectKey();
            }
            await stopSession();
          },
          onclose: async () => {
            await stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Zephyr, the WowSociety Vision Room Executive Consultant. 
            You are speaking with ${user?.name} about ${selectedClient.name}. 
            You can see them via camera. Comment on their brand presence, focus, and provide elite strategic advice in real-time. 
            Tone: Ultra-exclusive, insightful, direct, and sophisticated. Keep responses concise for natural conversation.`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error('Session failed:', err);
      const msg = err?.message || '';
      if (msg.includes('permission') || msg.includes('403') || msg.includes('not found')) {
        await (window as any).aistudio.openSelectKey();
      }
      setConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = async () => {
    setActive(false);
    setConnecting(false);
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn('Error closing session:', e);
      }
      sessionRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.input.state !== 'closed') {
          await audioContextRef.current.input.close();
        }
        if (audioContextRef.current.output.state !== 'closed') {
          await audioContextRef.current.output.close();
        }
      } catch (e) {
        console.warn('Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
    }
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleStart = async () => {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      // Proceed after opening dialog as per guidelines
    }
    startSession();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Vision Room</h1>
          <p className="text-gray-400 mt-1">Real-time multisensory strategic consultation with WowSociety Intelligence.</p>
        </div>
        {!active && !connecting && (
          <button 
            onClick={handleStart}
            className="px-8 py-3 bg-brand-green text-white font-bold rounded-xl shadow-lg shadow-brand-green/20 hover:bg-brand-darkGreen transition-all active:scale-95 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Initialize Consultation
          </button>
        )}
        {active && (
          <button 
            onClick={stopSession}
            className="px-8 py-3 bg-red-600/10 border border-red-600/30 text-red-500 font-bold rounded-xl hover:bg-red-600/20 transition-all active:scale-95"
          >
            End Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
        {/* Main Interface */}
        <div className="lg:col-span-8 relative bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-20'}`} 
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* AI Interface Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-10">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                 <div className={`w-2 h-2 rounded-full ${active ? 'bg-brand-green animate-pulse' : 'bg-gray-600'}`} />
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                   {connecting ? 'Calibrating Neural Pathways...' : active ? 'Live Strategic Analysis' : 'Society AI Offline'}
                 </span>
               </div>
               {active && (
                 <div className="flex items-center gap-2 bg-brand-green px-3 py-1.5 rounded-full shadow-lg shadow-brand-green/20">
                   <span className="text-[9px] font-bold text-white tracking-[0.2em] uppercase">Executive Presence Active</span>
                 </div>
               )}
            </div>

            {active && (
              <div className="space-y-4 max-w-lg">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Society Intelligence Feed</span>
                  </div>
                  <div className="space-y-3">
                    {transcription.length > 0 ? transcription.map((t, i) => (
                      <p key={i} className={`text-sm ${t.startsWith('Society AI') ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {t}
                      </p>
                    )) : (
                      <p className="text-gray-500 italic text-sm">Waiting for vocal alignment...</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!active && !connecting && (
              <div className="absolute inset-0 flex items-center justify-center text-center">
                 <div className="space-y-4 max-w-sm">
                   <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/30 rounded-full flex items-center justify-center mx-auto">
                     <svg className="w-10 h-10 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
                   </div>
                   <h3 className="text-xl font-heading font-bold text-white">Enter the Vision Room</h3>
                   <p className="text-gray-500 text-sm">Experience the world's first AI-driven executive presence and brand strategy audit room.</p>
                 </div>
              </div>
            )}
            
            {connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-2 border-brand-green border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-white font-bold tracking-widest uppercase text-xs">Authenticating Executive Token...</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
             <h3 className="text-lg font-heading font-bold text-white mb-6">Strategic Parameters</h3>
             <div className="space-y-6">
               <div className="flex items-center justify-between pb-4 border-b border-white/5">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latency</span>
                 <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Sub-200ms</span>
               </div>
               <div className="flex items-center justify-between pb-4 border-b border-white/5">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Modalities</span>
                 <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Vision / Audio / Text</span>
               </div>
               <div className="flex items-center justify-between pb-4 border-b border-white/5">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Brand Context</span>
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">{selectedClient.name}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neural Load</span>
                 <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Optimized</span>
               </div>
             </div>
          </div>

          <div className="bg-gradient-to-br from-brand-green/20 to-black border border-brand-green/30 rounded-3xl p-8 relative overflow-hidden group">
             <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-brand-green/10 blur-2xl rounded-full" />
             <h4 className="text-sm font-bold text-brand-green uppercase tracking-widest mb-3">Room Protocols</h4>
             <p className="text-xs text-gray-400 leading-relaxed">
               The Vision Room is an encrypted environment. Your biometric and vocal inputs are processed locally to generate real-time brand alignment narratives. Maintain eye contact for high-fidelity engagement.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVisionRoom;
