"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { UtensilsCrossed, ShoppingCart, CheckCircle, ChevronLeft, Plus, Minus, X } from 'lucide-react';
import { api } from '@/lib/api';

function GuestPortalContent() {
  const searchParams = useSearchParams();
  const roomNumber = searchParams.get('room') || '';
  
  const [lastName, setLastName] = useState('');
  const [verified, setVerified] = useState(false);
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [bookingId, setBookingId] = useState('');
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<string>('All Items');
  const [cart, setCart] = useState<{item: any, quantity: number, notes: string}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Track submitted orders for this session
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const { data: settings } = useQuery({
    queryKey: ['guestSettings'],
    queryFn: async () => {
      try {
        const data = await api.get<any>('/api/settings');
        return data;
      } catch (e) {
        return { currency: 'PKR' };
      }
    }
  });

  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      try {
        const data = await api.get<any>('/api/settings/public');
        return data;
      } catch (e) {
        return {};
      }
    }
  });

  const currency = settings?.currency || 'PKR';
  const menuImage = publicSettings?.restaurantMenuImage;

  const { data: categories = [] } = useQuery({
    queryKey: ['guestCategories'],
    queryFn: async () => {
      const data = await api.get<any>('/api/restaurant/categories');
      return [{ id: 'all', name: 'All Items' }, ...data];
    },
    enabled: verified
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['guestMenu'],
    queryFn: async () => {
      const data = await api.get<any>('/api/restaurant/menu');
      return data;
    },
    enabled: verified
  });

  useEffect(() => {
    if (verified) {
      const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}`);
      socket.on('order:status_changed', (order: any) => {
        setMyOrders(prev => prev.map(o => o.id === order.id ? order : o));
      });
      return () => { socket.disconnect(); };
    }
  }, [verified]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post<any>('/api/restaurant/verify-guest', { roomNumber, lastName });
      setVerified(true);
      setGuestInfo(data.guest);
      setBookingId(data.bookingId);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    try {
      const orderItems = cart.map(c => ({
        menuItemId: c.item.id,
        quantity: c.quantity
      }));
      
      const order = await api.post<any>('/api/restaurant/orders', {
        roomNumber,
        bookingId,
        items: orderItems,
        notes: notes
      });
      setMyOrders(prev => [order, ...prev]);
      setCart([]);
      setIsCartOpen(false);
      setNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = activeTab === 'All Items' ? menuItems : menuItems.filter((i: any) => i.category === activeTab);
  const cartTotal = cart.reduce((acc, c) => acc + (Number(c.item.price) * c.quantity), 0);

  if (!verified) {
    return (
      <div className="min-h-screen bg-theme-main flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-theme-card shadow-soft border border-theme-border rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto active:scale-95 shadow-md">
            <UtensilsCrossed size={32} />
          </div>
          <h1 className="text-2xl font-bold text-theme-text text-center mb-2">Welcome to In-Room Dining</h1>
          <p className="text-theme-muted text-center text-sm mb-8">Please verify your details to view the menu and place an order.</p>
          
          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Room Number</label>
              <input type="text" className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none" value={roomNumber} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-muted-light">Last Name</label>
              <input type="text" className="bg-theme-main border border-theme-border rounded-xl px-4 py-3 text-theme-text outline-none focus:border-primary transition-colors" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Enter last name on reservation" />
            </div>
            {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}
            <button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 active:scale-95 shadow-md">
              Access Menu
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-main pb-24 font-sans text-theme-text">
      {/* Header */}
      <div className="bg-theme-card shadow-soft border-b border-theme-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">In-Room Dining</h1>
            <p className="text-xs text-theme-muted">Room {roomNumber} • {guestInfo?.name}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-theme-main rounded-full border border-theme-border">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center active:scale-95 shadow-md">
                {cart.reduce((a,c) => a + c.quantity, 0)}
              </span>
            )}
          </button>
        </div>
        
        {/* Categories */}
        <div className="max-w-md mx-auto px-4 py-3 overflow-x-auto custom-scrollbar flex gap-2">
          {categories.map((c: any) => (
            <button 
              key={c.id}
              onClick={() => setActiveTab(c.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === c.name ? 'bg-blue-600 text-white' : 'bg-theme-main text-theme-muted border border-theme-border'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Uploaded Menu Image */}
      {menuImage && (
        <div className="max-w-md mx-auto mt-4 px-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl overflow-hidden shadow-2xl">
            <img loading="lazy" decoding="async" 
              src={menuImage.startsWith('http') ? menuImage : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${menuImage}`} 
              alt="Restaurant Menu" 
              className="w-full h-auto object-contain"
            />
          </div>
          <h3 className="text-sm font-bold text-theme-muted mt-6 mb-2 uppercase tracking-wider text-center">Or Order Digitally Below</h3>
        </div>
      )}

      {/* Track Active Orders */}
      {myOrders.length > 0 && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <h3 className="text-sm font-bold text-theme-muted mb-2 uppercase tracking-wider">Your Active Orders</h3>
          <div className="flex flex-col gap-3">
            {myOrders.map(order => (
              <div key={order.id} className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-medium text-theme-muted block mb-1">Order {order.orderNumber.split('-')[0]}</span>
                  <span className={`text-sm font-bold ${order.status === 'Served' ? 'text-blue-500' : order.status === 'Ready' ? 'text-green-500' : order.status === 'Preparing' ? 'text-orange-500' : 'text-red-500'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-theme-muted block mb-1">Total</span>
                  <span className="text-sm font-bold text-theme-text">{currency} {Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 flex gap-4">
              <div className="w-24 h-24 rounded-xl bg-theme-main flex items-center justify-center shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img loading="lazy" decoding="async" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed size={24} className="text-theme-muted" />
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-theme-text leading-tight">{item.name}</h4>
                  <p className="text-xs text-theme-muted mt-1">{item.category}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-bold text-blue-400">{currency} {Number(item.price).toFixed(2)}</span>
                  <button onClick={() => addToCart(item)} className="bg-primary/20 text-primary hover:bg-primary/30 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-md">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-theme-card shadow-soft border-t border-theme-border rounded-t-3xl w-full max-w-md mx-auto h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center p-6 border-b border-theme-border">
              <h3 className="text-xl font-bold text-theme-text">Your Order</h3>
              <button onClick={() => setIsCartOpen(false)} className="bg-theme-main p-2 rounded-full border border-theme-border">
                <X size={20} className="text-theme-muted" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {cart.length === 0 ? (
                <div className="text-center text-theme-muted mt-10">Your cart is empty</div>
              ) : (
                cart.map(c => (
                  <div key={c.item.id} className="flex justify-between items-center bg-theme-main p-3 rounded-xl border border-theme-border">
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-theme-text">{c.item.name}</h5>
                      <span className="text-xs text-theme-muted">{currency} {Number(c.item.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-theme-card shadow-soft rounded-lg p-1">
                      <button onClick={() => updateQuantity(c.item.id, -1)} className="w-7 h-7 flex items-center justify-center text-theme-muted hover:text-theme-text"><Minus size={14} /></button>
                      <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                      <button onClick={() => updateQuantity(c.item.id, 1)} className="w-7 h-7 flex items-center justify-center text-theme-muted hover:text-theme-text"><Plus size={14} /></button>
                    </div>
                  </div>
                ))
              )}

              {cart.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2 block">Special Instructions</label>
                  <textarea 
                    className="w-full bg-theme-main border border-theme-border rounded-xl p-3 text-sm text-theme-text outline-none focus:border-primary min-h-[80px]"
                    placeholder="E.g. No onions, extra spicy..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-theme-main border-t border-theme-border">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-theme-muted">Total</span>
                  <span className="text-xl font-bold text-theme-text">{currency} {cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={placeOrder} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-colors active:scale-95 shadow-md">
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-theme-main flex items-center justify-center text-theme-muted">Loading...</div>}>
      <GuestPortalContent />
    </Suspense>
  );
}
