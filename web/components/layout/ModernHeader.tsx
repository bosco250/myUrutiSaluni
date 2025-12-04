'use client';

import { useState } from 'react';
import { Search, Bell, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import CommandPalette from '@/components/navigation/CommandPalette';

export default function ModernHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-border-light dark:border-border-dark">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition" />
                <input
                  type="text"
                  placeholder="Search anything... (⌘K)"
                  onClick={() => setShowCommandPalette(true)}
                  className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-1 text-xs font-semibold text-text-light/40 dark:text-text-dark/40 bg-surface-light dark:bg-surface-dark rounded border border-border-light dark:border-border-dark">
                  <span>⌘</span>
                  <span>K</span>
                </kbd>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="relative p-2.5 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition group"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <button className="relative p-2.5 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition group">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface-light dark:ring-surface-dark" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm ring-2 ring-primary/20">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{user?.fullName || 'User'}</p>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 capitalize">
                      {user?.role?.replace('_', ' ') || 'User'}
                    </p>
                  </div>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-border-light dark:border-border-dark">
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">{user?.fullName}</p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">{user?.email}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            router.push('/settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-light/80 dark:text-text-dark/80 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition mt-1"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      )}
    </>
  );
}

