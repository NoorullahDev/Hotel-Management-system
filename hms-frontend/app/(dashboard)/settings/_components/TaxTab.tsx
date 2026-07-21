'use client';
import React, { useState } from 'react';
import { Percent, CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  settings: any;
  onSettingsChange: (category: string, key: string, value: any) => void;
  onSave: (category: string) => Promise<void>;
}

export default function TaxTab({ settings, onSettingsChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const get = (key: string, def: any = '') => settings?.tax?.[key] ?? def;

  const handleSave = async () => {
    setSaving(true);
    await onSave('tax');
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Percent size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Tax Configuration</h3>
            <p className="text-sm text-theme-muted">Configure global tax applied to bookings and orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={get('rate', '0')}
              onChange={e => onSettingsChange('tax', 'rate', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="e.g. 16"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Tax Name</label>
            <input
              type="text"
              value={get('name', 'GST')}
              onChange={e => onSettingsChange('tax', 'name', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="e.g. VAT, GST"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={get('enabled', true)}
                onChange={e => onSettingsChange('tax', 'enabled', e.target.checked)}
                className="w-5 h-5 rounded border-theme-border bg-theme-main text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-theme-muted">Enable Tax Calculation globally</span>
            </label>
          </div>
        </div>
      </div>

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
