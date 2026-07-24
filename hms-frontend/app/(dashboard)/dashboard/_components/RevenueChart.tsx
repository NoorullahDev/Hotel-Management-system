'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const fetchRevenue = async () => {
  return await api.get<any>('/api/reports/revenue');
};

export default function RevenueChart() {
  const { data } = useQuery({
    queryKey: ['revenueReport'],
    queryFn: fetchRevenue
  });

  const { data: summaryData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => await api.get<any>('/api/dashboard/summary')
  });

  const latestRevenue = data && data.length > 0 ? data[data.length - 1].revenue : 0;
  const delta = summaryData ? summaryData.revenue.delta : '0%';
  const isPositive = summaryData ? summaryData.revenue.isPositive : true;
  const currencySymbol = summaryData ? summaryData.revenue.value.split(' ')[0] : 'Rs.';

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-theme-text">Revenue Trend</h2>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-main border border-theme-border rounded-lg text-sm text-theme-muted-light hover:bg-theme-hover transition-colors">
          This Week <ChevronDown size={14} />
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-theme-text">{currencySymbol} {latestRevenue.toLocaleString()}</span>
          <span className={`flex items-center text-sm font-medium mb-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUp size={14} className="mr-0.5" /> : <ArrowDown size={14} className="mr-0.5" />} {delta} 
            <span className="text-theme-muted-light ml-1">vs yesterday</span>
          </span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${currencySymbol}${value/1000}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--theme-card))', borderColor: 'hsl(var(--theme-border))', borderRadius: '8px', color: 'hsl(var(--theme-text))' }}
              itemStyle={{ color: 'hsl(var(--theme-text))' }}
              formatter={(value: any) => [`${currencySymbol} ${Number(value).toLocaleString()}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
