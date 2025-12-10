'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    color: 'from-indigo-500 to-purple-500',
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN],
  },
  {
    name: 'Memberships',
    href: '/memberships',
    icon: Building2,
    color: 'from-amber-500 to-orange-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.CUSTOMER,
    ],
  },
  {
    name: 'Salons',
    href: '/salons',
    icon: Scissors,
    color: 'from-purple-500 to-pink-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Browse Salons',
    href: '/salons/browse',
    icon: Scissors,
    color: 'from-purple-500 to-pink-500',
    requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_EMPLOYEE],
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
    color: 'from-green-500 to-emerald-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    color: 'from-orange-500 to-red-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'My Appointments',
    href: '/appointments/my',
    icon: Calendar,
    color: 'from-orange-500 to-red-500',
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Services',
    href: '/services',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Purchase History',
    href: '/sales/history',
    icon: ShoppingCart,
    color: 'from-indigo-500 to-blue-500',
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
    color: 'from-indigo-500 to-blue-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Commissions',
    href: '/commissions',
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Payroll',
    href: '/payroll',
    icon: DollarSign,
    color: 'from-teal-500 to-cyan-500',
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    color: 'from-yellow-500 to-orange-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
  },
  {
    name: 'Accounting',
    href: '/accounting',
    icon: DollarSign,
    color: 'from-green-500 to-teal-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  {
    name: 'Loans',
    href: '/loans',
    icon: CreditCard,
    color: 'from-pink-500 to-rose-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  {
    name: 'Wallets',
    href: '/wallets',
    icon: Wallet,
    color: 'from-cyan-500 to-blue-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  {
    name: 'Airtel',
    href: '/airtel',
    icon: Phone,
    color: 'from-red-500 to-orange-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    color: 'from-violet-500 to-purple-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'from-gray-500 to-slate-500' },
];

export default function FloatingNav() {
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

  const activeItem = navItems.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
  );

  return (
    <>
      {/* Floating Navigation Bar */}
      <nav
        className={`fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          isScrolled ? 'scale-[0.98] opacity-95' : 'scale-100 opacity-100'
        }`}
      >
        <div className="bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-2xl border border-border-light/50 dark:border-border-dark/50 rounded-3xl shadow-lg shadow-black/10 dark:shadow-black/30 px-1.5 py-1.5 md:px-2 md:py-2">
          <div className="flex items-center gap-0.5 md:gap-1 relative">
            {/* Navigation Items */}
            {navItems.slice(0, 6).map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative z-10 flex flex-col items-center justify-center w-[60px] h-[68px] md:w-14 md:h-16 rounded-2xl transition-all duration-300 group overflow-hidden ${
                    isActive
                      ? 'scale-105'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  title={item.name}
                >
                  {/* Active Background - Pill Shape */}
                  {isActive && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl transition-all duration-500 ease-out z-0`}
                    />
                  )}
                  
                  {/* Active Border Ring */}
                  {isActive && (
                    <div
                      className={`absolute inset-0 border-2 border-white/30 dark:border-white/20 rounded-2xl z-[1] pointer-events-none`}
                    />
                  )}

                  {/* Hover Background */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-surface-light/80 dark:bg-surface-dark/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />
                  )}

                  {/* Content Container */}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-1 py-1.5">
                    <div
                      className={`flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-text-light dark:text-text-dark opacity-70 group-hover:opacity-100 group-hover:text-text-light dark:group-hover:text-text-dark'
                      }`}
                    >
                      <Icon className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" />
                    </div>
                    <span
                      className={`text-[9px] md:text-[10px] font-semibold mt-0.5 transition-all duration-300 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5 ${
                        isActive
                          ? 'text-white opacity-100'
                          : 'text-text-light dark:text-text-dark opacity-70 group-hover:opacity-100'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* More Menu */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`relative z-10 flex flex-col items-center justify-center w-[60px] h-[68px] md:w-14 md:h-16 rounded-2xl transition-all duration-300 group overflow-hidden ${
                isOpen
                  ? 'text-white bg-gradient-to-br from-gray-600 to-slate-600 scale-105 shadow-lg shadow-black/20'
                  : 'text-text-light/70 dark:text-text-dark/70 hover:text-text-light dark:hover:text-text-dark hover:scale-105 active:scale-95'
              }`}
              title="More"
            >
              {/* Hover Background */}
              {!isOpen && (
                <div className="absolute inset-0 bg-surface-light/80 dark:bg-surface-dark/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-1 py-1.5">
                <div
                  className={`flex items-center justify-center transition-all duration-300 ${
                    isOpen
                      ? 'text-white'
                      : 'text-text-light dark:text-text-dark opacity-70 group-hover:opacity-100 group-hover:text-text-light dark:group-hover:text-text-dark'
                  }`}
                >
                  {isOpen ? (
                    <X className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" />
                  ) : (
                    <Menu className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" />
                  )}
                </div>
                <span
                  className={`text-[9px] md:text-[10px] font-semibold mt-0.5 transition-all duration-300 text-center leading-tight whitespace-nowrap ${
                    isOpen 
                      ? 'text-white opacity-100' 
                      : 'text-text-light dark:text-text-dark opacity-70 group-hover:opacity-100'
                  }`}
                >
                  More
                </span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Expanded Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[90vw] md:max-w-none">
            <div className="bg-surface-light/98 dark:bg-surface-dark/98 backdrop-blur-2xl border border-border-light/50 dark:border-border-dark/50 rounded-3xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-4 md:p-5 min-w-[320px] md:min-w-[400px]">
              <div className="mb-3 pb-3 border-b border-border-light/50 dark:border-border-dark/50">
                <h3 className="text-sm md:text-base font-bold text-text-light dark:text-text-dark">
                  More Options
                </h3>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                {navItems.slice(6).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-br ${item.color} text-white scale-105 shadow-lg shadow-black/20`
                          : 'bg-background-light dark:bg-background-dark text-text-light/80 dark:text-text-dark/80 hover:bg-surface-light dark:hover:bg-surface-dark hover:text-text-light dark:hover:text-text-dark hover:scale-105 active:scale-95 border border-transparent hover:border-border-light/30 dark:hover:border-border-dark/30'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          isActive
                            ? ''
                            : 'group-hover:bg-surface-light/50 dark:group-hover:bg-surface-dark/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold mt-1.5 text-center leading-tight">
                        {item.name}
                      </span>
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
