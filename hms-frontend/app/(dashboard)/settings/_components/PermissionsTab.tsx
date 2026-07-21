'use client';
import React, { useState, useEffect } from 'react';
import { KeySquare, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'view_dashboard', name: 'View Dashboard', category: 'General' },
  { id: 'manage_bookings', name: 'Manage Bookings', category: 'Bookings' },
  { id: 'view_bookings', name: 'View Bookings', category: 'Bookings' },
  { id: 'manage_rooms', name: 'Manage Rooms', category: 'Rooms' },
  { id: 'view_rooms', name: 'View Rooms', category: 'Rooms' },
  { id: 'manage_guests', name: 'Manage Guests', category: 'Guests' },
  { id: 'manage_billing', name: 'Manage Billing & Invoices', category: 'Billing' },
  { id: 'manage_restaurant', name: 'Manage Restaurant', category: 'Restaurant' },
  { id: 'manage_housekeeping', name: 'Manage Housekeeping', category: 'Housekeeping' },
  { id: 'manage_staff', name: 'Manage Staff', category: 'Staff' },
  { id: 'view_reports', name: 'View Reports', category: 'Reports' },
  { id: 'manage_settings', name: 'Manage Settings', category: 'System' },
];

export default function PermissionsTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await api.get<any>('/api/roles');
      setRoles(data);
      if (data.length > 0 && !selectedRoleId) {
        handleSelectRole(data[0].id, data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (roleId: string, rolesList = roles) => {
    setSelectedRoleId(roleId);
    const role = rolesList.find(r => r.id === roleId);
    if (role) {
      setPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    } else {
      setPermissions([]);
    }
  };

  const togglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setSuccess('');

    try {
      await api.put(`/api/roles/${selectedRoleId}`, { permissions });

      setSuccess('Permissions updated successfully');
      // Update local roles state
      setRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permissions } : r));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-500 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <KeySquare size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-theme-text font-semibold">Role Permissions</h3>
            <p className="text-sm text-theme-muted">Configure access controls for each role</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-theme-muted-light"><Loader2 className="animate-spin inline mr-2" size={18} />Loading...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-theme-muted-light">No roles found. Create roles first.</div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1.5">Select Role to Edit</label>
              <select
                value={selectedRoleId}
                onChange={e => handleSelectRole(e.target.value)}
                className="w-full md:w-1/2 bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
              >
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-main">
              {categories.map((category, idx) => (
                <div key={category} className={idx !== 0 ? 'border-t border-theme-border' : ''}>
                  <div className="bg-theme-secondary/50 px-4 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(perm => (
                      <label key={perm.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 rounded border-theme-border bg-theme-main text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-theme-text">{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                Save Permissions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
