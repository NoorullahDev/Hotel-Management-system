'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, CheckCircle2, UserCheck, Bookmark, Sparkles, PenTool } from 'lucide-react';
import { api } from '@/lib/api';

const fetchStats = async () => {
  return api.get<any>('/api/rooms?limit=1');
};

const fetchSettings = async () => {
  try {
    return await api.get<any>('/api/settings');
  } catch {
    return {};
  }
};

export default function RoomsSummary({ filters }: { filters: any }) {
  const { data } = useQuery({
    queryKey: ['roomsStats'],
    queryFn: fetchStats
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings
  });

  const stats = data?.stats || { total: 0, available: 0, occupied: 0, reserved: 0, cleaning: 0, maintenance: 0 };
  const configuredCapacity = settings?.hotel?.rooms || 'N/A';

  const getPercentage = (value: number) => {
    if (stats.total === 0) return '0%';
    return ((value / stats.total) * 100).toFixed(1) + '%';
  };

  const cards = [
    { label: `Total Rooms (Cap: ${configuredCapacity})`, value: stats.total, pct: '100%', icon: BedDouble, iconColor: 'text-primary', iconBg: 'bg-primary/10', pctColor: 'text-primary' },
    { label: 'Available Rooms', value: stats.available, pct: getPercentage(stats.available), icon: CheckCircle2, iconColor: 'text-green-500', iconBg: 'bg-green-500/10', pctColor: 'text-green-500' },
    { label: 'Occupied Rooms', value: stats.occupied, pct: getPercentage(stats.occupied), icon: UserCheck, iconColor: 'text-red-500', iconBg: 'bg-red-500/10', pctColor: 'text-red-500' },
    { label: 'Reserved Rooms', value: stats.reserved, pct: getPercentage(stats.reserved), icon: Bookmark, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', pctColor: 'text-blue-400' },
    { label: 'Cleaning Rooms', value: stats.cleaning, pct: getPercentage(stats.cleaning), icon: Sparkles, iconColor: 'text-yellow-500', iconBg: 'bg-yellow-500/10', pctColor: 'text-yellow-500' },
    { label: 'Maintenance Rooms', value: stats.maintenance, pct: getPercentage(stats.maintenance), icon: PenTool, iconColor: 'text-theme-muted', iconBg: 'bg-theme-secondary', pctColor: 'text-theme-muted' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 hover:border-theme-border transition-colors">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.iconBg} ${c.iconColor}`}>
            <c.icon size={20} />
          </div>
          <h3 className="text-2xl font-bold text-theme-text mb-1">{c.value}</h3>
          <p className="text-theme-muted text-xs font-medium mb-2">{c.label}</p>
          <p className={`text-xs font-medium ${c.pctColor}`}>{c.pct}</p>
        </div>
      ))}
    </div>
  );
}
