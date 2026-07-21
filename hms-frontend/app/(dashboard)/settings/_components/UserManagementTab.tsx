'use client';
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, Search, X, Loader2, CheckCircle, AlertTriangle, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';

const ROLES = ['Admin', 'Manager', 'Receptionist', 'Housekeeping', 'Restaurant'];
const DEPARTMENTS = ['Management', 'Front Desk', 'Housekeeping', 'Restaurant', 'Maintenance'];

interface StaffUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  systemRole: string;
  shift: string;
  status: string;
  hireDate: string;
}

export default function UserManagementTab() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: 'Front Desk',
    role: 'Receptionist', shift: 'Morning (8AM - 4PM)', status: 'Active'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get<any>('/api/staff');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', department: 'Front Desk', role: 'Receptionist', shift: 'Morning (8AM - 4PM)', status: 'Active' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: StaffUser) => {
    setEditingUser(user);
    setForm({
      name: user.name, email: user.email, phone: user.phone || '',
      department: user.department, role: user.role || 'Staff',
      shift: user.shift || 'Morning (8AM - 4PM)', status: user.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      if (editingUser) {
        await api.put(`/api/staff/${editingUser.id}`, form);
        setSuccess('User updated successfully');
      } else {
        await api.post('/api/staff', { ...form, hireDate: new Date().toISOString() });
        setSuccess('User created successfully');
      }

      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/staff/${id}`);

      setShowDeleteConfirm(null);
      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/api/staff/${user.id}`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter || u.systemRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-theme-main border border-theme-border rounded-xl text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-theme-main border border-theme-border rounded-xl p-2.5 text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none"
          >
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95 shadow-md"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-theme-secondary border border-theme-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-theme-border bg-theme-main">
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">User</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider hidden md:table-cell">Department</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider hidden md:table-cell">Role</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-theme-muted-light"><Loader2 className="animate-spin inline mr-2" size={18} />Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-theme-muted-light">No users found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-theme-border/50 hover:bg-theme-hover/20 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-theme-text font-medium">{user.name}</p>
                      <p className="text-xs text-theme-muted-light">{user.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-theme-muted hidden md:table-cell">{user.department}</td>
                  <td className="p-4 text-sm text-theme-muted-light hidden md:table-cell">
                    <span className="flex items-center gap-1.5">
                      <Shield size={14} className="text-primary" />
                      {user.role || user.systemRole}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        user.status === 'Active'
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }`}
                    >
                      {user.status === 'Active' ? <UserCheck size={12} /> : <UserX size={12} />}
                      {user.status || 'Active'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(user)} className="p-2 text-theme-muted hover:text-blue-400 transition-colors" title="Edit User">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(user.id)} className="p-2 text-theme-muted hover:text-red-500 transition-colors" title="Delete User">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-theme-text font-semibold text-lg">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-theme-muted hover:text-theme-text"><X size={20} /></button>
            </div>

            {error && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" placeholder="John Doe" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" placeholder="john@hotel.com" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Phone Number</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" placeholder="+92 300 1234567" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Department</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Shift</label>
                  <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                    <option>Morning (8AM - 4PM)</option>
                    <option>Afternoon (4PM - 12AM)</option>
                    <option>Night (12AM - 8AM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-muted mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="bg-blue-500/5 border border-primary/20 rounded-xl p-3">
                  <p className="text-xs text-blue-300">Default password: <span className="font-mono text-blue-400">Password123!</span></p>
                  <p className="text-xs text-theme-muted-light mt-1">The user can change their password after first login.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-muted-light rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 active:scale-95 shadow-md">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-theme-text font-semibold text-lg">Delete User</h3>
            </div>
            <p className="text-theme-muted text-sm mb-6">Are you sure you want to delete this user? This action cannot be undone and will remove all associated data.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-5 py-2.5 bg-theme-main hover:bg-theme-card shadow-soft border border-theme-border text-theme-muted-light rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors">Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
