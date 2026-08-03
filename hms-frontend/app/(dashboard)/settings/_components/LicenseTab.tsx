'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Calendar, Clock, Copy, RefreshCw, CheckCircle2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LicenseTab() {
  const [licenseData, setLicenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  const handleRenewClick = () => {
    setShowModal(true);
    setSubmitError('');
    setSubmitSuccess('');
    setNewLicenseKey('');
  };

  const handleRenewSubmit = async () => {
    if (!newLicenseKey.trim()) {
      setSubmitError('Please enter a license key');
      return;
    }
    try {
      setSubmitLoading(true);
      setSubmitError('');
      setSubmitSuccess('');
      
      await api.post('/api/license/activate', { licenseKey: newLicenseKey.trim() });
      
      setSubmitSuccess('License activated successfully!');
      fetchLicense();
      
      setTimeout(() => {
        setShowModal(false);
      }, 1500);
      
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to activate license');
    } finally {
      setSubmitLoading(false);
    }
  };
  const fetchLicense = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/api/license/status');
      setLicenseData(data);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-theme-text font-semibold">License Information</h3>
              <p className="text-sm text-theme-muted">Your software license details</p>
            </div>
          </div>
          <button
            onClick={handleRenewClick}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Renew License
          </button>
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




      {/* Renew License Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-md p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-theme-text">Renew License</h3>
              <button onClick={() => setShowModal(false)} className="text-theme-muted hover:text-theme-text transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-theme-muted text-sm mb-6">
              Please enter your new license key below to activate or renew your subscription.
            </p>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {submitSuccess}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-medium text-theme-text">License Key</label>
              <textarea 
                className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text text-sm focus:outline-none focus:border-primary transition-colors resize-none h-24"
                placeholder="Paste your license key here..."
                value={newLicenseKey}
                onChange={(e) => setNewLicenseKey(e.target.value)}
              />
            </div>

            <div className="flex w-full gap-3 mt-auto">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 bg-theme-secondary hover:bg-theme-hover text-theme-text font-medium rounded-xl transition-colors"
                disabled={submitLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleRenewSubmit}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
