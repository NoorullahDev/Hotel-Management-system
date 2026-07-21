'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Key, Mail, CheckCircle, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export default function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    // Fetch current email
    const fetchUser = async () => {
      try {
        const data = await api.get<any>('/api/settings/account');
        setCurrentUsername(data.email || '');
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      await api.post('/api/settings/account/change-password', { currentPassword, newPassword });

      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      setPasswordError(err.message);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    if (newUsername.trim() === '') {
      setUsernameError('Please enter a valid username');
      return;
    }

    try {
      await api.post('/api/settings/account/change-email', { newEmail: newUsername });

      setUsernameSuccess('Username updated successfully. Use your new username to login.');
      setCurrentUsername(newUsername);
      setNewUsername('');
      setTimeout(() => setUsernameSuccess(''), 5000);
    } catch (err: any) {
      setUsernameError(err.message);
    }
  };

  const handleLogoutAll = async () => {
    setLogoutLoading(true);
    try {
      await api.post('/api/auth/logout');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Change Username */}
        <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Mail size={20} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-theme-text font-semibold">Change Username</h3>
              <p className="text-sm text-theme-muted">Current: <span className="text-theme-muted-light">{currentUsername}</span></p>
            </div>
          </div>

          {usernameError && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl flex items-center gap-2"><AlertTriangle size={14} />{usernameError}</div>}
          {usernameSuccess && <div className="mb-4 flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-xl"><CheckCircle size={16} />{usernameSuccess}</div>}

          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1.5">New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
                placeholder="newusername"
                required
              />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium p-3 rounded-xl transition-colors active:scale-95 shadow-md">
              Update Username
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Key size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-theme-text font-semibold">Change Password</h3>
              <p className="text-sm text-theme-muted">Update your account password</p>
            </div>
          </div>

          {passwordError && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl flex items-center gap-2"><AlertTriangle size={14} />{passwordError}</div>}
          {passwordSuccess && <div className="mb-4 flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-xl"><CheckCircle size={16} />{passwordSuccess}</div>}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1.5">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1.5">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors" required />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium p-3 rounded-xl transition-colors active:scale-95 shadow-md">
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Session Management */}
        <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-theme-text font-semibold">Session Management</h3>
              <p className="text-sm text-theme-muted">Manage your active sessions</p>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-300 font-medium">Logout from all devices</p>
            <p className="text-xs text-theme-muted mt-1">
              This will log you out of all active sessions on all devices, including this one.
              You will need to log in again.
            </p>
          </div>

          <button
            onClick={handleLogoutAll}
            disabled={logoutLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-medium p-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {logoutLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            Logout From All Devices
          </button>
        </div>


      </div>
    </div>
  );
}
