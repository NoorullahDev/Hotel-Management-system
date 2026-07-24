'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Users, BedDouble, ChevronRight } from 'lucide-react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { api } from '@/lib/api';

interface Props {
  onClose?: () => void;
  bookingType?: 'LOCAL' | 'FOREIGN';
}

export default function NewBookingWizard({ onClose, bookingType = 'LOCAL' }: Props) {
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { taxRate, taxName, currencySymbol, currency } = useGlobalSettings();

  // Form states
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

  const [additionalGuests, setAdditionalGuests] = useState<{name: string, phone: string, idNumber: string}[]>([]);

  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (guestSearch.length > 2) {
        setIsSearching(true);
        api.get<any>(`/api/guests?search=${guestSearch}&limit=5&guestType=${bookingType}`)
        .then(d => { setGuestResults(d.data || []); setShowDropdown(true); })
        .catch(() => setGuestResults([]))
        .finally(() => setIsSearching(false));
      } else {
        setGuestResults([]);
        setShowDropdown(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [guestSearch]);

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
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setStayDetails({ ...stayDetails, checkIn: newCheckIn, days: diffDays > 0 ? diffDays : 1 });
    }
  };

  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [paymentDetails, setPaymentDetails] = useState({
    method: 'Credit / Debit Card',
    cardNumber: '**** **** **** 4242',
    expiry: '06/27',
    cvv: '123',
    cardholder: 'John Smith'
  });

  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    // Fetch room types
    const fetchTypes = async () => {
      try {
        const res = await api.get<any>('/api/rooms/types');
        setRoomTypes(res);
      } catch (err) {}
    };
    fetchTypes();
  }, []);

  const fetchAvailableRooms = async () => {
    try {
      const params = new URLSearchParams({
        checkIn: stayDetails.checkIn,
        checkOut: stayDetails.checkOut,
      });
      if (stayDetails.roomType) params.append('roomType', stayDetails.roomType);

      const res = await api.get<any>(`/api/rooms/availability?${params.toString()}`);
      setAvailableRooms(res);
    } catch (err) {}
  };

  useEffect(() => {
    if (step === 3 || step === 2) {
      fetchAvailableRooms();
    }
  }, [stayDetails.checkIn, stayDetails.checkOut, stayDetails.roomType, step]);

  const selectedRoom = availableRooms.find(r => r.id === selectedRoomId);
  
  const calculateDays = () => {
    const start = new Date(stayDetails.checkIn);
    const end = new Date(stayDetails.checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateDays();
  const roomRate = selectedRoom ? parseFloat(selectedRoom.price) * nights : 0;
  const taxes = roomRate * (taxRate / 100);
  const discount = 30; // mock discount
  const totalAmount = roomRate + taxes - discount;

  const handleConfirm = async () => {
    if (!selectedRoomId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const checkInDateTime = `${stayDetails.checkIn}T${stayDetails.arrivalTime || '14:00'}:00`;
      const checkOutDateTime = `${stayDetails.checkOut}T${stayDetails.departureTime || '12:00'}:00`;

      const payload = {
        bookingType: bookingType,
        guest: { ...guestDetails, guestType: bookingType },
        additionalGuests: additionalGuests.length > 0 ? additionalGuests : null,
        roomId: selectedRoomId,
        checkIn: bookingType === 'FOREIGN' ? checkInDateTime : stayDetails.checkIn,
        checkOut: bookingType === 'FOREIGN' ? checkOutDateTime : stayDetails.checkOut,
        arrivalTime: bookingType === 'FOREIGN' ? checkInDateTime : undefined,
        guestCount: parseInt(stayDetails.guests) || (1 + additionalGuests.length),
        subtotal: roomRate,
        tax: taxes,
        total: totalAmount,
        paymentMethod: paymentDetails.method
      };

      const data = await api.post<any>('/api/bookings', payload);
      setBookingResult(data);
      setStep(6); // Success step
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMsg(err.message || 'Room just booked by someone else!');
        // Refresh availability
        await fetchAvailableRooms();
        setSelectedRoomId(null);
        setStep(3); // Go back to room selection
      } else {
        setErrorMsg(err.message || 'Failed to create booking');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepper = () => {
    const steps = ['Guest Details', 'Stay Details', 'Room Selection', 'Pricing Summary', 'Payment', 'Confirmation'];
    return (
      <div className="flex items-center justify-between w-full mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-theme-hover -z-10"></div>
        {steps.map((s, idx) => {
          const num = idx + 1;
          const isActive = step === num;
          const isPast = step > num;
          return (
            <div key={s} className="flex flex-col items-center gap-2 bg-theme-main px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${isActive ? 'border-primary bg-primary/10 text-primary shadow-sm' : isPast ? 'border-primary bg-primary text-white shadow-md' : 'border-theme-border bg-theme-secondary text-theme-muted-light'}`}>
                {isPast ? <Check size={14} /> : num}
              </div>
              <span className={`text-[10px] font-medium hidden md:block ${isActive ? 'text-theme-text' : 'text-theme-muted-light'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-theme-main border border-theme-border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-theme-border flex items-center justify-between bg-theme-secondary">
          <h2 className="text-xl font-bold text-theme-text">New Booking Wizard</h2>
          {onClose && (
            <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-8 flex flex-col flex-1 overflow-y-auto">
          {renderStepper()}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              {errorMsg}
            </div>
          )}

          <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4">
            
            {/* Step 1 & 2: Guest & Stay Details */}
            {(step === 1 || step === 2) && (
              <>
                <div className="w-full max-w-sm flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-theme-text mb-6">Guest Details</h3>
                  <div className="space-y-4 flex-1">
                    
                    <div className="relative">
                      <label className="text-xs font-semibold text-primary mb-1.5 block">Search Existing Guest</label>
                      <input 
                        type="text" 
                        placeholder="Type name, phone or email..."
                        value={guestSearch} 
                        onChange={e => setGuestSearch(e.target.value)} 
                        className="w-full bg-theme-card shadow-soft border border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                      />
                      {showDropdown && guestResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-theme-card shadow-soft border border-theme-border rounded-xl shadow-xl z-10 overflow-hidden">
                          {guestResults.map(g => (
                            <div 
                              key={g.id} 
                              onClick={() => {
                                setGuestDetails({
                                  id: g.id,
                                  name: g.name,
                                  phone: g.phone || '',
                                  email: g.email || '',
                                  idType: g.idType || (bookingType === 'FOREIGN' ? 'Passport' : 'CNIC'),
                                  idNumber: g.idNumber || '',
                                  nationality: g.nationality || (bookingType === 'FOREIGN' ? '' : 'Pakistani'),
                                  city: g.city || ''
                                });
                                setGuestSearch('');
                                setShowDropdown(false);
                              }}
                              className="px-4 py-3 hover:bg-theme-hover cursor-pointer border-b border-theme-border last:border-0"
                            >
                              <div className="font-bold text-theme-text text-sm">{g.name}</div>
                              <div className="text-xs text-theme-muted">{g.phone || g.email || 'No contact info'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 my-2">
                      <div className="h-px bg-theme-hover flex-1"></div>
                      <span className="text-xs text-theme-muted-light font-medium">OR ENTER NEW</span>
                      <div className="h-px bg-theme-hover flex-1"></div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Guest Name *</label>
                      <input type="text" value={guestDetails.name} onChange={e => setGuestDetails({...guestDetails, name: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Phone Number *</label>
                      <input type="text" value={guestDetails.phone} onChange={e => setGuestDetails({...guestDetails, phone: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Email Address</label>
                      <input type="email" value={guestDetails.email} onChange={e => setGuestDetails({...guestDetails, email: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">ID Type</label>
                        <select value={guestDetails.idType} onChange={e => setGuestDetails({...guestDetails, idType: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                          <option>CNIC</option>
                          <option>Passport</option>
                          <option>Driver License</option>
                          <option>National ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">ID Number</label>
                        <input type="text" value={guestDetails.idNumber} onChange={e => setGuestDetails({...guestDetails, idNumber: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Nationality</label>
                        <input type="text" value={guestDetails.nationality} onChange={e => setGuestDetails({...guestDetails, nationality: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">City</label>
                        <input type="text" value={guestDetails.city} onChange={e => setGuestDetails({...guestDetails, city: e.target.value, id: ''})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-theme-border">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-theme-muted">Additional Guests (Friends/Family)</label>
                        <button 
                          onClick={() => setAdditionalGuests([...additionalGuests, {name: '', phone: '', idNumber: ''}])}
                          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          + Add Guest
                        </button>
                      </div>
                      <div className="space-y-3">
                        {additionalGuests.map((ag, idx) => (
                          <div key={idx} className="flex flex-col gap-2 bg-theme-main p-3 rounded-xl border border-theme-border relative">
                            <button 
                              onClick={() => setAdditionalGuests(additionalGuests.filter((_, i) => i !== idx))}
                              className="absolute top-2 right-2 text-theme-muted-light hover:text-red-400"
                            >
                              <X size={14} />
                            </button>
                            <input 
                              type="text" placeholder="Name" value={ag.name} 
                              onChange={(e) => {
                                const newArr = [...additionalGuests];
                                newArr[idx].name = e.target.value;
                                setAdditionalGuests(newArr);
                              }}
                              className="w-full bg-theme-secondary border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="text" placeholder="Phone" value={ag.phone} 
                                onChange={(e) => {
                                  const newArr = [...additionalGuests];
                                  newArr[idx].phone = e.target.value;
                                  setAdditionalGuests(newArr);
                                }}
                                className="w-full bg-theme-secondary border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
                              />
                              <input 
                                type="text" placeholder="CNIC Number" value={ag.idNumber} 
                                onChange={(e) => {
                                  const newArr = [...additionalGuests];
                                  newArr[idx].idNumber = e.target.value;
                                  setAdditionalGuests(newArr);
                                }}
                                className="w-full bg-theme-secondary border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {step === 1 && (
                    <button 
                      onClick={() => setStep(2)} 
                      disabled={!guestDetails.name || !guestDetails.phone || (bookingType === 'FOREIGN' && !guestDetails.idNumber)}
                      className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-md"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                <div className={`w-full max-w-sm flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col ${step === 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <h3 className="text-lg font-bold text-theme-text mb-6">Stay Details</h3>
                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Check-in Date *</label>
                        <input type="date" value={stayDetails.checkIn} onChange={e => handleCheckInChange(e.target.value)} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Days of Stay</label>
                        <input type="number" min="1" value={stayDetails.days} onChange={e => handleDaysChange(parseInt(e.target.value) || 1)} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary [color-scheme:dark]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Check-out Date</label>
                      <input type="date" disabled value={stayDetails.checkOut} className="w-full bg-theme-secondary opacity-70 border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [color-scheme:dark] cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Guests</label>
                      <input type="text" value={stayDetails.guests} onChange={e => setStayDetails({...stayDetails, guests: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary" />
                    </div>
                    {bookingType === 'FOREIGN' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Arrival Time</label>
                          <input type="time" value={stayDetails.arrivalTime} onChange={e => setStayDetails({...stayDetails, arrivalTime: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [color-scheme:dark]" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Departure Time</label>
                          <input type="time" value={stayDetails.departureTime} onChange={e => setStayDetails({...stayDetails, departureTime: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [color-scheme:dark]" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Room Type Filter</label>
                      <select value={stayDetails.roomType} onChange={e => setStayDetails({...stayDetails, roomType: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary appearance-none">
                        <option value="">All Types</option>
                        {roomTypes.map(rt => (
                          <option key={rt.id} value={rt.id}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Special Requests</label>
                      <textarea value={stayDetails.specialRequests} onChange={e => setStayDetails({...stayDetails, specialRequests: e.target.value})} rows={3} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-primary resize-none" />
                    </div>
                  </div>
                  {step === 2 && (
                    <button onClick={() => setStep(3)} className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-md">
                      Next <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Room Selection */}
            {step === 3 && (
              <div className="w-full max-w-lg flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-theme-text mb-6">Room Selection</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                  {availableRooms.length === 0 ? (
                    <div className="text-center text-theme-muted py-10">No rooms available for these dates.</div>
                  ) : (
                    availableRooms.map(room => (
                      <div 
                        key={room.id} 
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`flex gap-4 p-3 rounded-xl border cursor-pointer transition-colors ${selectedRoomId === room.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-theme-border bg-theme-main hover:border-theme-strong'}`}
                      >
                        <div className="w-24 h-20 rounded-lg overflow-hidden bg-theme-secondary flex-shrink-0">
                          <img loading="lazy" decoding="async" src={room.imageUrl || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=200&auto=format&fit=crop"} alt="Room" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-theme-text text-sm">{room.number} - {room.roomType?.name}</h4>
                              <p className="text-[10px] text-theme-muted-light">Floor {room.floor}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-theme-text">{currencySymbol} {room.price}</span>
                              <p className="text-[10px] text-theme-muted-light">/ night</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <BedDouble size={14} className="text-theme-muted-light" />
                            <Users size={14} className="text-theme-muted-light" />
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRoomId === room.id ? 'border-primary bg-primary text-white shadow-md' : 'border-theme-border'}`}>
                            {selectedRoomId === room.id && <Check size={12} />}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={() => setStep(4)} 
                  disabled={!selectedRoomId}
                  className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-md"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Step 4 & 5: Pricing Summary & Payment */}
            {(step === 4 || step === 5) && (
              <>
                <div className="w-full max-w-sm flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-theme-text mb-6">Pricing Summary</h3>
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-theme-muted">Room Rate ({nights} Nights)</span>
                      <span className="text-theme-text">{currencySymbol} {roomRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-theme-muted">Taxes & Fees ({taxRate}%)</span>
                      <span className="text-theme-text">{currencySymbol} {taxes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-theme-muted">Discount</span>
                      <span className="text-green-400">-{currencySymbol} {discount.toFixed(2)}</span>
                    </div>
                    <div className="h-px w-full bg-theme-hover my-4"></div>
                    <div className="flex justify-between font-bold">
                      <span className="text-theme-text">Total Amount</span>
                      <span className="text-theme-text text-lg">{currencySymbol} {totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-theme-muted-light text-right">All amounts are in {currency}</p>
                  </div>
                  {step === 4 && (
                    <button onClick={() => setStep(5)} className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-md">
                      Next <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                {step === 5 && (
                  <div className="w-full max-w-sm flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-theme-text mb-6">Payment</h3>
                    <div className="space-y-6 flex-1">
                      <div>
                        <label className="text-xs font-semibold text-theme-muted mb-3 block">Select Payment Method</label>
                        <div className="space-y-2">
                          {['Cash', 'Credit / Debit Card', 'Bank Transfer', 'Digital Wallet'].map(method => (
                            <label key={method} className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="radio" 
                                name="paymentMethod" 
                                value={method}
                                checked={paymentDetails.method === method}
                                onChange={(e) => setPaymentDetails({...paymentDetails, method: e.target.value})}
                                className="w-4 h-4 text-primary bg-theme-main border-theme-border focus:ring-primary"
                              />
                              <span className="text-sm text-theme-muted-light">{method}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {paymentDetails.method === 'Credit / Debit Card' && (
                        <div className="space-y-4 border-t border-theme-border pt-4">
                          <div>
                            <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Card Details</label>
                            <input type="text" value={paymentDetails.cardNumber} onChange={e => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Expiry Date</label>
                              <input type="text" value={paymentDetails.expiry} onChange={e => setPaymentDetails({...paymentDetails, expiry: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-theme-muted mb-1.5 block">CVV</label>
                              <input type="text" value={paymentDetails.cvv} onChange={e => setPaymentDetails({...paymentDetails, cvv: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-theme-muted mb-1.5 block">Cardholder Name</label>
                            <input type="text" value={paymentDetails.cardholder} onChange={e => setPaymentDetails({...paymentDetails, cardholder: e.target.value})} className="w-full bg-theme-main border border-theme-border rounded-xl px-4 py-2 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={handleConfirm} 
                      disabled={isSubmitting}
                      className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-md"
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Step 6: Confirmation */}
            {step === 6 && bookingResult && (
              <div className="w-full max-w-sm flex-shrink-0 snap-center bg-theme-secondary border border-theme-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-6">
                  <Check size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-theme-text mb-2">Booking Confirmed!</h3>
                <p className="text-sm text-theme-muted mb-6">Your booking has been successfully created.</p>
                
                <div className="w-full bg-theme-main border border-theme-border rounded-xl p-4 mb-8">
                  <p className="text-[10px] text-theme-muted-light uppercase font-bold mb-1">Booking ID</p>
                  <p className="text-lg font-mono font-bold text-theme-text">{bookingResult.id.substring(0, 13).toUpperCase()}</p>
                </div>

                <div className="w-full flex flex-col gap-3">
                  <button onClick={() => { onClose?.(); window.location.href = '/billing'; }} className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors active:scale-95 shadow-md">
                    View Billing
                  </button>
                  <button onClick={onClose} className="w-full py-3 bg-theme-hover hover:bg-theme-hover text-theme-text font-medium rounded-xl transition-colors">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
