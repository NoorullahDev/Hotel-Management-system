'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BedDouble, CalendarCheck, User } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const [roomsJson, bookingsJson] = await Promise.all([
          api.get<any>(`/api/rooms?search=${encodeURIComponent(q)}&limit=50`).catch(() => ({ data: [] })),
          api.get<any>(`/api/bookings?search=${encodeURIComponent(q)}&limit=50`).catch(() => ({ data: [] }))
        ]);

        const allRooms = roomsJson.data || [];
        const allBookings = bookingsJson.data || [];

        setRooms(allRooms);
        setBookings(allBookings);

      } catch (error) {
        console.error('Search error', error);
      } finally {
        setLoading(false);
      }
    };

    if (q) {
      fetchResults();
    } else {
      setLoading(false);
      setRooms([]);
      setBookings([]);
    }
  }, [q]);

  if (!q) {
    return (
      <div className="flex flex-col gap-6 h-full p-2">
        <h1 className="text-2xl font-bold text-theme-text">Search</h1>
        <div className="text-theme-muted">Please enter a search query above.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Search Results for "{q}"</h1>
          <p className="text-theme-muted text-sm">Found {rooms.length} rooms and {bookings.length} bookings</p>
        </div>
      </div>

      {loading ? (
        <div className="text-theme-muted flex items-center gap-2">Loading...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Rooms Results */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
              <BedDouble size={20} className="text-primary" /> 
              Matching Rooms
            </h2>
            {rooms.length === 0 ? (
              <div className="text-sm text-theme-muted-light bg-theme-card shadow-soft border border-theme-border p-4 rounded-xl">No rooms found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map(room => (
                  <Link href="/rooms" key={room.id} className="bg-theme-card shadow-soft border border-theme-border p-4 rounded-xl flex items-center gap-4 hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                      {room.number}
                    </div>
                    <div>
                      <h3 className="font-semibold text-theme-text">{room.roomType?.name || 'Room'}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${room.status === 'Available' ? 'bg-green-500/10 text-green-400' : 'bg-theme-secondary text-theme-muted'}`}>{room.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bookings Results */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
              <CalendarCheck size={20} className="text-purple-500" /> 
              Matching Bookings & Guests
            </h2>
            {bookings.length === 0 ? (
              <div className="text-sm text-theme-muted-light bg-theme-card shadow-soft border border-theme-border p-4 rounded-xl">No bookings or guests found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.map(booking => (
                  <Link href="/booking" key={booking.rawId} className="bg-theme-card shadow-soft border border-theme-border p-4 rounded-xl flex flex-col gap-3 hover:border-purple-500/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-theme-secondary rounded-md text-theme-muted-light">
                          <User size={16} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-theme-text text-sm">{booking.guest}</h3>
                          <span className="text-xs text-theme-muted-light">Room {booking.room}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                        booking.status === 'CHECKED_IN' ? 'bg-blue-500/10 text-blue-400' : 
                        booking.status === 'CHECKED_OUT' ? 'bg-theme-secondary text-theme-muted' : 
                        'bg-orange-500/10 text-orange-400'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-theme-muted border-t border-theme-border pt-3">
                      <span>{booking.dates}</span>
                      <span className="font-semibold text-theme-muted-light">ID: {booking.id}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div className="text-theme-muted p-4">Loading search...</div>}>
      <SearchPageContent />
    </React.Suspense>
  );
}
