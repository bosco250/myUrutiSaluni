'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  ClipboardCheck,
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
      UserRole.SALON_EMPLOYEE,
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
      UserRole.SALON_EMPLOYEE,
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
  {
    name: 'Inspections',
    href: '/inspections',
    icon: ClipboardCheck,
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
          <div className="bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-2xl border-2 border-slate-300 dark:border-slate-700 rounded-2xl md:rounded-[1.8rem] p-1 flex flex-row items-center gap-0.5 md:flex-col md:w-14 lg:w-16 pointer-events-auto transition-all duration-500">
            
            {/* Primary Nav Items */}
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isMatch = pathname === item.href || pathname?.startsWith(item.href + '/');
              const isExcluded = item.excludeMatch?.some(match => pathname === match || pathname?.startsWith(match));
              const isActive = isMatch && !isExcluded && !isOpen;

              return (
                  <motion.div key={item.href} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                  <Link
                    href={item.href}
                    onMouseEnter={() => setHoveredId(item.href)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group relative flex flex-col items-center justify-center w-full min-h-[48px] md:min-h-[54px] gap-0.5 px-0.5 rounded-xl transition-all duration-300"
                  >
                    {/* Hover/Active Background Pill */}
                    <div
                      className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-primary opacity-100 scale-100'
                          : 'bg-primary/10 dark:bg-white/10 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                      }`}
                    />

                    {/* Icon */}
                    <Icon
                      strokeWidth={isActive ? 3 : 2.5}
                      className={`relative z-10 w-4 h-4 md:w-4.5 md:h-4.5 transition-transform duration-300 group-hover:scale-110 ${
                        isActive
                          ? 'text-white'
                          : 'text-text-primary dark:text-white group-hover:text-primary'
                      }`}
                    />

                    {/* Label */}
                    <span 
                      className={`relative z-10 text-[7.5px] md:text-[8.5px] font-bold tracking-tight transition-colors duration-300 text-center w-full block truncate px-0.5 leading-tight ${
                        isActive 
                          ? 'text-white' 
                          : 'text-text-primary dark:text-white group-hover:text-text-primary'
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>

                    {/* Active Indicator Bar (Bottom) */}
                    {isActive && (
                      <div className="absolute bottom-1 w-6 h-1 bg-white rounded-full hidden md:block" /> 
                    )}

                    {/* Floating Hover Label - Desktop Only */}
                    <AnimatePresence mode="wait">
                      {hoveredId === item.href && (
                        <motion.div
                          key="tooltip"
                          initial={{ opacity: 0, x: 10, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 10, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 600, damping: 30 }}
                          className="absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 hidden md:flex items-center pointer-events-none z-[100]"
                        >
                          <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-2.5 py-1 rounded-lg shadow-xl border border-white/10 dark:border-black/10 backdrop-blur-md">
                            <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">{item.name}</span>
                          </div>
                          {/* Triangle Arrow */}
                          <div className="w-1.5 h-1.5 bg-slate-900/95 dark:bg-white/95 border-r border-t border-white/10 dark:border-black/10 rotate-45 -ml-1 shadow-sm" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                </Link>
                </motion.div>
              );
            })}

            {/* Separator */}
            <div className="w-px h-6 md:w-6 md:h-px bg-border-light dark:bg-border-dark mx-1 md:mx-auto" />

            {/* More Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMenu}
              onMouseEnter={() => setHoveredId('apps')}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex flex-col items-center justify-center w-11 md:w-full min-h-[48px] md:min-h-[54px] gap-0.5 px-0.5 rounded-xl transition-all duration-300 ${
                isOpen ? 'bg-primary text-white border-2 border-white/20' : 'text-text-primary dark:text-white hover:text-primary'
              }`}
            >
              {!isOpen && (
                 <div className="absolute inset-0 bg-primary/5 dark:bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-95 group-hover:scale-100" />
              )}
              
              <div className={`relative z-10 transition-transform duration-500 ${isOpen ? 'rotate-180' : 'group-hover:rotate-180'}`}>
                 {isOpen ? <X strokeWidth={2.5} className="w-5 h-5" /> : <Menu strokeWidth={2.5} className="w-5 h-5" />}
              </div>

              <span className={`relative z-10 text-[8px] md:text-[9.5px] font-bold tracking-tight transition-colors duration-300 text-center w-full block truncate px-1 leading-tight ${
                isOpen ? 'text-white' : 'text-text-primary dark:text-white group-hover:text-text-primary'
              }`}>
                {isOpen ? 'Close' : 'Apps'}
              </span>

              {/* Floating Hover Label for Apps - Desktop Only */}
              <AnimatePresence mode="wait">
                {hoveredId === 'apps' && !isOpen && (
                  <motion.div
                    key="tooltip-apps"
                    initial={{ opacity: 0, x: 10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    className="absolute right-[calc(100%+14px)] top-1/2 -translate-y-1/2 hidden md:flex items-center pointer-events-none z-[40]"
                  >
                    <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-2.5 py-1 rounded-lg shadow-xl border border-white/10 dark:border-black/10 backdrop-blur-md">
                      <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">Applications</span>
                    </div>
                    {/* Triangle Arrow */}
                    <div className="w-1.5 h-1.5 bg-slate-900/95 dark:bg-white/95 border-r border-t border-white/10 dark:border-black/10 rotate-45 -ml-1 shadow-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
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
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:right-20 md:translate-x-0 md:top-1/2 md:-translate-y-1/2 md:bottom-auto z-50 animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-8 zoom-in-95 duration-200 origin-bottom md:origin-center-right">
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
                        <Icon strokeWidth={2.5} className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold text-center truncate w-full ${
                          isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'
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
