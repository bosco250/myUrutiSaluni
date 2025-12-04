'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import {
  LayoutDashboard,
  Users,
  Scissors,
  Calendar,
  ShoppingCart,
  Package,
  DollarSign,
  CreditCard,
  Wallet,
  Phone,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  color: string;
  requiredRoles?: UserRole[];
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500' },
  { name: 'Users', href: '/users', icon: Users, color: 'from-indigo-500 to-purple-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN] },
  { name: 'Membership', href: '/membership/apply', icon: Building2, color: 'from-amber-500 to-orange-500', requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_OWNER] },
  { name: 'Memberships', href: '/memberships', icon: Building2, color: 'from-amber-500 to-orange-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Salons', href: '/salons', icon: Scissors, color: 'from-purple-500 to-pink-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Browse Salons', href: '/salons/browse', icon: Scissors, color: 'from-purple-500 to-pink-500', requiredRoles: [UserRole.CUSTOMER] },
  { name: 'Customers', href: '/customers', icon: Users, color: 'from-green-500 to-emerald-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Appointments', href: '/appointments', icon: Calendar, color: 'from-orange-500 to-red-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'My Appointments', href: '/appointments/my', icon: Calendar, color: 'from-orange-500 to-red-500', requiredRoles: [UserRole.CUSTOMER] },
  { name: 'Services', href: '/services', icon: Sparkles, color: 'from-pink-500 to-rose-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Purchase History', href: '/sales/history', icon: ShoppingCart, color: 'from-indigo-500 to-blue-500', requiredRoles: [UserRole.CUSTOMER] },
  { name: 'Sales', href: '/sales', icon: ShoppingCart, color: 'from-indigo-500 to-blue-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Commissions', href: '/commissions', icon: TrendingUp, color: 'from-emerald-500 to-green-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Inventory', href: '/inventory', icon: Package, color: 'from-yellow-500 to-orange-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { name: 'Accounting', href: '/accounting', icon: DollarSign, color: 'from-green-500 to-teal-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Loans', href: '/loans', icon: CreditCard, color: 'from-pink-500 to-rose-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Wallets', href: '/wallets', icon: Wallet, color: 'from-cyan-500 to-blue-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Airtel', href: '/airtel', icon: Phone, color: 'from-red-500 to-orange-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Reports', href: '/reports', icon: BarChart3, color: 'from-violet-500 to-purple-500', requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'from-gray-500 to-slate-500' },
];

export default function FloatingNav() {
  const { theme } = useTheme();
  const { hasAnyRole } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // If no required roles, allow access (e.g., Dashboard, Settings)
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      // Check if user has any of the required roles
      return hasAnyRole(item.requiredRoles);
    });
  }, [hasAnyRole]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeItem = navItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'));

  return (
    <>
      {/* Floating Navigation Bar */}
      <nav
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          isScrolled ? 'scale-95 opacity-90' : 'scale-100 opacity-100'
        }`}
      >
        <div className="bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-xl border border-border-light dark:border-border-dark rounded-2xl shadow-2xl px-2 py-2">
          <div className="flex items-center gap-1 relative">
            {/* Active Indicator */}
            {activeItem && navItems.slice(0, 6).some((item) => item.href === activeItem.href) && (
              <div
                className={`absolute bg-gradient-to-r ${activeItem.color} rounded-xl transition-all duration-300 ease-out z-0`}
                style={{
                  width: '56px',
                  height: '56px',
                  left: `${navItems.slice(0, 6).findIndex((item) => item.href === activeItem.href) * 64 + 4}px`,
                }}
              />
            )}

            {/* Navigation Items */}
            {navItems.slice(0, 6).map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative z-10 flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'text-white scale-110'
                      : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:scale-105'
                  }`}
                  title={item.name}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
                </Link>
              );
            })}

            {/* More Menu */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`relative z-10 flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${
                isOpen
                  ? 'text-white bg-gradient-to-r from-gray-500 to-slate-500 scale-110'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:scale-105'
              }`}
              title="More"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Expanded Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl border border-border-light dark:border-border-dark rounded-2xl shadow-2xl p-4 min-w-[300px]">
              <div className="grid grid-cols-3 gap-2">
                {navItems.slice(6).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                        isActive
                          ? `bg-gradient-to-br ${item.color} text-white scale-105`
                          : 'bg-background-light dark:bg-background-dark text-text-light/80 dark:text-text-dark/80 hover:text-text-light dark:hover:text-text-dark hover:scale-105'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

