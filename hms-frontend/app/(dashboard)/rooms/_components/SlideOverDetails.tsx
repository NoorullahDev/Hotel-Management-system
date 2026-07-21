'use client';

import React, { useState } from 'react';
import { X, Wifi, Tv, Wind, Coffee, Lock as LockIcon, Droplets, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Props {
  roomId: string | null;
  onClose: () => void;
}

const fetchRoomDetails = async (id: string) => {
  return api.get<any>(`/api/rooms/${id}`);
};

export default function SlideOverDetails({ roomId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('Guest Info');

  const { data: room } = useQuery({
    queryKey: ['roomDetails', roomId],
    queryFn: () => fetchRoomDetails(roomId as string),
    enabled: !!roomId
  });

  if (!roomId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-theme-secondary h-full shadow-2xl border-l border-theme-border flex flex-col transform transition-transform duration-300 translate-x-0 overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-theme-border flex items-center justify-between sticky top-0 bg-theme-secondary/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text">{room ? `Room ${room.number}` : '—'}</h2>
            {room && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {room.status}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-theme-muted hover:text-theme-text rounded-lg hover:bg-theme-hover transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-8">
            {/* Image */}
            <div className="rounded-xl overflow-hidden h-48 bg-theme-secondary flex-shrink-0">
              <img loading="lazy" decoding="async" 
                src={room?.imageUrl || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop"} 
                alt="Room" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Room Info Grid */}
            <div className="grid grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Room Type</p>
                <p className="text-sm font-medium text-theme-text">{room?.roomType?.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Floor</p>
                <p className="text-sm font-medium text-theme-text">Floor {room?.floor}</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Price / Night</p>
                <p className="text-sm font-medium text-theme-text">Rs. {room?.price}</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Room Size</p>
                <p className="text-sm font-medium text-theme-text">22 m²</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Bed Type</p>
                <p className="text-sm font-medium text-theme-text">1 Single Bed</p>
              </div>
              <div>
                <p className="text-[10px] text-theme-muted-light uppercase font-semibold mb-1">Max Occupancy</p>
                <p className="text-sm font-medium text-theme-text">1 Guest</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-theme-border">
              {['Guest Info', 'Booking History', 'Maintenance', 'Amenities'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-xs font-semibold transition-colors relative ${activeTab === tab ? 'text-theme-text' : 'text-theme-muted-light hover:text-theme-muted-light'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {activeTab === 'Guest Info' && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-theme-card shadow-soft rounded-xl border border-theme-border">
                  <div className="w-12 h-12 rounded-full bg-theme-hover flex items-center justify-center mb-3">
                    <UserCheck className="text-theme-muted" size={20} />
                  </div>
                  <p className="text-sm text-theme-muted-light font-medium mb-1">No guest currently checked in</p>
                  <p className="text-xs text-theme-muted-light">Room is available for booking</p>
                </div>
              )}

              {activeTab === 'Booking History' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-theme-text">Booking History</h3>
                    <button className="text-xs text-primary hover:text-blue-400 font-medium">View All</button>
                  </div>
                  <div className="text-sm text-theme-muted">Mock history data here...</div>
                </div>
              )}

              {activeTab === 'Maintenance' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-theme-text">Maintenance Log</h3>
                    <button className="text-xs text-primary hover:text-blue-400 font-medium">View All</button>
                  </div>
                  <div className="text-sm text-theme-muted">Mock maintenance log here...</div>
                </div>
              )}

              {activeTab === 'Amenities' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-theme-text mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><Wifi size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">Wi-Fi</span></div>
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><Tv size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">TV</span></div>
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><Wind size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">AC</span></div>
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><Coffee size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">Mini Bar</span></div>
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><LockIcon size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">Safe</span></div>
                    <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-theme-card shadow-soft border border-theme-border flex items-center justify-center"><Droplets size={16} className="text-theme-muted"/></div><span className="text-[10px] text-theme-muted-light font-medium">Hot Water</span></div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
