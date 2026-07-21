'use client';

import React, { useEffect } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../../../../lib/socket';
import { api } from '@/lib/api';

interface Props {
  filters: { roomType: string; status: string; floor: string; price: string };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  onAddRoom: () => void;
}

const fetchRoomTypes = async () => {
  try {
    return await api.get<any>('/api/rooms/types');
  } catch {
    return [];
  }
};

const fetchSettings = async () => {
  try {
    return await api.get<any>('/api/settings');
  } catch {
    return {};
  }
};

export default function RoomsFilterBar({ filters, setFilters, onAddRoom }: Props) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();
    const handleSettingsUpdated = (data: any) => {
      if (data.category === 'hotel') {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      }
    };
    socket.on('settings:updated', handleSettingsUpdated);
    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, [queryClient]);

  const { data: roomTypes } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: fetchRoomTypes
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings
  });

  const statuses = ['All Status', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];
  
  // Generate floors array dynamically from hotel settings
  const totalFloors = parseInt(settings?.hotel?.floors) || 5; // Default to 5 if not configured
  const floors = ['All Floors', ...Array.from({ length: totalFloors }, (_, i) => (i + 1).toString())];
  
  const prices = ['All Prices', 'Under Rs.5000', 'Rs.5000 - Rs.10000', 'Over Rs.10000'];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col gap-1 w-40">
        <label className="text-[10px] text-theme-muted-light uppercase tracking-wider font-semibold">Room Type</label>
        <div className="relative">
          <select 
            value={filters.roomType}
            onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
            className="w-full bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 px-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none cursor-pointer"
          >
            <option value="All Types">All Types</option>
            {Array.isArray(roomTypes) && roomTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col gap-1 w-40">
        <label className="text-[10px] text-theme-muted-light uppercase tracking-wider font-semibold">Status</label>
        <div className="relative">
          <select 
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 px-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none cursor-pointer"
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col gap-1 w-40">
        <label className="text-[10px] text-theme-muted-light uppercase tracking-wider font-semibold">Floor</label>
        <div className="relative">
          <select 
            value={filters.floor}
            onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
            className="w-full bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 px-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none cursor-pointer"
          >
            {floors.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col gap-1 w-48">
        <label className="text-[10px] text-theme-muted-light uppercase tracking-wider font-semibold">Price Range</label>
        <div className="relative">
          <select 
            value={filters.price}
            onChange={(e) => setFilters({ ...filters, price: e.target.value })}
            className="w-full bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 px-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none cursor-pointer"
          >
            {prices.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
        </div>
      </div>

      <div className="flex-1"></div>

      <button 
        onClick={onAddRoom}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] hover:bg-primary text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 self-end active:scale-95"
      >
        <Plus size={18} />
        Add Room
      </button>
    </div>
  );
}
