'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, DollarSign, Clock, AlertCircle, FileText, CheckCircle2, ChevronDown, Download, Printer, Banknote, CreditCard, Landmark, Wallet, User, Crown } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { api } from '@/lib/api';


export default function BillingPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [folioData, setFolioData] = useState<any>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const { currencySymbol, currency, taxRate, hotelName, hotelAddress } = useGlobalSettings();
  
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  
  const [revenueView, setRevenueView] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  
  const [kpiData, setKpiData] = useState({
    totalRevenue: 0,
    dailyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    pendingPayments: 0,
    totalInvoices: 0,
    paidBills: 0
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (startDate) params.set('startDate', startDate);
      if (endDate)   params.set('endDate', endDate);

      const json = await api.get<{ data: any[], stats: any }>(`/api/bookings?${params}`);
      
      const data = json.data || [];
      const stats = json.stats || {};

      setKpiData({
         totalRevenue: stats.totalRevenue || 0,
         dailyRevenue: stats.dailyRevenue || 0,
         monthlyRevenue: stats.monthlyRevenue || 0,
         yearlyRevenue: stats.yearlyRevenue || 0,
         pendingPayments: stats.pendingPayments || 0,
         totalInvoices: stats.totalInvoices || 0,
         paidBills: stats.paidBills || 0
      });

      // Show ALL bookings for full historical access (CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED)
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (selectedBookingId) {
      handleGenerateInvoice(selectedBookingId);
    } else {
      setFolioData(null);
    }
  }, [selectedBookingId]);

  const handleGenerateInvoice = async (bookingId: string) => {
    setLoadingFolio(true);
    try {
      const data = await api.get<any>(`/api/bookings/${bookingId}/folio`);
      setFolioData(data);
      setSelectedBookingId(bookingId);
      if (data.balanceDue > 0) {
        setPaymentAmount(data.balanceDue.toString());
      } else {
        setPaymentAmount('');
      }
    } catch (error) {
      console.error('Error generating folio', error);
    } finally {
      setLoadingFolio(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentAmount || !folioData) return;
    try {
      await api.post('/api/payments', {
        bookingId: folioData.bookingId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod
      });
      
      // Refresh folio
      const newData = await api.get<any>(`/api/bookings/${folioData.bookingId}/folio`);
      setFolioData(newData);
      setPaymentAmount('');
      fetchBookings(); // refresh main list
    } catch (error: any) {
      console.error('Error processing payment', error);
      alert(error.message || 'Network error processing payment');
    }
  };

  const handleCheckoutAndGenerateInvoice = async () => {
    if (!folioData) return;
    try {
      await api.post(`/api/bookings/${folioData.bookingId}/checkout`, {
        discount: discountAmount ? parseFloat(discountAmount) : 0
      });
      fetchBookings();
      setSelectedBookingId(null);
      setFolioData(null);
      setDiscountAmount('');
    } catch (error) {
      console.error('Error on checkout/invoice generation', error);
    }
  };

  const downloadPdf = () => {
    if (!folioData || !selectedBookingId) return;
    const token = localStorage.getItem('accessToken');
    window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}/api/invoices/${selectedBookingId}/pdf?token=${token}&t=${Date.now()}`, '_blank');
  };

  const filtered = useMemo(() => bookings.filter(b => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.guest.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q) && !b.room.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'All') {
      const currentStatus = b.status === 'CHECKED_OUT' ? 'Paid' : 'Pending';
      if (currentStatus !== statusFilter) return false;
    }
    return true;
  }), [bookings, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col gap-6 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text mb-1">Billing & Payment</h1>
          <p className="text-theme-muted text-sm">Dashboard &gt; Billing &amp; Payment</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={16} />
            <input 
              type="text" 
              placeholder="Search by invoice, guest, room number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-theme-card shadow-soft border border-theme-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-theme-muted text-xs">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="bg-theme-card border border-theme-border rounded-xl py-2 px-3 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { title: 'Daily Revenue', value: `${currencySymbol} ${(kpiData.dailyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: 'Today', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { title: 'Monthly Revenue', value: `${currencySymbol} ${(kpiData.monthlyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: 'This Month', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { title: 'Yearly Revenue', value: `${currencySymbol} ${(kpiData.yearlyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: 'This Year', icon: Landmark, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { title: 'Pending Payments', value: `${currencySymbol} ${(kpiData.pendingPayments || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: 'In-House Guests', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { title: 'Paid Bills', value: `${currencySymbol} ${(kpiData.paidBills || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: 'Lifetime Total', icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        ].map((kpi, i) => (
          <div key={i} className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <span className="text-sm font-medium text-theme-muted-light">{kpi.title}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-theme-text">{kpi.value}</span>
              <span className={`text-[10px] ${kpi.sub.includes('+') ? 'text-green-400' : 'text-theme-muted-light'}`}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 flex-1">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          
          {/* Invoice List */}
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex-1 flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-theme-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-theme-text">Invoice List</h2>
              <div className="flex items-center gap-2 relative">
                <button 
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="flex items-center gap-2 text-xs text-theme-muted hover:text-theme-text px-3 py-1.5 border border-theme-border rounded-lg transition-colors"
                >
                  {statusFilter === 'All' ? 'All Status' : statusFilter} <ChevronDown size={14} />
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-theme-secondary border border-theme-border rounded-xl shadow-xl z-50 py-1 flex flex-col overflow-hidden">
                    {['All', 'Paid', 'Pending'].map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`px-3 py-1.5 text-xs text-left transition-colors ${statusFilter === s ? 'bg-blue-600/20 text-blue-400' : 'text-theme-muted-light hover:bg-theme-hover hover:text-white'}`}
                      >
                        {s === 'All' ? 'All Status' : s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-theme-secondary/50 border-b border-theme-border">
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Invoice Number</th>
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Name</th>
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Guest Name</th>
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Module</th>
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Room Number</th>
                    <th className="p-3 text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-theme-muted">Loading invoices...</td></tr>
                  ) : filtered.map((b) => {
                    const isForeign = b.bookingType === 'FOREIGN' || b.guestType === 'FOREIGN';
                    return (
                    <tr 
                      key={b.id} 
                      className={`cursor-pointer transition-colors ${selectedBookingId === b.rawId ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-theme-hover/50'}`}
                      onClick={() => setSelectedBookingId(b.rawId)}
                    >
                      <td className="p-3 text-xs font-medium text-blue-400">INV-{b.id}</td>
                      <td className="p-3 text-xs font-semibold text-theme-text">
                        {!isForeign ? b.guest : <span className="text-theme-muted-light font-normal">—</span>}
                      </td>
                      <td className="p-3 text-xs font-semibold text-theme-text">
                        {isForeign ? b.guest : <span className="text-theme-muted-light font-normal">—</span>}
                      </td>
                      <td className="p-3 text-xs text-theme-muted-light">
                        <div className="flex items-center gap-2">
                          {isForeign ? (
                            <><Crown size={14} className="text-amber-500" /> Foreign Guest</>
                          ) : (
                            <><User size={14} className="text-blue-400" /> Booking</>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-theme-muted-light">{b.room}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          b.status === 'CHECKED_OUT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {b.status === 'CHECKED_OUT' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Revenue Overview (Mocked per design) */}
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-4 h-64 shrink-0 flex flex-col justify-between">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-sm font-bold text-theme-text">Revenue Overview</h2>
               <div className="flex bg-theme-main rounded-lg p-1">
                 <button onClick={() => setRevenueView('Daily')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${revenueView === 'Daily' ? 'bg-blue-600 text-white' : 'text-theme-muted hover:text-theme-text'}`}>Daily</button>
                 <button onClick={() => setRevenueView('Weekly')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${revenueView === 'Weekly' ? 'bg-blue-600 text-white' : 'text-theme-muted hover:text-theme-text'}`}>Weekly</button>
                 <button onClick={() => setRevenueView('Monthly')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${revenueView === 'Monthly' ? 'bg-blue-600 text-white' : 'text-theme-muted hover:text-theme-text'}`}>Monthly</button>
               </div>
             </div>
             
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* Simplified Line Chart Mock based on view */}
                <div className="flex flex-col border-r border-theme-border pr-4 justify-center">
                  <span className="text-xs text-theme-muted">{revenueView} Revenue</span>
                  <span className="text-2xl font-bold text-theme-text mb-2">
                     {currencySymbol} {
                       revenueView === 'Daily' 
                         ? (kpiData.dailyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})
                         : revenueView === 'Weekly'
                         ? (kpiData.monthlyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})
                         : (kpiData.yearlyRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})
                     }
                  </span>
                  <p className="text-xs text-theme-muted-light mt-2">Check the Reports & Analytics tab for detailed breakdowns.</p>
                </div>

                {/* Simplified Yearly Bar Chart Mock */}
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-theme-muted">Lifetime Revenue</span>
                  <span className="text-2xl font-bold text-theme-text mb-2">{currencySymbol} {(kpiData.totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  <p className="text-xs text-theme-muted-light mt-2">Total revenue collected from all past bookings.</p>
                </div>
              </div>
          </div>

        </div>

        {/* Right Column - Folio Details */}
        <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex flex-col">
          {loadingFolio ? (
             <div className="flex-1 flex items-center justify-center text-theme-muted">Loading details...</div>
          ) : !folioData ? (
             <div className="flex-1 flex items-center justify-center text-theme-muted-light text-sm">Select an invoice from the list to view details</div>
          ) : (
            <div className="flex flex-col h-full">
              
              {/* Hotel Branding */}
              <div className="p-5 text-center border-b border-theme-border bg-theme-main/50">
                <h2 className="text-base font-bold text-theme-text uppercase tracking-wider">{hotelName}</h2>
                {hotelAddress && <p className="text-xs text-theme-muted mt-0.5">{hotelAddress}</p>}
              </div>

              {/* Top Details */}
              <div className="p-5 border-b border-theme-border">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-blue-400">INV-{folioData.bookingId.substring(0, 8).toUpperCase()}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    folioData.balanceDue <= 0 ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    {folioData.balanceDue <= 0 ? 'Paid' : 'Partial / Pending'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-theme-muted-light block mb-1">Guest Name</span>
                    <span className="font-semibold text-theme-text">{folioData.guestName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-theme-muted-light block mb-1">Room Number</span>
                    <span className="font-semibold text-theme-text">{folioData.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-theme-muted-light block mb-1">Check-in</span>
                    <span className="font-semibold text-theme-text">{new Date(folioData.checkIn).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-theme-muted-light block mb-1">Check-out</span>
                    <span className="font-semibold text-theme-text">{new Date(folioData.checkOut).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Bill Table */}
              <div className="p-5 border-b border-theme-border">
                <h3 className="text-sm font-bold text-theme-text mb-3">Itemized Bill</h3>
                <table className="w-full text-left mb-4">
                  <thead>
                    <tr className="border-b border-theme-border">
                      <th className="py-2 text-[10px] text-theme-muted font-medium">Description</th>
                      <th className="py-2 text-[10px] text-theme-muted font-medium text-center">Qty</th>
                      <th className="py-2 text-[10px] text-theme-muted font-medium text-right">Rate</th>
                      <th className="py-2 text-[10px] text-theme-muted font-medium text-right">Amount ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {folioData.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 text-xs text-theme-muted-light">{item.description || ''}</td>
                        <td className="py-2 text-xs text-theme-muted-light text-center">{item.qty || '-'}</td>
                        <td className="py-2 text-xs text-theme-muted-light text-right">{item.rate !== undefined && item.rate !== null ? `${currencySymbol} ${Number(item.rate).toFixed(2)}` : '-'}</td>
                        <td className="py-2 text-xs text-theme-text font-medium text-right">{currencySymbol} {Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-theme-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-theme-muted">Sub Total</span>
                    <span className="text-theme-text font-medium">{currencySymbol} {folioData.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-theme-muted">Taxes ({folioData.taxPct ?? taxRate}%)</span>
                    <span className="text-theme-text font-medium">{currencySymbol} {folioData.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-theme-muted">Discount</span>
                    <div className="flex items-center gap-2">
                      {folioData.hasInvoice ? (
                         <span className="text-green-400 font-medium">-{currencySymbol} {folioData.discount.toFixed(2)}</span>
                      ) : (
                         <input 
                           type="number"
                           placeholder="0.00"
                           value={discountAmount}
                           onChange={(e) => {
                             setDiscountAmount(e.target.value);
                             handleGenerateInvoice(selectedBookingId as string);
                           }}
                           className="w-20 bg-theme-main border border-theme-border rounded px-2 py-0.5 text-right text-green-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                         />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-theme-border">
                    <span className="text-theme-text font-bold">Total Amount</span>
                    <span className="text-theme-text font-bold">{currencySymbol} {folioData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-theme-border/50 bg-theme-secondary/30 p-3 rounded-xl">
                  <div className="flex justify-between text-xs">
                    <span className="text-theme-muted">Paid Amount</span>
                    <span className="text-green-400 font-medium">{currencySymbol} {folioData.paidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Ready for Checkout state */}
              {folioData.balanceDue <= 0 && folioData.status !== 'CHECKED_OUT' && (
                <div className="p-5 flex flex-col items-center justify-center gap-3 bg-green-500/5 m-4 rounded-xl border border-green-500/20">
                   <div className="flex items-center gap-2 text-green-400 font-bold">
                     <CheckCircle2 size={20} />
                     <span>Fully Paid & Ready</span>
                   </div>
                   {folioData.balanceDue < 0 && (
                     <p className="text-xs text-theme-muted text-center mb-1">
                       A refund of {currencySymbol} {Math.abs(folioData.balanceDue).toFixed(2)} will be automatically recorded to balance the folio to 0.00 upon checkout.
                     </p>
                   )}
                   <button 
                     onClick={handleCheckoutAndGenerateInvoice}
                     className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20"
                   >
                     Complete Check-Out
                   </button>
                </div>
              )}

              {/* Payment Processing */}
              {folioData.balanceDue > 0 && (
                <div className="p-5">
                  <h3 className="text-sm font-bold text-theme-text mb-3">Payment Methods</h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { id: 'Cash', icon: Banknote },
                      { id: 'Card', icon: CreditCard },
                      { id: 'Bank', icon: Landmark },
                      { id: 'Wallet', icon: Wallet },
                    ].map(pm => (
                      <button 
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                          paymentMethod === pm.id 
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                            : 'bg-theme-main border-theme-border text-theme-muted hover:border-theme-strong'
                        }`}
                      >
                        <pm.icon size={18} />
                        <span className="text-[10px] font-medium">{pm.id}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light text-xs font-bold">{currencySymbol}</span>
                       <input 
                         type="number" 
                         value={paymentAmount}
                         onChange={(e) => setPaymentAmount(e.target.value)}
                         className="w-full bg-theme-main border border-theme-border rounded-xl py-3 pl-10 pr-4 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
                         placeholder="Enter amount"
                       />
                    </div>
                    <button 
                      onClick={handleProcessPayment}
                      className="px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-theme-text font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap"
                    >
                      Receive Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-5 border-t border-theme-border mt-auto">
                 <h3 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3">Quick Actions</h3>
                 
                 {/* Transaction Buttons */}
                 <div className="flex gap-2 mb-2">
                   <button 
                     onClick={handleProcessPayment}
                     className="flex-1 py-2 bg-[#22c55e]/10 border border-[#22c55e]/30 hover:bg-[#22c55e]/20 text-[#22c55e] text-[11px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                   >
                     Receive Payment
                   </button>
                   <button 
                     className="flex-1 py-2 bg-[#eab308]/10 border border-[#eab308]/30 hover:bg-[#eab308]/20 text-[#eab308] text-[11px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                   >
                     Partial Payment
                   </button>
                   <button 
                     className="flex-1 py-2 bg-[#ef4444]/10 border border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444] text-[11px] font-semibold rounded-lg flex items-center justify-center transition-colors"
                   >
                     Refund
                   </button>
                 </div>

                 {/* Document Buttons */}
                 <div className="flex gap-2">
                   <button 
                     onClick={downloadPdf}
                     className="flex-1 py-2 bg-theme-hover hover:bg-theme-hover text-theme-text text-[11px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                   >
                     <Printer size={14} /> Print Invoice
                   </button>
                   <button 
                     onClick={downloadPdf}
                     className="flex-1 py-2 bg-theme-hover hover:bg-theme-hover text-theme-text text-[11px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                   >
                     <Download size={14} /> Export PDF
                   </button>
                 </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
