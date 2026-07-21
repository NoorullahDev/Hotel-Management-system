'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  booking: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBookingModal({ booking, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    status: booking.status || 'CONFIRMED',
    guestCount: booking.guestCount || 1,
    checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().slice(0, 16) : '',
    checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().slice(0, 16) : '',
    roomId: booking.roomId || ''
  });
  const [rooms, setRooms] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch available rooms so the user can change the room
    const fetchRooms = async () => {
      try {
        const data = await api.get<any>('/api/rooms?limit=1000');
        setRooms(Array.isArray(data) ? data : (data.data || []));
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      }
    };
    fetchRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch(`/api/bookings/${booking.id}`, {
        status: formData.status,
        guestCount: Number(formData.guestCount),
        checkIn: new Date(formData.checkIn).toISOString(),
        checkOut: new Date(formData.checkOut).toISOString(),
        roomId: formData.roomId
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-theme-secondary border border-theme-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-theme-text">Edit Booking</h2>
            <p className="text-xs text-theme-muted mt-1">Update reservation details for BKG-{booking.id.substring(0,8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors bg-theme-card shadow-soft p-2 rounded-lg hover:bg-theme-hover">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold text-theme-muted-light">Status *</label>
              <select 
                required
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="CHECKED_OUT">CHECKED_OUT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Check-in Date & Time *</label>
              <input 
                required
                type="datetime-local" 
                value={formData.checkIn}
                onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Check-out Date & Time *</label>
              <input 
                required
                type="datetime-local" 
                value={formData.checkOut}
                onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Room</label>
              <select 
                value={formData.roomId}
                onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {rooms.length === 0 && <option value={formData.roomId}>{booking.room?.number || 'Loading...'}</option>}
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.number} ({r.roomType?.name || 'Room'})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted-light">Guest Count *</label>
              <input 
                required
                type="number" 
                min="1"
                value={formData.guestCount}
                onChange={(e) => setFormData({...formData, guestCount: parseInt(e.target.value)})}
                className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-semibold text-theme-muted hover:text-theme-text transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
