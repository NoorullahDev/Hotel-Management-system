"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Users, Building, Search, Download, Plus, Eye, Edit2, MoreVertical, 
  X, Briefcase, UserCheck, Sparkles, UtensilsCrossed, Calendar,
  Clock, CheckCircle, AlertCircle, CalendarDays, Key, Trash2, Power
} from 'lucide-react';
import { api } from '@/lib/api';

export default function StaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerAction, setPickerAction] = useState<'shift' | 'edit' | 'deactivate' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', department: 'Reception', role: '', shift: 'Morning (8AM - 4PM)', status: 'Active', hireDate: ''
  });
  const [shiftData, setShiftData] = useState({ shift: 'Morning (8AM - 4PM)' });

  // Auth Guard
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const data = await api.get<any>('/api/auth/me');
        if (!['Admin', 'Manager'].includes(data.role)) {
          router.push('/dashboard'); // Unauthorized
        } else {
          setUserRole(data.role);
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      return api.get<any>('/api/staff');
    },
    enabled: !!userRole
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['rolesList'],
    queryFn: async () => {
      return api.get<any>('/api/roles');
    },
    enabled: !!userRole
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/staff', formData);
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', department: 'Reception', role: '', shift: 'Morning (8AM - 4PM)', status: 'Active', hireDate: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await api.put(`/api/staff/${selectedStaff.id}`, formData);
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setShowEditModal(false);
      setSelectedStaff({ ...selectedStaff, ...formData });
    } catch (err) {
      console.error(err);
    }
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await api.put(`/api/staff/${selectedStaff.id}/shift`, shiftData);
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setShowShiftModal(false);
      setSelectedStaff({ ...selectedStaff, shift: shiftData.shift });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async (staffId: string) => {
    try {
      await api.put(`/api/staff/${staffId}`, { status: 'Inactive' });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      if (selectedStaff?.id === staffId) {
        setSelectedStaff({ ...selectedStaff, status: 'Inactive' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingAuth) return <div className="min-h-screen bg-theme-main flex items-center justify-center text-theme-text">Loading...</div>;
  if (!userRole) return null;

  const filteredStaff = staffList.filter((s: any) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDept = departmentFilter === 'All Departments' || s.department === departmentFilter;
    const matchRole = roleFilter === 'All Roles' || s.role === roleFilter;
    const matchStatus = statusFilter === 'All Status' || s.status === statusFilter;
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s: any) => s.status === 'Active').length;
  const receptionStaff = staffList.filter((s: any) => s.department === 'Reception').length;
  const housekeepingStaff = staffList.filter((s: any) => s.department === 'Housekeeping').length;
  const restaurantStaff = staffList.filter((s: any) => s.department === 'Restaurant').length;
  const managers = staffList.filter((s: any) => s.department === 'Management' || s.systemRole === 'Manager').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Staff Management</h1>
          <p className="text-sm text-theme-muted">Manage hotel staff, roles, shifts and attendance</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, employee ID or department..." 
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 pl-10 pr-4 text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary w-80"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              if (filteredStaff.length === 0) {
                alert('No staff data to export.');
                return;
              }
              const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Role', 'Shift', 'Status', 'Hire Date', 'Attendance'];
              const rows = filteredStaff.map((s: any) => [
                s.employeeId,
                s.name,
                s.email,
                s.phone || '',
                s.department,
                s.role,
                s.shift,
                s.status,
                s.hireDate ? new Date(s.hireDate).toLocaleDateString('en-US') : '',
                s.attendance ? `${s.attendance}%` : 'N/A',
              ]);
              const csvContent = [headers, ...rows]
                .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-card shadow-soft border border-theme-border rounded-xl text-theme-muted-light hover:text-theme-text transition-colors text-sm font-medium"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => {
              setFormData({ name: '', email: '', phone: '', department: 'Reception', role: '', shift: 'Morning (8AM - 4PM)', status: 'Active', hireDate: '' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors text-sm font-medium active:scale-95 shadow-md"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { title: 'Total Staff', count: totalStaff, icon: Building, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { title: 'Active Staff', count: activeStaff, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Reception', count: receptionStaff, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { title: 'Housekeeping', count: housekeepingStaff, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { title: 'Restaurant', count: restaurantStaff, icon: UtensilsCrossed, color: 'text-red-500', bg: 'bg-red-500/10' },
          { title: 'Managers', count: managers, icon: Briefcase, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <span className="text-2xl font-bold text-theme-text block">{stat.count}</span>
              <span className="text-xs text-theme-muted">{stat.title}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 relative">
        {/* Main Table Area */}
        <div className={`flex-1 flex flex-col gap-4 ${selectedStaff ? 'w-[calc(100%-350px)]' : 'w-full'} transition-all`}>
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-theme-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-theme-text">All Staff Members</h2>
              <div className="flex gap-3">
                <select className="bg-theme-main border border-theme-border rounded-lg px-3 py-1.5 text-sm text-theme-muted-light outline-none" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                  <option>All Departments</option>
                  {[...new Set(staffList.map((s: any) => s.department).filter(Boolean))].sort().map((dept: any) => (
                    <option key={dept}>{dept}</option>
                  ))}
                </select>
                <select className="bg-theme-main border border-theme-border rounded-lg px-3 py-1.5 text-sm text-theme-muted-light outline-none" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option>All Roles</option>
                  {[...new Set(staffList.map((s: any) => s.role).filter(Boolean))].sort().map((role: any) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
                <select className="bg-theme-main border border-theme-border rounded-lg px-3 py-1.5 text-sm text-theme-muted-light outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option>All Status</option>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-border text-xs uppercase text-theme-muted-light font-semibold bg-theme-main">
                    <th className="p-4">Employee ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Shift</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-theme-muted-light">
                  {filteredStaff.map((staff: any) => (
                    <tr key={staff.id} className="border-b border-theme-border hover:bg-theme-hover/30 transition-colors">
                      <td className="p-4 font-medium">{staff.employeeId}</td>
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-theme-hover flex items-center justify-center text-xs font-bold text-theme-text shrink-0">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="font-medium text-theme-text">{staff.name}</span>
                      </td>
                      <td className="p-4">{staff.department}</td>
                      <td className="p-4">{staff.role}</td>
                      <td className="p-4">{staff.shift}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          staff.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          staff.status === 'On Leave' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="p-4">{staff.attendance ? `${staff.attendance}%` : 'N/A'}</td>
                      <td className="p-4 flex items-center gap-2">
                        <button onClick={() => setSelectedStaff(staff)} className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded-md transition-colors"><Eye size={16} /></button>
                        <button onClick={() => {
                          setSelectedStaff(staff);
                          setFormData({ name: staff.name, email: staff.email, phone: staff.phone, department: staff.department, role: staff.role, shift: staff.shift, status: staff.status, hireDate: new Date(staff.hireDate).toISOString().split('T')[0] });
                          setShowEditModal(true);
                        }} className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded-md transition-colors"><Edit2 size={16} /></button>
                        <button className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded-md transition-colors"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-theme-muted-light">No staff found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-theme-border text-xs text-theme-muted-light flex justify-between items-center">
              <span>Showing 1 to {filteredStaff.length} of {staffList.length} entries</span>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded bg-theme-hover text-theme-text">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-theme-hover text-theme-muted">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-theme-hover text-theme-muted">3</button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-theme-text">Quick Actions</h3>
              {selectedStaff && (
                <span className="text-xs text-theme-muted bg-theme-main border border-theme-border px-3 py-1 rounded-lg">
                  Acting on: <span className="text-theme-text font-medium">{selectedStaff.name}</span>
                  <button onClick={() => setSelectedStaff(null)} className="ml-2 text-theme-muted-light hover:text-red-400"><X size={12}/></button>
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-3">
              <button
                onClick={() => { setFormData({ name: '', email: '', phone: '', department: 'Reception', role: '', shift: 'Morning (8AM - 4PM)', status: 'Active', hireDate: '' }); setShowAddModal(true); }}
                className="bg-theme-main border border-primary/30 hover:border-primary rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
              >
                <Plus size={20} className="text-blue-400 group-hover:text-blue-300" />
                <span className="text-sm font-bold text-theme-text">Add Staff</span>
                <span className="text-[10px] text-theme-muted-light">Create New Staff Profile</span>
              </button>

              <button
                onClick={() => {
                  if (selectedStaff) {
                    setShiftData({ shift: selectedStaff.shift || 'Morning (8AM - 4PM)' });
                    setShowShiftModal(true);
                  } else {
                    setPickerAction('shift');
                    setPickerSearch('');
                    setShowPickerModal(true);
                  }
                }}
                className="bg-theme-main border border-emerald-500/30 hover:border-emerald-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
              >
                <Calendar size={20} className="text-emerald-400 group-hover:text-emerald-300" />
                <span className="text-sm font-bold text-theme-text">Assign Shift</span>
                <span className="text-[10px] text-theme-muted-light">Assign Staff to Shift</span>
              </button>

              <button
                onClick={() => {
                  if (selectedStaff) {
                    setFormData({ ...selectedStaff, hireDate: new Date(selectedStaff.hireDate).toISOString().split('T')[0] });
                    setShowEditModal(true);
                  } else {
                    setPickerAction('edit');
                    setPickerSearch('');
                    setShowPickerModal(true);
                  }
                }}
                className="bg-theme-main border border-amber-500/30 hover:border-amber-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
              >
                <Edit2 size={20} className="text-amber-400 group-hover:text-amber-300" />
                <span className="text-sm font-bold text-theme-text">Edit Role</span>
                <span className="text-[10px] text-theme-muted-light">Update Staff Role</span>
              </button>

              <button
                onClick={() => {
                  if (selectedStaff) {
                    setSelectedStaff(selectedStaff);
                  } else {
                    setPickerAction(null);
                    setPickerSearch('');
                    setShowPickerModal(true);
                  }
                }}
                className="bg-theme-main border border-purple-500/30 hover:border-purple-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
              >
                <Clock size={20} className="text-purple-400 group-hover:text-purple-300" />
                <span className="text-sm font-bold text-theme-text">View Attendance</span>
                <span className="text-[10px] text-theme-muted-light">Check Attendance</span>
              </button>

              <button
                onClick={() => {
                  if (selectedStaff) {
                    handleDeactivate(selectedStaff.id);
                  } else {
                    setPickerAction('deactivate');
                    setPickerSearch('');
                    setShowPickerModal(true);
                  }
                }}
                className="bg-theme-main border border-red-500/30 hover:border-red-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer"
              >
                <Power size={20} className="text-red-400 group-hover:text-red-300" />
                <span className="text-sm font-bold text-theme-text">Deactivate Staff</span>
                <span className="text-[10px] text-theme-muted-light">Deactivate Staff Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {selectedStaff && (
          <div className="w-[350px] shrink-0 bg-theme-card shadow-soft border border-theme-border rounded-2xl flex flex-col overflow-hidden relative sticky top-6 self-start max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <button onClick={() => setSelectedStaff(null)} className="absolute top-4 right-4 text-theme-muted hover:text-theme-text"><X size={20}/></button>
            <div className="p-6 border-b border-theme-border flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-theme-hover flex items-center justify-center text-xl font-bold text-theme-text shrink-0">
                {selectedStaff.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
                  {selectedStaff.name} 
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedStaff.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{selectedStaff.status}</span>
                </h3>
                <span className="text-sm text-theme-muted">{selectedStaff.role}</span>
              </div>
            </div>
            
            <div className="flex border-b border-theme-border text-xs font-medium text-theme-muted bg-theme-main">
              <button className="flex-1 py-3 border-b-2 border-primary text-blue-400">Overview</button>
              <button className="flex-1 py-3 hover:text-theme-text transition-colors">Attendance</button>
              <button className="flex-1 py-3 hover:text-theme-text transition-colors">Tasks</button>
              <button className="flex-1 py-3 hover:text-theme-text transition-colors">Schedule</button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted-light">Employee ID</span>
                  <span className="text-theme-text font-medium">{selectedStaff.employeeId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted-light">Email</span>
                  <span className="text-theme-text font-medium">{selectedStaff.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted-light">Phone</span>
                  <span className="text-theme-text font-medium">{selectedStaff.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted-light">Department</span>
                  <span className="text-theme-text font-medium">{selectedStaff.department}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted-light">Date of Joining</span>
                  <span className="text-theme-text font-medium">{new Date(selectedStaff.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="border-t border-theme-border pt-6 flex flex-col gap-4">
                <h4 className="text-sm font-bold text-theme-text">Attendance Summary <span className="text-xs font-normal text-theme-muted-light">(This Month)</span></h4>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-theme-border border-t-emerald-500 flex items-center justify-center shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-theme-text">{selectedStaff.attendance || 100}%</span>
                      <span className="text-[8px] text-theme-muted-light uppercase tracking-wider">Present</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-theme-muted">Present Days</span>
                      <span className="text-theme-text font-bold">23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">Absent Days</span>
                      <span className="text-theme-text font-bold">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">Late Days</span>
                      <span className="text-theme-text font-bold">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">Leaves</span>
                      <span className="text-theme-text font-bold">0</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-theme-border pt-6 flex flex-col gap-4">
                <h4 className="text-sm font-bold text-theme-text">Upcoming Shift</h4>
                <div className="bg-theme-main border border-theme-border rounded-xl p-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-theme-muted">Tomorrow</span>
                    <span className="text-sm font-bold text-theme-text">{selectedStaff.shift}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-theme-border pt-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-theme-text">Assigned Tasks</h4>
                  <button className="text-xs text-blue-400 hover:text-blue-300">View All</button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="bg-theme-main p-3 rounded-xl border border-theme-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-theme-text">Guest Check-In Assistance</span>
                      <span className="text-[10px] text-theme-muted-light">Due: May 20, 10:00 AM</span>
                    </div>
                    <span className="text-[10px] font-bold text-red-400 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded">High</span>
                  </div>
                  <div className="bg-theme-main p-3 rounded-xl border border-theme-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-theme-text">Handle Guest Complaints</span>
                      <span className="text-[10px] text-theme-muted-light">Due: May 20, 02:00 PM</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded">Medium</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-theme-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-text">{showAddModal ? 'Add New Staff' : 'Edit Staff Profile'}</h2>
              <button onClick={() => {setShowAddModal(false); setShowEditModal(false);}} className="text-theme-muted hover:text-theme-text"><X size={24}/></button>
            </div>
            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Full Name *</label>
                <input type="text" className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Email * {showAddModal && <span className="text-xs text-theme-muted-light font-normal">(Login identifier)</span>}</label>
                <input type="email" className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={showEditModal} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Phone</label>
                <input type="text" className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-theme-muted-light">Department *</label>
                  <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required>
                    <option>Reception</option>
                    <option>Housekeeping</option>
                    <option>Restaurant</option>
                    <option>Management</option>
                    <option>Maintenance</option>
                    <option>Security</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-theme-muted-light">Role / Job Title *</label>
                  <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} required>
                    <option value="" disabled>Select Role</option>
                    {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-theme-muted-light">Shift</label>
                  <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
                    <option>Morning (8AM - 4PM)</option>
                    <option>Evening (2PM - 10PM)</option>
                    <option>Night (10PM - 6AM)</option>
                    <option>Day (10AM - 6PM)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-theme-muted-light">Hire Date *</label>
                  <input type="date" className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary custom-date-input" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Status</label>
                <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="p-4 bg-blue-500/10 border border-primary/20 rounded-xl mt-2">
                <p className="text-xs text-blue-400 leading-relaxed">
                  {showAddModal 
                    ? "A new user account will be created with default password 'Password123!'. They can change this after logging in. The system role will be automatically inferred from the department."
                    : "Updating staff profile. Note that system role cannot be changed from here."}
                </p>
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-theme-border">
                <button type="button" onClick={() => {setShowAddModal(false); setShowEditModal(false);}} className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors active:scale-95 shadow-md">
                  {showAddModal ? 'Create Staff Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
            <div className="p-5 border-b border-theme-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-theme-text">Assign Shift</h2>
              <button onClick={() => setShowShiftModal(false)} className="text-theme-muted hover:text-theme-text"><X size={20}/></button>
            </div>
            <form onSubmit={handleShiftSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-theme-main p-3 rounded-xl border border-theme-border">
                <div className="w-10 h-10 rounded-full bg-theme-hover flex items-center justify-center text-sm font-bold text-theme-text shrink-0">
                  {selectedStaff?.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-theme-text">{selectedStaff?.name}</span>
                  <span className="text-xs text-theme-muted-light">{selectedStaff?.role}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-theme-muted-light">Select Shift</label>
                <select className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary" value={shiftData.shift} onChange={e => setShiftData({ shift: e.target.value })}>
                  <option>Morning (8AM - 4PM)</option>
                  <option>Evening (2PM - 10PM)</option>
                  <option>Night (10PM - 6AM)</option>
                  <option>Day (10AM - 6PM)</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded-xl text-theme-muted-light hover:bg-theme-hover font-medium transition-colors text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm">
                  Update Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-theme-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-theme-text">Select a Staff Member</h2>
                <p className="text-xs text-theme-muted mt-0.5">
                  {pickerAction === 'shift' && 'Choose who to assign a shift to'}
                  {pickerAction === 'edit' && 'Choose who to edit'}
                  {pickerAction === 'deactivate' && 'Choose who to deactivate'}
                  {pickerAction === null && 'Choose who to view attendance for'}
                </p>
              </div>
              <button onClick={() => setShowPickerModal(false)} className="text-theme-muted hover:text-theme-text"><X size={20}/></button>
            </div>
            <div className="p-4 border-b border-theme-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name or employee ID..."
                  className="w-full bg-theme-main border border-theme-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col max-h-[320px] overflow-y-auto custom-scrollbar">
              {staffList
                .filter((s: any) =>
                  s.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                  (s.employeeId || '').toLowerCase().includes(pickerSearch.toLowerCase())
                )
                .map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStaff(s);
                      setShowPickerModal(false);
                      if (pickerAction === 'shift') {
                        setShiftData({ shift: s.shift || 'Morning (8AM - 4PM)' });
                        setShowShiftModal(true);
                      } else if (pickerAction === 'edit') {
                        setFormData({ ...s, hireDate: new Date(s.hireDate).toISOString().split('T')[0] });
                        setShowEditModal(true);
                      } else if (pickerAction === 'deactivate') {
                        handleDeactivate(s.id);
                      }
                    }}
                    className="flex items-center gap-3 p-4 hover:bg-theme-hover/50 transition-colors border-b border-theme-border/50 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-theme-hover flex items-center justify-center text-sm font-bold text-theme-text shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-theme-text truncate">{s.name}</span>
                      <span className="text-xs text-theme-muted-light">{s.employeeId} · {s.department}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                      s.status === 'On Leave' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{s.status}</span>
                  </button>
                ))}
              {staffList.filter((s: any) =>
                s.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                (s.employeeId || '').toLowerCase().includes(pickerSearch.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-theme-muted-light text-sm">No staff members found.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
