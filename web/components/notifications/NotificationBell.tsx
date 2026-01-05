'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0, isLoading: isLoadingCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        // Backend returns { count: number }
        if (response.data && typeof response.data === 'object' && 'count' in response.data) {
          const count = Number(response.data.count);
          return isNaN(count) ? 0 : count;
        }
        // Fallback: if it's already a number
        if (typeof response.data === 'number') {
          return response.data;
        }
        return 0;
      } catch (error: any) {
        console.error('Failed to fetch unread count:', error);
        // Don't show error for 401/403 (not authenticated)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return 0;
        }
        return 0;
      }
    },
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 1, // Only retry once on failure
  });

  // Fetch recent notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications?limit=10&unreadOnly=false');
        // Backend returns { data: Notification[], total: number }
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        // Fallback: if data is directly an array
        if (Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error: any) {
        console.error('Failed to fetch notifications:', error);
        // Don't show error for 401/403 (not authenticated)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return [];
        }
        return [];
      }
    },
    enabled: isOpen, // Only fetch when dropdown is open
    retry: 1, // Only retry once on failure
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Ensure unreadCount is always a number
  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition group"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface-light dark:ring-surface-dark animate-pulse" />
        )}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 ring-2 ring-surface-light dark:ring-surface-dark">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Notifications
              </h3>
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="text-sm text-primary hover:text-primary/80 transition disabled:opacity-50"
                >
                  {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Loading notifications...
                  </p>
                </div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    No notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-background-light dark:hover:bg-background-dark transition cursor-pointer relative group ${
                        !notification.isRead
                          ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Priority Indicator */}
                        {notification.priority && notification.priority !== 'low' && (
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(
                              notification.priority
                            )}`}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`text-sm font-medium text-text-light dark:text-text-dark ${
                                !notification.isRead ? 'font-semibold' : ''
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-background-light dark:hover:bg-background-dark rounded"
                              title="Delete"
                              aria-label="Delete notification"
                            >
                              <X className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                            </button>
                          </div>
                          <p className="text-sm text-text-light/70 dark:text-text-dark/70 mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-text-light/50 dark:text-text-dark/50">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            {notification.actionLabel && (
                              <span className="text-xs text-primary font-medium">
                                {notification.actionLabel} →
                              </span>
                            )}
                          </div>
                        </div>

                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border-light dark:border-border-dark">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium py-2"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
