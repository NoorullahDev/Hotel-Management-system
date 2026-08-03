'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, BedDouble, CalendarCheck, LogIn, LogOut, 
  Receipt, UtensilsCrossed, Sparkles, Users, FileBarChart, 
  LineChart, Settings, Power, Bell, ChevronDown, User,
  MapPin, Building2, Search, Crown, Menu, X, Sun, Moon
} from 'lucide-react';
import Link from 'next/link';
import { connectSocket } from '../../lib/socket';
import { Outfit } from 'next/font/google';
import { API_BASE } from '../../lib/config';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';

const outfit = Outfit({ subsets: ['latin'] });

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  permissions?: string[];
}

const allNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { name: 'Rooms', href: '/rooms', icon: BedDouble, permission: 'view_rooms' },
  { name: 'Booking', href: '/booking', icon: CalendarCheck, permission: 'view_bookings' },
  { name: 'Foreign Guests', href: '/guests', icon: Users, permission: 'manage_guests' },
  { name: 'Check-In', href: '/checkin', icon: LogIn, permission: 'manage_bookings' },
  { name: 'Check-Out', href: '/checkout', icon: LogOut, permission: 'manage_bookings' },
  { name: 'Billing', href: '/billing', icon: Receipt, permission: 'manage_billing' },
  { name: 'Restaurant', href: '/restaurant', icon: UtensilsCrossed, permission: 'manage_restaurant' },
  { name: 'Housekeeping', href: '/housekeeping', icon: Sparkles, permission: 'manage_housekeeping' },
  { name: 'Reports', href: '/reports', icon: FileBarChart, permission: 'view_reports' },
  { name: 'Notifications', href: '/notifications', icon: Bell, permission: 'view_dashboard' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'manage_settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const user = userData || {
    name: 'Loading...',
    role: 'Admin',
    email: '',
    avatar: '',
    permissions: [] as string[]
  };
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hotelLogo, setHotelLogo] = useState('');
  const [hotelName, setHotelName] = useState('HotelPrime');

  useEffect(() => {
    const socket = connectSocket();
    const handleSettingsUpdated = (data: any) => {
      if (data.category === 'general') {
        if (data.updates.hotelName) setHotelName(data.updates.hotelName);
        if (data.updates.hotelLogo !== undefined) setHotelLogo(data.updates.hotelLogo);
      }
    };
    socket.on('settings:updated', handleSettingsUpdated);
    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    // Clock tick
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get<any>('/api/settings/public');
        if (data.hotelLogo) setHotelLogo(data.hotelLogo);
        if (data.hotelName) setHotelName(data.hotelName);
      } catch (error) {
        console.error('Failed to fetch public settings', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await api.get<any>('/api/auth/me');
        setUserData(data);
      } catch (err) {
        console.error('Failed to fetch user', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('hms_user');
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-text opacity-50"></div>
      </div>
    );
  }

  if (!userData) return null;

  const allowedNavItems = allNavItems.filter(item => {
    if (user.role === 'Admin') return true;
    return user.permissions && user.permissions.includes(item.permission);
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAvatarUrl = (avatarStr: string) => {
    if (!avatarStr) return '/images/avatar.png';
    if (avatarStr.startsWith('http')) return avatarStr;
    if (avatarStr.startsWith('/images')) return avatarStr;
    return `${API_BASE}${avatarStr}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-theme-main text-theme-text font-sans md:pl-80">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-theme-card shadow-soft border-r border-theme-border flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Logo Area */}
        <div className="shrink-0 h-16 md:h-20 flex items-center justify-between px-6 border-b border-theme-border">
          <div className="flex items-center gap-4 text-primary">
            {hotelLogo ? (
              <img loading="lazy" decoding="async" src={hotelLogo.startsWith('http') || hotelLogo.startsWith('/images/') ? hotelLogo : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${hotelLogo}`} alt="Hotel Logo" className="h-10 w-auto object-contain rounded-xl shadow-sm" />
            ) : (
              <div className="p-2 border border-primary/50 rounded-xl flex-shrink-0 bg-blue-500/10">
                <Building2 size={24} className="text-primary" />
              </div>
            )}
            <div className={`flex flex-col uppercase flex-1 min-w-0 ${outfit.className}`}>
              <span className="text-base font-extrabold text-theme-text tracking-wide break-words line-clamp-2 leading-tight">{hotelName}</span>
              <span className="text-[9px] text-blue-400 tracking-[0.15em] mt-0.5 font-semibold">Hotel Management</span>
            </div>
          </div>
          <button className="md:hidden text-theme-muted" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4 space-y-1 custom-scrollbar">
          {allowedNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 h-11 rounded-xl transition-all duration-200 ease-in-out group ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-semibold relative overflow-hidden' 
                    : 'text-theme-muted hover:bg-theme-hover hover:text-theme-text font-medium'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>
                )}
                <div className={`flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[15px] tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions & Widget */}
        <div className="shrink-0 p-4 border-t border-theme-border flex flex-col gap-3 bg-theme-card">
          <div className="bg-theme-main rounded-xl p-3 flex flex-col gap-2 border border-theme-border/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-blue-500" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-theme-text truncate">{user.name}</span>
                <span className="text-[11px] font-semibold text-theme-muted-light truncate leading-tight mt-0.5">{hotelName}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-theme-border/60 pt-3 mt-1">
              <span className="text-[11px] font-medium text-theme-muted uppercase tracking-wider">{formatDate(currentTime)}</span>
              <span className="text-sm font-bold text-theme-text">{formatTime(currentTime)}</span>
            </div>
          </div>

          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 px-3 h-11 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors duration-200 ease-in-out w-full font-medium"
          >
            <div className="flex items-center justify-center">
              <Power size={20} strokeWidth={2} />
            </div>
            <span className="text-[15px] tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full">
        
        {/* Top Bar */}
        <header className="shrink-0 h-20 bg-theme-main flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex-1 flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-theme-muted hover:text-theme-text transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted-light" size={18} />
              <input 
                type="text" 
                placeholder="Search guests, bookings, rooms..." 
                className="w-full bg-theme-card shadow-soft border border-theme-border rounded-xl py-2 pl-10 pr-4 text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    router.push(`/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              className="p-2 text-theme-muted hover:text-theme-text transition-colors"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 hover:bg-theme-card shadow-soft p-2 rounded-xl transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={getAvatarUrl(user.avatar)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-theme-border" />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-theme-text">{user.name}</span>
                  <span className="text-xs text-theme-muted-light">Hotel {user.role}</span>
                </div>
                <ChevronDown size={16} className="text-theme-muted-light" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-theme-card shadow-soft border border-theme-border rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-theme-border mb-2">
                    <span className="block text-sm text-theme-text">{user.name}</span>
                    <span className="block text-xs text-theme-muted-light truncate">{user.email}</span>
                  </div>
                  <Link href="/settings?tab=account" onClick={() => setShowProfileDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-theme-muted-light hover:bg-theme-hover flex items-center gap-2">
                    <User size={16} /> Profile
                  </Link>
                  <button 
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Power size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl transform scale-100 transition-all">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <Power size={32} className="text-red-500" />
            </div>
            
            <h3 className="text-xl font-bold text-theme-text mb-2">Confirm Logout</h3>
            
            <div className="bg-theme-main rounded-xl p-3 w-full flex items-center gap-3 mb-6 border border-theme-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={getAvatarUrl(user.avatar)} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-theme-text">{user.name}</span>
                <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded mt-0.5 border border-primary/20">
                  {user.role}
                </span>
              </div>
            </div>

            <p className="text-theme-muted text-sm mb-8">
              Are you sure you want to logout? You will need to login again to access the dashboard.
            </p>

            <div className="flex w-full gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 bg-theme-secondary hover:bg-theme-hover text-theme-text font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-900/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
