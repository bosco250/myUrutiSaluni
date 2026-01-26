'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import {
  LayoutDashboard,
  Users,
  Scissors,
  Store,
  Search,
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
  requiredRoles?: UserRole[];
  excludeMatch?: string[];
}

const allNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN],
  },
  {
    name: 'Memberships',
    href: '/memberships',
    icon: Building2,
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
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ],
    excludeMatch: ['/salons/browse'],
  },
  {
    name: 'Browse Salons',
    href: '/salons/browse',
    icon: Search,
    requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_EMPLOYEE],
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
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
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Services',
    href: '/services',
    icon: Sparkles,
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
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
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
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
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
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function FloatingNavComponent() {
  const { hasAnyRole } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // If no required roles, allow access (e.g., Dashboard, Settings)
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      return hasAnyRole(item.requiredRoles);
    });
  }, [hasAnyRole]);

  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Floating Navigation Sidebar - Responsive */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none md:fixed md:right-0 md:top-0 md:h-full md:left-auto md:bottom-auto md:translate-x-0 md:flex md:flex-col md:justify-center md:pr-4">
        <nav className="pointer-events-auto relative">
          {/* Main Backdrop Container */}
          <div className="bg-surface-light dark:bg-surface-dark backdrop-blur-xl border border-border-light dark:border-border-dark rounded-2xl shadow-xl p-1.5 flex flex-row items-center gap-1 md:flex-col pointer-events-auto transition-all duration-300">
            
            {/* Primary Nav Items */}
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isMatch = pathname === item.href || pathname?.startsWith(item.href + '/');
              const isExcluded = item.excludeMatch?.some(match => pathname === match || pathname?.startsWith(match));
              const isActive = isMatch && !isExcluded && !isOpen;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11"
                >
                  {/* Hover/Active Background Pill */}
                  <div
                    className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-primary opacity-100 shadow-md'
                        : 'bg-background-secondary/50 dark:bg-white/5 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                    }`}
                  />

                  {/* Icon */}
                  <Icon
                    className={`relative z-10 w-5 h-5 transition-colors duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                  />

                  {/* Tooltip (Left on Desktop, Hidden on Mobile) */}
                  <div className="hidden md:flex absolute right-full mr-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 items-center">
                    <div className="bg-surface-dark dark:bg-surface-light text-text-inverse dark:text-text-primary text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-xl whitespace-nowrap backdrop-blur-sm">
                      {item.name}
                    </div>
                  </div>

                  {/* Active Indicator Dot (Only showing for clarity on active) */}
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-full opacity-0 md:opacity-100" /> 
                  )}
                </Link>
              );
            })}

            {/* Separator */}
            <div className="w-px h-6 md:w-6 md:h-px bg-border-light dark:bg-border-dark mx-1 md:mx-auto" />

            {/* More Button */}
            <button
              onClick={toggleMenu}
              className={`group relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all duration-300 ${
                isOpen ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {!isOpen && (
                 <div className="absolute inset-0 bg-background-secondary/50 dark:bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100" />
              )}
              
              <div className={`relative z-10 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'group-hover:rotate-90'}`}>
                 {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </div>

               {/* Tooltip (Desktop Only) */}
               {!isOpen && (
                <div className="hidden md:flex absolute right-full mr-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 items-center">
                    <div className="bg-surface-dark dark:bg-surface-light text-text-inverse dark:text-text-primary text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
                      More Apps
                    </div>
                </div>
               )}
            </button>
          </div>
        </nav>
      </div>

      {/* Expanded Menu Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 animate-in fade-in duration-300"
            onClick={closeMenu}
          />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:right-20 md:translate-x-0 md:top-auto md:bottom-8 z-50 animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-8 zoom-in-95 duration-200 origin-bottom md:origin-bottom-right">
            <div className="bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl border border-border-light dark:border-border-dark rounded-2xl shadow-2xl p-4 w-[calc(100vw-5.5rem)] max-w-[320px]">
              
              <div className="flex items-center justify-between mb-4 pl-1">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                  Quick Access
                </h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
                {navItems.slice(6).map((item) => {
                  const Icon = item.icon;
                  const isMatch = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const isExcluded = item.excludeMatch?.some(match => pathname === match || pathname?.startsWith(match));
                  const isActive = isMatch && !isExcluded;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`group flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10 dark:ring-primary/40' // Improved contrast and visibility
                          : 'hover:bg-background-secondary/50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg mb-1.5 transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-background-secondary dark:bg-white/5 text-text-secondary group-hover:text-text-primary group-hover:scale-105 group-hover:bg-background-tertiary dark:group-hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-medium text-center truncate w-full ${
                          isActive ? 'text-primary font-semibold' : 'text-text-secondary group-hover:text-text-primary'
                      }`}>
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

export default memo(FloatingNavComponent);
