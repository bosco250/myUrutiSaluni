'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { User, Bell, Shield, Key } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'api', name: 'API Keys', icon: Key },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Settings</h1>
        <p className="text-text-light/60 dark:text-text-dark/60 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow border border-border-light dark:border-border-dark">
        <div className="border-b border-border-light dark:border-border-dark">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:border-border-light dark:hover:border-border-dark'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.fullName}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue={user?.phone}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Role</label>
                  <input
                    type="text"
                    defaultValue={user?.role?.replace('_', ' ')}
                    disabled
                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light/60 dark:text-text-dark/60"
                  />
                </div>
                <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark">
                  <div>
                    <p className="font-medium text-text-light dark:text-text-dark">Email Notifications</p>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Receive notifications via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                </div>
                <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark">
                  <div>
                    <p className="font-medium text-text-light dark:text-text-dark">SMS Notifications</p>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Receive notifications via SMS</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-primary" />
                </div>
                <div className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark">
                  <div>
                    <p className="font-medium text-text-light dark:text-text-dark">Push Notifications</p>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Receive push notifications</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">API Keys</h2>
              <p className="text-text-light/60 dark:text-text-dark/60 mb-4">
                Manage your API keys for third-party integrations
              </p>
              <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
                <p className="text-sm text-text-light/80 dark:text-text-dark/80">API key management coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

