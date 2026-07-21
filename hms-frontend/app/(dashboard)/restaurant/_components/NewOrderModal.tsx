"use client";

import React, { useState } from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NewOrderModal({ onClose, currency }: any) {
  const queryClient = useQueryClient();
  const [roomNumber, setRoomNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      try {
        return await api.get<any>('/api/restaurant/menu');
      } catch {
        return [];
      }
    }
  });

  const addItem = (item: any) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const removeItem = (id: string) => {
    setOrderItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) return setError('Room number is required');
    if (orderItems.length === 0) return setError('Please add at least one item');
    setError('');
    setLoading(true);

    try {
      await api.post('/api/restaurant/orders', {
        roomNumber,
        notes,
        items: orderItems
      });

      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-4xl flex shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Left Side - Menu Selection */}
        <div className="w-1/2 border-r border-theme-border flex flex-col bg-theme-main">
          <div className="p-4 border-b border-theme-border">
            <h3 className="text-lg font-bold text-theme-text">Menu Items</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => addItem(item)}
                  className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-3 cursor-pointer hover:border-primary transition-colors flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-theme-text">{item.name}</span>
                    <span className="text-sm font-bold text-blue-400">{currency} {Number(item.price).toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-theme-muted-light">{item.category}</span>
                </div>
              ))}
              {menuItems.length === 0 && (
                <div className="col-span-2 text-center text-theme-muted-light py-10">No menu items available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Order Form */}
        <div className="w-1/2 flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-theme-border">
            <h2 className="text-xl font-bold text-theme-text">New Order</h2>
            <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
            {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Room Number *</label>
              <input 
                type="text"
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary"
                placeholder="e.g. 101"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                required
              />
              <span className="text-xs text-theme-muted-light">Must belong to a checked-in guest</span>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-theme-muted-light">Selected Items</label>
              <div className="bg-theme-main border border-theme-border rounded-xl p-3 flex flex-col gap-2 min-h-[150px]">
                {orderItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-theme-muted-light italic">
                    Select items from the menu
                  </div>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-theme-card shadow-soft p-2 rounded-lg border border-theme-border">
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-theme-text">{item.name}</span>
                        <span className="text-xs text-theme-muted">{currency} {Number(item.price).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-theme-main rounded-lg p-1">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-theme-hover rounded text-theme-muted"><Minus size={14}/></button>
                          <span className="text-sm font-bold text-theme-text w-4 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-theme-hover rounded text-theme-muted"><Plus size={14}/></button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Kitchen Notes</label>
              <textarea 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary resize-none h-24"
                placeholder="e.g. Extra spicy, No onions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

          </form>
          
          <div className="p-6 border-t border-theme-border bg-theme-main flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-theme-muted">Total Amount</span>
              <span className="text-xl font-bold text-theme-text">
                {currency} {orderItems.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading} type="button" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors font-medium active:scale-95 shadow-md">
                {loading ? 'Submitting...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
