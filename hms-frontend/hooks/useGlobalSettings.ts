'use client';
import { useState, useEffect } from 'react';
import { connectSocket } from '@/lib/socket';
import { api } from '@/lib/api';

interface GlobalSettings {
  hotelName: string;
  hotelLogo: string | null;
  hotelAddress: string;
  contactNumber: string;
  email: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxName: string;
  loading: boolean;
}

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>({
    hotelName: '',
    hotelLogo: null,
    hotelAddress: '',
    contactNumber: '',
    email: '',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    taxRate: 0,
    taxName: 'Tax',
    loading: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get<any>('/api/settings/public');
        setSettings({
          hotelName: data.hotelName || '',
          hotelLogo: data.hotelLogo || null,
          hotelAddress: data.hotelAddress || '',
          contactNumber: data.contactNumber || '',
          email: data.email || '',
          currency: data.currency || 'PKR',
          currencySymbol: data.currencySymbol || 'Rs.',
          taxRate: data.taxRate !== undefined ? data.taxRate : 0,
          taxName: data.taxName || 'Tax',
          loading: false,
        });
      } catch (err) {
        setSettings(prev => ({ ...prev, loading: false }));
      }
    };
    fetchSettings();

    // Real-time updates via WebSocket
    const socket = connectSocket();
    const handleSettingsUpdated = (data: any) => {
      if (data.category === 'general') {
        setSettings(prev => ({
          ...prev,
          hotelName: data.updates.hotelName ?? prev.hotelName,
          hotelLogo: data.updates.hotelLogo !== undefined ? (data.updates.hotelLogo || null) : prev.hotelLogo,
          hotelAddress: data.updates.hotelAddress ?? prev.hotelAddress,
          contactNumber: data.updates.contactNumber ?? prev.contactNumber,
          email: data.updates.email ?? prev.email,
        }));
      }
      if (data.category === 'hotel') {
        setSettings(prev => ({
          ...prev,
          currency: data.updates.currency ?? prev.currency,
          currencySymbol: data.updates.currencySymbol ?? prev.currencySymbol,
        }));
      }
      if (data.category === 'tax') {
        setSettings(prev => ({
          ...prev,
          taxRate: data.updates.rate !== undefined ? parseFloat(data.updates.rate) : prev.taxRate,
          taxName: data.updates.name ?? prev.taxName,
        }));
      }
    };
    socket.on('settings:updated', handleSettingsUpdated);
    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, []);

  return settings;
}
