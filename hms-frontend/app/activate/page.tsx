'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Copy, Key, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

export default function ActivatePage() {
  const router = useRouter();
  const [hwid, setHwid] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState('Checking...');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Hotel info state
  const [hotelName, setHotelName] = useState('Hotel Management System');
  const [hotelLogo, setHotelLogo] = useState('');

  useEffect(() => {
    // Fetch hotel settings first for branding
    api.get<any>('/api/settings')
      .then(res => {
        if (res.hotelName) setHotelName(res.hotelName);
        if (res.hotelLogo) setHotelLogo(res.hotelLogo);
      })
      .catch(() => { /* ignore */ });

    // Fetch license status and HWID
    fetchLicenseStatus();
  }, []);

  const fetchLicenseStatus = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/api/license/status');
      setHwid(data.hwid || '');
      setStatus(data.status || 'Invalid');
      
      if (data.status === 'Active') {
        // If they visit this page but are already active, send them to the right place
        const token = localStorage.getItem('accessToken');
        if (token) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch license details');
      setStatus('Invalid');
    } finally {
      setLoading(false);
    }
  };

  const copyHWID = () => {
    if (hwid) {
      navigator.clipboard.writeText(hwid);
      setSuccess('Hardware ID copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }

    setActivating(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/license/activate', { licenseKey: licenseKey.trim() });
      setSuccess('License activated successfully! Redirecting...');
      
      // Instant SPA transition without full page reload
      setTimeout(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to activate license. Invalid key.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-main flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-theme-muted font-medium">Loading activation details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-main flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          {hotelLogo ? (
            <img src={hotelLogo} alt="Logo" className="h-20 mx-auto mb-6 object-contain" />
          ) : (
            <div className="h-20 w-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-theme-text">{hotelName}</h1>
          <p className="text-theme-muted mt-2">Software Activation Required</p>
        </div>

        <div className="bg-theme-card rounded-2xl p-8 shadow-xl border border-theme-border">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-text">License Locked</h2>
              <p className="text-sm text-red-500 font-medium">Status: {status}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* HWID Section */}
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2">
                Your Hardware ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={hwid || 'Generating...'}
                  className="flex-1 bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none opacity-80"
                />
                <button
                  onClick={copyHWID}
                  className="px-4 py-3 bg-theme-border/50 text-theme-text rounded-xl hover:bg-theme-border transition-colors flex items-center gap-2"
                  title="Copy Hardware ID"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
              <p className="text-xs text-theme-muted mt-2 leading-relaxed">
                Send this Hardware ID to your software provider to receive your unique activation key. This software is bound securely to this specific machine.
              </p>
            </div>

            <div className="w-full h-px bg-theme-border my-2"></div>

            {/* Activation Key Section */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">
                License Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-theme-muted-light" />
                </div>
                <textarea
                  placeholder="Paste your license key here..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  rows={4}
                  className="block w-full pl-12 pr-4 py-3 bg-theme-main border border-theme-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-theme-text text-sm resize-none font-mono transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium border border-red-500/20">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-500/10 text-green-500 rounded-xl text-sm font-medium border border-green-500/20">
                {success}
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="w-full bg-primary text-white rounded-xl py-4 font-bold text-lg hover:bg-primary-hover focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
            >
              {activating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Activating...
                </>
              ) : (
                'Activate Software'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
