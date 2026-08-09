import React, { useState, useRef, useEffect } from 'react';
import { Eye, Edit2, PenTool, CheckCircle2, Lock, Sparkles, RefreshCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Props {
  room: any;
  onView: (id: string) => void;
  onEdit: (room: any) => void;
  onMaint: () => void;
  onStatusClick: (e: React.MouseEvent, id: string) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return { label: 'Available', color: 'bg-emerald-500 text-white shadow-md', icon: Lock };
    case 'OCCUPIED': return { label: 'Occupied', color: 'bg-rose-500 text-white shadow-md', icon: Lock };
    case 'RESERVED': return { label: 'Reserved', color: 'bg-primary text-white shadow-md', icon: Lock };
    case 'CLEANING': return { label: 'Cleaning', color: 'bg-amber-500 text-white shadow-md', icon: Sparkles };
    case 'MAINTENANCE': return { label: 'Maintenance', color: 'bg-slate-600 text-white shadow-md', icon: PenTool };
    default: return { label: status, color: 'bg-slate-600 text-white shadow-md', icon: CheckCircle2 };
  }
};

export default function RoomCard({ room, onView, onEdit, onMaint, onStatusClick }: Props) {
  const statusConfig = getStatusConfig(room.status);
  const StatusIcon = statusConfig.icon;

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(room.price?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isEditingPrice && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingPrice]);

  const updatePriceMutation = useMutation({
    mutationFn: (newPrice: number) => api.patch(`/api/rooms/${room.id}`, { price: newPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomsList'] });
    }
  });

  const handlePriceSubmit = () => {
    setIsEditingPrice(false);
    const numPrice = parseFloat(editedPrice);
    if (!isNaN(numPrice) && numPrice !== room.price) {
      updatePriceMutation.mutate(numPrice);
    } else {
      setEditedPrice(room.price?.toString() || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePriceSubmit();
    if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setEditedPrice(room.price?.toString() || '');
    }
  };

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-hover hover:border-theme-strong transition-all duration-300 flex flex-col group relative">
      {/* Image Area */}
      <div className="relative h-48 bg-theme-secondary overflow-hidden">
        <img loading="lazy" decoding="async" 
          src={room.imageUrl || `https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop`} 
          alt={`Room ${room.number}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-theme-card to-transparent pointer-events-none"></div>
        
        {/* Status Badge Overlay */}
        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 ${statusConfig.color}`}>
          <StatusIcon size={14} />
          {statusConfig.label}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between -mt-4 relative z-10">
        <div>
          <h3 className="text-2xl font-bold text-theme-text mb-1">{room.number}</h3>
          <p className="text-theme-muted text-sm mb-4">{room.roomType?.name || 'Standard Room'}</p>
          
          <div className="flex items-center justify-between text-xs text-theme-muted-light mb-6">
            <span>Floor {room.floor}</span>
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <span>Rs.</span>
                <input 
                  ref={inputRef}
                  type="number"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(e.target.value)}
                  onBlur={handlePriceSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-16 bg-theme-main border border-theme-border rounded px-1 py-0.5 text-xs text-theme-text focus:outline-none focus:border-primary no-spinners"
                  style={{ MozAppearance: 'textfield' }}
                />
                <span>/ night</span>
              </div>
            ) : (
              <span 
                className="font-medium text-theme-muted-light cursor-pointer hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary"
                onClick={(e) => { e.stopPropagation(); setIsEditingPrice(true); setEditedPrice(room.price?.toString() || ''); }}
                title="Click to edit price"
              >
                Rs. {room.price?.toLocaleString()} / night
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 border-t border-theme-border pt-4">
          <button 
            onClick={() => onView(room.id)}
            className="flex flex-col items-center justify-center gap-1 text-theme-muted hover:text-theme-text transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-theme-border flex items-center justify-center bg-theme-main group-hover:border-theme-strong">
              <Eye size={14} />
            </div>
            <span className="text-[10px] font-medium">View</span>
          </button>
          <button 
            onClick={() => onEdit(room)}
            className="flex flex-col items-center justify-center gap-1 text-theme-muted hover:text-theme-text transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-theme-border flex items-center justify-center bg-theme-main group-hover:border-theme-strong">
              <Edit2 size={14} />
            </div>
            <span className="text-[10px] font-medium">Edit</span>
          </button>
          <button 
            onClick={onMaint}
            className="flex flex-col items-center justify-center gap-1 text-theme-muted hover:text-theme-text transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-theme-border flex items-center justify-center bg-theme-main group-hover:border-theme-strong">
              <PenTool size={14} />
            </div>
            <span className="text-[10px] font-medium">Maint.</span>
          </button>
          <button 
            onClick={(e) => onStatusClick(e, room.id)}
            className="flex flex-col items-center justify-center gap-1 text-theme-muted hover:text-theme-text transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-theme-border flex items-center justify-center bg-theme-main group-hover:border-theme-strong">
              <RefreshCcw size={14} />
            </div>
            <span className="text-[10px] font-medium">Status</span>
          </button>
        </div>
      </div>
    </div>
  );
}

