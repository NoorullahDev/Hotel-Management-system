'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, MoreVertical, Check, X, Calendar, Activity, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import ForeignBookingWizard from '@/components/wizard/NewBookingWizard';
import GuestDetailsSidebar from '../_components/GuestDetailsSidebar';
import BookingCalendar from './_components/BookingCalendar';
import { api } from '@/lib/api';

export default function ForeignGuestsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        bookingType: 'FOREIGN',
        limit: '50',
        page: String(page),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter)      params.set('status', statusFilter);
      if (startDate)         params.set('startDate', startDate);
      if (endDate)           params.set('endDate', endDate);

      const json = await api.get<any>(`/api/bookings?${params}`);
      setBookings(json.data || []);
      setMeta(json.meta || { total: 0, page: 1, limit: 50, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching bookings', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, startDate, endDate]);

  const fetchRooms = async () => {
    try {
      const data = await api.get<any>('/api/rooms?limit=100');
      setRooms(data.data || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBookings(1);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchBookings(1);
    fetchRooms();
  }, [isWizardOpen]);

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.post(`/api/bookings/${id}/cancel`);
      fetchBookings(1);
      setEditBookingId(null);
    } catch (err: any) {
      alert(`Failed to cancel booking: ${err.message}`);
    }
    setActiveDropdown(null);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Are you sure you want to completely delete this booking?')) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      fetchBookings(1);
      setEditBookingId(null);
    } catch (err: any) {
      alert(`Failed to delete booking: ${err.message}`);
    }
    setActiveDropdown(null);
  };

  // Filtering is server-side; bookings is already the filtered page result.
  const filteredBookings = bookings;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'CHECKED_IN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'CHECKED_OUT': return 'text-theme-muted bg-theme-secondary border-theme-border';
      case 'CANCELLED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-muted bg-theme-secondary border-theme-border';
    }
  };

  const { totalBookings, confirmedCount, checkedInCount, cancelledCount, upcomingCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return {
      totalBookings: meta.total,
      confirmedCount: bookings.filter(b => b.status === 'CONFIRMED').length,
      checkedInCount: bookings.filter(b => b.status === 'CHECKED_IN').length,
      cancelledCount: bookings.filter(b => b.status === 'CANCELLED').length,
      upcomingCount: bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.checkIn) >= today).length
    };
  }, [bookings, meta.total]);

  return (
    <div className="flex flex-col gap-6 h-full p-2 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Foreign Guest Management</h1>
          <p className="text-theme-muted text-sm">Manage foreign visitors and reservations</p>
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
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-theme-muted text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">Clear</button>
            )}
          </div>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={16} />
            New Booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Bookings', value: totalBookings, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Confirmed', value: confirmedCount, icon: Check, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Checked-In', value: checkedInCount, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Cancelled', value: cancelledCount, icon: X, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Upcoming Check-ins', value: upcomingCount, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
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

      {/* Main Content: Split Layout */}
      <div className="grid grid-cols-[1.1fr_1.4fr] gap-6 flex-1 min-h-0">
        
        {/* Left Col: Booking List */}
        <div className="flex flex-col bg-theme-card shadow-soft border border-theme-border rounded-2xl h-full pb-4">
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-theme-text">Booking List</h2>
            <div className="flex items-center gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-theme-secondary border border-theme-border rounded-md px-2 py-1 text-xs text-theme-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto custom-scrollbar w-full pb-24">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-theme-secondary/50 border-b border-theme-border">
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Booking ID</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Guest</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Room</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap min-w-[120px]">Stay Dates</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Days</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-theme-muted text-xs">Loading...</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-theme-muted text-xs">No foreign guests found.</td></tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr 
                      key={booking.id} 
                      className="hover:bg-theme-hover/50 transition-colors cursor-pointer"
                      onClick={() => setEditBookingId(booking.rawId)}
                    >
                      <td className="p-3 text-xs font-medium text-theme-muted-light font-mono whitespace-nowrap">#{booking.id}</td>
                      <td className="p-3 text-xs font-semibold text-theme-text whitespace-nowrap">{booking.guest}</td>
                      <td className="p-3 text-xs text-theme-muted-light whitespace-nowrap">{booking.room}</td>
                      <td className="p-3 text-[10px] text-theme-muted min-w-[120px]">{booking.dates}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-theme-muted-light whitespace-nowrap">{booking.days} Nights</td>
                      <td className="p-3 text-xs font-semibold text-theme-text whitespace-nowrap">{booking.amount}</td>
                      <td className={`p-3 text-right relative ${activeDropdown === booking.rawId ? 'z-50' : 'z-10'}`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === booking.rawId ? null : booking.rawId);
                          }}
                          className="p-1 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {activeDropdown === booking.rawId && (
                          <div className="absolute right-8 top-6 w-32 bg-theme-secondary border border-theme-border rounded-xl shadow-xl z-50 py-1 flex flex-col overflow-hidden text-left">
                            <button 
                              onClick={() => {
                                setActiveDropdown(null);
                                setEditBookingId(booking.rawId);
                              }}
                              className="px-3 py-1.5 text-xs text-theme-muted-light hover:bg-theme-hover hover:text-theme-text w-full text-left transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => cancelBooking(booking.rawId)}
                              className="px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10 w-full text-left transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => deleteBooking(booking.rawId)}
                              className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 w-full text-left transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination footer */}
          <div className="px-4 py-2 border-t border-theme-border flex items-center justify-between">
            <span className="text-[10px] text-theme-muted">
              Showing {filteredBookings.length} of {meta.total} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-theme-hover disabled:opacity-30 text-theme-muted transition-colors"
              ><ChevronLeft size={14} /></button>
              <span className="text-[10px] text-theme-muted px-2">Page {currentPage} / {meta.totalPages}</span>
              <button
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                className="p-1 rounded hover:bg-theme-hover disabled:opacity-30 text-theme-muted transition-colors"
              ><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Right Col: Booking Calendar */}
        <div className="flex flex-col h-full overflow-hidden min-w-0">
          <BookingCalendar rooms={rooms} bookings={bookings} />
        </div>
        
      </div>

      {isWizardOpen && (
        <ForeignBookingWizard onClose={() => setIsWizardOpen(false)} />
      )}
      
      {editBookingId && (
        <GuestDetailsSidebar 
          bookingId={editBookingId}
          onClose={() => setEditBookingId(null)}
          onSuccess={() => {
            setEditBookingId(null);
            fetchBookings(1);
          }}
          onCancelBooking={cancelBooking}
          onDeleteBooking={deleteBooking}
        />
      )}
    </div>
  );
}
