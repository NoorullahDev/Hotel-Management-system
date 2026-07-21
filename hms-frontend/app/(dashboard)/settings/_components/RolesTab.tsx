'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: string;
  name: string;
  permissions: any;
}

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await api.get<any>('/api/roles');
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingRole(null);
    setFormName('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Role name is required');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      if (editingRole) {
        await api.put(`/api/roles/${editingRole.id}`, { name: formName });
      } else {
        await api.post('/api/roles', { name: formName });
      }

      setSuccess(`Role ${editingRole ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/roles/${id}`);

      setShowDeleteConfirm(null);
      setSuccess('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-500 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-theme-text font-semibold">System Roles</h3>
          <p className="text-sm text-theme-muted">Manage roles for system access</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95 shadow-md"
        >
          <Plus size={16} /> Add Role
        </button>
      </div>

      <div className="bg-theme-secondary border border-theme-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-theme-border bg-theme-main">
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Role Name</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className="p-8 text-center text-theme-muted-light"><Loader2 className="animate-spin inline mr-2" size={18} />Loading roles...</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={2} className="p-8 text-center text-theme-muted-light">No roles found.</td></tr>
            ) : (
              roles.map(role => (
                <tr key={role.id} className="border-b border-theme-border/50 hover:bg-theme-hover/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-primary" />
                      <span className="text-sm text-theme-text font-medium">{role.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(role)} className="p-2 text-theme-muted hover:text-blue-400 transition-colors" title="Edit Role">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(role.id)} className="p-2 text-theme-muted hover:text-red-500 transition-colors" title="Delete Role">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-theme-text font-semibold text-lg">{editingRole ? 'Edit Role' : 'Add New Role'}</h3>
              <button onClick={() => setShowModal(false)} className="text-theme-muted hover:text-theme-text"><X size={20} /></button>
            </div>

            {error && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Role Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                  placeholder="e.g. Supervisor" 
                  required 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-muted-light rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-theme-text font-semibold text-lg">Delete Role</h3>
            </div>
            <p className="text-theme-muted text-sm mb-6">Are you sure you want to delete this role? It cannot be undone if users are still assigned to it.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-5 py-2.5 bg-theme-main hover:bg-theme-card border border-theme-border text-theme-muted-light rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors">Delete Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
