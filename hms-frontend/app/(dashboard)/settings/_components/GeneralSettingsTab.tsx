'use client';
import React, { useState } from 'react';
import { Building2, Upload, CheckCircle, Loader2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';

interface Props {
  settings: any;
  onSettingsChange: (category: string, key: string, value: any) => void;
  onSave: (category: string) => Promise<void>;
}

export default function GeneralSettingsTab({ settings, onSettingsChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const { theme, setTheme } = useTheme();

  const get = (key: string, def = '') => settings?.general?.[key] || def;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(key);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadData = await api.post<any>('/api/upload', formData);
      if (uploadData.imageUrl) {
        onSettingsChange('general', key, uploadData.imageUrl);
      } else {
        alert('Image upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Error uploading image.');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave('general');
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const resolveUrl = (path: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${path}`;
  };

  return (
    <div className="space-y-8">
      {/* Theme Card */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Moon size={20} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Appearance</h3>
            <p className="text-sm text-theme-muted">Customize the look and feel of your dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Theme Button */}
          <button 
            onClick={() => setTheme('light')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-500/5' : 'border-theme-border bg-theme-main hover:border-theme-strong'}`}
          >
            <div className={`p-3 rounded-full ${theme === 'light' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-theme-muted-light'}`}>
              <Sun size={20} />
            </div>
            <div className="text-left">
              <div className="font-medium text-theme-text">Light Theme</div>
              <div className="text-sm text-theme-muted">Clean and bright interface</div>
            </div>
          </button>

          {/* Dark Theme Button */}
          <button 
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-500/5' : 'border-theme-border bg-theme-main hover:border-theme-strong'}`}
          >
            <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-theme-card text-theme-muted border border-theme-border'}`}>
              <Moon size={20} />
            </div>
            <div className="text-left">
              <div className="font-medium text-theme-text">Dark Theme</div>
              <div className="text-sm text-theme-muted">Easy on the eyes (Default)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Building2 size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Hotel Branding</h3>
            <p className="text-sm text-theme-muted">Manage your hotel's logo, banner, and identity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-2">Hotel Logo</label>
            <div className="flex items-center gap-4">
              {get('hotelLogo') ? (
                <img loading="lazy" decoding="async" src={resolveUrl(get('hotelLogo'))} alt="Logo" className="h-16 w-16 object-contain bg-theme-card/5 rounded-xl border border-theme-border p-1" />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-theme-main border border-theme-border flex items-center justify-center text-theme-muted">
                  <Building2 size={24} />
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-theme-main hover:bg-theme-card shadow-soft border border-dashed border-theme-strong rounded-xl p-4 text-center transition-colors">
                <Upload size={18} className="mx-auto mb-1 text-theme-muted-light" />
                <span className="text-sm font-medium text-theme-muted-light">
                  {uploading === 'hotelLogo' ? 'Uploading...' : 'Upload Logo'}
                </span>
                <p className="text-xs text-theme-muted-light mt-1">PNG, JPG up to 5MB</p>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'hotelLogo')} disabled={!!uploading} />
              </label>
            </div>
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-2">Hotel Banner / Login Background</label>
            <div className="flex items-center gap-4">
              {get('hotelBanner') ? (
                <img loading="lazy" decoding="async" src={resolveUrl(get('hotelBanner'))} alt="Banner" className="h-16 w-28 object-cover rounded-xl border border-theme-border" />
              ) : (
                <div className="h-16 w-28 rounded-xl bg-theme-main border border-theme-border flex items-center justify-center text-theme-muted text-xs">
                  No Banner
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-theme-main hover:bg-theme-card shadow-soft border border-dashed border-theme-strong rounded-xl p-4 text-center transition-colors">
                <Upload size={18} className="mx-auto mb-1 text-theme-muted-light" />
                <span className="text-sm font-medium text-theme-muted-light">
                  {uploading === 'hotelBanner' ? 'Uploading...' : 'Upload Banner'}
                </span>
                <p className="text-xs text-theme-muted-light mt-1">Used on Login page</p>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'hotelBanner')} disabled={!!uploading} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Login Page Content */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <h3 className="text-theme-text font-semibold mb-4">Login Page Content</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Main Heading</label>
            <input
              type="text"
              value={get('loginHeadingMain', 'Smart Hotel Management Simplified.')}
              onChange={e => onSettingsChange('general', 'loginHeadingMain', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="e.g. Smart Hotel Management Simplified."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Subheading Description</label>
            <textarea
              value={get('loginSubheading', 'Manage bookings, guests, staff, and operations seamlessly with our all-in-one hotel management solution.')}
              onChange={e => onSettingsChange('general', 'loginSubheading', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary h-20 resize-none transition-colors"
              placeholder="Enter a brief description..."
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <h3 className="text-theme-text font-semibold mb-4">Hotel Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Hotel Name</label>
            <input
              type="text"
              value={get('hotelName')}
              onChange={e => onSettingsChange('general', 'hotelName', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
              placeholder="Grand Park Hotel"
            />
            <p className="text-xs text-theme-muted-light mt-1">Updates across Dashboard, Reports, Invoices, and Login</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Email Address</label>
            <input
              type="email"
              value={get('email')}
              onChange={e => onSettingsChange('general', 'email', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
              placeholder="info@hotel.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Hotel Address</label>
            <textarea
              value={get('hotelAddress')}
              onChange={e => onSettingsChange('general', 'hotelAddress', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary h-20 resize-none transition-colors"
              placeholder="123 Hotel Avenue, New York, NY 10001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Contact Number</label>
            <input
              type="text"
              value={get('contactNumber')}
              onChange={e => onSettingsChange('general', 'contactNumber', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
              placeholder="+92 300 1234567"
            />
          </div>
        </div>
      </div>

      {/* Save Bar */}
      <div className="flex items-center justify-end gap-4 pt-2">
        {success && (
          <span className="flex items-center gap-1.5 text-green-500 text-sm font-medium animate-in fade-in">
            <CheckCircle size={16} /> Saved Successfully
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          Save Changes
        </button>
      </div>
    </div>
  );
}
