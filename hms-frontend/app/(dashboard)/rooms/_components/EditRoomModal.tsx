'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Props {
  room: any;
  onClose: () => void;
}

const fetchRoomTypes = async () => {
  try {
    return await api.get<any>('/api/rooms/types');
  } catch {
    return [];
  }
};

export default function EditRoomModal({ room, onClose }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    number: room.number,
    floor: room.floor.toString(),
    roomTypeId: room.roomTypeId,
    price: room.price.toString(),
    amenities: (() => {
      if (Array.isArray(room.amenities)) return room.amenities.join(', ');
      if (typeof room.amenities === 'string') {
        try {
          const parsed = JSON.parse(room.amenities);
          if (Array.isArray(parsed)) return parsed.join(', ');
        } catch (e) {}
        return room.amenities;
      }
      return '';
    })(),
    imageUrl: room.imageUrl || ''
  });
  const [error, setError] = useState('');

  const { data: roomTypes } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: fetchRoomTypes
  });

  const updateRoom = async (data: any) => {
    return api.patch<any>(`/api/rooms/${room.id}`, {
      ...data,
      price: parseFloat(data.price),
      amenities: data.amenities.split(',').map((a: string) => a.trim()).filter(Boolean)
    });
  };

  const mutation = useMutation({
    mutationFn: updateRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomsList'] });
      queryClient.invalidateQueries({ queryKey: ['roomsStats'] });
      queryClient.invalidateQueries({ queryKey: ['roomDetails', room.id] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update room');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-theme-secondary border border-theme-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-theme-text">Edit Room {room.number}</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Room Number *</label>
            <input 
              required
              type="text" 
              value={formData.number}
              onChange={(e) => setFormData({...formData, number: e.target.value})}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Floor *</label>
            <input 
              required
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.floor}
              onChange={(e) => setFormData({...formData, floor: e.target.value})}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Room Type *</label>
            <select 
              required
              value={formData.roomTypeId}
              onChange={(e) => setFormData({...formData, roomTypeId: e.target.value})}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            >
              <option value="">Select Room Type</option>
              {Array.isArray(roomTypes) && roomTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Price per Night (Rs.) *</label>
            <input 
              required
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Amenities (comma separated)</label>
            <input 
              type="text" 
              value={formData.amenities}
              onChange={(e) => setFormData({...formData, amenities: e.target.value})}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Room Image</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const formDataPayload = new FormData();
                  formDataPayload.append('image', file);
                  
                  try {
                    const data = await api.post<any>('/api/upload', formDataPayload);
                    setFormData({...formData, imageUrl: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${data.imageUrl}`});
                  } catch (err) {
                    setError('Image upload failed');
                  }
                }}
                className="flex-1 bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-muted-light file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary cursor-pointer active:scale-95 shadow-md"
              />
              {formData.imageUrl && (
                <img loading="lazy" decoding="async" src={formData.imageUrl} alt="Preview" className="w-10 h-10 rounded-md object-cover border border-theme-border" />
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-theme-hover hover:bg-theme-hover text-theme-text text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 active:scale-95 shadow-md"
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
