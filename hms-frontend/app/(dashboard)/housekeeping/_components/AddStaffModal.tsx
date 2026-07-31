import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

export default function AddStaffModal({ onClose, onStaffAdded }: { onClose: () => void, onStaffAdded: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  React.useEffect(() => {
    api.get<any[]>('/api/roles').then(setRoles).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/housekeeping/staff', formData);
      onStaffAdded();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Failed to add staff member. Check if email already exists.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-theme-border">
          <h2 className="text-xl font-bold text-theme-text">Add Housekeeping Staff</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Full Name *</label>
              <input 
                type="text" 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Contact Number</label>
              <input 
                type="text" 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-theme-muted-light">Email (Optional)</label>
            <input 
              type="email" 
              className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Role *</label>
              <select 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="" disabled>Select Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Status *</label>
              <select 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-primary/20 rounded-xl">
            <p className="text-xs text-blue-400 leading-relaxed">
              This will create a new staff profile under the Housekeeping department. They will be available for task assignment immediately if set to Active.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-theme-border">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors active:scale-95 shadow-md flex items-center justify-center min-w-[120px]"
            >
              {loading ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
