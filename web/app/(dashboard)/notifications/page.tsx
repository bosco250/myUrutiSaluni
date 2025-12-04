'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Send,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  appointment?: {
    id: string;
    scheduledStart: string;
    service?: { name: string };
    salon?: { name: string };
  };
}

interface NotificationPreference {
  id: string;
  type: string;
  channel: string;
  enabled: boolean;
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER]}>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your notifications and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            History
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </div>
        </button>
      </div>

      {activeTab === 'history' ? <NotificationHistory /> : <NotificationSettings />}
    </div>
  );
}

function NotificationHistory() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=100');
      return response.data?.data || response.data || [];
    },
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'push':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
          <p className="text-gray-600 dark:text-gray-400">You haven't received any notifications yet.</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    {getChannelIcon(notification.channel)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notification.body}</p>
                  </div>
                </div>

                {notification.appointment && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {notification.appointment.service?.name} at {notification.appointment.salon?.name}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{format(new Date(notification.appointment.scheduledStart), 'PPpp')}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(notification.status)}
                    {notification.status}
                  </span>
                  <span>{format(new Date(notification.createdAt), 'PPpp')}</span>
                  {notification.sentAt && (
                    <span>Sent: {format(new Date(notification.sentAt), 'PPpp')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NotificationSettings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery<NotificationPreference[]>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences');
      return response.data?.data || response.data || [];
    },
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async (data: { type: string; channel: string; enabled: boolean }) => {
      await api.patch('/notifications/preferences', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const notificationTypes = [
    { value: 'appointment_reminder', label: 'Appointment Reminders', icon: Calendar },
    { value: 'appointment_confirmed', label: 'Appointment Confirmations', icon: CheckCircle2 },
    { value: 'appointment_cancelled', label: 'Appointment Cancellations', icon: XCircle },
    { value: 'appointment_rescheduled', label: 'Appointment Reschedules', icon: Clock },
    { value: 'payment_received', label: 'Payment Notifications', icon: Send },
  ];

  const channels = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'push', label: 'Push Notifications', icon: Smartphone },
  ];

  const getPreference = (type: string, channel: string): boolean => {
    const pref = preferences.find((p) => p.type === type && p.channel === channel);
    return pref ? pref.enabled : true; // Default to enabled if not set
  };

  const togglePreference = (type: string, channel: string, enabled: boolean) => {
    updatePreferenceMutation.mutate({ type, channel, enabled });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Choose how you want to receive different types of notifications
        </p>

        <div className="space-y-6">
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.value} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{type.label}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-12">
                  {channels.map((channel) => {
                    const ChannelIcon = channel.icon;
                    const enabled = getPreference(type.value, channel.value);
                    return (
                      <label
                        key={channel.value}
                        className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => togglePreference(type.value, channel.value, e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <ChannelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {channel.label}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

