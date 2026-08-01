'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Calendar, Clock, Copy, RefreshCw, CheckCircle2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function LicenseTab() {
  const [licenseData, setLicenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const handleRenewClick = () => {
    alert("Please contact the software provider to renew your license.");
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




    </div>
  );
}
