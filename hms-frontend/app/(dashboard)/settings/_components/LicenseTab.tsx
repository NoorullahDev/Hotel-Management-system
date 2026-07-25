'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Calendar, Clock, Copy, RefreshCw, CheckCircle2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LicenseTab() {
  const [licenseData, setLicenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Manage License Form State
  const [status, setStatus] = useState('Active');
  const [durationPreset, setDurationPreset] = useState('365');
  const [customExpiry, setCustomExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Activate via Key Modal State
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/api/license/status');
      setLicenseData(data);
      if (data?.status) setStatus(data.status);
      
      if (data?.expiryDate) {
        setCustomExpiry(new Date(data.expiryDate).toISOString().split('T')[0]);
        if (data.lastRenewed) {
          const daysDiff = Math.round((new Date(data.expiryDate).getTime() - new Date(data.lastRenewed).getTime()) / (1000 * 60 * 60 * 24));
          if ([30, 90, 180, 365].includes(daysDiff)) {
            setDurationPreset(daysDiff.toString());
          } else {
            setDurationPreset('custom');
          }
        } else {
          setDurationPreset('custom');
        }
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 365);
        setCustomExpiry(d.toISOString().split('T')[0]);
        setDurationPreset('365');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load license details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicense();
  }, []);

  const handleCopyHWID = () => {
    if (licenseData?.hwid) {
      navigator.clipboard.writeText(licenseData.hwid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDurationChange = (preset: string) => {
    setDurationPreset(preset);
    if (preset !== 'custom') {
      const days = parseInt(preset, 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      setCustomExpiry(d.toISOString().split('T')[0]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!customExpiry) throw new Error('Expiry date is required.');
      const expiryDate = new Date(customExpiry);
      expiryDate.setHours(23, 59, 59, 999);
      
      await api.put('/api/license/manage', {
        status,
        expiryDate: expiryDate.toISOString()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchLicense();
    } catch (err: any) {
      alert(err.message || 'Failed to update license.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenewViaKey = async () => {
    setRenewError('');
    setRenewing(true);
    try {
      await api.post('/api/license/activate', { licenseKey: newKey });
      setShowRenewModal(false);
      setNewKey('');
      fetchLicense();
    } catch (err: any) {
      setRenewError(err.message || 'Failed to activate license');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center text-theme-muted">
        <Loader2 className="animate-spin w-8 h-8 mr-2" />
        Loading license information...
      </div>
    );
  }

  if (error && !licenseData) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  const isActive = licenseData?.status === 'Active';

  return (
    <div className="space-y-8 max-w-4xl">
      {/* License Information Card */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">License Information</h3>
            <p className="text-sm text-theme-muted">Your software license details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-theme-muted mb-1.5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-theme-muted-light" /> Hardware ID
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text font-mono text-sm tracking-wider">
                {licenseData?.hwid || 'UNKNOWN'}
              </div>
              <button 
                onClick={handleCopyHWID}
                className="p-3 text-theme-muted hover:text-theme-text bg-theme-main border border-theme-border hover:border-theme-strong hover:bg-theme-card rounded-xl transition-all shadow-sm"
                title="Copy HWID"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-theme-muted-light mt-2">Hardware ID is permanently tied to this machine.</p>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-theme-muted mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-theme-muted-light" /> License Key
            </span>
            <div className="bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text font-mono text-sm truncate opacity-70">
              {licenseData?.licenseKey?.startsWith('MANUAL_') ? 'MANUALLY MANAGED' : (licenseData?.licenseKey || 'No key provided')}
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-theme-muted mb-1.5">Last Renewed</span>
            <div className="bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text text-sm">
              {licenseData?.lastRenewed ? new Date(licenseData.lastRenewed).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'}
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-theme-muted mb-1.5">Current Status</span>
            <div className="bg-theme-main border border-theme-border rounded-xl p-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {licenseData?.status || 'Invalid'}
              </span>
              <span className="text-sm text-theme-muted">
                ({licenseData?.daysRemaining || 0} days remaining)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual License Management Card */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">License Management</h3>
            <p className="text-sm text-theme-muted">Directly manage the license duration and status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
            >
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Invalid">Invalid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Extend Duration</label>
            <select
              value={durationPreset}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">1 Year (365 Days)</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={customExpiry}
              onChange={(e) => {
                setCustomExpiry(e.target.value);
                setDurationPreset('custom');
              }}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-theme-border">
          <button
            onClick={() => setShowRenewModal(true)}
            className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Activate via Secure Key Instead
          </button>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {success && (
              <span className="flex items-center gap-1.5 text-green-500 text-sm font-medium animate-in fade-in">
                <CheckCircle size={16} /> Saved Successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Renew Modal Overlay */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-main">
              <h3 className="text-lg font-bold text-theme-text">Activate via License Key</h3>
              <button onClick={() => setShowRenewModal(false)} className="text-theme-muted hover:text-theme-text transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-theme-muted">
                Please enter your securely generated license key. It must match your Hardware ID (<strong>{licenseData?.hwid}</strong>).
              </p>
              {renewError && (
                <div className="p-4 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> {renewError}
                </div>
              )}
              <textarea
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-theme-main border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm resize-none h-32 transition-colors"
                placeholder="Paste your license key here..."
              ></textarea>
            </div>
            <div className="p-5 bg-theme-main border-t border-theme-border flex justify-end gap-3">
              <button 
                onClick={() => setShowRenewModal(false)}
                className="px-5 py-2.5 text-theme-text bg-theme-secondary border border-theme-border hover:border-theme-strong hover:bg-theme-card rounded-xl font-medium transition-all"
                disabled={renewing}
              >
                Cancel
              </button>
              <button 
                onClick={handleRenewViaKey}
                disabled={renewing || !newKey.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
              >
                {renewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Activate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
