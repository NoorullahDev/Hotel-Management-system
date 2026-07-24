'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  guest: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuestModal({ guest, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: guest.name || '',
    email: guest.email || '',
    phone: guest.phone || '',
    guestType: guest.guestType || 'LOCAL',
    idType: guest.idType || '',
    idNumber: guest.idNumber || '',
    nationality: guest.nationality || '',
    city: guest.city || '',
    address: guest.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch(`/api/guests/${guest.id}`, formData);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-theme-secondary border border-theme-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-theme-text">Edit Guest Profile</h2>
            <p className="text-xs text-theme-muted mt-1">Update information for {guest.name}</p>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors bg-theme-card shadow-soft p-2 rounded-lg hover:bg-theme-hover">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-theme-muted-light">Full Name *</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Email</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Phone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Guest Type *</label>
              <select 
                required
                value={formData.guestType}
                onChange={(e) => setFormData({...formData, guestType: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none"
              >
                <option value="LOCAL">Local (Pakistani)</option>
                <option value="FOREIGN">Foreign (VIP)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Nationality</label>
              <input 
                type="text" 
                value={formData.nationality}
                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">ID Type</label>
              <select 
                value={formData.idType}
                onChange={(e) => setFormData({...formData, idType: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none"
              >
                <option value="">Select ID Type</option>
                <option value="CNIC">CNIC</option>
                <option value="Passport">Passport</option>
                <option value="Driver License">Driver License</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">ID Number</label>
              <input 
                type="text" 
                value={formData.idNumber}
                onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">City</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-theme-muted-light">Full Address</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={2}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary custom-scrollbar resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-theme-hover hover:bg-theme-hover text-theme-text text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-primary hover:bg-primary text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 active:scale-95 shadow-md"
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
