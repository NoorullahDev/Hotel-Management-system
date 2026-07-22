'use client';

import React, { useEffect, useState } from 'react';
import StatCards from './_components/StatCards';
import ActionButtons from './_components/ActionButtons';
import RecentBookings from './_components/RecentBookings';
import RoomStatusGrid from './_components/RoomStatusGrid';
import RevenueChart from './_components/RevenueChart';
import OccupancyChart from './_components/OccupancyChart';
import NotificationsFeed from './_components/NotificationsFeed';

export default function DashboardPage() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('hms_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.name) setUserName(user.name);
      } catch (e) {}
    }
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text mb-1">Dashboard</h1>
        <p className="text-theme-muted text-sm">{userName ? `Welcome back, ${userName}! ` : 'Welcome! '}Here's what's happening today.</p>
      </div>

      {/* Stats Row */}
      <StatCards />

      {/* Action Bar */}
      <ActionButtons />

      {/* Middle Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentBookings />
        </div>
        <div className="xl:col-span-1">
          <RoomStatusGrid />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RevenueChart />
        </div>
        <div className="lg:col-span-1">
          <OccupancyChart />
        </div>
        <div className="lg:col-span-1">
          <NotificationsFeed />
        </div>
      </div>
    </div>
  );
}
