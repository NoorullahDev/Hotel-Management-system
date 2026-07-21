'use client';

import React, { useEffect } from 'react';
import { LogIn, CalendarCheck, Sparkles, PenTool, Receipt, Info } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../../../../lib/socket';
import { api } from '@/lib/api';

const fetchNotifications = async () => {
  const json = await api.get<any>('/api/notifications?limit=5');
  return json.data || [];
};

const getIconData = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'check-in':
    case 'check-out': return { icon: LogIn, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'booking': return { icon: CalendarCheck, iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10 border-blue-500/20' };
    case 'room ready': return { icon: Sparkles, iconColor: 'text-yellow-500', iconBg: 'bg-yellow-500/10 border-yellow-500/20' };
    case 'maintenance': return { icon: PenTool, iconColor: 'text-theme-muted', iconBg: 'bg-theme-secondary border-theme-border' };
    case 'payment': return { icon: Receipt, iconColor: 'text-red-500', iconBg: 'bg-red-500/10 border-red-500/20' };
    default: return { icon: Info, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10 border-blue-500/20' };
  }
};

export default function NotificationsFeed() {
  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ['recentNotifications'],
    queryFn: fetchNotifications
  });

  useEffect(() => {
    const socket = connectSocket();

      const handleNewNotification = (newNotification: any) => {
        queryClient.setQueryData(['recentNotifications'], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return [newNotification];
          // Prepend and keep max 5 (since limit is 5 in the query)
          return [newNotification, ...oldData].slice(0, 5);
        });
      };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  return (
    <div className="bg-theme-card shadow-soft border border-theme-border rounded-2xl h-full flex flex-col">
      <div className="p-6 border-b border-theme-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-theme-text">Notifications</h2>
        <Link href="/notifications" className="text-sm text-theme-muted hover:text-theme-text transition-colors">
          View All
        </Link>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {!notifications || notifications.length === 0 ? (
            <div className="text-sm text-theme-muted-light text-center mt-4">No recent notifications</div>
          ) : (
            notifications?.map((notif: any) => {
              const iconData = getIconData(notif.type);
              const Icon = iconData.icon;
              const timeString = new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={notif.id} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border ${iconData.iconBg} ${iconData.iconColor}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-theme-text">{notif.title}</h4>
                      <span className="text-xs text-theme-muted-light flex-shrink-0">{timeString}</span>
                    </div>
                    <p className="text-sm text-theme-muted mt-0.5">{notif.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
