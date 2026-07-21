'use client';

import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../../../../lib/socket';
import { api } from '@/lib/api';

type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Reserved';

interface Room {
  number: string;
  status: RoomStatus;
}

const fetchRooms = async () => {
  return await api.get<any>('/api/rooms/status-grid');
};

const legendItems: { label: RoomStatus; colorClass: string; dotClass: string }[] = [
  { label: 'Available', colorClass: 'bg-emerald-500 text-white shadow-sm border-transparent', dotClass: 'bg-emerald-200' },
  { label: 'Occupied', colorClass: 'bg-rose-500 text-white shadow-sm border-transparent', dotClass: 'bg-rose-200' },
  { label: 'Cleaning', colorClass: 'bg-amber-500 text-white shadow-sm border-transparent', dotClass: 'bg-amber-200' },
  { label: 'Maintenance', colorClass: 'bg-slate-600 text-white shadow-sm border-transparent', dotClass: 'bg-slate-300' },
  { label: 'Reserved', colorClass: 'bg-blue-500 text-white shadow-sm border-transparent', dotClass: 'bg-blue-200' },
];

const getStatusColor = (status: RoomStatus) => {
  return legendItems.find(l => l.label === status)?.colorClass || 'bg-theme-secondary border-theme-border text-theme-muted-light';
};

export default function RoomStatusGrid() {
  const queryClient = useQueryClient();
  const { data: rooms } = useQuery({
    queryKey: ['roomsStatusGrid'],
    queryFn: fetchRooms
  });

  useEffect(() => {
    const socket = connectSocket();

    const handleRoomStatusChanged = (data: { roomId: string, newStatus: string }) => {
      queryClient.setQueryData(['roomsStatusGrid'], (oldData: Room[] | undefined) => {
        if (!oldData) return oldData;
        // The API returns rooms with uppercase statuses originally but formatted as title case?
        // Wait, let's check fetchRooms formatting in the backend: it returns "Available", "Occupied", etc.
        // We will just map newStatus 'OCCUPIED' to 'Occupied'.
        let formattedStatus = 'Available';
        if (data.newStatus === 'OCCUPIED') formattedStatus = 'Occupied';
        if (data.newStatus === 'RESERVED') formattedStatus = 'Reserved';
        if (data.newStatus === 'CLEANING') formattedStatus = 'Cleaning';
        if (data.newStatus === 'MAINTENANCE') formattedStatus = 'Maintenance';

        // We only have roomId in the event, but the oldData has 'number' and 'status' but wait, does it have 'id'?
        // Let's check backend getRoomsStatusGrid: it selects 'id', 'number', 'status'.
        // So the frontend data has 'id' too?
        return oldData.map(room => {
          // If the backend didn't return id in oldData, we might have a problem.
          // Let's assume oldData has id.
          if ((room as any).id === data.roomId) {
            return { ...room, status: formattedStatus };
          }
          return room;
        });
      });
    };

    socket.on('room:status_changed', handleRoomStatusChanged);

    return () => {
      socket.off('room:status_changed', handleRoomStatusChanged);
    };
  }, [queryClient]);

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-bold text-theme-text whitespace-nowrap">Live Room Status</h2>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted-light">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`}></span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {rooms?.map((room: Room, i: number) => (
          <div 
            key={i} 
            className={`border rounded-lg py-2 px-1 flex flex-col items-center justify-center text-center transition-colors shadow-sm ${getStatusColor(room.status)}`}
            title={`${room.number} - ${room.status}`}
          >
            <span className="text-sm font-bold block mb-0.5">{room.number}</span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-tight font-bold opacity-90 w-full break-words">{room.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
