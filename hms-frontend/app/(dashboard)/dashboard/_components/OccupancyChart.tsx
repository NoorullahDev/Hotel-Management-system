'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const fetchOccupancy = async () => {
  return await api.get<any>('/api/reports/occupancy');
};

export default function OccupancyChart() {
  const { data } = useQuery({
    queryKey: ['occupancyReport'],
    queryFn: fetchOccupancy
  });

  const chartData = data?.donut;
  const occupiedData = chartData?.find((d: any) => d.name === 'Occupied');
  const occupancyPercentage = occupiedData ? occupiedData.percentage : '0.0%';
  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-theme-text">Occupancy Rate</h2>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-main border border-theme-border rounded-lg text-sm text-theme-muted-light hover:bg-theme-hover transition-colors">
          This Month <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
        
        {/* Donut Chart */}
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData || []}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--theme-card))', borderColor: 'hsl(var(--theme-border))', borderRadius: '8px', color: 'hsl(var(--theme-text))' }}
                itemStyle={{ color: 'hsl(var(--theme-text))' }}
                formatter={(value: any) => [`${value} Rooms`, 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-theme-text">{occupancyPercentage}</span>
            <span className="text-xs text-theme-muted">Occupancy</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4">
          {chartData?.map((item: any, index: number) => (
            <div key={index} className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-theme-text">{item.name}</span>
                  <span className="text-xs text-theme-muted-light">({item.value} Rooms)</span>
                </div>
              </div>
              <span className="text-sm font-bold text-theme-muted-light">{item.percentage}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
