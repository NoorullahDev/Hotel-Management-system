"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Utensils, Search, Plus, DollarSign, ListOrdered } from 'lucide-react';
import OrderDetailsSidebar from './OrderDetailsSidebar';
import NewOrderModal from './NewOrderModal';
import MenuManagement from './MenuManagement';
import { io } from 'socket.io-client';
import { api } from '@/lib/api';

export default function RestaurantBoard() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');

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

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const filteredOrders = orders.filter((o: any) => 
    o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.booking?.room?.number.includes(searchQuery) ||
    o.booking?.guest?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate today's stats
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === today && o.status !== 'Cancelled');
  const totalRevenueToday = todaysOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
  const totalItemsToday = todaysOrders.reduce((sum: number, o: any) => sum + (o.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0);

  const displayedOrders = viewMode === 'today' ? filteredOrders.filter((o: any) => new Date(o.createdAt).toDateString() === today) : filteredOrders;

  return (
    <div className="flex-1 flex flex-col h-screen bg-theme-main overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-theme-border">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Restaurant Management</h1>
          <p className="text-sm text-theme-muted">Record food charges and manage menu</p>
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
          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm active:scale-95 shadow-md"
          >
            <Plus size={18} /> New Order
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-primary">
              <ListOrdered size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Total Orders (Today)</p>
              <h3 className="text-2xl font-bold text-theme-text">{todaysOrders.length}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Recorded food orders</p>
            </div>
          </div>
          
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Food Revenue (Today)</p>
              <h3 className="text-2xl font-bold text-theme-text">{currency} {totalRevenueToday.toLocaleString()}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Total charges recorded</p>
            </div>
          </div>

          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Utensils size={24} />
            </div>
            <div>
              <p className="text-sm text-theme-muted">Items Ordered (Today)</p>
              <h3 className="text-2xl font-bold text-theme-text">{totalItemsToday}</h3>
              <p className="text-xs text-theme-muted-light mt-1">Total items served</p>
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-theme-text">Recent Food Charges</h2>
            <div className="flex bg-theme-secondary rounded-lg p-1 border border-theme-border">
              <button 
                onClick={() => setViewMode('today')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'today' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setViewMode('all')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'all' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
              >
                All Time
              </button>
            </div>
          </div>
          <div className="bg-theme-card border border-theme-border rounded-2xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-theme-secondary text-theme-muted text-xs uppercase tracking-wider border-b border-theme-border">
                    <th className="p-4 font-medium">Order #</th>
                    <th className="p-4 font-medium">Room</th>
                    <th className="p-4 font-medium">Guest</th>
                    <th className="p-4 font-medium">Time</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Total Amount</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-sm text-theme-text">
                  {displayedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-theme-muted">
                        No food charges found.
                      </td>
                    </tr>
                  ) : (
                    displayedOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-theme-hover transition-colors">
                        <td className="p-4 font-medium">
                          {order.orderNumber?.split('-')[0] + '-' + order.orderNumber?.split('-')[1]?.substring(0,4)?.toUpperCase() || 'ORD-NEW'}
                        </td>
                        <td className="p-4 font-bold text-primary">
                          {order.booking?.room?.number || '--'}
                        </td>
                        <td className="p-4">
                          {order.booking?.guest?.name || '--'}
                        </td>
                        <td className="p-4 text-theme-muted">
                          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {order.status === 'Cancelled' ? 'Cancelled' : 'Recorded'}
                          </span>
                        </td>
                        <td className="p-4 font-bold">
                          {currency} {Number(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-primary hover:text-primary/80 font-medium text-xs px-3 py-1.5 rounded-lg bg-primary/10 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
      />

      {isNewOrderModalOpen && <NewOrderModal currency={currency} onClose={() => setIsNewOrderModalOpen(false)} />}
    </div>
  );
}
