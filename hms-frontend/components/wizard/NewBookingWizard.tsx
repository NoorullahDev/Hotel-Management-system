'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Users, BedDouble, ChevronRight, ChevronLeft, Search, Calendar, User } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { api } from '@/lib/api';
import { API_BASE } from '@/lib/config';

interface Props {
  onClose?: () => void;
  bookingType?: 'LOCAL' | 'FOREIGN';
}

export default function NewBookingWizard({ onClose, bookingType = 'LOCAL' }: Props) {
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { taxRate, currencySymbol } = useGlobalSettings();
  const roomsScrollRef = useRef<HTMLDivElement>(null);

  // ─── Existing state (unchanged) ────────────────────────────────────────
  const [guestDetails, setGuestDetails] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    idType: bookingType === 'FOREIGN' ? 'Passport' : 'CNIC',
    idNumber: '',
    nationality: bookingType === 'FOREIGN' ? '' : 'Pakistani',
    city: ''
  });

  const [additionalGuests, setAdditionalGuests] = useState<{name: string, relationship: string, phone: string, idNumber: string}[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Room selection filters (client-side only, no backend change)
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      if (guestSearch.length > 2) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.get<any>(`/api/guests?search=${guestSearch}&limit=5&guestType=${bookingType}`)
          .then(d => { setGuestResults(d.data || []); setShowDropdown(true); })
          .catch(() => setGuestResults([]));
      } else {
        setGuestResults([]);
        setShowDropdown(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [guestSearch, bookingType]);

  const [stayDetails, setStayDetails] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    days: 1,
    guests: '2 Adults, 1 Child',
    roomType: '',
    specialRequests: 'High floor, Non-smoking room',
    arrivalTime: '14:00',
    departureTime: '12:00'
  });

  const handleDaysChange = (days: number) => {
    const checkInDate = new Date(stayDetails.checkIn);
    const newCheckOut = new Date(checkInDate.getTime() + days * 86400000);
    setStayDetails({ ...stayDetails, days, checkOut: newCheckOut.toISOString().split('T')[0] });
  };

  const handleCheckInChange = (newCheckIn: string) => {
    const checkInDate = new Date(newCheckIn);
    const checkOutDate = new Date(stayDetails.checkOut);
    if (checkInDate >= checkOutDate) {
      const newCheckOut = new Date(checkInDate.getTime() + stayDetails.days * 86400000);
      setStayDetails({ ...stayDetails, checkIn: newCheckIn, checkOut: newCheckOut.toISOString().split('T')[0] });
    } else {
      const diffDays = Math.ceil(Math.abs(checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
      setStayDetails({ ...stayDetails, checkIn: newCheckIn, days: diffDays > 0 ? diffDays : 1 });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any>('/api/rooms/types').then(r => setRoomTypes(r)).catch(() => {});
  }, []);

  const fetchAvailableRooms = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ checkIn: stayDetails.checkIn, checkOut: stayDetails.checkOut });
      if (stayDetails.roomType) params.append('roomType', stayDetails.roomType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.get<any>(`/api/rooms/availability?${params.toString()}`);
      setAvailableRooms(res);
    } catch { /* ignore */ }
  }, [stayDetails.checkIn, stayDetails.checkOut, stayDetails.roomType]);

  useEffect(() => {
    if (step === 3) fetchAvailableRooms();
  }, [fetchAvailableRooms, step]);

  const selectedRoom = availableRooms.find(r => r.id === selectedRoomId);

  const calculateDays = () => {
    const diffTime = Math.abs(new Date(stayDetails.checkOut).getTime() - new Date(stayDetails.checkIn).getTime());
    const d = Math.ceil(diffTime / 86400000);
    return d > 0 ? d : 1;
  };

  const nights = calculateDays();

  // Client-side room filters
  const filteredRooms = availableRooms.filter(room => {
    if (roomSearchQuery) {
      const q = roomSearchQuery.toLowerCase();
      if (!room.number?.toLowerCase().includes(q) && !room.roomType?.name?.toLowerCase().includes(q)) return false;
    }
    if (floorFilter && room.floor !== parseInt(floorFilter)) return false;
    return true;
  });
  const uniqueFloors = [...new Set(availableRooms.map((r: { floor: number }) => r.floor))].sort((a, b) => a - b);

  // Estimated pricing for confirmation preview (UI-only, actual billing at checkout)
  const roomPrice = selectedRoom?.price || 0;
  const estimatedSubtotal = roomPrice * nights;
  const estimatedTax = estimatedSubtotal * ((taxRate || 0) / 100);
  const estimatedTotal = estimatedSubtotal + estimatedTax;

  const scrollRooms = (dir: 'left' | 'right') => {
    roomsScrollRef.current?.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' });
  };

  // ─── Existing booking handler (unchanged) ──────────────────────────────
  const handleConfirm = async () => {
    if (!selectedRoomId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const checkInDateTime = `${stayDetails.checkIn}T${stayDetails.arrivalTime || '14:00'}:00`;
      const checkOutDateTime = `${stayDetails.checkOut}T${stayDetails.departureTime || '12:00'}:00`;
      const payload = {
        bookingType,
        guest: { ...guestDetails, guestType: bookingType },
        additionalGuests: additionalGuests.length > 0 ? additionalGuests : null,
        roomId: selectedRoomId,
        checkIn: bookingType === 'FOREIGN' ? checkInDateTime : stayDetails.checkIn,
        checkOut: bookingType === 'FOREIGN' ? checkOutDateTime : stayDetails.checkOut,
        arrivalTime: bookingType === 'FOREIGN' ? checkInDateTime : undefined,
        guestCount: parseInt(stayDetails.guests) || (1 + additionalGuests.length),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await api.post<any>('/api/bookings', payload);
      setBookingResult(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMsg(err.message || 'Room just booked by someone else!');
        await fetchAvailableRooms();
        setSelectedRoomId(null);
        setStep(3);
      } else {
        setErrorMsg(err.message || 'Failed to create booking');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  UI RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const inp = 'w-full bg-[#0d1527] border border-[#1e2a45] rounded-lg px-3 py-2.5 text-sm text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
  const lbl = 'text-[11px] font-semibold text-theme-muted mb-1.5 block';

  // ── 4-step stepper (always shows all 4) ────────────────────────────────
  const renderStepper = () => {
    const steps = [
      { num: 1, label: 'Guest Details' },
      { num: 2, label: 'Stay Details' },
      { num: 3, label: 'Room Selection' },
      { num: 4, label: 'Confirmation' },
    ];
    return (
      <div className="flex items-start justify-between px-4 mb-1">
        {steps.map((s, idx) => {
          const isActive = step === s.num;
          const isCompleted = step > s.num;
          return (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : isActive ? 'bg-primary text-white shadow-lg shadow-primary/40 ring-4 ring-primary/20'
                  : 'bg-[#0d1527] border-2 border-[#1e2a45] text-theme-muted-light'
                }`}>
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : s.num}
                </div>
                <span className={`mt-2 text-[11px] font-semibold text-center leading-tight ${
                  isActive || isCompleted ? 'text-primary' : 'text-theme-muted-light'
                }`}>{s.label}</span>
              </div>
              {idx < 3 && (
                <div className={`flex-1 h-[2px] mt-5 mx-1 rounded-full transition-colors duration-300 ${
                  step > s.num ? 'bg-primary' : 'bg-[#1e2a45]'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ── Step 1: Guest Details ──────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="flex flex-col min-h-full">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <User size={18} className="text-theme-text" />
        <h3 className="text-base font-bold text-theme-text">Guest Details</h3>
      </div>

      {/* Card */}
      <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-5 flex-1">
        {/* Guest search */}
        <div className="relative mb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" />
            <input
              type="text"
              placeholder="Search existing guest by name, phone, or email…"
              value={guestSearch}
              onChange={e => setGuestSearch(e.target.value)}
              className="w-full bg-[#0d1527] border border-primary/40 rounded-lg pl-9 pr-3 py-2 text-sm text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {showDropdown && guestResults.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-[#111b30] border border-[#1e2a45] rounded-xl shadow-2xl z-20 overflow-hidden max-h-48 overflow-y-auto">
              {guestResults.map(g => (
                <div
                  key={g.id}
                  onClick={() => {
                    setGuestDetails({ id: g.id, name: g.name, phone: g.phone||'', email: g.email||'', idType: g.idType||(bookingType==='FOREIGN'?'Passport':'CNIC'), idNumber: g.idNumber||'', nationality: g.nationality||(bookingType==='FOREIGN'?'':'Pakistani'), city: g.city||'' });
                    setGuestSearch(''); setShowDropdown(false);
                  }}
                  className="px-4 py-2.5 hover:bg-primary/10 cursor-pointer border-b border-[#1e2a45] last:border-0 transition-colors"
                >
                  <div className="font-semibold text-theme-text text-sm">{g.name}</div>
                  <div className="text-[10px] text-theme-muted-light">{g.phone || g.email || 'No contact info'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-[#1e2a45] flex-1" />
          <span className="text-[10px] text-theme-muted-light font-medium tracking-wider">OR ENTER NEW</span>
          <div className="h-px bg-[#1e2a45] flex-1" />
        </div>

        {/* Form grid */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <div>
            <label className={lbl}>Guest Name *</label>
            <input type="text" value={guestDetails.name} onChange={e=>setGuestDetails({...guestDetails,name:e.target.value,id:''})} className={inp} placeholder="Full name" />
          </div>
          <div>
            <label className={lbl}>Nationality *</label>
            <input type="text" value={guestDetails.nationality} onChange={e=>setGuestDetails({...guestDetails,nationality:e.target.value,id:''})} className={inp} />
          </div>
          <div>
            <label className={lbl}>Phone Number *</label>
            <input type="text" value={guestDetails.phone} onChange={e=>setGuestDetails({...guestDetails,phone:e.target.value,id:''})} className={inp} placeholder="0300 1234567" />
          </div>
          <div>
            <label className={lbl}>City *</label>
            <input type="text" value={guestDetails.city} onChange={e=>setGuestDetails({...guestDetails,city:e.target.value,id:''})} className={inp} placeholder="City" />
          </div>
          <div>
            <label className={lbl}>Email Address</label>
            <input type="email" value={guestDetails.email} onChange={e=>setGuestDetails({...guestDetails,email:e.target.value,id:''})} className={inp} placeholder="guest@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>ID Type *</label>
              <select value={guestDetails.idType} onChange={e=>setGuestDetails({...guestDetails,idType:e.target.value,id:''})} className={`${inp} appearance-none cursor-pointer`}>
                <option>CNIC</option>
                <option>Passport</option>
                <option>Driver License</option>
                <option>National ID</option>
              </select>
            </div>
            <div>
              <label className={lbl}>ID Number *</label>
              <input type="text" value={guestDetails.idNumber} onChange={e=>setGuestDetails({...guestDetails,idNumber:e.target.value,id:''})} className={inp} placeholder="61101-1234567-1" />
            </div>
          </div>
        </div>

        {/* Additional guests */}
        <div className="mt-4 pt-3 border-t border-[#1e2a45]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-theme-muted">Additional Guests (Friends / Family)</span>
            <button onClick={() => setAdditionalGuests([...additionalGuests, { name:'', relationship:'', phone:'', idNumber:'' }])} className="text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors">
              + Add Guest
            </button>
          </div>
          {additionalGuests.length > 0 && (
            <div className="space-y-2 mt-3 pr-1">
              {additionalGuests.map((ag, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#0d1527] border border-[#1e2a45] rounded-lg p-2 relative">
                  <button onClick={() => setAdditionalGuests(additionalGuests.filter((_,i)=>i!==idx))} className="absolute top-1.5 right-1.5 text-theme-muted-light hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                  <input type="text" placeholder="Name" value={ag.name} onChange={e=>{const a=[...additionalGuests];a[idx].name=e.target.value;setAdditionalGuests(a);}} className="flex-1 bg-transparent border border-[#1e2a45] rounded px-2 py-1 text-[11px] text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:border-primary" />
                  <select value={ag.relationship||''} onChange={e=>{const a=[...additionalGuests];a[idx].relationship=e.target.value;setAdditionalGuests(a);}} className="bg-transparent border border-[#1e2a45] rounded px-2 py-1 text-[11px] text-theme-text focus:outline-none appearance-none w-24">
                    <option value="" disabled>Relation</option>
                    <option>Spouse</option><option>Child</option><option>Parent</option><option>Friend</option><option>Other</option>
                  </select>
                  <input type="text" placeholder="Phone" value={ag.phone} onChange={e=>{const a=[...additionalGuests];a[idx].phone=e.target.value;setAdditionalGuests(a);}} className="w-28 bg-transparent border border-[#1e2a45] rounded px-2 py-1 text-[11px] text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:border-primary" />
                  <input type="text" placeholder="CNIC/Passport" value={ag.idNumber} onChange={e=>{const a=[...additionalGuests];a[idx].idNumber=e.target.value;setAdditionalGuests(a);}} className="w-32 bg-transparent border border-[#1e2a45] rounded px-2 py-1 text-[11px] text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:border-primary" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Step 2: Stay Details ───────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <Calendar size={18} className="text-theme-text" />
        <h3 className="text-base font-bold text-theme-text">Stay Details</h3>
      </div>

      <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-5">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label className={lbl}>Check-in Date *</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
              <input type="date" value={stayDetails.checkIn} onChange={e => handleCheckInChange(e.target.value)} className={`${inp} pl-9 [color-scheme:dark]`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Check-out Date *</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
              <input type="date" disabled value={stayDetails.checkOut} className={`${inp} pl-9 opacity-50 cursor-not-allowed [color-scheme:dark]`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Number of Nights</label>
            <input type="number" min="1" value={stayDetails.days} onChange={e => handleDaysChange(parseInt(e.target.value) || 1)} className={`${inp} [color-scheme:dark]`} />
          </div>
          <div>
            <label className={lbl}>Number of Guests *</label>
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light pointer-events-none" />
              <input type="text" value={stayDetails.guests} onChange={e => setStayDetails({ ...stayDetails, guests: e.target.value })} className={`${inp} pl-9`} />
            </div>
          </div>
          {bookingType === 'FOREIGN' && (
            <>
              <div>
                <label className={lbl}>Arrival Time</label>
                <input type="time" value={stayDetails.arrivalTime} onChange={e => setStayDetails({ ...stayDetails, arrivalTime: e.target.value })} className={`${inp} [color-scheme:dark]`} />
              </div>
              <div>
                <label className={lbl}>Departure Time</label>
                <input type="time" value={stayDetails.departureTime} onChange={e => setStayDetails({ ...stayDetails, departureTime: e.target.value })} className={`${inp} [color-scheme:dark]`} />
              </div>
            </>
          )}
          <div className="col-span-2">
            <label className={lbl}>Special Requests (Optional)</label>
            <input type="text" value={stayDetails.specialRequests} onChange={e => setStayDetails({ ...stayDetails, specialRequests: e.target.value })} className={inp} placeholder="Late check-in requested" />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Room Selection ─────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <BedDouble size={18} className="text-theme-text" />
        <h3 className="text-base font-bold text-theme-text">Room Selection</h3>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" />
          <input
            type="text"
            placeholder="Search by room number or type…"
            value={roomSearchQuery}
            onChange={e => setRoomSearchQuery(e.target.value)}
            className="w-full bg-[#0d1527] border border-[#1e2a45] rounded-lg pl-9 pr-3 py-2 text-xs text-theme-text placeholder:text-theme-muted-light/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={stayDetails.roomType}
          onChange={e => setStayDetails({ ...stayDetails, roomType: e.target.value })}
          className="bg-[#0d1527] border border-[#1e2a45] rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">All Room Types</option>
          {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>
        <select
          value={floorFilter}
          onChange={e => setFloorFilter(e.target.value)}
          className="bg-[#0d1527] border border-[#1e2a45] rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer min-w-[110px]"
        >
          <option value="">All Floors</option>
          {uniqueFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
      </div>

      {/* Room cards — horizontal scroll */}
      {filteredRooms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-theme-muted-light">
          <BedDouble size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No rooms available for selected dates.</p>
          <p className="text-xs mt-1 opacity-50">Try adjusting dates or filters.</p>
        </div>
      ) : (
        <div className="relative flex-1">
          <div
            ref={roomsScrollRef}
            className="flex gap-4 overflow-x-auto pb-2 h-full items-start"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.rooms-scroll::-webkit-scrollbar { display: none; }`}</style>
            {filteredRooms.map(room => (
              <div
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`flex-shrink-0 w-[190px] bg-[#0b1120] border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  selectedRoomId === room.id
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-[#1e2a45] hover:border-primary/40'
                }`}
              >
                {/* Room image */}
                <div className="relative h-[120px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={room.imageUrl ? (room.imageUrl.startsWith('http') ? room.imageUrl : `${API_BASE}${room.imageUrl}`) : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=300&auto=format&fit=crop'}
                    alt={`Room ${room.number}`}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=300&auto=format&fit=crop'; }}
                  />
                  {/* Available badge */}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded backdrop-blur-sm">
                    Available
                  </span>
                  {/* Selected checkmark */}
                  {selectedRoomId === room.id && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <Check size={15} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                {/* Room info */}
                <div className="p-3">
                  <h4 className="text-sm font-bold text-theme-text truncate">{room.number} - {room.roomType?.name}</h4>
                  <p className="text-[11px] text-theme-muted-light mt-0.5">Floor {room.floor}</p>
                  <div className="flex items-center gap-3 mt-2 text-theme-muted-light">
                    <div className="flex items-center gap-1"><BedDouble size={12} /><span className="text-[10px]">2</span></div>
                    <div className="flex items-center gap-1"><Users size={12} /><span className="text-[10px]">1</span></div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#1e2a45]">
                    <span className="text-sm font-bold text-theme-text">{currencySymbol} {room.price?.toLocaleString()}</span>
                    <span className="text-[10px] text-theme-muted-light"> /night</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Scroll arrow */}
          {filteredRooms.length > 3 && (
            <button onClick={() => scrollRooms('right')} className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 z-10 hover:bg-primary/90 transition-colors active:scale-95">
              <ChevronRight size={20} className="text-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 4: Confirmation ───────────────────────────────────────────────
  const renderStep4 = () => {
    // After booking is created — success view
    if (bookingResult) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-5">
            <Check size={36} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-theme-text mb-1">Booking Created!</h3>
          <p className="text-sm text-theme-muted mb-6">The reservation has been successfully confirmed.</p>
          <div className="w-full max-w-sm bg-[#0b1120] border border-[#1e2a45] rounded-xl p-5 text-left space-y-3">
            <div>
              <p className="text-[10px] text-theme-muted-light uppercase font-bold mb-0.5">Booking ID</p>
              <p className="text-sm font-mono font-bold text-theme-text">{bookingResult.id?.substring(0, 13).toUpperCase()}</p>
            </div>
            <div className="h-px bg-[#1e2a45]" />
            <div>
              <p className="text-[10px] text-theme-muted-light uppercase font-bold mb-0.5">Room</p>
              <p className="text-sm font-semibold text-theme-text">Room {bookingResult.room?.number || selectedRoom?.number} — {bookingResult.room?.roomType?.name || selectedRoom?.roomType?.name}</p>
            </div>
            <div className="h-px bg-[#1e2a45]" />
            <div>
              <p className="text-[10px] text-theme-muted-light uppercase font-bold mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bookingResult.status === 'CHECKED_IN' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${bookingResult.status === 'CHECKED_IN' ? 'bg-green-500' : 'bg-blue-400'}`} />
                {bookingResult.status === 'CHECKED_IN' ? 'Checked In' : 'Reserved'}
              </span>
            </div>
            <div className="h-px bg-[#1e2a45]" />
            <div className="text-[11px] text-theme-muted-light">
              <span className="font-semibold">Check-In:</span> {stayDetails.checkIn}&nbsp;|&nbsp;<span className="font-semibold">Check-Out:</span> {stayDetails.checkOut}
            </div>
            <div className="pt-1 border-t border-[#1e2a45]/50">
              <p className="text-[10px] text-theme-muted-light italic">💳 Payment will be collected at Check-Out.</p>
            </div>
          </div>
        </div>
      );
    }

    // Before booking — preview/summary
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2.5 mb-1">
          <Check size={18} className="text-theme-text" />
          <h3 className="text-base font-bold text-theme-text">Confirmation</h3>
        </div>
        <p className="text-xs text-theme-muted-light mb-4">Please review the booking details before confirming.</p>

        <div className="grid grid-cols-4 gap-4 flex-1">
          {/* Guest Information */}
          <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e2a45]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-theme-text">Guest Information</span>
            </div>
            <div className="space-y-2.5">
              <div><p className="text-[10px] text-theme-muted-light">Name</p><p className="text-xs font-semibold text-theme-text">{guestDetails.name || '—'}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Phone</p><p className="text-xs font-semibold text-theme-text">{guestDetails.phone || '—'}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Email</p><p className="text-xs font-semibold text-theme-text truncate">{guestDetails.email || '—'}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">{guestDetails.idType}</p><p className="text-xs font-semibold text-theme-text">{guestDetails.idNumber || '—'}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Nationality</p><p className="text-xs font-semibold text-theme-text">{guestDetails.nationality || '—'}</p></div>
            </div>
          </div>

          {/* Stay Information */}
          <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e2a45]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-theme-text">Stay Information</span>
            </div>
            <div className="space-y-2.5">
              <div><p className="text-[10px] text-theme-muted-light">Check-in Date</p><p className="text-xs font-semibold text-theme-text">{stayDetails.checkIn}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Check-out Date</p><p className="text-xs font-semibold text-theme-text">{stayDetails.checkOut}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Nights</p><p className="text-xs font-semibold text-theme-text">{nights}</p></div>
              <div><p className="text-[10px] text-theme-muted-light">Guests</p><p className="text-xs font-semibold text-theme-text">{stayDetails.guests}</p></div>
            </div>
          </div>

          {/* Room Information */}
          <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e2a45]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-theme-text">Room Information</span>
            </div>
            {selectedRoom ? (
              <div>
                <div className="w-full h-20 rounded-lg overflow-hidden mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedRoom.imageUrl ? (selectedRoom.imageUrl.startsWith('http') ? selectedRoom.imageUrl : `${API_BASE}${selectedRoom.imageUrl}`) : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=300&auto=format&fit=crop'}
                    alt={`Room ${selectedRoom.number}`}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=300&auto=format&fit=crop'; }}
                  />
                </div>
                <h4 className="text-sm font-bold text-theme-text">{selectedRoom.number} - {selectedRoom.roomType?.name}</h4>
                <p className="text-[11px] text-theme-muted-light">Floor {selectedRoom.floor}</p>
                <div className="flex items-center gap-3 mt-1.5 text-theme-muted-light">
                  <BedDouble size={12} />
                  <Users size={12} />
                </div>
                <p className="mt-2 text-sm font-bold text-theme-text">{currencySymbol} {selectedRoom.price?.toLocaleString()} <span className="text-[10px] text-theme-muted-light font-normal">/night</span></p>
              </div>
            ) : (
              <p className="text-xs text-theme-muted-light italic">No room selected</p>
            )}
          </div>

          {/* Price Summary */}
          <div className="bg-[#0b1120] border border-[#1e2a45] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1e2a45]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-theme-text">Price Summary</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-theme-muted-light">Room Price ({nights} Night{nights !== 1 ? 's' : ''})</span>
                <span className="text-theme-text font-medium">{currencySymbol} {estimatedSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-theme-muted-light">Taxes & Charges</span>
                <span className="text-theme-text font-medium">{currencySymbol} {Math.round(estimatedTax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-theme-muted-light">Discount</span>
                <span className="text-theme-text font-medium">{currencySymbol} 0</span>
              </div>
              <div className="h-px bg-[#1e2a45] mt-1" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-theme-text">Total Amount</span>
                <span className="text-lg font-bold text-green-400">{currencySymbol} {Math.round(estimatedTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  const pageNum = step <= 2 ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[#0e1726] border border-[#1e2a45] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '85vh' }}>

        {/* ── Header ─── */}
        <div className="flex-shrink-0 px-7 py-4 border-b border-[#1e2a45] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar size={16} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-theme-text">New Booking Wizard</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-theme-muted-light hover:text-theme-text transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Stepper ─── */}
        <div className="flex-shrink-0 px-7 pt-5 pb-4 border-b border-[#1e2a45]/60">
          {renderStepper()}
        </div>

        {/* ── Content ─── */}
        <div className="flex-1 px-7 py-5 overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              {errorMsg}
            </div>
          )}
          <div className="min-h-full">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>
        </div>

        {/* ── Footer ─── */}
        <div className="flex-shrink-0 px-7 py-4 border-t border-[#1e2a45] flex items-center justify-between">
          {/* Left: Cancel / Back */}
          <div>
            {step === 1 && (
              <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 border border-[#1e2a45] text-theme-muted-light hover:text-theme-text hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            )}
            {step > 1 && !bookingResult && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-5 py-2.5 border border-[#1e2a45] text-theme-muted-light hover:text-theme-text hover:bg-white/5 rounded-lg text-sm font-medium transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
            )}
          </div>

          {/* Center: Page indicator */}
          <span className="text-[11px] text-primary font-semibold tracking-wider">
            PAGE {pageNum} OF 2
          </span>

          {/* Right: Next / Confirm / Done */}
          <div>
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!guestDetails.name || !guestDetails.phone || (bookingType === 'FOREIGN' && !guestDetails.idNumber)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors active:scale-95 shadow-md shadow-primary/20"
              >
                Next <ChevronRight size={15} />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg text-sm transition-colors active:scale-95 shadow-md shadow-primary/20"
              >
                Next <ChevronRight size={15} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => { if (selectedRoomId) setStep(4); }}
                disabled={!selectedRoomId}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors active:scale-95 shadow-md shadow-primary/20"
              >
                Next <ChevronRight size={15} />
              </button>
            )}
            {step === 4 && !bookingResult && (
              <button
                onClick={handleConfirm}
                disabled={!selectedRoomId || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors active:scale-95 shadow-md shadow-green-600/20"
              >
                {isSubmitting ? 'Creating Booking…' : '✓ Confirm Booking'}
              </button>
            )}
            {step === 4 && bookingResult && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg text-sm transition-colors active:scale-95 shadow-md shadow-primary/20"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
