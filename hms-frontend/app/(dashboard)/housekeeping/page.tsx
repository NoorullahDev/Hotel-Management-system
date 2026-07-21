import React from 'react';
import HousekeepingBoard from './_components/HousekeepingBoard';

export const metadata = {
  title: 'Housekeeping - HotelPrime',
  description: 'Manage room cleaning tasks and staff assignments'
};

export default function HousekeepingPage() {
  return (
    <div className="min-h-screen bg-theme-main">
      <div className="max-w-[1600px] mx-auto p-8">
        <HousekeepingBoard />
      </div>
    </div>
  );
}
