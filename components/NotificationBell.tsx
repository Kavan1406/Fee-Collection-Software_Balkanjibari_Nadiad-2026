'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationApi, Notification } from '@/lib/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isAuthenticated } = useAuth();
 
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getNotifications();
      if (response.success) {
        const data = response.data.results || response.data;
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount(Array.isArray(data) ? data.filter(n => !n.is_read).length : 0);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.warn('Notifications fetch unauthorized - user may be logged out.');
      } else {
        console.error('Failed to fetch notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-background animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h4 className="font-bold text-sm font-poppins uppercase tracking-tight">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-8 text-primary hover:text-primary/80 px-2 font-inter"
                onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-xs text-muted-foreground font-inter">Checking for alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2 opacity-50">
                <div className="bg-muted p-3 rounded-full">
                    <Bell className="h-6 w-6" />
                </div>
              <p className="text-sm font-medium">All clear!</p>
              <p className="text-xs text-center px-4">No new notifications at the moment.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative group ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-center justify-between pr-6">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        notification.notification_type === 'REGISTRATION_NEW' ? 'bg-amber-100 text-amber-700' :
                        notification.notification_type === 'PAYMENT_SUCCESS' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                      {notification.notification_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h5 className={`text-sm font-bold leading-none font-poppins ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notification.title}
                  </h5>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-tight font-inter">
                    {notification.message}
                  </p>
                  {!notification.is_read && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full group-hover:hidden" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-3 border-t bg-muted/10">
          <Button variant="outline" className="w-full text-xs h-9 font-bold font-poppins uppercase tracking-widest" onClick={fetchNotifications}>
            Refresh Alerts
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
