'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Clock, Filter, 
  Settings, User, MapPin, Search, ChevronRight, X, AlertCircle,
  CalendarCheck, LogIn, LogOut, Receipt, PenTool, ShieldCheck, Mail, Smartphone, Monitor, Trash2, Calendar
} from 'lucide-react';
import { connectSocket } from '../../../lib/socket';
import { api } from '@/lib/api';

type NotificationStats = {
  total: number;
  unread: number;
  bookingAlerts: number;
  paymentAlerts: number;
  maintenanceAlerts: number;
  systemAlerts: number;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  metadata: any | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationPreference = {
  booking: boolean;
  checkIn: boolean;
  checkOut: boolean;
  roomReady: boolean;
  foodOrder: boolean;
  feedback: boolean;
  system: boolean;
  payment: boolean;
  maintenance: boolean;
  staff: boolean;
  emergency: boolean;
  email: boolean;
  sms: boolean;
  desktop: boolean;
};

const getIconData = (type: string, title?: string) => {
  const t = type.toLowerCase();
  if (t === 'booking') {
    if (title?.toLowerCase().includes('cancelled')) {
      return { icon: Calendar, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
    }
    return { icon: CalendarCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  }
  if (t === 'check-in' || t === 'check-out') return { icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' };
  if (t === 'payment' || t === 'invoice') return { icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' };
  if (t === 'maintenance') return { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' };
  if (t === 'housekeeping' || t === 'room ready') return { icon: CheckCircle, color: 'text-teal-500', bg: 'bg-teal-500/10 border-teal-500/20' };
  if (t === 'system' || title?.toLowerCase().includes('login')) return { icon: ShieldCheck, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  return { icon: Bell, color: 'text-theme-muted', bg: 'bg-theme-secondary border-theme-border' };
};

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0, unread: 0, bookingAlerts: 0, paymentAlerts: 0, maintenanceAlerts: 0, systemAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState('All Types');
  
  const [prefs, setPrefs] = useState<NotificationPreference>({
    booking: true, checkIn: true, checkOut: true, roomReady: true, foodOrder: true, feedback: true,
    system: true, payment: true, maintenance: true, staff: true, emergency: true, email: true, sms: false, desktop: true
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  const fetchNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const url = new URL('/api/notifications', window.location.origin);
      if (filterType !== 'All Types') url.searchParams.append('type', filterType);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      
      const data = await api.get<any>(`${url.pathname}${url.search}`);
      setNotifications(data.data);
      setStats(data.stats);
      setTotalPages(data.meta.totalPages);
      setCurrentPage(data.meta.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const data = await api.get<any>('/api/notifications/preferences');
      setPrefs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
    fetchPreferences();
    
    const socket = connectSocket();
    const handleNew = (notif: Notification) => {
      fetchNotifications(currentPage); // Simple reload on new
    };
    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [filterType]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      
      if (selectedNotification?.id === id) {
        setSelectedNotification(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setStats(prev => ({ ...prev, unread: 0 }));
    } catch (err) {
      console.error(err);
    }
  };

  const updatePreference = async (key: keyof NotificationPreference, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      await api.patch('/api/notifications/preferences', { [key]: value });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelect = (n: Notification) => {
    setSelectedNotification(n);
  };

  const filterTabs = [
    { label: 'All Types', icon: null },
    { label: 'Booking', icon: CalendarCheck },
    { label: 'Check-in', icon: User },
    { label: 'Check-out', icon: User },
    { label: 'Payment', icon: Receipt },
    { label: 'Maintenance', icon: AlertCircle },
    { label: 'System', icon: ShieldCheck }
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Notifications</h1>
          <p className="text-sm text-theme-muted">Stay updated with real-time alerts and important activities</p>
        </div>
        
        {/* We can add a search box here if needed, omitted to focus on main layout */}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterTabs.map(tab => (
            <button
              key={tab.label}
              onClick={() => setFilterType(tab.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filterType === tab.label 
                  ? 'bg-[#0066FF] text-white' 
                  : 'bg-theme-card text-theme-muted border border-theme-border hover:bg-theme-hover hover:text-theme-text'
              }`}
            >
              {tab.icon && <tab.icon size={16} />}
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={markAllAsRead}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white text-sm font-medium rounded-lg hover:bg-primary transition-colors shrink-0 active:scale-95 shadow-md"
        >
          <CheckCircle size={16} /> Mark all as read
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Total Notifications', val: stats.total, sub: 'All time', icon: Bell, c1: 'text-blue-500', c2: 'bg-blue-500/10 border border-blue-500/20' },
          { label: 'Unread Notifications', val: stats.unread, sub: 'Requires attention', icon: Mail, c1: 'text-orange-500', c2: 'bg-orange-500/10 border border-orange-500/20' },
          { label: 'Booking Alerts', val: stats.bookingAlerts, sub: 'This month', icon: CalendarCheck, c1: 'text-emerald-500', c2: 'bg-emerald-500/10 border border-emerald-500/20' },
          { label: 'Payment Alerts', val: stats.paymentAlerts, sub: 'This month', icon: Receipt, c1: 'text-purple-500', c2: 'bg-purple-500/10 border border-purple-500/20' },
          { label: 'Maintenance Alerts', val: stats.maintenanceAlerts, sub: 'This month', icon: PenTool, c1: 'text-orange-400', c2: 'bg-orange-400/10 border border-orange-400/20' },
          { label: 'System Alerts', val: stats.systemAlerts, sub: 'This month', icon: ShieldCheck, c1: 'text-teal-500', c2: 'bg-teal-500/10 border border-teal-500/20' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${kpi.c2} ${kpi.c1}`}>
              <kpi.icon size={20} />
            </div>
            <div className="text-xs font-medium text-theme-muted mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold text-theme-text mb-1">{kpi.val}</div>
            <div className="text-[10px] text-theme-muted-light">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="flex gap-6 flex-1 min-h-[500px]">
        
        {/* Left: List */}
        <div className="flex-1 bg-theme-card shadow-soft border border-theme-border rounded-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-theme-border">
            <span className="text-sm font-medium text-theme-muted-light">All Notifications ({stats.total})</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-theme-muted-light">Sort by:</span>
              <select className="bg-transparent text-sm text-theme-muted-light focus:outline-none cursor-pointer">
                <option>Latest</option>
                <option>Oldest</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center text-theme-muted-light py-10">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-theme-muted-light py-10">No notifications found</div>
            ) : (
              notifications.map((n) => {
                const iconD = getIconData(n.type, n.title);
                const Icon = iconD.icon;
                const isSelected = selectedNotification?.id === n.id;
                
                return (
                  <div 
                    key={n.id} 
                    onClick={() => handleSelect(n)}
                    className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-theme-hover border border-theme-border' 
                        : 'bg-theme-main border border-transparent hover:border-theme-border'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border ${iconD.bg} ${iconD.color}`}>
                      <Icon size={22} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-theme-text truncate">{n.title}</div>
                      <div className="text-sm text-theme-muted mt-1 line-clamp-1">{n.message}</div>
                      {n.referenceId && (
                        <div className="text-xs text-theme-muted-light mt-2">Ref ID: {n.referenceId.substring(0, 13).toUpperCase()}</div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="text-xs text-theme-muted-light">{formatTimeAgo(n.createdAt)}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-theme-strong' : 'bg-[#0066FF]'}`}></div>
                        <span className={`text-xs ${n.isRead ? 'text-theme-muted-light' : 'text-[#0066FF]'}`}>
                          {n.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(n.id, e)}
                        className="text-theme-muted hover:text-red-500 transition-colors mt-2 p-1"
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-theme-border flex items-center justify-between text-sm text-theme-muted-light">
            <span>Showing {notifications.length} of {stats.total} notifications</span>
            <div className="flex gap-1">
              <button 
                onClick={() => fetchNotifications(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 hover:text-theme-muted-light disabled:opacity-50"
              >
                {'<'}
              </button>
              {Array.from({length: Math.min(5, totalPages)}).map((_, i) => (
                <button 
                  key={i}
                  onClick={() => fetchNotifications(i + 1)}
                  className={`w-8 h-8 rounded flex items-center justify-center ${currentPage === i + 1 ? 'bg-[#0066FF] text-white' : 'hover:bg-theme-hover'}`}
                >
                  {i + 1}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2">...</span>}
              {totalPages > 5 && (
                <button 
                  onClick={() => fetchNotifications(totalPages)}
                  className={`w-8 h-8 rounded flex items-center justify-center ${currentPage === totalPages ? 'bg-[#0066FF] text-white' : 'hover:bg-theme-hover'}`}
                >
                  {totalPages}
                </button>
              )}
              <button 
                onClick={() => fetchNotifications(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 hover:text-theme-muted-light disabled:opacity-50"
              >
                {'>'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Details Pane */}
        <div className="w-[450px] bg-theme-card shadow-soft border border-theme-border rounded-xl flex flex-col shrink-0">
          {selectedNotification ? (() => {
            const iconD = getIconData(selectedNotification.type, selectedNotification.title);
            const Icon = iconD.icon;
            
            return (
              <>
                <div className="flex items-center justify-between p-6 border-b border-theme-border">
                  <h3 className="text-lg font-bold text-theme-text">Notification Details</h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${selectedNotification.isRead ? 'text-theme-muted border-theme-strong bg-theme-secondary' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'}`}>
                      {selectedNotification.isRead ? 'Read' : 'Unread'}
                    </span>
                    <button onClick={() => setSelectedNotification(null)} className="text-theme-muted-light hover:text-theme-muted-light"><X size={20} /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  <div className="flex gap-4 items-start mb-8">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${iconD.bg} ${iconD.color}`}>
                      <Icon size={26} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-theme-text leading-tight mb-2">{selectedNotification.title}</h2>
                      <p className="text-sm text-theme-muted leading-relaxed">{selectedNotification.message}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-theme-text mb-4 pb-2 border-b border-theme-border">Related Information</h4>
                    <div className="space-y-3 text-sm">
                      {selectedNotification.metadata ? (
                        Object.entries(selectedNotification.metadata).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center py-1">
                            <span className="text-theme-muted-light">{k}</span>
                            <span className="text-theme-text font-medium text-right">{v as React.ReactNode}</span>
                          </div>
                        ))
                      ) : selectedNotification.referenceId ? (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-theme-muted-light">Reference ID</span>
                          <span className="text-theme-text font-medium">{selectedNotification.referenceId}</span>
                        </div>
                      ) : (
                        <div className="text-theme-muted-light py-1">No additional metadata available.</div>
                      )}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-theme-text mb-4">Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0066FF] hover:bg-primary text-white rounded-lg text-sm font-medium transition-colors active:scale-95 shadow-md">
                        View Details
                      </button>
                      <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-theme-border hover:bg-theme-hover text-theme-text rounded-lg text-sm font-medium transition-colors">
                        <User size={16} /> Guest Profile
                      </button>
                      {!selectedNotification.isRead && (
                        <button 
                          onClick={(e) => markAsRead(selectedNotification.id, e)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-theme-border hover:bg-theme-hover text-theme-text rounded-lg text-sm font-medium transition-colors"
                        >
                          <CheckCircle size={16} /> Mark as Read
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDelete(selectedNotification.id, e)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-theme-text mb-4">Activity Timeline</h4>
                    <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-theme-border before:to-transparent">
                      <div className="relative flex items-center gap-4">
                        <div className="absolute left-[-29px] w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-theme-main"></div>
                        <div>
                          <div className="text-sm font-medium text-theme-text">Notification created</div>
                          <div className="text-xs text-theme-muted-light">{new Date(selectedNotification.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-4">
                        <div className="absolute left-[-29px] w-3 h-3 bg-theme-strong rounded-full ring-4 ring-theme-main"></div>
                        <div>
                          <div className="text-sm font-medium text-theme-muted">Sent to Users</div>
                          <div className="text-xs text-theme-muted">{new Date(selectedNotification.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div className="relative flex items-center gap-4">
                        <div className="absolute left-[-29px] w-3 h-3 bg-theme-strong rounded-full ring-4 ring-theme-main"></div>
                        <div>
                          <div className="text-sm font-medium text-theme-muted">Delivered</div>
                          <div className="text-xs text-theme-muted">{new Date(selectedNotification.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            );
          })() : (
            <div className="flex-1 flex flex-col items-center justify-center text-theme-muted-light p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-theme-hover flex items-center justify-center mb-4">
                <Bell size={32} className="text-theme-muted" />
              </div>
              <h3 className="text-lg font-medium text-theme-muted-light mb-2">No notification selected</h3>
              <p className="text-sm">Click on any notification from the list to view its complete details and related information here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Bottom Strip */}
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-theme-text">Notification Settings</h3>
          <p className="text-xs text-theme-muted">Choose how you want to receive notifications</p>
        </div>

        <div className="flex items-center gap-8">
          {[
            { key: 'email', label: 'Email Alerts', desc: 'Receive notifications via email', icon: Mail },
            { key: 'sms', label: 'SMS Alerts', desc: 'Receive notifications via SMS', icon: Smartphone },
            { key: 'desktop', label: 'Desktop Alerts', desc: 'Show notifications on desktop', icon: Monitor },
          ].map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <div className="p-2 rounded bg-theme-hover text-theme-muted"><s.icon size={16} /></div>
              <div className="mr-2">
                <div className="text-sm font-medium text-theme-text">{s.label}</div>
                <div className="text-[10px] text-theme-muted-light">{s.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={prefs[s.key as keyof NotificationPreference] as boolean}
                  onChange={e => updatePreference(s.key as keyof NotificationPreference, e.target.checked)}
                />
                <div className="w-9 h-5 bg-theme-hover peer-focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-card after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066FF]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
