'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { Search, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import GlobalSearch from '@/components/navigation/GlobalSearch';
import NotificationBell from '@/components/notifications/NotificationBell';

function ModernHeaderComponent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const closeUserMenu = useCallback(() => setShowUserMenu(false), []);
  const toggleUserMenu = useCallback(() => setShowUserMenu(prev => !prev), []);
  const openSearch = useCallback(() => setShowSearch(true), []);
  const closeSearch = useCallback(() => setShowSearch(false), []);

  const handleSettingsClick = useCallback(() => {
    router.push('/settings');
    setShowUserMenu(false);
  }, [router]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-border-light dark:border-border-dark">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition" />
                <input
                  type="text"
                  placeholder="Search everything... (⌘K)"
                  onClick={openSearch}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition cursor-pointer"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-text-light/40 dark:text-text-dark/40 bg-surface-light dark:bg-surface-dark rounded border border-border-light dark:border-border-dark">
                  <span>⌘</span>
                  <span>K</span>
                </kbd>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="relative p-2 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition group"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center gap-2 p-1.5 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition group"
                >
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs ring-2 ring-primary/20">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                      {user?.fullName || 'User'}
                    </p>
                    <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 capitalize">
                      {user?.role?.replace('_', ' ') || 'User'}
                    </p>
                  </div>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={closeUserMenu} />
                    <div className="absolute right-0 mt-1 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-border-light dark:border-border-dark">
                        <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                          {user?.fullName}
                        </p>
                        <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-0.5">
                          {user?.email}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <button
                          onClick={handleSettingsClick}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-light/80 dark:text-text-dark/80 hover:bg-background-light dark:hover:bg-background-dark rounded-md transition"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Settings
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-danger hover:bg-background-light dark:hover:bg-background-dark rounded-md transition mt-0.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
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

      {/* Global Search */}
      <GlobalSearch isOpen={showSearch} onClose={closeSearch} />
    </>
  );
}

// Memoized export to prevent unnecessary re-renders
export default memo(ModernHeaderComponent);
