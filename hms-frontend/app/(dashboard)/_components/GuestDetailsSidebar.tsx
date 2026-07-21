import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Phone, Mail, User, Star, Crown, Edit, Trash2, XCircle } from 'lucide-react';
import EditGuestModal from './EditGuestModal';
import EditBookingModal from './EditBookingModal';
import { CalendarClock } from 'lucide-react';
import { api } from '@/lib/api';

interface GuestDetailsSidebarProps {
  bookingId: string;
  onClose: () => void;
  onSuccess: () => void;
  onCancelBooking: (id: string) => void;
  onDeleteBooking: (id: string) => void;
}

export default function GuestDetailsSidebar({ bookingId, onClose, onSuccess, onCancelBooking, onDeleteBooking }: GuestDetailsSidebarProps) {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);

  const fetchBookingDetails = async () => {
    try {
      const data = await api.get<any>(`/api/bookings/${bookingId}`);
      setBooking(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[420px] bg-theme-main border-l border-theme-border shadow-2xl z-50 flex items-center justify-center">
        <span className="text-theme-muted">Loading details...</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-y-0 right-0 w-[420px] bg-theme-main border-l border-theme-border shadow-2xl z-50 flex items-center justify-center flex-col gap-4">
        <span className="text-theme-muted">Booking not found.</span>
        <button onClick={onClose} className="text-primary hover:text-blue-400">Close</button>
      </div>
    );
  }

  const isVIP = booking.bookingType === 'FOREIGN' || booking.guest?.guestType === 'FOREIGN';
  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[420px] bg-theme-main border-l border-theme-border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <h2 className="text-sm font-bold text-theme-text">Guest Details</h2>
          <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Guest Profile Header */}
          <div className="p-6 flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-theme-secondary flex items-center justify-center shrink-0 border border-theme-border">
              <User size={32} className="text-theme-muted" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-theme-text">{booking.guest?.name}</h3>
                {isVIP && (
                  <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                    <Crown size={10} /> VIP
                  </span>
                )}
              </div>
              <span className="text-xs text-theme-muted mb-2 font-mono">BKG-{booking.id.substring(0, 8).toUpperCase()}</span>
              
              <div className="flex flex-col gap-1 text-xs text-theme-muted">
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-theme-muted-light" />
                  <span>{booking.guest?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-theme-muted-light" />
                  <span>{booking.guest?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-theme-muted-light" />
                  <span>{booking.guest?.nationality || booking.guest?.city || 'Local'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="px-6 pb-6 grid grid-cols-3 gap-2">
            <div className="bg-theme-card shadow-soft rounded-xl p-3 flex flex-col items-center justify-center border border-theme-border">
              <span className="text-lg font-bold text-theme-text">1</span>
              <span className="text-[10px] text-theme-muted">Total Stays</span>
            </div>
            <div className="bg-theme-card shadow-soft rounded-xl p-3 flex flex-col items-center justify-center border border-theme-border">
              <span className="text-lg font-bold text-theme-text">Rs. {Number(booking.total).toLocaleString()}</span>
              <span className="text-[10px] text-theme-muted">Total Spent</span>
            </div>
            <div className="bg-theme-card shadow-soft rounded-xl p-3 flex flex-col items-center justify-center border border-theme-border">
              <div className="flex items-center gap-1 mb-0.5">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-theme-text">Gold</span>
              </div>
              <span className="text-[10px] text-theme-muted">Membership</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 flex gap-4 border-b border-theme-border">
            {['Overview', 'Stay History', 'Preferences', 'Notes'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-medium transition-colors border-b-2 ${activeTab === tab ? 'text-blue-400 border-blue-400' : 'text-theme-muted-light border-transparent hover:text-theme-muted-light'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'Overview' && (
              <div className="flex flex-col gap-6">
                
                {/* Current Stay */}
                <div className="bg-theme-card shadow-soft rounded-xl border border-theme-border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-theme-text">Current Stay</h4>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${
                      booking.status === 'CONFIRMED' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                      booking.status === 'CHECKED_IN' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                      booking.status === 'CHECKED_OUT' ? 'text-theme-muted bg-theme-secondary border-theme-border' :
                      'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Booking ID</span>
                      <span className="text-theme-text font-mono">BKG-{booking.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Room Number</span>
                      <span className="text-theme-text">{booking.room?.number} ({booking.room?.roomType?.name})</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Check-in Date</span>
                      <span className="text-theme-text">{checkInDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Check-out Date</span>
                      <span className="text-theme-text">{checkOutDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Duration</span>
                      <span className="text-theme-text">{nights} Nights</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-theme-card shadow-soft rounded-xl border border-theme-border p-4">
                  <h4 className="text-sm font-bold text-theme-text mb-4">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Phone</span>
                      <span className="text-theme-text">{booking.guest?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Email</span>
                      <span className="text-blue-400">{booking.guest?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-muted-light">Address</span>
                      <span className="text-theme-text text-right max-w-[150px] truncate">{booking.guest?.city || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'Stay History' && (
              <div className="flex flex-col gap-4">
                {booking.guest?.bookings?.length > 0 ? (
                  booking.guest.bookings.map((b: any) => (
                    <div key={b.id} className="bg-theme-card shadow-soft rounded-xl border border-theme-border p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-theme-muted">BKG-{b.id.substring(0,8).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${
                          b.status === 'CONFIRMED' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                          b.status === 'CHECKED_IN' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                          b.status === 'CHECKED_OUT' ? 'text-theme-muted bg-theme-secondary border-theme-border' :
                          'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-theme-text">Room {b.room?.number}</span>
                        <span className="font-bold text-theme-text">Rs. {Number(b.total).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-theme-muted-light">
                        {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-theme-muted-light text-xs">
                    No stay history data available yet.
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'Preferences' || activeTab === 'Notes') && (
              <div className="bg-theme-card shadow-soft rounded-xl border border-theme-border p-4">
                <h4 className="text-sm font-bold text-theme-text mb-2">
                  {activeTab === 'Preferences' ? 'Guest Preferences' : 'Internal Notes'}
                </h4>
                {booking.guest?.notes ? (
                  <p className="text-sm text-theme-muted whitespace-pre-wrap">
                    {booking.guest.notes}
                  </p>
                ) : (
                  <p className="text-xs text-theme-muted-light italic">
                    No notes or preferences have been recorded for this guest. You can add them by editing the Guest Profile.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-theme-border bg-theme-secondary flex flex-col gap-2">
          <div className="flex gap-2">
            <button 
              onClick={() => setShowEditBookingModal(true)}
              className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <CalendarClock size={14} /> Edit Booking
            </button>
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex-1 py-2.5 bg-theme-hover border border-theme-border hover:bg-theme-border text-theme-text text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Edit size={14} /> Edit Guest Profile
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onCancelBooking(booking.id)}
              className="flex-1 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <XCircle size={14} /> Cancel Booking
            </button>
            <button 
              onClick={() => onDeleteBooking(booking.id)}
              className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

      </div>

      {showEditModal && (
        <EditGuestModal 
          guest={booking.guest} 
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchBookingDetails();
            onSuccess(); // Also notify parent to refresh lists
          }}
        />
      )}

      {showEditBookingModal && (
        <EditBookingModal 
          booking={booking} 
          onClose={() => setShowEditBookingModal(false)}
          onSuccess={() => {
            fetchBookingDetails();
            onSuccess(); // Notify parent to refresh lists
          }}
        />
      )}
    </>
  );
}
