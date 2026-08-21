'use client';
import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, Loader2, Clock, HardDrive, Shield } from 'lucide-react';
import { api } from '@/lib/api';

export default function BackupRestoreTab() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });

  React.useEffect(() => {
    fetchBackupInfo();
  }, []);

  const fetchBackupInfo = async () => {
    try {
      const data = await api.get<any>('/api/settings/backup/info');
      setLastBackup(data.lastBackupAt);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/api/settings/backup');
      setSuccessModal({ show: true, message: 'Your backup is complete.' });
      fetchBackupInfo();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloadLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}/api/settings/backup/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      
      // Extract filename from header or fallback to generated
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = '';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      } else {
        const now = new Date();
        // Use local date/time parts to avoid UTC midnight crossing giving wrong date
        const pad = (n: number) => String(n).padStart(2, '0');
        const y  = now.getFullYear();
        const mo = pad(now.getMonth() + 1);
        const d  = pad(now.getDate());
        filename = `HMS_Backup_${y}-${mo}-${d}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.zip`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessModal({ show: true, message: 'Your backup has been downloaded successfully.' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setShowRestoreConfirm(true);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    // Guard: password is required by the backend to confirm the destructive operation
    if (!restorePassword.trim()) {
      setError('Please enter your current password to confirm the restore.');
      return;
    }

    setRestoreLoading(true);
    setError('');
    setSuccess('');
    setShowRestoreConfirm(false);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      // Backend requires currentPassword to authorise overwriting the entire DB
      formData.append('currentPassword', restorePassword);

      const responseData = await api.post<any>('/api/settings/restore', formData);
      setSuccessModal({ show: true, message: responseData.message || 'Restore completed successfully. Please restart the application to apply all restored data.' });
      setRestoreFile(null);
      setRestorePassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Last Backup Info */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Clock size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Backup Status</h3>
            <p className="text-sm text-theme-muted">
              {lastBackup
                ? `Last backup: ${new Date(lastBackup as string).toLocaleString()}`
                : 'No backups created yet'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Database size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Backup Database</h3>
            <p className="text-sm text-theme-muted">Create a complete backup of all hotel data</p>
          </div>
        </div>

        <div className="bg-theme-main border border-theme-border rounded-xl p-4 mb-6">
          <p className="text-sm text-theme-muted-light mb-2">The backup includes:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['Bookings', 'Guests', 'Rooms', 'Billing & Invoices', 'Restaurant Data', 'User Accounts', 'Settings', 'Notifications', 'Audit Logs'].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-theme-muted">
                <CheckCircle size={12} className="text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {backupLoading ? <Loader2 size={18} className="animate-spin" /> : <HardDrive size={18} />}
            Create Backup
          </button>

          <button
            onClick={handleDownload}
            disabled={downloadLoading}
            className="flex items-center gap-2 px-6 py-3 bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-text font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {downloadLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Download Backup
          </button>
        </div>
      </div>

      {/* Restore Section */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Shield size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Restore Database</h3>
            <p className="text-sm text-theme-muted">Restore hotel data from a backup file</p>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Warning: Destructive Operation</p>
            <p className="text-xs text-theme-muted mt-1">
              Restoring a backup will overwrite current settings data. Make sure to create a backup of your current data before proceeding.
            </p>
          </div>
        </div>

        <label className="cursor-pointer bg-theme-main hover:bg-theme-card shadow-soft border border-dashed border-theme-strong rounded-xl p-6 text-center transition-colors block">
          <Upload size={24} className="mx-auto mb-2 text-theme-muted-light" />
          <span className="text-sm font-medium text-theme-muted-light">
            {restoreLoading ? 'Restoring...' : 'Upload Backup File (.zip)'}
          </span>
          <p className="text-xs text-theme-muted-light mt-1">Select a previously downloaded backup file</p>
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={handleRestoreFileSelect}
            disabled={restoreLoading}
          />
        </label>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h3 className="text-theme-text font-semibold text-lg">Confirm Restore</h3>
            </div>
            <p className="text-theme-muted text-sm mb-4">
              Are you sure you want to restore from <span className="text-theme-text font-medium">{restoreFile?.name}</span>?
              This will overwrite current settings data.
            </p>

            {/* Password confirmation — required by the backend */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-theme-muted-light mb-2">
                Enter your current password to confirm
              </label>
              <input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && restorePassword.trim()) handleRestore(); }}
                placeholder="Current password"
                className="w-full px-4 py-2.5 bg-theme-main border border-theme-border rounded-xl text-theme-text placeholder-theme-muted text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); setRestorePassword(''); }}
                className="px-5 py-2.5 bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-muted-light rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={!restorePassword.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <h3 className="text-theme-text font-semibold text-lg">Success</h3>
            </div>
            <p className="text-theme-muted text-sm mb-6">
              {successModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSuccessModal({ show: false, message: '' });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
