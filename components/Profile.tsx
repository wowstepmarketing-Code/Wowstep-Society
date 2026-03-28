
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, profile, updateProfile, updatePassword } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    
    const res = await updateProfile({ full_name: fullName, email });
    
    if (res.ok) {
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
    }
    setBusy(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    
    setBusy(true);
    setMessage(null);
    
    const res = await updatePassword(newPassword);
    
    if (res.ok) {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update password.' });
    }
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Executive Profile</h1>
          <p className="text-gray-400 mt-1">Manage your identity and security within the WowSociety ecosystem.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm font-bold uppercase tracking-widest animate-in slide-in-from-top-2 ${
          message.type === 'success' 
            ? 'bg-brand-green/10 border-brand-green/30 text-brand-green' 
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Account Details */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md shadow-2xl">
          <h3 className="text-2xl font-heading font-bold text-white mb-8 tracking-tight">Account Details</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3 ml-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-700"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-700"
                placeholder="your@email.com"
              />
              <p className="text-[9px] text-gray-600 mt-2 ml-1 italic">Changing your email will require re-verification.</p>
            </div>
            <button
              disabled={busy}
              className="w-full py-4 rounded-xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 active:scale-[0.98] mt-4"
            >
              {busy ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-md shadow-2xl">
          <h3 className="text-2xl font-heading font-bold text-white mb-8 tracking-tight">Security Vault</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3 ml-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-700"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] block mb-3 ml-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-green transition-all placeholder:text-gray-700"
                placeholder="••••••••"
              />
            </div>
            <button
              disabled={busy || !newPassword}
              className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all disabled:opacity-50 active:scale-[0.98] mt-4"
            >
              {busy ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-gradient-to-br from-brand-green/10 to-black border border-brand-green/30 rounded-[2rem] p-10 relative overflow-hidden group">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-brand-green/5 blur-3xl rounded-full" />
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-3xl font-bold text-brand-green shadow-inner">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-2xl font-heading font-bold text-white">{profile?.full_name}</h4>
            <p className="text-gray-500 font-medium">{profile?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <span className="px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/30 text-[10px] font-bold text-brand-green uppercase tracking-widest">
                {profile?.role} Access
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                ID: {profile?.id.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
