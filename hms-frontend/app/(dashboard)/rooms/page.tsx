'use client';

import React, { useState } from 'react';
import RoomsFilterBar from './_components/RoomsFilterBar';
import RoomsSummary from './_components/RoomsSummary';
import RoomGrid from './_components/RoomGrid';
import SlideOverDetails from './_components/SlideOverDetails';
import AddRoomModal from './_components/AddRoomModal';

export default function RoomsPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    roomType: 'All Types',
    status: 'All Status',
    floor: 'All Floors',
    price: 'All Prices'
  });

  return (
    <div className="flex flex-col gap-6 pb-8 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text mb-1">Room Management</h1>
        <p className="text-theme-muted text-sm">Manage rooms, availability, status and settings</p>
      </div>

      <RoomsFilterBar 
        filters={filters} 
        setFilters={setFilters} 
        onAddRoom={() => setIsAddModalOpen(true)} 
      />
      
      <RoomsSummary filters={filters} />
      
      <RoomGrid 
        filters={filters} 
        onSelectRoom={(id) => setSelectedRoomId(id)} 
      />

      <SlideOverDetails 
        roomId={selectedRoomId} 
        onClose={() => setSelectedRoomId(null)} 
      />

      {isAddModalOpen && (
        <AddRoomModal onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  );
}
