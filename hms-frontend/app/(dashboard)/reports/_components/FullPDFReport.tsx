"use client";

import React from "react";
import {
  Calendar,
  User,
  Building,
  Clock,
  LayoutTemplate,
  FileText,
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Clock3,
  Star,
  Bed,
  Ban,
  MapPin,
  Phone,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface FullPDFReportProps {
  hotelName: string;
  hotelAddress: string;
  contactNumber: string;
  email: string;
  dateRange: string;
  department: string;
  roomType: string;
  generatedBy: string;
  generatedOn: string;
  reportType: string;
  summary: {
    totalRevenue: string;
    occupancyRate: number;
    totalBookings: number;
    avgLOS: string;
    guestSatisfaction: number;
    revenueDelta?: number;
    occupancyDelta?: number;
    bookingsDelta?: number;
    losDelta?: number;
    satisfactionDelta?: number;
  };
  revenueTrendData: any[];
  occupancyData: any[]; // e.g. { name: "Available", pct: 85.7, color: "#22c55e" }
  bookingsOverviewData: any[];
  recentBookings: any[];
  revenueSummary: { name: string; amount: string; color?: string }[];
  totalRevenueStr: string;
  roomStatus: {
    available: number;
    occupied: number;
    reserved: number;
    outOfOrder: number;
    total: number;
  };
  revenueSources: { name: string; percentage: string; value: number; color: string }[];
  pageNumber?: number;
  totalPages?: number;
}

export default function FullPDFReport({
  hotelName,
  hotelAddress,
  contactNumber,
  email,
  dateRange,
  department,
  roomType,
  generatedBy,
  generatedOn,
  reportType,
  summary,
  revenueTrendData,
  occupancyData,
  bookingsOverviewData,
  recentBookings,
  revenueSummary,
  totalRevenueStr,
  roomStatus,
  revenueSources,
  pageNumber = 1,
  totalPages = 2,
}: FullPDFReportProps) {
  const OCC_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#64748b"];

  const [clientDate, setClientDate] = React.useState(generatedOn);
  React.useEffect(() => {
    if (!generatedOn) {
      setClientDate(new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }));
    }
  }, [generatedOn]);

  const getStatusBadge = (status: string) => {
    let bg = "bg-slate-100", text = "text-slate-600";
    if (status.toLowerCase().includes("checked in")) {
      bg = "bg-emerald-50"; text = "text-emerald-500";
    } else if (status.toLowerCase().includes("reserved")) {
      bg = "bg-amber-50"; text = "text-amber-500";
    } else if (status.toLowerCase().includes("confirmed")) {
      bg = "bg-blue-50"; text = "text-blue-500";
    }
    return (
      <span className={"px-2 py-1 rounded text-[10px] font-bold " + bg + " " + text}>
        {status}
      </span>
    );
  };

  return (
    <div
      id="pdf-full-report"
      className="bg-white text-slate-900 absolute top-0 flex flex-col font-sans"
      style={{ width: "1000px", height: "1350px", padding: "40px", boxSizing: "border-box", left: "-9999px", zIndex: -100 }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {/* Logo Swirl */}
          <div className="w-12 h-12 relative flex items-center justify-center">
             <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-500" fill="currentColor">
               <path d="M50,10 A40,40 0 1,1 10,50 A40,40 0 0,1 50,10" fill="none" stroke="url(#grad1)" strokeWidth="12" strokeLinecap="round" strokeDasharray="60 30" />
               <defs>
                 <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" style={{stopColor:"#3b82f6", stopOpacity:1}} />
                   <stop offset="50%" style={{stopColor:"#8b5cf6", stopOpacity:1}} />
                   <stop offset="100%" style={{stopColor:"#ef4444", stopOpacity:1}} />
                 </linearGradient>
               </defs>
             </svg>
          </div>
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-slate-900 uppercase">
              {hotelName}
            </h1>
            <p className="text-[12px] font-bold tracking-wider text-blue-600 uppercase">
              Hotel Management
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-[22px] font-black tracking-tight text-slate-900 uppercase">
            Reports & Analytics
          </h2>
          <p className="text-[12px] font-semibold tracking-wider text-blue-600">
            Performance Summary Report
          </p>
        </div>
      </div>

      <div className="h-[1px] bg-slate-200 w-full mb-6"></div>

      {/* ── METADATA ── */}
      <div className="flex justify-between mb-8">
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex items-start gap-3">
            <Calendar className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Date Range</p>
              <p className="text-[12px] font-semibold text-slate-800">{dateRange}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Department</p>
              <p className="text-[12px] font-semibold text-slate-800">{department}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LayoutTemplate className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Room Type</p>
              <p className="text-[12px] font-semibold text-slate-800">{roomType}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1 items-start ml-20">
          <div className="flex items-start gap-3">
            <User className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Report Generated By</p>
              <p className="text-[12px] font-semibold text-slate-800">{generatedBy}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Generated On</p>
              <p className="text-[12px] font-semibold text-slate-800">{clientDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="w-[18px] h-[18px] text-slate-500 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Report Type</p>
              <p className="text-[12px] font-semibold text-slate-800">{reportType}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY METRICS ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-4 bg-blue-600 rounded-sm"></div>
          <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Summary Metrics</h3>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center h-[120px]">
            <div className="flex items-center gap-2 mb-2 w-full justify-center">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <DollarSign size={12} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Revenue</span>
            </div>
            <div className="text-[20px] font-black text-slate-900 mb-1">{summary.totalRevenue}</div>
            <div className="text-[10px] font-bold text-blue-500">Total Earnings</div>
          </div>
          <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center h-[120px]">
            <div className="flex items-center gap-2 mb-2 w-full justify-center">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <TrendingUp size={12} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Occupancy Rate</span>
            </div>
            <div className="text-[20px] font-black text-slate-900 mb-1">{summary.occupancyRate}%</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 justify-center">
              <ArrowUpRight size={12} strokeWidth={3} /> {summary.occupancyDelta || 0}% vs last week
            </div>
          </div>
          <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center h-[120px]">
            <div className="flex items-center gap-2 mb-2 w-full justify-center">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                <CalendarCheck size={12} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Bookings</span>
            </div>
            <div className="text-[20px] font-black text-slate-900 mb-1">{summary.totalBookings}</div>
            <div className="text-[10px] font-bold text-blue-500">New Bookings</div>
          </div>
          <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center h-[120px]">
            <div className="flex items-center gap-2 mb-2 w-full justify-center">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Clock3 size={12} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Avg Length of Stay</span>
            </div>
            <div className="text-[20px] font-black text-slate-900 mb-1">{summary.avgLOS} Nights</div>
            <div className="text-[10px] font-bold text-blue-500">Average Stay</div>
          </div>
          <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center h-[120px]">
            <div className="flex items-center gap-2 mb-2 w-full justify-center">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center shrink-0">
                <Star size={12} strokeWidth={3} fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Guest Satisfaction</span>
            </div>
            <div className="text-[20px] font-black text-slate-900 mb-1">{summary.guestSatisfaction} / 5</div>
            <div className="text-[10px] font-bold text-slate-500">Average Rating</div>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="flex gap-4 h-[220px] mb-6">
        {/* Revenue Trend */}
        <div className="flex-[1.5] border border-slate-200 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Revenue Trend</h3>
            <span className="text-[10px] font-medium text-slate-500 border border-slate-200 rounded px-2 py-0.5">Daily</span>
          </div>
          <div className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(val) => `Rs. ${val/1000}K`} width={50} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col relative overflow-hidden">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Occupancy Rate</h3>
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="w-[120px] h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={occupancyData} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                    {occupancyData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color || OCC_COLORS[index % OCC_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[16px] font-black text-slate-900">{summary.occupancyRate}%</span>
                <span className="text-[9px] font-bold text-slate-500">Occupancy</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {occupancyData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || OCC_COLORS[i % OCC_COLORS.length] }}></div>
                  <span className="text-[10px] text-slate-600 font-bold w-[60px] truncate">{entry.name}</span>
                  <span className="text-[10px] font-black text-slate-900">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings Overview */}
        <div className="flex-1 border border-slate-200 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Bookings Overview</h3>
            <span className="text-[10px] font-medium text-slate-500 border border-slate-200 rounded px-2 py-0.5">Daily</span>
          </div>
          <div className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsOverviewData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} allowDecimals={false} width={30} />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── TABLES ROW ── */}
      <div className="flex gap-4 mb-6">
        {/* Recent Bookings */}
        <div className="flex-[2] flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3">Recent Bookings</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-800">Guest Name</th>
                  <th className="px-4 py-3 font-bold text-slate-800">Room</th>
                  <th className="px-4 py-3 font-bold text-slate-800">Check-in</th>
                  <th className="px-4 py-3 font-bold text-slate-800">Check-out</th>
                  <th className="px-4 py-3 font-bold text-slate-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{b.room}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{b.checkIn}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{b.checkOut}</td>
                    <td className="px-4 py-3">{getStatusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="flex-[1.2] flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3">Revenue Summary</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-800 text-left">Item</th>
                  <th className="px-4 py-3 font-bold text-slate-800 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {revenueSummary.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{item.name}</td>
                    <td className="px-4 py-3.5 text-slate-800 font-bold text-right">{item.amount}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50/50">
                  <td className="px-4 py-3.5 text-blue-600 font-bold text-left">Total Revenue</td>
                  <td className="px-4 py-3.5 text-blue-600 font-bold text-right">{totalRevenueStr}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="flex gap-4 mb-[80px]">
        {/* Room Status Overview */}
        <div className="flex-[2] flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3">Room Status Overview</h3>
          <div className="flex gap-4 flex-1">
            <div className="flex-1 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bed size={16} className="text-emerald-500 shrink-0" />
                <span className="text-[16px] font-black text-slate-900">{roomStatus.available}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase">Available</span>
            </div>
            <div className="flex-1 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-500 shrink-0" />
                <span className="text-[16px] font-black text-slate-900">{roomStatus.occupied}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase">Occupied</span>
            </div>
            <div className="flex-1 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck size={16} className="text-purple-500 shrink-0" />
                <span className="text-[16px] font-black text-slate-900">{roomStatus.reserved}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase">Reserved</span>
            </div>
            <div className="flex-1 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-slate-500 shrink-0" />
                <span className="text-[16px] font-black text-slate-900">{roomStatus.outOfOrder}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Out of Order</span>
            </div>
          </div>
          <div className="text-center mt-3 text-[10px] font-bold text-slate-600">
            Total Rooms: {roomStatus.total}
          </div>
        </div>

        {/* Top Revenue Sources */}
        <div className="flex-[1.2] flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-3">Top Revenue Sources</h3>
          <div className="flex-1 border border-slate-200 rounded-xl p-3 flex items-center h-[90px]">
            <div className="w-[80px] h-[80px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueSources} innerRadius={22} outerRadius={32} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                    {revenueSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 ml-4 flex-1">
              {revenueSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: src.color }}></div>
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">{src.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900">{src.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-slate-200 w-full mt-auto mb-6"></div>

      {/* ── FOOTER ── */}
      <div className="flex justify-between items-end pb-4">
        <div className="flex items-start gap-3">
          <MapPin size={14} className="text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-800">{hotelName}</span>
            <span className="text-[10px] font-medium text-slate-500 max-w-[200px]">{hotelAddress}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-center">
          {contactNumber && (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-slate-500" />
              <span className="text-[10px] font-medium text-slate-600">{contactNumber}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-slate-500" />
              <span className="text-[10px] font-medium text-slate-600">{email}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <div className="w-32 h-10 flex items-center justify-center relative mb-1">
            {/* Signature imitation */}
             <svg width="100%" height="100%" viewBox="0 0 100 40" fill="none">
                <path d="M10,30 Q30,10 50,30 T90,20" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
                <path d="M20,10 L30,30" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M60,15 L70,35" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
             </svg>
          </div>
          <div className="w-32 h-[1px] bg-slate-300 mb-2"></div>
          <span className="text-[10px] font-bold text-slate-600">Authorised Signature</span>
        </div>
      </div>

      {/* ── BOTTOM BLUE BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-slate-900 flex justify-between items-center px-10">
        <span className="text-[9px] font-bold text-white tracking-wide">
          Software developed by <span className="font-black text-blue-400">EagleNest Creation</span>
        </span>
        <span className="text-[9px] font-bold text-white tracking-wide">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}
