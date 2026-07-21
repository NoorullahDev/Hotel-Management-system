"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Search, Bell, Plus, Clock, CheckCircle, Flame, Camera, Upload } from 'lucide-react';
import OrderCard from './OrderCard';
import OrderDetailsSidebar from './OrderDetailsSidebar';
import NewOrderModal from './NewOrderModal';
import MenuManagement from './MenuManagement';
import QRCodesModal from './QRCodesModal';
import { io } from 'socket.io-client';
import { api } from '@/lib/api';

export default function RestaurantBoard() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['restaurantOrders'],
    queryFn: async () => {
      try {
        const json = await api.get<any>('/api/restaurant/orders');
        return json.data || [];
      } catch {
        throw new Error('Failed to fetch orders');
      }
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['hotelSettings'],
    queryFn: async () => {
      try {
        return await api.get<any>('/api/settings');
      } catch {
        throw new Error('Failed to fetch settings');
      }
    }
  });

  const currency = settings?.currency || 'PKR';

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}`);
    
    socket.on('order:created', () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
    });

    socket.on('order:status_changed', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
      setSelectedOrder((prev: any) => {
        if (prev && prev.id === data.orderId) {
          return data.order;
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/api/restaurant/orders/${orderId}/status`, { status: newStatus });
      // Optimistic update
      queryClient.setQueryData(['restaurantOrders'], (old: any) => {
        if (!old) return old;
        return old.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o);
      });
    } catch (error) {
      console.error('Failed to change status', error);
    }
  };

  const handleUploadMenu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadData = await api.post<any>('/api/upload', formData);
      
      if (uploadData.imageUrl) {
        // Save to settings
        await api.patch('/api/settings', {
          category: 'general',
          updates: { restaurantMenuImage: uploadData.imageUrl }
        });
        alert('Menu Image uploaded successfully! Guests will now see this image when they scan the QR code.');
      }
    } catch (error) {
      console.error('Failed to upload menu', error);
      alert('Failed to upload menu image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredOrders = orders.filter((o: any) => 
    o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.booking?.room?.number.includes(searchQuery) ||
    o.booking?.guest?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingOrders = filteredOrders.filter((o: any) => o.status === 'Pending');
  const preparingOrders = filteredOrders.filter((o: any) => o.status === 'Preparing');
  const readyOrders = filteredOrders.filter((o: any) => o.status === 'Ready');
  const servedOrders = filteredOrders.filter((o: any) => o.status === 'Served');


  return (
    <div className="flex-1 flex flex-col h-screen bg-theme-main overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-theme-border">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Restaurant Management</h1>
          <p className="text-sm text-theme-muted">Manage restaurant orders, kitchen workflow and menu</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search orders, items, guest or room..." 
              className="bg-theme-card shadow-soft border border-theme-border text-sm rounded-full pl-10 pr-4 py-2.5 outline-none text-theme-text w-80 focus:border-primary transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="relative text-theme-muted hover:text-theme-text transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-theme-border"></span>
          </button>
          <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadMenu} 
            accept="image/*,application/pdf" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50 active:scale-95 shadow-md"
          >
            <Upload size={18} /> {isUploading ? 'Uploading...' : 'Upload Menu Image'}
          </button>
          <button 
            onClick={() => setIsQRModalOpen(true)}
            className="bg-theme-card shadow-soft border border-theme-border text-theme-muted-light hover:text-theme-text px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
          >
            QR Codes
          </button>
          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm active:scale-95 shadow-md"
          >
            <Plus size={18} /> New Order
          </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <ChefHat size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Active Orders</p>
              <h3 className="text-2xl font-bold text-theme-text">{orders.filter((o:any) => o.status !== 'Served').length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">View all active orders</p>
            </div>
          </div>
          
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Pending Orders</p>
              <h3 className="text-2xl font-bold text-theme-text">{pendingOrders.length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Waiting to be accepted</p>
            </div>
          </div>

          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Preparing</p>
              <h3 className="text-2xl font-bold text-theme-text">{preparingOrders.length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Currently in kitchen</p>
            </div>
          </div>

          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Ready</p>
              <h3 className="text-2xl font-bold text-theme-text">{readyOrders.length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Ready to serve</p>
            </div>
          </div>

          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-primary">
              <ChefHat size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Served</p>
              <h3 className="text-2xl font-bold text-theme-text">{servedOrders.length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Served today</p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          
          {/* Pending Column */}
          <div className="bg-theme-card shadow-soft/50 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Pending
              </h3>
              <span className="text-xs text-theme-muted">{pendingOrders.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
              {pendingOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} currency={currency} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="bg-theme-card shadow-soft/50 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Preparing
              </h3>
              <span className="text-xs text-theme-muted">{preparingOrders.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
              {preparingOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} currency={currency} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-theme-card shadow-soft/50 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Ready
              </h3>
              <span className="text-xs text-theme-muted">{readyOrders.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
              {readyOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} currency={currency} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>
          </div>

          {/* Served Column */}
          <div className="bg-theme-card shadow-soft/50 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Served
              </h3>
              <span className="text-xs text-theme-muted">{servedOrders.length}</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
              {servedOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} currency={currency} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>
          </div>

        </div>

        {/* Menu Management Component */}
        <MenuManagement currency={currency} />

      </main>

      <OrderDetailsSidebar 
        order={selectedOrder} 
        currency={currency}
        onClose={() => setSelectedOrder(null)} 
        onStatusChange={handleStatusChange} 
      />

      {isNewOrderModalOpen && <NewOrderModal currency={currency} onClose={() => setIsNewOrderModalOpen(false)} />}
      {isQRModalOpen && <QRCodesModal onClose={() => setIsQRModalOpen(false)} />}
    </div>
  );
}
