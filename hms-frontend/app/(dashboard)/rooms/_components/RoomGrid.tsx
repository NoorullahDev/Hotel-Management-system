'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../../../../lib/socket';
import RoomCard from './RoomCard';
import EditRoomModal from './EditRoomModal';
import MaintenanceModal from './MaintenanceModal';
import { LayoutGrid, List, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  filters: any;
  onSelectRoom: (id: string) => void;
}

export default function RoomGrid({ filters, onSelectRoom }: Props) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('Room Number');
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);
  
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<any>(null);

  const fetchRooms = async () => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '12',
      ...(filters.roomType !== 'All Types' && { roomTypeId: filters.roomType }),
      ...(filters.status !== 'All Status' && { status: filters.status }),
      ...(filters.floor !== 'All Floors' && { floor: filters.floor }),
    });

    return api.get<any>(`/api/rooms?${queryParams}`);
  };

  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['roomsList', filters, page],
    queryFn: fetchRooms
  });

  useEffect(() => {
    const socket = connectSocket();

    const handleRoomStatusChanged = (eventData: { roomId: string, newStatus: string }) => {
      queryClient.setQueryData(['roomsList', filters, page], (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        
        return {
          ...oldData,
          data: oldData.data.map((room: any) => {
            if (room.id === eventData.roomId) {
              return { ...room, status: eventData.newStatus };
            }
            return room;
          })
        };
      });
    };

    socket.on('room:status_changed', handleRoomStatusChanged);

    return () => {
      socket.off('room:status_changed', handleRoomStatusChanged);
    };
  }, [queryClient, filters, page]);

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    // Close menu immediately for snappy UX
    setStatusMenuOpen(null);

    // 1. OPTIMISTIC UPDATE — change the room in the cache right now, zero delay
    queryClient.setQueryData(['roomsList', filters, page], (oldData: any) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((r: any) =>
          r.id === roomId ? { ...r, status: newStatus } : r
        )
      };
    });

    // Also update the stats summary optimistically
    queryClient.setQueryData(['roomsStats'], (oldData: any) => {
      if (!oldData?.stats) return oldData;
      const stats = { ...oldData.stats };
      // Find old status from current data
      const currentRoom = queryClient.getQueryData<any>(['roomsList', filters, page])?.data?.find((r: any) => r.id === roomId);
      const oldStatus = currentRoom?.status?.toLowerCase();
      if (oldStatus && stats[oldStatus] !== undefined) stats[oldStatus] = Math.max(0, stats[oldStatus] - 1);
      const ns = newStatus.toLowerCase();
      if (stats[ns] !== undefined) stats[ns] = (stats[ns] || 0) + 1;
      return { ...oldData, stats };
    });

    // 2. BACKGROUND API CALL
    await api.patch(`/api/rooms/${roomId}/status`, { status: newStatus });

    // 3. Refresh stats in background (don't await — non-blocking)
    queryClient.invalidateQueries({ queryKey: ['roomsStats'] });
  };


  return (
    <div className="flex flex-col gap-4">
      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <p className="text-theme-muted text-sm">
          Showing {data?.data?.length || 0} of {data?.meta?.totalCount || 0} rooms
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-theme-card shadow-soft border border-theme-border rounded-lg p-1">
            <button className="p-1.5 bg-theme-hover text-theme-text rounded shadow-sm"><LayoutGrid size={16} /></button>
            <button className="p-1.5 text-theme-muted-light hover:text-theme-text transition-colors"><List size={16} /></button>
          </div>

          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-theme-card shadow-soft border border-theme-border rounded-lg text-sm text-theme-muted-light hover:bg-theme-hover transition-colors">
              Sort: {sort} <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative">
        {data?.data?.map((room: any) => (
          <div key={room.id} className="relative">
            <RoomCard 
              room={room} 
              onView={() => onSelectRoom(room.id)}
              onEdit={() => setEditingRoom(room)}
              onMaint={() => setMaintenanceRoom(room)}
              onStatusClick={(e, id) => {
                e.stopPropagation();
                setStatusMenuOpen(statusMenuOpen === id ? null : id);
              }}
            />
            
            {/* Status Change Dropdown */}
            {statusMenuOpen === room.id && (
              <div className="absolute bottom-16 right-4 w-40 bg-theme-card shadow-soft border border-theme-border rounded-xl shadow-2xl z-50 overflow-hidden text-sm">
                {['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'].map(s => (
                  <button 
                    key={s}
                    onClick={() => handleStatusChange(room.id, s)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-theme-hover transition-colors font-medium ${
                      room.status === s
                        ? 'text-blue-400 bg-blue-500/5'
                        : 'text-theme-muted-light hover:text-theme-text'
                    }`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                    {room.status === s && <span className="ml-2 text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data?.meta?.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            {Array.from({ length: data.meta.totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-theme-card text-theme-muted hover:bg-theme-hover'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {editingRoom && (
        <EditRoomModal room={editingRoom} onClose={() => setEditingRoom(null)} />
      )}
      
      {maintenanceRoom && (
        <MaintenanceModal room={maintenanceRoom} onClose={() => setMaintenanceRoom(null)} />
      )}
    </div>
  );
}
