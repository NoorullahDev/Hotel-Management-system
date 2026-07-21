'use client';

import React, { useState } from 'react';
import { Plus, LogIn, LogOut, FileText } from 'lucide-react';
import Link from 'next/link';
import NewBookingWizard from '@/components/wizard/NewBookingWizard';

export default function ActionButtons() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <button 
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          <Plus size={18} />
          New Booking
        </button>
      
      <Link 
        href="/checkin" 
        className="flex items-center gap-2 px-5 py-2.5 bg-[#0e2a1d] hover:bg-[#133b28] text-green-400 font-medium rounded-xl border border-green-900/50 transition-colors"
      >
        <LogIn size={18} />
        Check-In
      </Link>

      <Link 
        href="/checkout" 
        className="flex items-center gap-2 px-5 py-2.5 bg-[#251532] hover:bg-[#341d46] text-purple-400 font-medium rounded-xl border border-purple-900/50 transition-colors"
      >
        <LogOut size={18} />
        Check-Out
      </Link>

        <Link 
          href="/billing"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#332612] hover:bg-[#453318] text-yellow-500 font-medium rounded-xl border border-yellow-900/50 transition-colors"
        >
          <FileText size={18} />
          Billing
        </Link>
      </div>
      
      {isWizardOpen && (
        <NewBookingWizard onClose={() => setIsWizardOpen(false)} />
      )}
    </>
  );
}
