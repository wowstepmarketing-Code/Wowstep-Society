import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CompanyRequest, Profile, UserRole, GrowthPhase } from '../types';
import { ICONS } from '../constants';

const AdminApprovals: React.FC = () => {
  const [requests, setRequests] = useState<(CompanyRequest & { profiles: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_requests')
        .select('*, profiles:requested_by(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: CompanyRequest) => {
    setBusyId(request.id);
    setError(null);
    try {
      // 1) Create company
      const { data: company, error: cErr } = await supabase
        .from('companies')
        .insert({
          name: request.company_name,
          niche: request.niche,
          location: request.location,
          owner_id: request.requested_by,
          phase: GrowthPhase.START
        })
        .select('id')
        .single();

      if (cErr || !company) throw cErr || new Error('Failed to create company');

      // 2) Create membership
      const { error: mErr } = await supabase
        .from('memberships')
        .insert({
          user_id: request.requested_by,
          company_id: company.id,
          role: 'owner'
        });

      if (mErr) throw mErr;

      // 3) Update request status
      const { error: rErr } = await supabase
        .from('company_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (rErr) throw rErr;

      // 4) Update profile status and onboarding_complete
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ 
          status: 'approved',
          onboarding_complete: true 
        })
        .eq('id', request.requested_by);

      if (pErr) throw pErr;

      // Refresh list
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: CompanyRequest) => {
    const reason = window.prompt('Reason for rejection (optional):');
    setBusyId(request.id);
    setError(null);
    try {
      // 1) Update request status
      const { error: rErr } = await supabase
        .from('company_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason || null
        })
        .eq('id', request.id);

      if (rErr) throw rErr;

      // 2) Update profile status
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', request.requested_by);

      if (pErr) throw pErr;

      // Refresh list
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Executive Approvals.</h1>
          <p className="text-gray-500 mt-2 text-sm">Review and authorize new company workspace requests.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Company</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Niche</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Location</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Submitted By</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Date</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 text-sm italic">
                    No pending requests at this time.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-white">{request.company_name}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-gray-400 text-sm">{request.niche || '—'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-gray-400 text-sm truncate max-w-[200px]">{request.location || '—'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-white text-sm">{request.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-gray-500 text-xs">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleReject(request)}
                          disabled={!!busyId}
                          className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={!!busyId}
                          className="px-4 py-2 rounded-lg bg-brand-green text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-green/20 hover:bg-brand-darkGreen transition-all disabled:opacity-50"
                        >
                          {busyId === request.id ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;
