'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Filter, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import Button from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  metadata?: Record<string, any>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const limit = 20;

  // Fetch notifications
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'all', filter, page],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: ((page - 1) * limit).toString(),
        });

        if (filter === 'unread') {
          params.append('unreadOnly', 'true');
        }

        const response = await api.get(`/notifications?${params.toString()}`);
        // Backend returns { data: { data: Notification[], total: number } } or { data: Notification[], ... }
        const resData = response.data.data !== undefined ? response.data.data : response.data;
        
        if (resData?.data && Array.isArray(resData.data)) {
          return {
            data: resData.data,
            total: resData.total || resData.data.length,
          };
        }
        // Fallback: if data is directly an array
        if (Array.isArray(resData)) {
          return {
            data: resData,
            total: resData.length,
          };
        }
        return {
          data: [],
          total: 0,
        };
      } catch (error: any) {
        console.error('Failed to fetch notifications:', error);
        // Don't throw for 401/403 (not authenticated)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return { data: [], total: 0 };
        }
        throw error;
      }
    },
    retry: 1,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        const resData = response.data.data !== undefined ? response.data.data : response.data;

        // Backend returns { count: number }
        if (resData && typeof resData === 'object' && 'count' in resData) {
          const count = Number(resData.count);
          return isNaN(count) ? 0 : count;
        }
        // Fallback: if it's already a number
        if (typeof resData === 'number') {
          return resData;
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
    retry: 1,
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
      success('Notification deleted');
      setDeleteId(null);
    },
    onError: () => {
      toastError('Failed to delete notification');
    },
  });

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Ensure unreadCount is always a number
  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      try {
        // Handle absolute URLs (e.g. from email context) by stripping origin for client-side nav
        if (notification.actionUrl.startsWith('http')) {
          const url = new URL(notification.actionUrl);
          router.push(url.pathname + url.search + url.hash);
        } else {
          router.push(notification.actionUrl);
        }
      } catch (e) {
        // Fallback
        router.push(notification.actionUrl);
      }
    }
  };

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      default:
        return 'Low';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <p className="text-danger">Failed to load notifications. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
              Notifications
            </h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              {count > 0
                ? `${count} unread notification${count !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          {count > 0 && (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
          <button
            onClick={() => {
              setFilter('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => {
              setFilter('unread');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
            }`}
          >
            Unread ({count})
          </button>
          <button
            onClick={() => {
              setFilter('read');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'read'
                ? 'bg-primary text-white'
                : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
            }`}
          >
            Read ({Math.max(0, total - count)})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-12 text-center">
          <Bell className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
            No notifications
          </h3>
          <p className="text-text-light/60 dark:text-text-dark/60">
            {filter === 'unread'
              ? "You're all caught up! No unread notifications."
              : filter === 'read'
                ? 'No read notifications yet.'
                : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 transition cursor-pointer ${
                  !notification.isRead
                    ? 'ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Badge */}
                  {notification.priority && notification.priority !== 'low' && (
                    <div
                      className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${getPriorityColor(
                        notification.priority
                      )}`}
                    >
                      {getPriorityLabel(notification.priority)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className={`text-base font-medium text-text-light dark:text-text-dark ${
                          !notification.isRead ? 'font-semibold' : ''
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
                          title="Delete"
                          aria-label="Delete notification"
                        >
                          <X className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-text-light/70 dark:text-text-dark/70 mb-3">
                      {notification.body}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-text-light/50 dark:text-text-dark/50">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.readAt && (
                          <span>
                            Read{' '}
                            {formatDistanceToNow(new Date(notification.readAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                        <span>
                          {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {notification.actionLabel && (
                        <span className="text-sm text-primary font-medium">
                          {notification.actionLabel} →
                        </span>
                      )}
                    </div>
                  </div>

                  {!notification.isRead && (
                    <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="secondary"
              >
                Previous
              </Button>
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
          }
        }}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isProcessing={deleteMutation.isPending}
      />
    </div>
  );
}
