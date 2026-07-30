"use client";

import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NewOrderModal({ onClose, currency }: any) {
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [selectedGuestName, setSelectedGuestName] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [menuSearch, setMenuSearch] = useState('');

  // Fetch all CHECKED_IN bookings.
  // NOTE: /api/bookings returns flat formatted objects:
  //   b.room   = room number string  (e.g. "101")
  //   b.guest  = guest name string   (e.g. "Khan")
  //   b.rawId  = actual booking UUID (used for API calls)
  const { data: occupiedBookings = [] } = useQuery({
    queryKey: ['occupiedBookings'],
    queryFn: async () => {
      try {
        const json = await api.get<any>('/api/bookings?status=CHECKED_IN&limit=500');
        const data: any[] = json.data || [];
        // Filter to only CHECKED_IN, exclude any with missing room/guest data
        return data.filter((b: any) => b.status === 'CHECKED_IN' && b.room && b.guest);
      } catch {
        return [];
      }
    }
  });

  // Fetch menu items (available only shown in selector)
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

  // Fetch categories for tab filter
  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: async () => {
      try {
        const data = await api.get<any>('/api/restaurant/categories');
        return [{ id: 'all', name: 'All' }, ...data];
      } catch {
        return [{ id: 'all', name: 'All' }];
      }
    }
  });

  const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawId = e.target.value;  // this is booking.rawId (UUID)
    setSelectedBookingId(rawId);
    if (!rawId) {
      setSelectedRoomNumber('');
      setSelectedGuestName('');
      return;
    }
    // occupiedBookings entries have flat fields: .room (string), .guest (string), .rawId (UUID)
    const booking = occupiedBookings.find((b: any) => b.rawId === rawId);
    if (booking) {
      setSelectedRoomNumber(booking.room || '');
      setSelectedGuestName(booking.guest || '');
    }
  };

  const availableMenuItems = menuItems.filter((item: any) => item.isAvailable !== false);

  const filteredMenuItems = availableMenuItems.filter((item: any) => {
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchSearch = !menuSearch || item.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchCat && matchSearch;
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

  const totalAmount = orderItems.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) return setError('Please select a room');
    if (orderItems.length === 0) return setError('Please add at least one item');
    setError('');
    setLoading(true);

    try {
      await api.post('/api/restaurant/orders', {
        bookingId: selectedBookingId,   // new backend path (bookingId directly)
        roomNumber: selectedRoomNumber, // old backend path (roomNumber) — keeps backward compat
        notes,
        items: orderItems.map((i: any) => ({
          name: i.name,
          price: Number(i.price),
          quantity: i.quantity,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-5xl flex shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Left Side — Menu Selection */}
        <div className="w-1/2 border-r border-theme-border flex flex-col bg-theme-main">
          <div className="p-4 border-b border-theme-border flex flex-col gap-3">
            <h3 className="text-lg font-bold text-theme-text">Menu Items</h3>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={15} />
              <input
                type="text"
                placeholder="Search menu..."
                className="bg-theme-card border border-theme-border rounded-lg pl-8 pr-3 py-2 text-sm text-theme-text outline-none w-full focus:border-primary"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
              />
            </div>
            {/* Category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === c.name ? 'bg-primary text-white' : 'bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-text border border-theme-border'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-2 gap-3">
              {filteredMenuItems.map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => addItem(item)}
                  className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-3 cursor-pointer hover:border-primary transition-colors flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-sm font-medium text-theme-text line-clamp-2 flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-blue-400 shrink-0">{currency} {Number(item.price).toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-theme-muted-light">{item.category}</span>
                  {item.description && (
                    <span className="text-xs text-theme-muted line-clamp-1">{item.description}</span>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    {item.preparationTime && (
                      <span className="text-[10px] text-theme-muted-light">~{item.preparationTime} min</span>
                    )}
                    <span className="text-[10px] font-medium text-green-400 ml-auto">+ Add</span>
                  </div>
                </div>
              ))}
              {filteredMenuItems.length === 0 && (
                <div className="col-span-2 text-center text-theme-muted-light py-10 text-sm">No available items.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side — Order Form */}
        <div className="w-1/2 flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-theme-border">
            <h2 className="text-xl font-bold text-theme-text">New Order</h2>
            <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
            {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">{error}</div>}

            {/* Room Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Select Room *</label>
              <select
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary text-sm"
                value={selectedBookingId}
                onChange={handleRoomSelect}
                required
              >
                <option value="">-- Select an occupied room --</option>
                {occupiedBookings.map((booking: any) => (
                  // booking.room = room number string, booking.guest = guest name string, booking.rawId = UUID
                  <option key={booking.rawId} value={booking.rawId}>
                    {booking.room} - {booking.guest}
                  </option>
                ))}
              </select>
              {occupiedBookings.length === 0 && (
                <span className="text-xs text-theme-muted-light">No rooms are currently checked in.</span>
              )}
            </div>

            {/* Guest Info (auto-populated) */}
            {selectedRoomNumber && (
              <div className="bg-theme-main border border-theme-border rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-bold text-theme-muted-light uppercase tracking-wide">Guest Info</p>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">Room</span>
                  <span className="text-theme-text font-medium">{selectedRoomNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-theme-muted">Guest</span>
                  <span className="text-theme-text font-medium">{selectedGuestName}</span>
                </div>
              </div>
            )}

            {/* Selected Items */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-theme-muted-light">Selected Items</label>
              <div className="bg-theme-main border border-theme-border rounded-xl p-3 flex flex-col gap-2 min-h-[130px]">
                {orderItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-theme-muted-light italic py-4">
                    Click items from the menu to add
                  </div>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-theme-card shadow-soft p-2 rounded-lg border border-theme-border">
                      <div className="flex flex-col flex-1 min-w-0 mr-2">
                        <span className="text-sm font-medium text-theme-text line-clamp-1">{item.name}</span>
                        <span className="text-xs text-theme-muted">{currency} {Number(item.price).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-theme-main rounded-lg p-1">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-theme-hover rounded text-theme-muted"><Minus size={13}/></button>
                          <span className="text-sm font-bold text-theme-text w-4 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-theme-hover rounded text-theme-muted"><Plus size={13}/></button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Kitchen Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Kitchen Notes <span className="text-theme-muted text-xs">(Optional)</span></label>
              <textarea 
                className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary resize-none h-20 text-sm"
                placeholder="e.g. Extra spicy, No onions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

          </form>
          
          {/* Footer with total & submit */}
          <div className="p-6 border-t border-theme-border bg-theme-main flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-theme-muted">Total Amount</span>
              <span className="text-xl font-bold text-theme-text">
                {currency} {totalAmount.toFixed(2)}
              </span>
              {orderItems.length > 0 && (
                <span className="text-xs text-theme-muted-light">{orderItems.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-theme-muted-light hover:bg-theme-hover transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading} type="button" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors font-medium active:scale-95 shadow-md disabled:opacity-50">
                {loading ? 'Submitting...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
