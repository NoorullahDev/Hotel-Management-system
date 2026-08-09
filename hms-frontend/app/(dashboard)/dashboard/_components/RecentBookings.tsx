'use client';

import React, { useEffect, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../../../../lib/socket';
import { api } from '@/lib/api';
import GuestDetailsSidebar from '../../_components/GuestDetailsSidebar';

const fetchRecentBookings = async () => {
  const json = await api.get<any>('/api/bookings?limit=15&sort=recent');
  return json.data || [];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'CHECKED_IN': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'CHECKED_OUT': return 'bg-theme-secondary text-theme-muted border-theme-border';
    case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
};

export default function RecentBookings() {
  const queryClient = useQueryClient();
  const { data: bookings } = useQuery({
    queryKey: ['recentBookings'],
    queryFn: fetchRecentBookings
  });

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.post(`/api/bookings/${id}/cancel`);
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
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
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      setEditBookingId(null);
    } catch (err: any) {
      alert(`Failed to delete booking: ${err.message}`);
    }
    setActiveDropdown(null);
  };

  useEffect(() => {
    const socket = connectSocket();

    const handleBookingCreated = (newBooking: any) => {
      queryClient.setQueryData(['recentBookings'], (oldData: any) => {
        if (!oldData) return [newBooking];
        // Prepend and keep max 15 (since limit is 15 in the query)
        return [newBooking, ...oldData].slice(0, 15);
      });
    };

    socket.on('booking:created', handleBookingCreated);

    return () => {
      socket.off('booking:created', handleBookingCreated);
    };
  }, [queryClient]);

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-theme-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-theme-text">Recent Bookings</h2>
        <Link href="/booking" className="text-sm text-theme-muted hover:text-theme-text px-3 py-1.5 bg-theme-main rounded-lg transition-colors">
          View All
        </Link>
      </div>
      
      <div className="w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-theme-border text-theme-muted-light text-xs font-medium">
              <th className="px-3 py-3 font-medium text-xs">ID</th>
              <th className="px-3 py-3 font-medium text-xs">Room</th>
              <th className="px-3 py-3 font-medium text-xs hidden sm:table-cell">Guest Name</th>
              <th className="px-3 py-3 font-medium text-xs">Dates</th>
              <th className="px-3 py-3 font-medium text-xs">Status</th>
              <th className="px-3 py-3 font-medium text-xs hidden md:table-cell">Amount</th>
              <th className="px-3 py-3 font-medium text-xs text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {bookings?.map((booking: any) => (
              <tr key={booking.id} className="hover:bg-theme-hover/50 transition-colors">
                <td className="px-3 py-3 text-xs font-medium text-theme-text">{booking.id}</td>
                <td className="px-3 py-3 text-xs text-theme-muted">{booking.room}</td>
                <td className="px-3 py-3 text-xs text-theme-muted-light hidden sm:table-cell max-w-[100px] truncate">{booking.guest}</td>
                <td className="px-3 py-3 text-xs text-theme-muted">{booking.dates}</td>
                <td className="px-3 py-3 text-xs">
                  <span className={`px-2 py-1 text-[10px] font-medium border rounded-md whitespace-nowrap ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs font-medium text-theme-muted-light hidden md:table-cell">{booking.amount}</td>
                <td className="px-1 py-3 text-right relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === booking.rawId ? null : booking.rawId)}
                    className="text-theme-muted-light hover:text-theme-muted-light transition-colors p-1 rounded-md hover:bg-theme-hover"
                  >
                    <MoreVertical size={16} />
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
            ))}
          </tbody>
        </table>
      </div>

      {editBookingId && (
        <GuestDetailsSidebar 
          bookingId={editBookingId}
          onClose={() => setEditBookingId(null)}
          onSuccess={() => {
            setEditBookingId(null);
            queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
          }}
          onCancelBooking={cancelBooking}
          onDeleteBooking={deleteBooking}
        />
      )}
    </div>
  );
}
