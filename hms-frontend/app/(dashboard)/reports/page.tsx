"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Clock,
  Star,
  Download,
  Printer,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { api } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API = "/api/reports";

async function fetchJSON(url: string) {
  return api.get<any>(url);
}

// Currency formatters
function formatCurrency(n: number, sym: string) {
  return (
    sym +
    " " +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function formatShort(n: number, sym: string) {
  if (n >= 1000000) return sym + " " + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return sym + " " + (n / 1000).toFixed(0) + "K";
  return sym + " " + n.toFixed(0);
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}
function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: toISO(start), end: toISO(end) };
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const ChartTooltip = ({
  active,
  payload,
  label,
  currencySymbol = "Rs.",
}: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-xl p-3 shadow-xl text-xs z-50">
      <p className="text-theme-muted mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}:{" "}
          <span className="font-bold text-theme-text">
            {p.name?.toLowerCase().includes("revenue") ||
            p.name?.toLowerCase().includes("sales") ||
            p.name?.toLowerCase().includes("order")
              ? formatCurrency(p.value, currencySymbol)
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Summary Card ──────────────────────────────────────────────────────────
function SummaryCard({
  title,
  value,
  delta,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  value: string | number;
  delta: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  const isSpecial = delta === "New" || delta === "—";
  const numDelta = typeof delta === "number" ? delta : 0;
  const positive = isSpecial || numDelta >= 0;
  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex flex-col gap-3 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-theme-muted font-medium uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}
        >
          <Icon size={17} className={color} />
        </div>
      </div>
      <span className="text-3xl font-extrabold text-theme-text">{value}</span>
      <div
        className={`flex items-center gap-1 text-xs font-semibold ${isSpecial ? "text-theme-muted" : positive ? "text-emerald-500" : "text-rose-500"}`}
      >
        {!isSpecial &&
          (positive ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          ))}
        {isSpecial ? delta : `${positive ? "+" : ""}${delta}% vs last week`}
      </div>
    </div>
  );
}

// ── Chart Card ─────────────────────────────────────────────────────────────
function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-theme-text">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Period Dropdown ────────────────────────────────────────────────────────
function PeriodSelect({
  value,
  onChange,
  options = ["Daily", "Weekly", "Monthly"],
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <select
      className="bg-theme-main border border-theme-border rounded-lg px-2.5 py-1 text-xs text-theme-muted-light outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

// ── Full Report Modal ──────────────────────────────────────────────────────
function FullReportModal({
  title,
  headers,
  rows,
  totalRow,
  onClose,
}: {
  title: string;
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  totalRow?: (string | number | React.ReactNode)[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-theme-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-theme-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-theme-border bg-theme-main sticky top-0">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-theme-muted font-semibold uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-theme-muted">
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-theme-border/60 hover:bg-theme-hover/30 transition-colors"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {totalRow && (
                <tr className="bg-theme-main border-t-2 border-theme-border font-bold text-theme-text sticky bottom-0">
                  {totalRow.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Inline Data Table ──────────────────────────────────────────────────────
function DataTable({
  title,
  headers,
  rows,
  totalRow,
  onViewFull,
}: {
  title: string;
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  totalRow?: (string | number | React.ReactNode)[];
  onViewFull: () => void;
}) {
  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex flex-col w-full min-w-0" style={{overflow: 'hidden'}}>
      <div className="p-4 border-b border-theme-border flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold text-theme-text">{title}</h3>
        <button
          onClick={onViewFull}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
        >
          View Full Report
        </button>
      </div>
      <div className="overflow-x-auto w-full" style={{WebkitOverflowScrolling: 'touch'}}>
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-theme-border bg-theme-main">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-theme-muted font-semibold uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-theme-muted">
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-theme-border/60 hover:bg-theme-hover/30 transition-colors"
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 max-w-[140px] break-words">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {totalRow && (
              <tr className="bg-theme-main border-t border-theme-border font-bold text-theme-text">
                {totalRow.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2.5 max-w-[140px] break-words">
                    {cell}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DEPT_COLORS = ["#6366f1", "#22c55e", "#a855f7", "#f59e0b"];
const STAFF_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];

// ═══════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const {
    hotelName,
    hotelLogo,
    hotelAddress,
    contactNumber,
    email,
    currencySymbol = "Rs.",
  } = useGlobalSettings();
  const [range, setRange] = useState(defaultRange());
  const [department, setDepartment] = useState("All Departments");
  const [roomType, setRoomType] = useState("All Room Types");
  const [revPeriod, setRevPeriod] = useState("Daily");
  const [bookPeriod, setBookPeriod] = useState("Daily");
  const [restPeriod, setRestPeriod] = useState("Daily");
  const [staffPeriod, setStaffPeriod] = useState("This Week");

  // Full-report modal state
  const [fullModal, setFullModal] = useState<{
    title: string;
    headers: string[];
    rows: any[][];
    totalRow?: any[];
  } | null>(null);

  // Raw data
  const [summary, setSummary] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [occupancy, setOccupancy] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any[]>([]);
  const [staffPerf, setStaffPerf] = useState<any[]>([]);
  const [revByDept, setRevByDept] = useState<any>(null);
  const [satisfaction, setSatisfaction] = useState<any[]>([]);
  const [revTable, setRevTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toggle states for tables
  const [showRevTable, setShowRevTable] = useState(false);
  const [showOccTable, setShowOccTable] = useState(false);

  // PDF Export States
  const [exportingPDF, setExportingPDF] = useState(false);
  const [roomStatusStateForPDF, setRoomStatusStateForPDF] = useState({ available: 0, occupied: 0, reserved: 0, outOfOrder: 0, total: 0 });
  const [recentBookingsStateForPDF, setRecentBookingsStateForPDF] = useState<any[]>([]);

  const qs = `?startDate=${range.start}&endDate=${range.end}`;

  const fetchAll = useCallback(() => {
    fetchJSON(`${API}/summary${qs}`).then(setSummary).catch(console.error);
    fetchJSON(`${API}/revenue${qs}`).then(setRevenue).catch(console.error);
    fetchJSON(`${API}/occupancy${qs}`).then(setOccupancy).catch(console.error);
    fetchJSON(`${API}/bookings-overview${qs}`)
      .then(setBookings)
      .catch(console.error);
    fetchJSON(`${API}/restaurant-revenue${qs}`)
      .then(setRestaurant)
      .catch(console.error);
    fetchJSON(`${API}/staff-performance${qs}`)
      .then(setStaffPerf)
      .catch(console.error);
    fetchJSON(`${API}/revenue-by-department${qs}`)
      .then(setRevByDept)
      .catch(console.error);
    fetchJSON(`${API}/guest-satisfaction`)
      .then(setSatisfaction)
      .catch(console.error);
    fetchJSON(`${API}/revenue-report-table${qs}`)
      .then(setRevTable)
      .catch(console.error);
  }, [qs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Department filter: filter revenue chart data ──────────────────────
  const filteredRevenue = useMemo(
    () =>
      revenue.map((d) => {
        if (department === "Rooms") return { ...d, revenue: d.roomRevenue };
        if (department === "Restaurant")
          return { ...d, revenue: d.restaurantRevenue };
        return d;
      }),
    [revenue, department],
  );

  const filteredRevByDept = useMemo(
    () =>
      revByDept
        ? {
            ...revByDept,
            data:
              department === "All Departments"
                ? revByDept.data
                : revByDept.data?.filter((d: any) => {
                    if (department === "Rooms") return d.name === "Rooms";
                    if (department === "Restaurant")
                      return d.name === "Restaurant";
                    return true;
                  }),
            total:
              department === "All Departments"
                ? revByDept.total
                : revByDept.data?.find(
                    (d: any) =>
                      d.name ===
                      (department === "Rooms" ? "Rooms" : "Restaurant"),
                  )?.value || 0,
          }
        : null,
    [revByDept, department],
  );

  const handleExportCSV = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
      const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:4000";
      const response = await fetch(`${BASE}${API}/export?format=csv&startDate=${range.start}&endDate=${range.end}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to export CSV");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Error exporting CSV");
    }
  };

    const generatePDF = async () => {
    setExportingPDF(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = 20;

      let fetchedBookings = [];
      try {
        const res = await api.get<{ data: any[] }>(`/api/bookings?limit=10000`);
        if (res && res.data) {
          fetchedBookings = res.data;
        }
      } catch (e) {
        console.error("Failed to fetch bookings for PDF", e);
      }

      let roomStatusState = { available: 0, occupied: 0, reserved: 0, outOfOrder: 0, total: 0 };
      try {
        const res = await api.get<any>(`/api/rooms`);
        if (res && res.data) {
          const rooms = res.data;
          roomStatusState.total = rooms.length;
          roomStatusState.available = rooms.filter((r: any) => r.status === "AVAILABLE").length;
          roomStatusState.occupied = rooms.filter((r: any) => r.status === "OCCUPIED").length;
          roomStatusState.reserved = rooms.filter((r: any) => r.status === "RESERVED").length;
          roomStatusState.outOfOrder = rooms.filter((r: any) => r.status === "MAINTENANCE").length;
        }
      } catch (e) {
        console.error("Failed to fetch rooms for PDF", e);
      }

      // Header Section
      // Draw a subtle header band
      doc.setFillColor(41, 128, 185); // Professional blue
      doc.rect(0, 0, pageWidth, 5, "F");

      cursorY = 15;

      if (hotelLogo) {
        try {
          const loadImage = (url: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
              const img = new window.Image();
              img.crossOrigin = "Anonymous";
              img.onload = () => resolve(img);
              img.onerror = (e) => reject(e);
              img.src = url;
            });
          };
          let logoUrl = hotelLogo;
          if (logoUrl.startsWith("/")) {
             logoUrl = window.location.origin + logoUrl;
          }
          const img = await loadImage(logoUrl);
          const maxDim = 30; // Slightly larger for centered logo
          let w = img.width;
          let h = img.height;
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
          const logoX = (pageWidth - w) / 2;
          doc.addImage(img, "PNG", logoX, cursorY, w, h);
          cursorY += h + 6;
        } catch(e) {
          console.error("Failed to load logo", e);
          cursorY += 5;
        }
      } else {
        cursorY += 10;
      }

      // Hotel Name
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      const nameText = hotelName || "Business Report";
      doc.text(nameText, (pageWidth - doc.getTextWidth(nameText)) / 2, cursorY);
      
      // Address & Contact
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 120);
      
      cursorY += 6;
      if (hotelAddress) {
        doc.text(hotelAddress, (pageWidth - doc.getTextWidth(hotelAddress)) / 2, cursorY);
        cursorY += 5;
      }
      
      let contactStr = [];
      if (contactNumber) contactStr.push(`Tel: ${contactNumber}`);
      if (email) contactStr.push(`Email: ${email}`);
      if (contactStr.length > 0) {
        const cStr = contactStr.join("  |  ");
        doc.text(cStr, (pageWidth - doc.getTextWidth(cStr)) / 2, cursorY);
        cursorY += 5;
      }
      
      // Add a dividing line
      cursorY += 5;
      doc.setDrawColor(220, 224, 228);
      doc.setLineWidth(0.5);
      doc.line(14, cursorY, pageWidth - 14, cursorY);
      cursorY += 10;

      // Report Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      const titleText = "Hotel Performance Report";
      doc.text(titleText, (pageWidth - doc.getTextWidth(titleText)) / 2, cursorY);
      cursorY += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 120);
      
      const dateText = `Date Range: ${range.start} to ${range.end}`;
      doc.text(dateText, (pageWidth - doc.getTextWidth(dateText)) / 2, cursorY);
      cursorY += 5;
      
      const deptText = `Department: ${department}  |  Room Type: ${roomType}`;
      doc.text(deptText, (pageWidth - doc.getTextWidth(deptText)) / 2, cursorY);
      cursorY += 5;
      
      const genText = `Generated On: ${new Date().toLocaleString()}`;
      doc.text(genText, (pageWidth - doc.getTextWidth(genText)) / 2, cursorY);
      cursorY += 10;

      // Reset text color for tables
      doc.setTextColor(0, 0, 0);

      const noData = [["No Records Found"]];

      autoTable(doc, {
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", summary ? formatCurrency(summary.totalRevenue, currencySymbol) : formatCurrency(0, currencySymbol)],
          ["Occupancy Rate", `${summary?.occupancyRate || 0}%`],
          ["Total Bookings", summary?.totalBookings || 0],
          ["Average Length of Stay", `${summary?.avgLOS || 0} Nights`],
          ["Guest Satisfaction", `${summary?.guestSatisfaction || 0} / 5`]
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Room Status Report", 14, cursorY);
      cursorY += 5;
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Total Rooms", "Available", "Occupied", "Reserved", "Out of Order"]],
        body: [[
          roomStatusState.total,
          roomStatusState.available,
          roomStatusState.occupied,
          roomStatusState.reserved,
          roomStatusState.outOfOrder
        ]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3, halign: "center" },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      const checkPageBreak = (neededSpace: number) => {
        if (cursorY + neededSpace > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
      };

      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Revenue Summary", 14, cursorY);
      cursorY += 5;
      
      let revBody = revTable?.rows?.map((r: any) => [
        r.date, 
        formatCurrency(r.roomsRevenue, currencySymbol),
        formatCurrency(r.restaurantRevenue, currencySymbol),
        formatCurrency(r.otherRevenue, currencySymbol),
        formatCurrency(r.total, currencySymbol)
      ]) || [];
      
      if (revBody.length > 0 && revTable?.totals) {
        revBody.push([
          "TOTAL",
          formatCurrency(revTable.totals.roomsRevenue, currencySymbol),
          formatCurrency(revTable.totals.restaurantRevenue, currencySymbol),
          formatCurrency(revTable.totals.otherRevenue, currencySymbol),
          formatCurrency(revTable.totals.total, currencySymbol)
        ]);
      }
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Date", "Rooms Rev.", "Restaurant Rev.", "Other Rev.", "Total"]],
        body: revBody.length ? revBody : noData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" },
        willDrawCell: (data: any) => {
          if (data.row.index === revBody.length - 1 && revBody.length > 0 && data.row.raw[0] === "TOTAL") {
             data.cell.styles.fontStyle = "bold";
             data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Booking Report", 14, cursorY);
      cursorY += 5;
      
      let bookingBody = fetchedBookings.map((b: any) => [
         b.guest || 'Unknown',
         b.room || 'N/A',
         new Date(b.checkIn).toLocaleDateString(),
         new Date(b.checkOut).toLocaleDateString(),
         b.status
      ]);
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Guest Name", "Room", "Check-in", "Check-out", "Status"]],
        body: bookingBody.length ? bookingBody : noData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Check-In / Check-Out Report", 14, cursorY);
      cursorY += 5;
      
      let inOutBody = fetchedBookings
        .filter((b) => b.status === "CHECKED_IN" || b.status === "CHECKED_OUT" || b.status === "CONFIRMED")
        .map((b: any) => [
         b.guest || 'Unknown',
         b.room || 'N/A',
         b.status === "CHECKED_OUT" ? "Check-Out" : (b.status === "CHECKED_IN" ? "Checked-In" : "Expected"),
         new Date(b.checkIn).toLocaleDateString(),
         new Date(b.checkOut).toLocaleDateString()
      ]);
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Guest Name", "Room", "Type", "Check-in Date", "Check-out Date"]],
        body: inOutBody.length ? inOutBody : noData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Restaurant Orders Report", 14, cursorY);
      cursorY += 5;
      
      let restBody = restaurant?.map((r: any) => [
        r.name,
        r.orders,
        formatCurrency(r.foodSales, currencySymbol),
        formatCurrency(r.beverageSales, currencySymbol),
        formatCurrency(r.revenue, currencySymbol)
      ]) || [];
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Date / Period", "Total Orders", "Food Sales", "Beverage Sales", "Total Revenue"]],
        body: restBody.length ? restBody : noData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 15;

      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Staff Performance Report", 14, cursorY);
      cursorY += 5;
      
      let staffBody = staffPerf?.map((s: any) => [
        s.name,
        s.department,
        s.tasksCompleted,
        `${s.efficiency}%`,
        s.rating
      ]) || [];
      
      autoTable(doc, {
        startY: cursorY,
        head: [["Staff Name", "Department", "Tasks Completed", "Efficiency", "Rating"]],
        body: staffBody.length ? staffBody : noData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" }
      });
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const pdfOutput = doc.output('arraybuffer');
      const filename = `Business_Report_${range.start}_to_${range.end}.pdf`;
      
      if (typeof window !== "undefined" && (window as any).electron?.savePdf) {
        const success = await (window as any).electron.savePdf(pdfOutput, filename);
        if (!success) console.log("PDF save cancelled or failed.");
      } else {
        doc.save(filename);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setExportingPDF(false);
    }
  };

  // ── Table row builders ─────────────────────────────────────────────────
  const { revRows, revTotalRow } = useMemo(() => {
    const r = (revTable?.rows || []).map((row: any) => [
      row.date,
      formatCurrency(row.roomsRevenue, currencySymbol),
      formatCurrency(row.restaurantRevenue, currencySymbol),
      formatCurrency(row.otherRevenue, currencySymbol),
      <span key={row.date} className="font-bold text-theme-text">
        {formatCurrency(row.total, currencySymbol)}
      </span>,
    ]);
    const t = revTable?.totals
      ? [
          "Total",
          formatCurrency(revTable.totals.roomsRevenue, currencySymbol),
          formatCurrency(revTable.totals.restaurantRevenue, currencySymbol),
          formatCurrency(revTable.totals.otherRevenue, currencySymbol),
          formatCurrency(revTable.totals.total, currencySymbol),
        ]
      : undefined;
    return { revRows: r, revTotalRow: t };
  }, [revTable]);

  const { occRows, occTotalRow } = useMemo(() => {
    const r = (occupancy?.table || []).map((row: any) => [
      row.date,
      row.occupied,
      row.available,
      row.reserved,
      <span
        key={row.date}
        className={`font-bold ${parseFloat(row.occupancyPct) >= 70 ? "text-emerald-400" : "text-amber-400"}`}
      >
        {row.occupancyPct}%
      </span>,
    ]);
    const t = occupancy?.table?.length
      ? [
          "Total",
          occupancy.table.reduce((a: number, row: any) => a + row.occupied, 0),
          occupancy.table.reduce((a: number, row: any) => a + row.available, 0),
          occupancy.table.reduce((a: number, row: any) => a + row.reserved, 0),
          <span key="occ" className="text-emerald-400">
            {occupancy?.occupancyRate}%
          </span>,
        ]
      : undefined;
    return { occRows: r, occTotalRow: t };
  }, [occupancy]);

  const { staffRows, staffAvg } = useMemo(() => {
    const r = staffPerf.map((s: any, i: number) => [
      <span key={i} className="text-blue-400 font-medium">
        {s.name}
      </span>,
      s.department,
      s.tasksCompleted,
      `${s.efficiency}%`,
      s.rating,
    ]);
    const t = staffPerf.length
      ? [
          "Average",
          "—",
          Math.round(
            staffPerf.reduce((a: any, s: any) => a + s.tasksCompleted, 0) /
              staffPerf.length,
          ),
          `${(staffPerf.reduce((a: any, s: any) => a + s.efficiency, 0) / staffPerf.length).toFixed(1)}%`,
          (
            staffPerf.reduce((a: any, s: any) => a + s.rating, 0) /
            staffPerf.length
          ).toFixed(1),
        ]
      : undefined;
    return { staffRows: r, staffAvg: t };
  }, [staffPerf]);

  const restRows = restaurant.map((r: any) => [
    r.name,
    r.orders,
    formatCurrency(r.revenue, currencySymbol),
    formatCurrency(r.foodSales, currencySymbol),
    formatCurrency(r.beverageSales, currencySymbol),
    formatCurrency(r.avgOrder, currencySymbol),
    r.topItem,
  ]);
  const restTotalRow = restaurant.length
    ? [
        "Total",
        restaurant.reduce((a, r) => a + r.orders, 0),
        formatCurrency(
          restaurant.reduce((a: number, r: any) => a + r.revenue, 0),
          currencySymbol,
        ),
        formatCurrency(
          restaurant.reduce((a: number, r: any) => a + r.foodSales, 0),
          currencySymbol,
        ),
        formatCurrency(
          restaurant.reduce((a: number, r: any) => a + r.beverageSales, 0),
          currencySymbol,
        ),
        formatCurrency(
          restaurant.reduce((a: number, r: any) => a + r.avgOrder, 0) /
            (restaurant.length || 1),
          currencySymbol,
        ),
        "—",
      ]
    : undefined;

  const maxTasks = Math.max(...staffPerf.map((s) => s.tasksCompleted), 1);

  return (
    <>
      {/* ── INTERACTIVE DASHBOARD (HIDDEN ON PRINT) ── */}
      <div className="print:hidden flex flex-col gap-6 w-full max-w-full">
        {/* ── Full Report Modal ────────────────────────────────────────────── */}
        {fullModal && (
          <FullReportModal
            title={fullModal.title}
            headers={fullModal.headers}
            rows={fullModal.rows}
            totalRow={fullModal.totalRow}
            onClose={() => setFullModal(null)}
          />
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-theme-text">
                Reports & Analytics
              </h1>
              <p className="text-sm text-theme-muted mt-0.5">
                Comprehensive insights and performance metrics
              </p>
            </div>
            {/* Export buttons — hidden on print */}
            <div className="flex gap-3 print-hide items-center">
              <button
                onClick={generatePDF}
                disabled={exportingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-theme-card shadow-soft border border-theme-border rounded-xl text-theme-muted-light hover:text-theme-text hover:border-theme-border transition-colors text-sm font-medium disabled:opacity-50"
              >
                <FileText size={15} /> {exportingPDF ? "Generating..." : "Export PDF"}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-theme-card shadow-soft border border-theme-border rounded-xl text-theme-muted-light hover:text-theme-text hover:border-theme-border transition-colors text-sm font-medium"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-theme-card shadow-soft border border-theme-border rounded-xl text-theme-muted-light hover:text-theme-text hover:border-theme-border transition-colors text-sm font-medium"
              >
                <Printer size={15} /> Print Report
              </button>
            </div>
          </div>

          {/* Filters row — hidden on print */}
          <div className="flex flex-wrap gap-3 items-center print-hide">
            <div className="flex items-center gap-2 bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2">
              <span className="text-xs text-theme-muted">📅</span>
              <select
                className="bg-transparent text-sm text-theme-muted-light outline-none border-r border-theme-border pr-2 mr-2 cursor-pointer"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") return;

                  const end = new Date();
                  const start = new Date();

                  if (val === "today") {
                    // Keep start and end as today
                  } else if (val === "7d") {
                    start.setDate(end.getDate() - 7);
                  } else if (val === "30d") {
                    start.setDate(end.getDate() - 30);
                  } else if (val === "90d") {
                    start.setDate(end.getDate() - 90);
                  } else if (val === "1y") {
                    start.setFullYear(end.getFullYear() - 1);
                  }

                  setRange({
                    start: start.toISOString().split("T")[0],
                    end: end.toISOString().split("T")[0],
                  });
                }}
              >
                <option value="custom">Custom Range</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
              <input
                type="date"
                value={range.start}
                onChange={(e) =>
                  setRange((r) => ({ ...r, start: e.target.value }))
                }
                className="bg-transparent text-sm text-theme-text outline-none"
              />
              <span className="text-theme-muted-light text-sm">–</span>
              <input
                type="date"
                value={range.end}
                onChange={(e) =>
                  setRange((r) => ({ ...r, end: e.target.value }))
                }
                className="bg-transparent text-sm text-theme-text outline-none"
              />
            </div>

            {/* Department filter — wired to charts */}
            <select
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-muted-light outline-none cursor-pointer"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option>All Departments</option>
              <option>Rooms</option>
              <option>Restaurant</option>
              <option>Housekeeping</option>
              <option>Management</option>
            </select>

            <select
              className="bg-theme-card shadow-soft border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-muted-light outline-none cursor-pointer"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              <option>All Room Types</option>
              <option>Standard</option>
              <option>Deluxe</option>
              <option>Suite</option>
            </select>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 w-full">
          <SummaryCard
            title="Lifetime Revenue"
            value={
              summary
                ? formatCurrency(summary.lifetimeRevenue, currencySymbol)
                : "PKR 0.00"
            }
            delta="—"
            icon={DollarSign}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
          <SummaryCard
            title="Period Revenue"
            value={
              summary
                ? formatCurrency(summary.totalRevenue, currencySymbol)
                : "PKR 0.00"
            }
            delta={summary?.revenueDelta ?? 0}
            icon={DollarSign}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <SummaryCard
            title="Occupancy Rate"
            value={summary ? `${summary.occupancyRate}%` : "0%"}
            delta={summary?.occupancyDelta ?? 0}
            icon={TrendingUp}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <SummaryCard
            title="Total Bookings"
            value={summary?.totalBookings ?? 0}
            delta={summary?.bookingsDelta ?? 0}
            icon={CalendarCheck}
            color="text-purple-400"
            bg="bg-purple-500/10"
          />
          <SummaryCard
            title="Average Length of Stay"
            value={summary ? `${summary.avgLOS} Nights` : "0 Nights"}
            delta={summary?.losDelta ?? 0}
            icon={Clock}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <SummaryCard
            title="Guest Satisfaction"
            value={summary ? `${summary.guestSatisfaction} / 5` : "4.5 / 5"}
            delta={summary?.satisfactionDelta ?? 0}
            icon={Star}
            color="text-yellow-400"
            bg="bg-yellow-500/10"
          />
        </div>

        {/* ── Row 1 Charts ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          {/* Revenue Trend — respects department filter */}
          <div id="chart-revenue" className="flex-1 min-w-0">
            <ChartCard
              title={
                department === "All Departments"
                  ? "Revenue Trend"
                  : `Revenue Trend (${department})`
              }
              action={
                <PeriodSelect value={revPeriod} onChange={setRevPeriod} />
              }
            >
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={filteredRevenue}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(128,128,128,0.2)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatShort(v, currencySymbol)}
                  />
                  <Tooltip
                    content={<ChartTooltip currencySymbol={currencySymbol} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                  {department === "All Departments" && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="roomRevenue"
                        name="Rooms Revenue"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="restaurantRevenue"
                        name="Restaurant Revenue"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="mt-2 text-right">
              <button
                onClick={() => setShowRevTable(!showRevTable)}
                className="text-xs text-blue-500 hover:text-blue-400 font-medium underline underline-offset-2 transition-colors"
              >
                {showRevTable ? "Hide Detailed Table" : "View Detailed Table"}
              </button>
            </div>
            {showRevTable && (
              <div className="mt-4">
                <DataTable
                  title="Revenue Report"
                  headers={[
                    "Date",
                    "Rooms Revenue",
                    "Restaurant Rev.",
                    "Other Revenue",
                    "Total",
                  ]}
                  rows={revRows}
                  totalRow={revTotalRow}
                  onViewFull={() =>
                    setFullModal({
                      title: "Revenue Report — Full Data",
                      headers: [
                        "Date",
                        "Rooms Revenue",
                        "Restaurant Revenue",
                        "Other Revenue",
                        "Total",
                      ],
                      rows: (revTable?.rows || []).map((r: any) => [
                        r.date,
                        formatCurrency(r.roomsRevenue, currencySymbol),
                        formatCurrency(r.restaurantRevenue, currencySymbol),
                        formatCurrency(r.otherRevenue, currencySymbol),
                        formatCurrency(r.total, currencySymbol),
                      ]),
                      totalRow: revTable?.totals
                        ? [
                            "Total",
                            formatCurrency(
                              revTable.totals.roomsRevenue,
                              currencySymbol,
                            ),
                            formatCurrency(
                              revTable.totals.restaurantRevenue,
                              currencySymbol,
                            ),
                            formatCurrency(
                              revTable.totals.otherRevenue,
                              currencySymbol,
                            ),
                            formatCurrency(revTable.totals.total, currencySymbol),
                          ]
                        : undefined,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Occupancy Rate Donut */}
          <div id="chart-occupancy" className="flex-1 min-w-0">
            <ChartCard title="Occupancy Rate">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={occupancy?.donut || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                      nameKey="name"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {(occupancy?.donut || []).map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="46%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--theme-text)"
                      fontSize={15}
                      fontWeight={700}
                    >
                      {occupancy?.occupancyRate ?? 0}%
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#94a3b8"
                      fontSize={9}
                    >
                      Occupancy
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1">
                  {(occupancy?.donut || []).map((d: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-theme-muted">{d.name}</span>
                      </div>
                      <span className="font-bold text-theme-text">
                        {d.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
            <div className="mt-2 text-right">
              <button
                onClick={() => setShowOccTable(!showOccTable)}
                className="text-xs text-blue-500 hover:text-blue-400 font-medium underline underline-offset-2 transition-colors"
              >
                {showOccTable ? "Hide Detailed Table" : "View Detailed Table"}
              </button>
            </div>
            {showOccTable && (
              <div className="mt-4">
                <DataTable
                  title="Occupancy Report"
                  headers={[
                    "Date",
                    "Occupied",
                    "Available",
                    "Reserved",
                    "Occupancy %",
                  ]}
                  rows={occRows}
                  totalRow={occTotalRow}
                  onViewFull={() =>
                    setFullModal({
                      title: "Occupancy Report — Full Data",
                      headers: [
                        "Date",
                        "Occupied",
                        "Available",
                        "Reserved",
                        "Occupancy %",
                      ],
                      rows: (occupancy?.table || []).map((r: any) => [
                        r.date,
                        r.occupied,
                        r.available,
                        r.reserved,
                        `${r.occupancyPct}%`,
                      ]),
                      totalRow: occTotalRow
                        ? [
                            "Total",
                            String(occTotalRow[1]),
                            String(occTotalRow[2]),
                            String(occTotalRow[3]),
                            `${occupancy?.occupancyRate}%`,
                          ]
                        : undefined,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Bookings Overview Bar */}
          <div id="chart-bookings" className="flex-1 min-w-0">
            <ChartCard
              title="Bookings Overview"
              action={
                <PeriodSelect value={bookPeriod} onChange={setBookPeriod} />
              }
            >
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={bookings} barSize={24}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(128,128,128,0.2)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip currencySymbol={currencySymbol} />}
                  />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* ── Row 2 Charts ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          {/* Restaurant Revenue */}
          <div id="chart-restaurant" className="flex-1 min-w-0">
            <ChartCard
              title="Restaurant Revenue"
              action={
                <PeriodSelect value={restPeriod} onChange={setRestPeriod} />
              }
            >
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={restaurant}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(128,128,128,0.2)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatShort(v, currencySymbol)}
                />
                <Tooltip
                  content={<ChartTooltip currencySymbol={currencySymbol} />}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          </div>

          {/* Staff Performance Horizontal Bars */}
          <div id="chart-staff" className="flex-1 min-w-0">
            <ChartCard
              title="Staff Performance (Tasks Completed)"
              action={
                <PeriodSelect
                  value={staffPeriod}
                  onChange={setStaffPeriod}
                  options={["This Week", "This Month"]}
                />
              }
            >
            <div className="flex flex-col gap-3">
              {staffPerf.length === 0 ? (
                <p className="text-theme-muted-light text-sm text-center py-8">
                  No task data for this period
                </p>
              ) : (
                staffPerf.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-theme-muted w-24 shrink-0 text-right truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 bg-theme-main rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                        style={{
                          width: `${Math.max((s.tasksCompleted / maxTasks) * 100, 8)}%`,
                          background: STAFF_COLORS[i % STAFF_COLORS.length],
                        }}
                      >
                        <span className="text-[10px] font-bold text-theme-text">
                          {s.tasksCompleted}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-theme-text w-6 shrink-0">
                      {s.tasksCompleted}
                    </span>
                  </div>
                ))
              )}
              {staffPerf.length > 0 && (
                <div className="flex justify-between text-[10px] text-theme-muted pl-28">
                  {[0, 10, 20, 30, 40, 50].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              )}
            </div>
          </ChartCard>
          </div>

          {/* Revenue by Department Donut — respects department filter */}
          <div id="chart-dept-revenue" className="flex-1 min-w-0">
            <ChartCard
              title="Revenue by Department"
              action={
                <select className="bg-theme-main border border-theme-border rounded-lg px-2.5 py-1 text-xs text-theme-muted-light outline-none">
                  <option>This Week</option>
                </select>
              }
            >
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={filteredRevByDept?.data || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                      nameKey="name"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {(filteredRevByDept?.data || []).map(
                        (_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                          />
                        ),
                      )}
                    </Pie>
                    <text
                      x="50%"
                      y="43%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--theme-text)"
                      fontSize={12}
                      fontWeight={700}
                    >
                      {formatShort(
                        filteredRevByDept?.total || 0,
                        currencySymbol,
                      )}
                    </text>
                    <text
                      x="50%"
                      y="57%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#94a3b8"
                      fontSize={9}
                    >
                      Total Revenue
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {(filteredRevByDept?.data || []).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: DEPT_COLORS[i % DEPT_COLORS.length],
                        }}
                      />
                      <span className="text-theme-muted">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-theme-text font-bold">
                        {formatCurrency(d.value, currencySymbol)}
                      </span>
                      <span className="text-theme-muted-light ml-1">
                        ({d.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
          </div>
        </div>

        {/* ── Data Tables Row (Staff) ───────────────────────────────── */}
        <div className="flex flex-col gap-4 w-full">
          <DataTable
            title="Staff Report"
            headers={[
              "Staff Name",
              "Department",
              "Tasks",
              "Efficiency %",
              "Rating",
            ]}
            rows={staffRows}
            totalRow={staffAvg}
            onViewFull={() =>
              setFullModal({
                title: "Staff Report — Full Data",
                headers: [
                  "Staff Name",
                  "Department",
                  "Tasks Completed",
                  "Efficiency %",
                  "Rating",
                ],
                rows: staffPerf.map((s) => [
                  s.name,
                  s.department,
                  s.tasksCompleted,
                  `${s.efficiency}%`,
                  s.rating,
                ]),
                totalRow: staffAvg
                  ? [
                      "Average",
                      "—",
                      String(staffAvg[2]),
                      String(staffAvg[3]),
                      String(staffAvg[4]),
                    ]
                  : undefined,
              })
            }
          />
        </div>

        {/* ── Restaurant Report ──────────────────────────────────────── */}
        <div className="w-full">
        <DataTable
          title="Restaurant Report"
          headers={[
            "Date",
            "Total Orders",
            "Total Sales",
            "Food Sales",
            "Beverage Sales",
            "Avg Order Value",
            "Top Item",
          ]}
          rows={restRows}
          totalRow={restTotalRow}
          onViewFull={() =>
            setFullModal({
              title: "Restaurant Report — Full Data",
              headers: [
                "Date",
                "Total Orders",
                "Total Sales",
                "Food Sales",
                "Beverage Sales",
                "Avg Order Value",
                "Top Item",
              ],
              rows: restaurant.map((r) => [
                r.name,
                r.orders,
                formatCurrency(r.revenue, currencySymbol),
                formatCurrency(r.foodSales, currencySymbol),
                formatCurrency(r.beverageSales, currencySymbol),
                formatCurrency(r.avgOrder, currencySymbol),
                r.topItem,
              ]),
              totalRow: restTotalRow,
            })
          }
        />

        </div>

        {/* ── Guest Satisfaction Trend ───────────────────────────────── */}
        <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-theme-text">
              Guest Satisfaction Trend
            </h3>
            <select className="bg-theme-main border border-theme-border rounded-lg px-2.5 py-1 text-xs text-theme-muted-light outline-none">
              <option>Weekly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={satisfaction}
              margin={{ top: 24, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(128,128,128,0.2)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip currencySymbol={currencySymbol} />}
              />
              <Line
                type="monotone"
                dataKey="rating"
                name="Rating"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 7 }}
              >
                <LabelList
                  dataKey="rating"
                  position="top"
                  style={{ fill: "#f59e0b", fontSize: 11, fontWeight: 700 }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>


      </div>
    </>
  );
}
