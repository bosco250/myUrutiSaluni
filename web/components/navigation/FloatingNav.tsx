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
  color: string;
  requiredRoles?: UserRole[];
}

const allNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'from-primary to-primary-light',
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    color: 'from-secondary to-secondary-light',
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN],
  },
  {
    name: 'Memberships',
    href: '/memberships',
    icon: Building2,
    color: 'from-warning to-warning-light',
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
    color: 'from-secondary-dark to-secondary',
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
    icon: Search,
    color: 'from-secondary-dark to-secondary',
    requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_EMPLOYEE],
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
    color: 'from-success to-success-light',
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
    color: 'from-warning to-error',
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
    color: 'from-warning to-error',
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Services',
    href: '/services',
    icon: Sparkles,
    color: 'from-primary-dark to-primary',
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
    color: 'from-info to-info-light',
    requiredRoles: [UserRole.CUSTOMER],
  },
  {
    name: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
    color: 'from-info to-info-light',
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
    color: 'from-success-dark to-success',
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
    color: 'from-success to-info',
    requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    color: 'from-warning-dark to-warning',
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
    color: 'from-success to-success-dark',
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
    color: 'from-error to-error-light',
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
    color: 'from-info-dark to-info',
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
    color: 'from-error-dark to-warning',
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
    color: 'from-secondary to-secondary-dark',
    requiredRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
    ],
  },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'from-gray-500 to-gray-600' },
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
          <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-gray-300 dark:border-white/10 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/50 p-1.5 flex flex-row items-center gap-1 md:flex-col pointer-events-auto transition-all duration-300">
            
            {/* Primary Nav Items */}
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

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
                        ? `bg-gradient-to-tr ${item.color} opacity-100 shadow-md`
                        : 'bg-gray-100 dark:bg-white/10 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                    }`}
                  />

                  {/* Icon */}
                  <Icon
                    className={`relative z-10 w-5 h-5 transition-colors duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                    }`}
                  />

                  {/* Tooltip (Left on Desktop, Hidden on Mobile) */}
                  <div className="hidden md:flex absolute right-full mr-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 items-center">
                    <div className="bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-xl whitespace-nowrap backdrop-blur-sm">
                      {item.name}
                    </div>
                  </div>

                  {/* Active Indicator Dot (Only showing for clarity on active) */}
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-current rounded-full opacity-0" /> 
                  )}
                </Link>
              );
            })}

            {/* Separator */}
            <div className="w-px h-6 md:w-6 md:h-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-auto opacity-50" />

            {/* More Button */}
            <button
              onClick={toggleMenu}
              className={`group relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all duration-300 ${
                isOpen ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg' : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {!isOpen && (
                 <div className="absolute inset-0 bg-gray-100 dark:bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100" />
              )}
              
              <div className={`relative z-10 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'group-hover:rotate-90'}`}>
                 {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </div>

               {/* Tooltip (Desktop Only) */}
               {!isOpen && (
                <div className="hidden md:flex absolute right-full mr-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 items-center">
                    <div className="bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
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
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 animate-in fade-in duration-300"
            onClick={closeMenu}
          />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:right-20 md:translate-x-0 md:top-auto md:bottom-8 z-50 animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-8 zoom-in-95 duration-200 origin-bottom md:origin-bottom-right">
            <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl shadow-black/20 p-4 w-[calc(100vw-5.5rem)] max-w-[320px]">
              
              <div className="flex items-center justify-between mb-4 pl-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Quick Access
                </h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
                {navItems.slice(6).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`group flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gray-100 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10'
                          : 'hover:bg-gray-200/50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg mb-1.5 transition-all duration-200 ${
                          isActive
                            ? `bg-gradient-to-br ${item.color} text-white shadow-sm`
                            : 'bg-gray-200/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 group-hover:scale-105 group-hover:bg-gray-300 dark:group-hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-medium text-center truncate w-full ${
                          isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
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
