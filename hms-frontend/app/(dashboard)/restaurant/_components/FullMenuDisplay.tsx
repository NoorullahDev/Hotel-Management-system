import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function FullMenuDisplay({ onClose, roomNumber }: { onClose: () => void, roomNumber?: string }) {
  const [activeTab, setActiveTab] = useState<string>('All Items');

  const { data: settings } = useQuery({
    queryKey: ['hotelSettings'],
    queryFn: async () => {
      const data = await api.get<any>('/api/settings');
      return data;
    }
  });

  const currency = settings?.currency || 'PKR';

  const { data: categories = [] } = useQuery({
    queryKey: ['menuCategories'],
    queryFn: async () => {
      const data = await api.get<any>('/api/restaurant/categories');
      return [{ id: 'all', name: 'All Items' }, ...data];
    }
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      const data = await api.get<any>('/api/restaurant/menu');
      return data;
    }
  });

  const filteredItems = activeTab === 'All Items' ? menuItems : menuItems.filter((i: any) => i.category === activeTab);

  return (
    <div className="fixed inset-0 bg-theme-main z-[60] flex flex-col overflow-hidden animate-in slide-in-from-bottom">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-theme-border bg-theme-card shadow-soft sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-theme-main rounded-xl text-theme-muted hover:text-theme-text transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-theme-text mb-1">Digital Menu</h1>
            <p className="text-sm text-theme-muted">
              {roomNumber ? `Viewing menu for Room ${roomNumber}` : 'Complete Restaurant Menu'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="bg-theme-main hover:bg-theme-hover text-theme-muted hover:text-theme-text p-3 rounded-xl border border-theme-border transition-colors">
          <X size={20} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((c: any) => (
            <button 
              key={c.id}
              onClick={() => setActiveTab(c.name)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeTab === c.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-theme-card text-theme-muted border border-theme-border hover:text-theme-text hover:bg-theme-hover'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex gap-5 hover:border-primary/50 transition-colors group">
              <div className="w-32 h-32 rounded-xl bg-theme-main flex items-center justify-center shrink-0 overflow-hidden relative">
                {item.imageUrl ? (
                  <img loading="lazy" decoding="async" src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <UtensilsCrossed size={32} className="text-theme-muted" />
                )}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Sold Out</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-lg font-bold text-theme-text leading-tight">{item.name}</h4>
                    <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg shrink-0 ml-2">{currency} {Number(item.price).toFixed(2)}</span>
                  </div>
                  <span className="inline-block px-2 py-1 bg-theme-main border border-theme-border rounded text-[10px] text-theme-muted font-medium uppercase tracking-wider mb-2">
                    {item.category}
                  </span>
                  <p className="text-sm text-theme-muted line-clamp-2">{item.description || "No description provided."}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center text-theme-muted-light">
              <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">No items found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
