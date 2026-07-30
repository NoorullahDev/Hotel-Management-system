"use client";

import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function NewServiceRequestModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [serviceSearch, setServiceSearch] = useState('');

  // Fetch occupied bookings
  const { data: occupiedBookings = [] } = useQuery({
    queryKey: ['occupiedBookings'],
    queryFn: async () => {
      try {
        const json = await api.get<any>('/api/bookings?limit=500');
        const data: any[] = json.data || [];
        // Support both CHECKED_IN and CONFIRMED (Occupied) as requested
        return data.filter((b: any) => 
          (b.status === 'CHECKED_IN' || b.status === 'CONFIRMED') && b.room && b.guest
        );
      } catch {
        return [];
      }
    }
  });

  // Fetch all active housekeeping services
  const { data: services = [] } = useQuery({
    queryKey: ['housekeepingServices', 'All'],
    queryFn: async () => {
      try {
        const data = await api.get<any[]>('/api/housekeeping/services');
        return data.filter(s => s.isActive);
      } catch {
        return [];
      }
    }
  });

  const categories = ['All', 'Laundry', 'Pantry', 'Amenities', 'Other Services'];

  const filteredServices = services.filter((s: any) => {
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (serviceSearch && !s.name.toLowerCase().includes(serviceSearch.toLowerCase())) return false;
    return true;
  });

  const addItem = (service: any) => {
    const existing = orderItems.find(i => i.serviceId === service.id);
    if (existing) {
      setOrderItems(orderItems.map(i => 
        i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setOrderItems([...orderItems, { 
        serviceId: service.id,
        serviceName: service.name, 
        category: service.category,
        price: service.price, 
        quantity: 1 
      }]);
    }
  };

  const updateQuantity = (serviceId: string, delta: number) => {
    setOrderItems(orderItems.map(i => {
      if (i.serviceId === serviceId) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const removeItem = (serviceId: string) => {
    setOrderItems(orderItems.filter(i => i.serviceId !== serviceId));
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBookingId) {
      return setError('Please select an occupied room.');
    }
    if (orderItems.length === 0) {
      return setError('Please add at least one service.');
    }

    setLoading(true);
    try {
      await api.post('/api/housekeeping/orders', {
        bookingId: selectedBookingId,
        items: orderItems
      });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit service request');
    }
    setLoading(false);
  };

  const handleBookingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawId = e.target.value;
    setSelectedBookingId(rawId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme-bg w-full max-w-5xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-theme-border">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-theme-border bg-theme-card">
          <h2 className="text-xl font-bold text-theme-text">New Service Request</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Left Panel: Service Selection */}
          <div className="flex-1 border-r border-theme-border flex flex-col bg-theme-bg overflow-hidden">
            
            {/* Filters */}
            <div className="p-4 border-b border-theme-border bg-theme-card">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {categories.map((cat: string) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      categoryFilter === cat 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'bg-theme-bg text-theme-text hover:bg-theme-hover border border-theme-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Search services..." 
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border text-theme-text rounded-xl pl-10 pr-4 py-2 text-sm focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Service Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredServices.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-theme-muted p-8 text-center">
                  <p>No services found.</p>
                </div>
              ) : (
                filteredServices.map((service: any) => (
                  <button
                    key={service.id}
                    onClick={() => addItem(service)}
                    className="bg-theme-card border border-theme-border hover:border-primary p-4 rounded-xl flex flex-col text-left transition-all hover:shadow-md group active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold px-2 py-1 bg-theme-hover text-theme-muted-light rounded-md">
                        {service.category}
                      </span>
                    </div>
                    <span className="font-semibold text-theme-text line-clamp-2 leading-tight mb-1">{service.name}</span>
                    <span className="text-primary font-bold mt-auto">{Number(service.price).toLocaleString()}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Order Details */}
          <div className="w-full lg:w-96 flex flex-col bg-theme-card">
            <div className="p-4 border-b border-theme-border flex-1 overflow-y-auto">
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-theme-muted-light mb-2">Select Occupied Room *</label>
                <select 
                  value={selectedBookingId}
                  onChange={handleBookingChange}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-theme-text outline-none focus:border-primary appearance-none"
                >
                  <option value="">-- Select Room --</option>
                  {occupiedBookings.map((booking: any) => (
                    <option key={booking.rawId} value={booking.rawId}>
                      {booking.room} - {booking.guest}
                    </option>
                  ))}
                </select>
                {occupiedBookings.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">No occupied rooms currently found.</p>
                )}
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-theme-text">Selected Services</h3>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {orderItems.length} items
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {orderItems.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-theme-border rounded-xl text-theme-muted">
                    <p className="text-sm">No services added yet.</p>
                    <p className="text-xs mt-1">Click items on the left to add.</p>
                  </div>
                ) : (
                  orderItems.map(item => (
                    <div key={item.serviceId} className="flex flex-col gap-2 p-3 bg-theme-bg rounded-xl border border-theme-border">
                      <div className="flex justify-between">
                        <span className="font-medium text-theme-text text-sm">{item.serviceName}</span>
                        <span className="font-semibold text-theme-text text-sm">{(Number(item.price) * item.quantity).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-theme-muted">{Number(item.price).toLocaleString()} each</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-theme-card border border-theme-border rounded-lg">
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.serviceId, -1)}
                              className="p-1 hover:bg-theme-hover text-theme-text transition-colors rounded-l-lg"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-theme-text">{item.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.serviceId, 1)}
                              className="p-1 hover:bg-theme-hover text-theme-text transition-colors rounded-r-lg"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeItem(item.serviceId)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 bg-theme-card border-t border-theme-border">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-xl">
                  {error}
                </div>
              )}
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-theme-muted-light font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-theme-text">
                  {totalAmount.toLocaleString()}
                </span>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={loading || orderItems.length === 0 || !selectedBookingId}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-theme-muted text-primary-foreground py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
