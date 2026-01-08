'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Save, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Camera,
  Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useRef } from 'react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Configure how you receive alerts' },
    { id: 'security', name: 'Security', icon: Shield, description: 'Update password and security settings' },
    { id: 'api', name: 'API Keys', icon: Key, description: 'Manage developer access keys' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Settings</h1>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
          Manage your account preferences and security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'text-text-light/60 dark:text-text-dark/60 hover:bg-surface-light dark:hover:bg-surface-dark hover:text-text-light dark:hover:text-text-dark'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  <div className="text-left">
                    <div className={isActive ? 'text-white' : 'text-text-light dark:text-text-dark'}>
                      {tab.name}
                    </div>
                    {isActive && (
                      <div className="text-[10px] text-white/80 font-normal hidden sm:block">
                        {tab.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 min-h-[500px]">
            {activeTab === 'profile' && <ProfileSettings user={user} isLoading={isLoading} setIsLoading={setIsLoading} />}
            {activeTab === 'notifications' && <NotificationSettings isLoading={isLoading} setIsLoading={setIsLoading} />}
            {activeTab === 'security' && <SecuritySettings isLoading={isLoading} setIsLoading={setIsLoading} />}
            {activeTab === 'api' && <ApiSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user, isLoading, setIsLoading }: any) {
  const { refreshUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload image
      const uploadResponse = await api.post('/uploads/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const avatarUrl = uploadResponse.data.url;

      // Update user profile
      // Use /users/me endpoint since /users/:id might be admin-only or non-existent
      await api.put('/users/me', {
        avatar: avatarUrl,
      });

      // Refresh local user state
      await refreshUser();
      
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Profile Information</h2>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          Update your personal details and public profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-background-light dark:border-background-dark shadow-xl overflow-hidden relative">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || 'U'
              )}
              
              {/* Overlay on hover or during upload */}
              <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          
          <div>
            <Button 
              variant="secondary" 
              size="sm" 
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Change Avatar'}
            </Button>
            <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-2">
              JPG, GIF or PNG. Max size 2MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type="text"
                defaultValue={user?.fullName}
                className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Phone Number
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type="tel"
                defaultValue={user?.phone}
                className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type="text"
                defaultValue={user?.role?.replace('_', ' ')}
                disabled
                className="w-full pl-9 pr-4 py-2.5 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light/60 cursor-not-allowed capitalize"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-light dark:border-border-dark flex justify-end">
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NotificationSettings({ isLoading, setIsLoading }: any) {
  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Notifications</h2>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          Choose how you want to be notified
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-light dark:text-text-dark">Email Notifications</p>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">Get updates about your account via email</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Smartphone className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-light dark:text-text-dark">SMS Notifications</p>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">Receive urgent alerts via SMS</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-light dark:text-text-dark">Push Notifications</p>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">Receive notifications on your device</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings({ isLoading, setIsLoading }: any) {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Security</h2>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          Manage your password and account security
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-warning/90">
            <p className="font-semibold">Secure your account</p>
            <p className="mt-1 opacity-90">Make sure your password is strong and unique. We recommend using a password manager.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-primary transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              New Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
              Confirm New Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-light dark:border-border-dark flex justify-end">
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">API Keys</h2>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          Manage your API credentials for external integrations
        </p>
      </div>

      <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">Developer API Access</h3>
        <p className="text-text-light/60 dark:text-text-dark/60 max-w-sm mx-auto mb-6">
          Generate API keys to authenticate your requests when integrating with our external API endpoints.
        </p>
        <Button variant="primary" disabled>
          Generate New Key
        </Button>
      </div>
    </div>
  );
}
