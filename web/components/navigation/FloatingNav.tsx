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
    icon: Scissors,
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

  const toggleMenu = useCallback(() => setIsOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

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
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-lg shadow-black/10 dark:shadow-black/30 px-1.5 py-1.5 md:px-2 md:py-2">
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
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />
                  )}

                  {/* Content Container */}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-1 py-1.5">
                    <div
                      className={`flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-black dark:text-white opacity-70 group-hover:opacity-100 group-hover:text-black dark:group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 md:w-5 md:h-5 flex-shrink-0" />
                    </div>
                    <span
                      className={`text-[9px] md:text-[10px] font-semibold mt-0.5 transition-all duration-300 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5 ${
                        isActive
                          ? 'text-white opacity-100'
                          : 'text-black dark:text-white opacity-70 group-hover:opacity-100'
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
              onClick={toggleMenu}
              className={`relative z-10 flex flex-col items-center justify-center w-[60px] h-[68px] md:w-14 md:h-16 rounded-2xl transition-all duration-300 group overflow-hidden ${
                isOpen
                  ? 'text-white bg-gradient-to-br from-gray-600 to-gray-700 scale-105 shadow-lg shadow-black/20'
                  : 'text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:scale-105 active:scale-95'
              }`}
              title="More"
            >
              {/* Hover Background */}
              {!isOpen && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-1 py-1.5">
                <div
                  className={`flex items-center justify-center transition-all duration-300 ${
                    isOpen
                      ? 'text-white'
                      : 'text-black dark:text-white opacity-70 group-hover:opacity-100 group-hover:text-black dark:group-hover:text-white'
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
                      : 'text-black dark:text-white opacity-70 group-hover:opacity-100'
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
            onClick={closeMenu}
          />
          <div className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[90vw] md:max-w-none">
            <div className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-4 md:p-5 min-w-[320px] md:min-w-[400px]">
              <div className="mb-3 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <h3 className="text-sm md:text-base font-bold text-black dark:text-white">
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
                      onClick={closeMenu}
                      className={`group flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-br ${item.color} text-white scale-105 shadow-lg shadow-black/20`
                          : 'bg-white dark:bg-gray-900 text-black/80 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white hover:scale-105 active:scale-95 border border-transparent hover:border-gray-200/30 dark:hover:border-gray-700/30'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          isActive
                            ? ''
                            : 'group-hover:bg-gray-50/50 dark:group-hover:bg-gray-800/50'
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

export default memo(FloatingNavComponent);
