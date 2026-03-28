import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GrowthPhase } from '../types';

const Onboarding: React.FC = () => {
  const { user, profile, refreshProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [fullName, setFullName] = useState(profile?.full_name ?? '');

  // Step 2
  const [companyName, setCompanyName] = useState('');
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');

  const seedMilestones = async (companyId: string) => {
    try {
      // Prioritize the server-side RPC for milestone generation
      const { error: rpcError } = await supabase.rpc('seed_milestones_for_company', { p_company_id: companyId });
      
      if (rpcError) {
        console.warn("RPC seeding failed, attempting manual fallback:", rpcError);
        // Fallback to manual seeding if RPC is not available
        const defaultMilestones = [
          { company_id: companyId, phase: GrowthPhase.START, title: 'Positioning Refinement', weight: 5, status: 'in-progress' },
          { company_id: companyId, phase: GrowthPhase.START, title: 'Brand Identity Direction', weight: 3, status: 'locked' },
          { company_id: companyId, phase: GrowthPhase.START, title: 'Strategic Content Foundation', weight: 4, status: 'locked' },
          { company_id: companyId, phase: GrowthPhase.SCALE, title: 'Authority Building', weight: 5, status: 'locked' },
          { company_id: companyId, phase: GrowthPhase.SCALE, title: 'Campaign Strategy', weight: 5, status: 'locked' },
          { company_id: companyId, phase: GrowthPhase.ELITE, title: 'Market Leadership Expansion', weight: 10, status: 'locked' },
        ];
        const { error: manualError } = await supabase.from('milestones').insert(defaultMilestones);
        if (manualError) throw manualError;
      }
    } catch (error) {
      console.error("Error seeding milestones:", error);
    }
  };

  const next = async () => {
    setError(null);

    if (step === 1) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      setStep(2);
      return;
    }

    if (!companyName.trim()) {
      setError('Please enter your company name.');
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
      // 1) Update profile name
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (pErr) throw pErr;

      // 2) Create company
      const { data: company, error: cErr } = await supabase
        .from('companies')
        .insert({
          name: companyName.trim(),
          niche: niche.trim() || null,
          location: location.trim() || null,
          phase: 'START'
        })
        .select('id')
        .single();

      if (cErr || !company?.id) throw cErr || new Error('Could not create company.');

      // 3) Create membership (user -> company)
      const { error: mErr } = await supabase.from('memberships').insert({
        user_id: user.id,
        company_id: company.id,
        role_in_company: 'owner',
      });

      if (mErr) throw mErr;

      // 4) Seed Milestones
      await seedMilestones(company.id);

      // 5) Mark onboarding complete
      const { error: oErr } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id);

      if (oErr) throw oErr;

      await refreshProfile();
      navigate('/dashboard');
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
            Phase 01 • Profile
          </div>
          <div className="h-px flex-1 bg-white/10" />
          <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all duration-500 ${step === 2 ? 'bg-brand-green text-white border-brand-green' : 'bg-white/10 text-gray-500 border-white/10'}`}>
            Phase 02 • Ecosystem
          </div>
        </div>

        {error && <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 animate-in shake-1">{error}</div>}

        {step === 1 ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Your Full Executive Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                placeholder="Juliano Wowstep"
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
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Company / Brand Name</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all"
                placeholder="e.g. Stellar Technology"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Market Niche</label>
                <input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. Luxury Real Estate"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-green/50 transition-all"
                  placeholder="e.g. Manhattan, NY"
                />
              </div>
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
                disabled={busy}
                className="flex-[2] py-4 rounded-2xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50"
                type="button"
              >
                {busy ? 'Establishing Workspace…' : 'Finalize Activation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;