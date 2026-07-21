'use client';

import React from 'react';
import { LogIn, LogOut, PieChart, BedDouble, Bookmark, ArrowUp, ArrowDown } from 'lucide-react';

const RsIcon = ({ size = 24 }: { size?: number }) => (
  <span style={{ fontSize: size * 0.7, fontWeight: 'bold', lineHeight: 1 }}>Rs</span>
);
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const fetchSummary = async () => {
  return await api.get<any>('/api/dashboard/summary');
};

export default function StatCards() {
  const { data } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchSummary
  });

  const stats = data ? [
    {
      title: "Today's Check-ins",
      value: data.checkIns.value,
      change: data.checkIns.delta,
      isPositive: data.checkIns.isPositive,
      icon: LogIn,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#0066FF] to-[#0052CC] shadow-lg shadow-[#0066FF]/20"
    },
    {
      title: "Today's Check-outs",
      value: data.checkOuts.value,
      change: data.checkOuts.delta,
      isPositive: data.checkOuts.isPositive,
      icon: LogOut,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#8A2BE2] to-[#6A1B9A] shadow-lg shadow-[#8A2BE2]/20"
    },
    {
      title: "Occupancy Rate",
      value: data.occupancy.value,
      change: data.occupancy.delta,
      isPositive: data.occupancy.isPositive,
      icon: PieChart,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#00C4B5] to-[#009688] shadow-lg shadow-[#00C4B5]/20"
    },
    {
      title: "Total Revenue",
      value: data.revenue.value,
      change: data.revenue.delta,
      isPositive: data.revenue.isPositive,
      icon: RsIcon,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#F5A623] to-[#D48806] shadow-lg shadow-[#F5A623]/20"
    },
    {
      title: "Available Rooms",
      value: data.available.value,
      change: data.available.delta,
      isPositive: data.available.isPositive,
      icon: BedDouble,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-[#10B981]/20"
    },
    {
      title: "Reserved Rooms",
      value: data.reserved.value,
      change: data.reserved.delta,
      isPositive: data.reserved.isPositive,
      icon: Bookmark,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-lg shadow-[#3B82F6]/20"
    }
  ] : [
    { title: "Today's Check-ins", value: '—', change: '0', isPositive: true, icon: LogIn, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#0066FF] to-[#0052CC] shadow-lg shadow-[#0066FF]/20" },
    { title: "Today's Check-outs", value: '—', change: '0', isPositive: true, icon: LogOut, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#8A2BE2] to-[#6A1B9A] shadow-lg shadow-[#8A2BE2]/20" },
    { title: "Occupancy Rate", value: '—', change: '0%', isPositive: true, icon: PieChart, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#00C4B5] to-[#009688] shadow-lg shadow-[#00C4B5]/20" },
    { title: "Total Revenue", value: '—', change: '0', isPositive: true, icon: RsIcon, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#F5A623] to-[#D48806] shadow-lg shadow-[#F5A623]/20" },
    { title: "Available Rooms", value: '—', change: '0', isPositive: true, icon: BedDouble, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-[#10B981]/20" },
    { title: "Reserved Rooms", value: '—', change: '0', isPositive: true, icon: Bookmark, iconColor: "text-white", iconBg: "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-lg shadow-[#3B82F6]/20" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex flex-col justify-between hover:border-theme-border transition-colors">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.iconBg} ${stat.iconColor}`}>
            <stat.icon size={24} />
          </div>
          <div>
            <h3 className="text-2xl xl:text-3xl font-bold text-theme-text mb-1">{stat.value}</h3>
            <p className="text-theme-muted text-xs xl:text-sm font-medium mb-3">{stat.title}</p>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`flex items-center font-medium ${stat.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {stat.isPositive ? <ArrowUp size={12} className="mr-0.5" /> : <ArrowDown size={12} className="mr-0.5" />}
                {stat.change}
              </span>
              <span className="text-theme-muted-light">vs yesterday</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

