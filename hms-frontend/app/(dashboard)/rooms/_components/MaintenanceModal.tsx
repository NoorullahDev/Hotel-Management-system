'use client';

import React, { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Props {
  room: any;
  onClose: () => void;
}

export default function MaintenanceModal({ room, onClose }: Props) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');

  const reportMaintenance = async (desc: string) => {
    return api.post(`/api/rooms/${room.id}/maintenance`, { description: desc });
  };

  const mutation = useMutation({
    mutationFn: reportMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomsList'] });
      queryClient.invalidateQueries({ queryKey: ['roomsStats'] });
      queryClient.invalidateQueries({ queryKey: ['roomDetails', room.id] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    mutation.mutate(description);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-theme-secondary border border-theme-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-theme-secondary flex items-center justify-center text-theme-muted">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-text leading-tight">Report Maintenance</h2>
              <p className="text-xs text-theme-muted">Room {room.number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors self-start mt-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <p className="text-sm text-theme-muted-light">
            Reporting a maintenance issue will log a ticket and automatically change this room&apos;s status to <span className="font-semibold text-theme-muted">Maintenance</span>.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted-light">Issue Description *</label>
            <textarea 
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary resize-none"
              placeholder="e.g. Air conditioning is not cooling properly."
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-theme-hover hover:bg-theme-hover text-theme-text text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={mutation.isPending || !description.trim()}
              className="flex-1 py-2.5 bg-theme-strong hover:bg-theme-hover text-theme-text text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
