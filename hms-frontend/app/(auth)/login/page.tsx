'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2, ShieldCheck, BarChart3, Globe, Crown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Playfair_Display, Outfit } from 'next/font/google';
import { connectSocket } from '../../../lib/socket';
import { api } from '@/lib/api';

const playfair = Playfair_Display({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bgImage, setBgImage] = useState('/images/hotel_bg.png');
  const [hotelLogo, setHotelLogo] = useState('');
  const [hotelName, setHotelName] = useState('Hotel Name');
  const [loginHeadingMain, setLoginHeadingMain] = useState('Smart Hotel Management Simplified.');
  const [loginSubheading, setLoginSubheading] = useState('Manage bookings, guests, staff, and operations seamlessly with our all-in-one hotel management solution.');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load remembered username
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }

    // Fetch custom background and branding from settings if available
    const fetchSettings = async () => {
      try {
        const data = await api.get<any>('/api/settings/public');
        if (data.hotelBanner) {
          setBgImage(data.hotelBanner);
        } else if (data.loginBackgroundImage) {
          setBgImage(data.loginBackgroundImage); // Fallback
        }
          if (data.hotelLogo) {
            setHotelLogo(data.hotelLogo);
          }
          if (data.hotelName) {
            setHotelName(data.hotelName);
          }
        if (data.loginHeadingMain) {
          setLoginHeadingMain(data.loginHeadingMain);
        }
        if (data.loginSubheading) {
          setLoginSubheading(data.loginSubheading);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchSettings();

    const socket = connectSocket();
    const handleSettingsUpdated = (data: any) => {
      if (data.category === 'general') {
        if (data.updates.hotelBanner !== undefined) setBgImage(data.updates.hotelBanner || '/images/hotel_bg.png');
        if (data.updates.hotelLogo !== undefined) setHotelLogo(data.updates.hotelLogo || '');
        if (data.updates.hotelName) setHotelName(data.updates.hotelName);
        if (data.updates.loginHeadingMain !== undefined) setLoginHeadingMain(data.updates.loginHeadingMain || 'Smart Hotel Management Simplified.');
        if (data.updates.loginSubheading !== undefined) setLoginSubheading(data.updates.loginSubheading || 'Manage bookings, guests, staff, and operations seamlessly with our all-in-one hotel management solution.');
      }
    };
    socket.on('settings:updated', handleSettingsUpdated);
    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const trimmedUsername = username.trim();
      const data = await api.post<any>('/api/auth/login', { username: trimmedUsername, password });

      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      if (rememberMe) {
        localStorage.setItem('rememberedUsername', trimmedUsername);
      } else {
        localStorage.removeItem('rememberedUsername');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B1220]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A050]"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-theme-main text-theme-text font-sans">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgImage.startsWith('http') || bgImage.startsWith('/images/') ? bgImage : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${bgImage}`}')` }}
        >
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/95 via-[#0B1220]/70 to-[#0B1220]/30"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div>
            <div className="flex items-center gap-5 mb-16 text-[#C9A050]">
              {hotelLogo ? (
                <img loading="lazy" decoding="async" src={hotelLogo.startsWith('http') || hotelLogo.startsWith('/images/') ? hotelLogo : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}${hotelLogo}`} alt="Hotel Logo" className="h-14 w-auto object-contain rounded-2xl shadow-lg" />
              ) : (
                <div className="p-3 border border-[#C9A050]/50 rounded-2xl flex-shrink-0 bg-[#C9A050]/10 backdrop-blur-md">
                  <Crown size={28} className="text-[#C9A050]" />
                </div>
              )}
              <div className={`flex flex-col uppercase tracking-[0.15em] leading-tight ${outfit.className}`}>
                <span className="text-2xl font-bold text-white drop-shadow-md">{hotelName}</span>
                {!hotelLogo && <span className="text-[10px] font-medium tracking-[0.4em] text-[#C9A050] mt-1 drop-shadow-sm">Hotels & Resorts</span>}
              </div>
            </div>

            <h1 className={`text-6xl font-medium leading-tight mb-6 text-white ${playfair.className}`}>
              {loginHeadingMain}
            </h1>
            
            <p className="text-white/80 text-lg max-w-md mb-16 leading-relaxed">
              {loginSubheading}
            </p>

            <div className="flex gap-10">
              <div className="flex flex-col items-center text-center gap-3 max-w-[100px]">
                <Building2 size={28} className="text-[#C9A050]" />
                <span className="text-sm font-medium text-white/80">All-in-One<br />Solution</span>
              </div>
              <div className="flex flex-col items-center text-center gap-3 max-w-[100px]">
                <ShieldCheck size={28} className="text-[#C9A050]" />
                <span className="text-sm font-medium text-white/80">Secure &<br />Reliable</span>
              </div>
              <div className="flex flex-col items-center text-center gap-3 max-w-[100px]">
                <BarChart3 size={28} className="text-[#C9A050]" />
                <span className="text-sm font-medium text-white/80">Real-time<br />Analytics</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60">
            © 2025 {hotelName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-24 justify-center relative bg-theme-main overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-400/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Language Dropdown */}
        <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-theme-card/80 backdrop-blur-md shadow-soft rounded-full text-sm cursor-pointer hover:bg-theme-hover transition-colors border border-theme-border z-10">
          <Globe size={16} className="text-theme-muted" />
          <span>English</span>
          <svg className="w-4 h-4 ml-1 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>

        <div className="w-full max-w-md mx-auto relative z-10 bg-theme-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-soft border border-theme-border/50">
          <div className="mb-10 text-center">
            <h2 className={`text-3xl font-bold mb-2 text-theme-text tracking-tight ${outfit.className}`}>Welcome Back</h2>
            <p className="text-theme-muted">Sign in to continue to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-muted-light">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-muted-light">
                  <Mail size={18} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-theme-main border border-theme-border rounded-xl text-theme-text placeholder-theme-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  placeholder="Username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-theme-muted-light">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-muted-light">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 bg-theme-main border border-theme-border rounded-xl text-theme-text placeholder-theme-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  placeholder="••••••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-theme-muted-light hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer w-4 h-4 rounded border-theme-strong bg-theme-main text-primary focus:ring-primary/20 transition-all cursor-pointer appearance-none checked:bg-primary checked:border-primary" />
                  <Check size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className="text-sm text-theme-muted group-hover:text-theme-text transition-colors">Remember me</span>
              </label>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setError('Please contact your system administrator to reset your password.'); }}
                className="text-sm text-primary hover:text-blue-600 transition-colors font-medium"
              >
                Forgot password?
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 active:scale-95 shadow-lg shadow-primary/20"
            >
              {loading ? 'Signing in...' : 'Login'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>



          <p className="mt-8 text-center text-sm text-theme-muted">
            Don&apos;t have an account? <span className="text-theme-muted-light font-medium">Contact your administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}
