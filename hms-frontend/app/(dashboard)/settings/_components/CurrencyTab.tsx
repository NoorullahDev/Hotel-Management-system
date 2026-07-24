'use client';
import React, { useState } from 'react';
import { DollarSign, CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  settings: any;
  onSettingsChange: (category: string, key: string, value: any) => void;
  onSave: (category: string) => Promise<void>;
  setHasUnsavedChanges?: (val: boolean) => void;
}

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'BDT'];
const SYMBOLS: Record<string, string> = {
  'PKR': 'Rs.',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
  'SAR': '﷼',
  'INR': '₹',
  'BDT': '৳'
};

export default function CurrencyTab({ settings, onSettingsChange, onSave, setHasUnsavedChanges }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const get = (key: string, def = '') => settings?.hotel?.[key] || def;

  const handleCurrencyChange = (curr: string) => {
    onSettingsChange('hotel', 'currency', curr);
    onSettingsChange('hotel', 'currencySymbol', SYMBOLS[curr] || curr);
    setHasUnsavedChanges?.(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave('hotel');
    setSaving(false);
    setSuccess(true);
    setHasUnsavedChanges?.(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <DollarSign size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Currency Configuration</h3>
            <p className="text-sm text-theme-muted">Configure primary currency used across the system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Primary Currency</label>
            <select
              value={get('currency', 'PKR')}
              onChange={e => handleCurrencyChange(e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Currency Symbol</label>
            <input
              type="text"
              value={get('currencySymbol', 'Rs.')}
              onChange={e => { onSettingsChange('hotel', 'currencySymbol', e.target.value); setHasUnsavedChanges?.(true); }}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="e.g. $, Rs."
            />
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
