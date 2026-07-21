'use client';
import React, { useState } from 'react';
import { Building, Clock, DollarSign, Globe, CheckCircle, Loader2, Info } from 'lucide-react';

interface Props {
  settings: any;
  onSettingsChange: (category: string, key: string, value: any) => void;
  onSave: (category: string) => Promise<void>;
}

const TIMEZONES = [
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh',
  'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Dhaka', 'Asia/Singapore', 'Australia/Sydney'
];

export default function HotelSettingsTab({ settings, onSettingsChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const get = (key: string, def = '') => settings?.hotel?.[key] || def;

  const handleSave = async () => {
    setSaving(true);
    await onSave('hotel');
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Sync Info Banner */}
      <div className="bg-blue-500/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-300 font-medium">Room Management Synchronization</p>
          <p className="text-xs text-theme-muted mt-1">
            Changes to Total Floors and Total Rooms will update the Room Management module's floor dropdown 
            and room capacity display. Individual rooms are still managed in the Room Management section.
          </p>
        </div>
      </div>

      {/* Operational Hours */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Clock size={20} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Operational Hours</h3>
            <p className="text-sm text-theme-muted">Configure check-in and check-out times</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Check-in Time</label>
            <input
              type="time"
              value={get('checkInTime', '14:00')}
              onChange={e => onSettingsChange('hotel', 'checkInTime', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Check-out Time</label>
            <input
              type="time"
              value={get('checkOutTime', '12:00')}
              onChange={e => onSettingsChange('hotel', 'checkOutTime', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Room Configuration */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Building size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Room Configuration</h3>
            <p className="text-sm text-theme-muted">Set hotel capacity — syncs with Room Management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Total Floors</label>
            <input
              type="number"
              min="1"
              max="200"
              value={get('floors', '')}
              onChange={e => onSettingsChange('hotel', 'floors', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
              placeholder="e.g. 5"
            />
            <p className="text-xs text-theme-muted-light mt-1">Updates the floor filter in Room Management</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Total Rooms</label>
            <input
              type="number"
              min="1"
              max="9999"
              value={get('rooms', '')}
              onChange={e => onSettingsChange('hotel', 'rooms', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors"
              placeholder="e.g. 24"
            />
            <p className="text-xs text-theme-muted-light mt-1">Hotel capacity reference for Room Management</p>
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Globe size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Regional Settings</h3>
            <p className="text-sm text-theme-muted">Currency and timezone configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1.5">Time Zone</label>
            <select
              value={get('timeZone', 'Asia/Karachi')}
              onChange={e => onSettingsChange('hotel', 'timeZone', e.target.value)}
              className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary transition-colors appearance-none"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
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
