'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, LogIn, CheckCircle2, AlertCircle, Users, Calendar, Activity, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function CheckInPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ limit: '200' });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate', endDate);
      // In history mode fetch all statuses; in default mode still fetch all and filter client-side
      const json = await api.get<any>(`/api/bookings?${params}`);
      setBookings(json.data || []);
    } catch (error) {
      console.error('Error fetching bookings', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCheckIn = async (rawId: string) => {
    try {
      await api.post(`/api/bookings/${rawId}/checkin`);
      alert('Check-In Successful! Room status updated to OCCUPIED.');
      setVerifyingId(null);
      fetchBookings();
    } catch (error: any) {
      alert(`Check-in failed: ${error.message}`);
    }
  };

  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const historyBookings   = bookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT');

  const displayBookings = showHistory ? historyBookings : confirmedBookings;

  const filtered = displayBookings.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.guest.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.room.toLowerCase().includes(q);
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const arrivingToday = confirmedBookings.filter(b => new Date(b.checkIn) >= today).length;
  const totalCheckedIn = bookings.filter(b => b.status === 'CHECKED_IN').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':   return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'CHECKED_IN':  return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'CHECKED_OUT': return 'text-theme-muted bg-theme-secondary border-theme-border';
      default: return 'text-theme-muted bg-theme-secondary border-theme-border';
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Check-In Management</h1>
          <p className="text-theme-muted text-sm">Process guest arrivals and view check-in history</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
            <input 
              type="text" 
              placeholder="Search guest, room, ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 pl-9 pr-4 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {showHistory && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <span className="text-theme-muted text-xs">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">Clear</button>
              )}
            </div>
          )}
          {/* History toggle */}
          <button
            onClick={() => { setShowHistory(h => !h); setStartDate(''); setEndDate(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              showHistory
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-theme-card border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
            }`}
          >
            <Clock size={14} />
            {showHistory ? 'Showing History' : 'View History'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending Check-Ins',  value: confirmedBookings.length, icon: Calendar,      color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Arriving Today',     value: arrivingToday,            icon: Activity,       color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
          { label: 'Checked-In Guests',  value: totalCheckedIn,           icon: Users,          color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'History Records',    value: historyBookings.length,   icon: Clock,          color: 'text-green-500',  bg: 'bg-green-500/10'  },
        ].map((stat, i) => (
          <div key={i} className="bg-theme-card shadow-soft border border-theme-border p-5 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <stat.icon size={18} className={stat.color} />
                <span className="text-3xl font-bold text-theme-text">{stat.value}</span>
              </div>
              <span className="text-sm font-medium text-theme-muted mt-1">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-theme-text">
            {showHistory ? 'Check-In History' : 'Incoming Reservations'}
          </h2>
          <span className="text-[10px] text-theme-muted">{filtered.length} records</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-secondary/50 border-b border-theme-border">
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Booking ID</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Guest Name</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Room</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Check-in</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Check-out</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-theme-muted text-xs">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-theme-muted text-xs">
                  {showHistory ? 'No historical check-in records found.' : 'No incoming reservations found.'}
                </td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.rawId} className="hover:bg-theme-hover/50 transition-colors">
                    <td className="p-4 text-xs font-medium text-theme-muted-light font-mono whitespace-nowrap">#{b.id}</td>
                    <td className="p-4 text-xs font-semibold text-theme-text">{b.guest}</td>
                    <td className="p-4 text-xs text-theme-muted-light">{b.room} <span className="text-[9px] text-theme-muted-light ml-1">({b.roomType})</span></td>
                    <td className="p-4 text-xs text-theme-muted-light whitespace-nowrap">
                      {new Date(b.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 text-xs text-theme-muted-light whitespace-nowrap">
                      {new Date(b.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {b.status === 'CONFIRMED' ? (
                        verifyingId === b.rawId ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] text-orange-400 flex items-center gap-1"><AlertCircle size={12}/> Verify Guest ID</span>
                            <button 
                              onClick={() => handleCheckIn(b.rawId)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 ml-2 transition-colors"
                            >
                              <CheckCircle2 size={14} /> Confirm
                            </button>
                            <button 
                              onClick={() => setVerifyingId(null)}
                              className="px-3 py-1.5 bg-theme-hover text-theme-text text-xs font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setVerifyingId(b.rawId)}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-xl flex items-center gap-2 ml-auto transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                          >
                            <LogIn size={14} /> Process Check-In
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-theme-muted italic">
                          {b.status === 'CHECKED_IN' ? 'Currently In' : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
