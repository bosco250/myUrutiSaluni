'use client';

import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function Header() {
  const { user } = useAuthStore();

  return (
    <header className="bg-background-light border-b border-border-light px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background-light text-text-light"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-text-secondary hover:text-text-light hover:bg-background-secondary rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-text-light">{user?.fullName}</p>
              <p className="text-xs text-text-secondary capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 bg-background-secondary dark:bg-surface-dark border-2 border-primary rounded-full flex items-center justify-center text-primary font-semibold">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

