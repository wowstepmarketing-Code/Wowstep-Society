import React, { useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

const Onboarding: React.FC = () => {
  const { user, profile, refreshProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_KEY || '',
    libraries
  });

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.formatted_address) {
        setLocation(place.formatted_address);
      }
    }
  };

  const next = async () => {
    setError(null);

    if (step === 1) {
      if (!companyName.trim()) {
        setError('Please enter your company name.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!niche.trim()) {
        setError('Please enter your market niche.');
        return;
      }
      setStep(3);
      return;
    }

    if (!location.trim()) {
      setError('Please enter your location.');
      return;
    }

    if (!isConfigured) {
      setError('Internal Error: Backend connectivity required for executive access.');
      return;
    }

    if (!user?.id) {
      setError('Session not found. Please log in again.');
      return;
    }

    setBusy(true);

    try {
      // 1) Create company request
      const { error: reqErr } = await supabase
        .from('company_requests')
        .insert({
          company_name: companyName.trim(),
          niche: niche.trim(),
          location: location.trim(),
          requested_by: user.id,
          status: 'pending'
        });

      if (reqErr) throw reqErr;

      // 2) Update profile status to pending
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ status: 'pending' })
        .eq('id', user.id);

      if (pErr) throw pErr;

      // 3) Show success modal
      setShowSuccessModal(true);

      // 4) Redirect to login after 3 seconds
      setTimeout(async () => {
        await signOut();
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during activation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black p-6 flex items-center justify-center font-sans overflow-hidden">
      <div className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl relative">
        <div className="flex items-start justify-between gap-6 mb-12">
          <div>
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-xs shadow-lg shadow-brand-green/20">WS</div>
                <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Onboarding.</h1>
             </div>
            <p className="text-gray-500 mt-2 text-sm">
              Complete your executive alignment to unlock the WowSociety ecosystem.
            </p>
          </div>

          <button
            onClick={signOut}
            className="px-5 py-2 text-[10px] font-bold tracking-widest uppercase bg-white/5 text-gray-400 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            type="button"
          >
            Sign out
          </button>
        </div>

        <div className="flex items-center gap-3 mb-10">
          <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all duration-500 ${step === 1 ? 'bg-brand-green text-white border-brand-green' : 'bg-white/10 text-gray-500 border-white/10'}`}>
            01 • Company
          </div>
          <div className="h-px flex-1 bg-white/10" />
          <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all duration-500 ${step === 2 ? 'bg-brand-green text-white border-brand-green' : 'bg-white/10 text-gray-500 border-white/10'}`}>
            02 • Niche
          </div>
          <div className="h-px flex-1 bg-white/10" />
          <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all duration-500 ${step === 3 ? 'bg-brand-green text-white border-brand-green' : 'bg-white/10 text-gray-500 border-white/10'}`}>
            03 • Location
          </div>
        </div>

        {error && <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 animate-in shake-1">{error}</div>}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Company / Brand Name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                placeholder="e.g. Stellar Technology"
              />
            </div>

            <button
              onClick={next}
              className="w-full py-4 rounded-2xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20"
              type="button"
            >
              Continue Calibration
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Market Niche</label>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                placeholder="e.g. Luxury Real Estate"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 text-[11px] font-bold uppercase tracking-[0.3em] border border-white/10 hover:bg-white/10 transition-all"
                type="button"
              >
                Back
              </button>
              <button
                onClick={next}
                className="flex-[2] py-4 rounded-2xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20"
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Location</label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocompleteRef.current = autocomplete;
                  }}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                    placeholder="e.g. Manhattan, NY"
                  />
                </Autocomplete>
              ) : (
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                  placeholder="e.g. Manhattan, NY"
                />
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 text-[11px] font-bold uppercase tracking-[0.3em] border border-white/10 hover:bg-white/10 transition-all"
                type="button"
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={busy}
                className="flex-[2] py-4 rounded-2xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50"
                type="button"
              >
                {busy ? 'Establishing Workspace…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-brand-black border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-4">Thank you!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your company is now on our waitlist. An admin will review your information and you'll be notified when approved.
              </p>
              <div className="mt-8 flex justify-center">
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-green animate-progress-bar" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;