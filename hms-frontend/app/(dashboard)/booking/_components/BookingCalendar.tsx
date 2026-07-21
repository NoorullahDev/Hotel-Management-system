import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingCalendarProps {
  rooms: any[];
  bookings: any[];
}

export default function BookingCalendar({ rooms, bookings }: BookingCalendarProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [roomTypeFilter, setRoomTypeFilter] = useState('All Rooms');

  const uniqueRoomTypes = useMemo(() => {
    const types = rooms.map(r => r.roomType?.name).filter(Boolean);
    return Array.from(new Set(types));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => roomTypeFilter === 'All Rooms' || r.roomType?.name === roomTypeFilter);
  }, [rooms, roomTypeFilter]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate]);

  const endDate = days[6];

  const nextWeek = () => {
    const next = new Date(startDate);
    next.setDate(next.getDate() + 7);
    setStartDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(startDate);
    prev.setDate(prev.getDate() - 7);
    setStartDate(prev);
  };

  const formatHeaderDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-600/90 hover:bg-green-500';
      case 'CHECKED_IN': return 'bg-blue-600/90 hover:bg-blue-500';
      case 'CANCELLED': return 'bg-red-600/90 hover:bg-red-500';
      default: return 'bg-purple-600/90 hover:bg-purple-500'; 
    }
  };

  const getBookingStyle = (checkInStr: string, checkOutStr: string) => {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    const windowStart = days[0].getTime();
    const windowEnd = days[6].getTime();

    if (checkOut.getTime() < windowStart || checkIn.getTime() > windowEnd) return null;

    let startOffset = 0;
    if (checkIn.getTime() > windowStart) {
      startOffset = (checkIn.getTime() - windowStart) / (1000 * 60 * 60 * 24);
    }

    let endOffset = 7;
    if (checkOut.getTime() < windowEnd) {
      endOffset = (checkOut.getTime() - windowStart) / (1000 * 60 * 60 * 24);
    }
    
    const duration = Math.max(0.5, endOffset - startOffset);

    return {
      left: `${(startOffset / 7) * 100}%`,
      width: `${(duration / 7) * 100}%`,
    };
  };

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between p-3 border-b border-theme-border">
        <h2 className="text-sm font-bold text-theme-text whitespace-nowrap hidden sm:block mr-2">Calendar</h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center shrink-0">
            <button onClick={prevWeek} className="p-1 hover:bg-theme-hover rounded text-theme-muted hover:text-theme-text transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextWeek} className="p-1 hover:bg-theme-hover rounded text-theme-muted hover:text-theme-text transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-[10px] font-medium text-theme-muted-light whitespace-nowrap shrink-0">
            {formatHeaderDate(startDate)} - {formatHeaderDate(endDate)}
          </span>
          <select 
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="bg-theme-secondary border border-theme-border rounded-md px-1.5 py-1 text-[10px] text-theme-muted-light focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary max-w-[100px] truncate shrink-0"
          >
            <option value="All Rooms">All</option>
            {uniqueRoomTypes.map((type: any) => (
              <option key={type} value={type} className="truncate">{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-w-full">
          
          <div className="flex border-b border-theme-border">
            <div className="w-20 p-2 shrink-0 flex items-center justify-center border-r border-theme-border bg-theme-secondary/50">
              <span className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">Room</span>
            </div>
            <div className="flex-1 grid grid-cols-7">
              {days.map((d, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-2 border-r border-theme-border/50 last:border-r-0">
                  <span className="text-[10px] font-medium text-theme-muted">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-xs font-bold ${d.getDate() === new Date().getDate() ? 'text-blue-500' : 'text-theme-text'}`}>
                    {d.getDate()} {d.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            {filteredRooms.map(room => {
              const roomBookings = bookings.filter(b => b.room === room.number && b.status !== 'CANCELLED');

              return (
                <div key={room.id} className="flex border-b border-theme-border/50 hover:bg-theme-hover/20 transition-colors">
                  <div className="w-20 p-2 shrink-0 flex flex-col justify-center border-r border-theme-border bg-theme-secondary/30">
                    <span className="text-xs font-bold text-theme-text">{room.number}</span>
                    <span className="text-[9px] text-theme-muted-light truncate">{room.roomType?.name || 'Standard'}</span>
                  </div>
                  
                  <div className="flex-1 relative min-h-[40px] grid grid-cols-7">
                    {Array.from({length: 7}).map((_, i) => (
                      <div key={i} className="border-r border-theme-border/30 last:border-r-0 h-full"></div>
                    ))}

                    {roomBookings.map(b => {
                      const style = getBookingStyle(b.checkIn, b.checkOut);
                      if (!style) return null;

                      return (
                        <div 
                          key={b.rawId}
                          className={`absolute top-1 bottom-1 ${getStatusColor(b.status)} rounded-md shadow-sm border border-black/20 overflow-hidden flex items-center px-2 group cursor-pointer z-10 transition-all`}
                          style={style}
                          title={`${b.guest} (${b.status})`}
                        >
                          <span className="text-[10px] font-semibold text-theme-text/90 truncate drop-shadow-md">
                            {b.guest}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredRooms.length === 0 && (
              <div className="p-8 text-center text-theme-muted-light text-xs">No rooms found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-theme-border flex items-center justify-center gap-4 bg-theme-secondary/30">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-600"></div><span className="text-[10px] text-theme-muted font-medium">Confirmed</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary active:scale-95 shadow-md"></div><span className="text-[10px] text-theme-muted font-medium">Checked-in</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-600"></div><span className="text-[10px] text-theme-muted font-medium">Upcoming</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[10px] text-theme-muted font-medium">Pending</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600"></div><span className="text-[10px] text-theme-muted font-medium">Cancelled</span></div>
      </div>
    </div>
  );
}
