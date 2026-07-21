'use client';

import React, { useState, useEffect } from 'react';
import { Search, LogOut, CheckCircle2, FileText, Users, Activity, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function CheckoutPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      const json = await api.get<any>('/api/bookings?limit=1000&sort=recent');
      setBookings(json.data || []);
    } catch (error) {
      console.error('Error fetching bookings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const checkedInBookings = bookings.filter(b => b.status === 'CHECKED_IN');
  
  const filtered = checkedInBookings.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.guest.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.room.toLowerCase().includes(q);
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  const leavingToday = checkedInBookings.filter(b => {
    const outDate = new Date(b.checkOut);
    outDate.setHours(0,0,0,0);
    return outDate.getTime() === today.getTime();
  }).length;
  
  const totalCheckedOut = bookings.filter(b => b.status === 'CHECKED_OUT').length;

  return (
    <div className="flex flex-col gap-6 h-full p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Check-Out Management</h1>
          <p className="text-theme-muted text-sm">Review guests departing and process final billing</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
          <input 
            type="text" 
            placeholder="Search by Booking ID, Guest..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 pl-9 pr-4 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Stays', value: checkedInBookings.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Departing Today', value: leavingToday, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Pending Folios', value: checkedInBookings.length, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Checked Out', value: totalCheckedOut, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
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
          <h2 className="text-sm font-bold text-theme-text">Guests Currently In-House</h2>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-secondary/50 border-b border-theme-border">
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Booking ID</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Guest Name</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Room</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Check-in Time</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Check-out Time</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-theme-muted text-xs">Loading guests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-theme-muted text-xs">No active stays found.</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-theme-hover/50 transition-colors">
                    <td className="p-4 text-xs font-medium text-theme-muted-light font-mono">#{b.id}</td>
                    <td className="p-4 text-xs font-semibold text-theme-text">{b.guest}</td>
                    <td className="p-4 text-xs text-theme-muted-light">{b.room} <span className="text-[9px] text-theme-muted-light ml-1">({b.roomType})</span></td>
                    <td className="p-4 text-xs text-theme-muted-light">
                      {new Date(b.checkIn).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-xs text-theme-muted-light">
                       <span className={new Date(b.checkOut).getTime() <= today.getTime() ? 'text-orange-400 font-bold' : ''}>
                          {new Date(b.checkOut).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded text-blue-400 bg-blue-500/10 border-primary/20">
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => router.push('/billing')}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-theme-text text-xs font-medium rounded-xl flex items-center gap-2 ml-auto transition-all shadow-lg shadow-orange-900/20"
                      >
                        <Receipt size={14} /> Process Billing
                      </button>
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
