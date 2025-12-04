'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, LayoutDashboard, Users, Scissors, Calendar, ShoppingCart, Package, DollarSign, CreditCard, Wallet, Phone, BarChart3, Settings, X, TrendingUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';

interface CommandItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  category: string;
  keywords: string[];
  requiredRoles?: UserRole[];
}

const allCommands: CommandItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Main', keywords: ['home', 'overview', 'stats'] },
  { id: 'users', name: 'Users', href: '/users', icon: Users, category: 'Management', keywords: ['user', 'people', 'admin', 'role'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN] },
  { id: 'membership-apply', name: 'Apply for Membership', href: '/membership/apply', icon: CreditCard, category: 'Membership', keywords: ['membership', 'apply', 'application', 'join', 'member'], requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_OWNER] },
  { id: 'membership-applications', name: 'Review Applications', href: '/membership/applications', icon: Users, category: 'Membership', keywords: ['membership', 'applications', 'review', 'approve'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN] },
  { id: 'memberships', name: 'Memberships', href: '/memberships', icon: CreditCard, category: 'Management', keywords: ['membership', 'salon', 'member', 'association', 'active'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'salons', name: 'Salons', href: '/salons', icon: Scissors, category: 'Management', keywords: ['salon', 'business', 'shop'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'customers', name: 'Customers', href: '/customers', icon: Users, category: 'Management', keywords: ['client', 'customer', 'people'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'appointments', name: 'Appointments', href: '/appointments', icon: Calendar, category: 'Operations', keywords: ['booking', 'schedule', 'calendar'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'sales', name: 'Sales & POS', href: '/sales', icon: ShoppingCart, category: 'Operations', keywords: ['pos', 'transaction', 'sale', 'checkout'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'commissions', name: 'Commissions', href: '/commissions', icon: TrendingUp, category: 'Finance', keywords: ['commission', 'employee', 'payroll', 'earnings'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'inventory', name: 'Inventory', href: '/inventory', icon: Package, category: 'Operations', keywords: ['stock', 'products', 'items'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
  { id: 'accounting', name: 'Accounting', href: '/accounting', icon: DollarSign, category: 'Finance', keywords: ['finance', 'money', 'accounts'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'loans', name: 'Loans', href: '/loans', icon: CreditCard, category: 'Finance', keywords: ['loan', 'credit', 'lending'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'wallets', name: 'Wallets', href: '/wallets', icon: Wallet, category: 'Finance', keywords: ['wallet', 'balance', 'payment'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'airtel', name: 'Airtel', href: '/airtel', icon: Phone, category: 'Integrations', keywords: ['airtel', 'mobile', 'money'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3, category: 'Analytics', keywords: ['report', 'analytics', 'data'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
  { id: 'settings', name: 'Settings', href: '/settings', icon: Settings, category: 'System', keywords: ['config', 'preferences', 'setup'] },
];

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CommandPalette({ isOpen: controlledOpen, onClose }: CommandPaletteProps) {
  const { theme } = useTheme();
  const { hasAnyRole } = usePermissions();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onClose ? () => { setInternalOpen(false); onClose(); } : setInternalOpen;
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on user role
  const commands = useMemo(() => {
    return allCommands.filter((cmd) => {
      // If no required roles, allow access (e.g., Dashboard, Settings)
      if (!cmd.requiredRoles || cmd.requiredRoles.length === 0) {
        return true;
      }
      // Check if user has any of the required roles
      return hasAnyRole(cmd.requiredRoles);
    });
  }, [hasAnyRole]);

  const filteredCommands = search
    ? commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(search.toLowerCase()) ||
          cmd.keywords.some((kw) => kw.toLowerCase().includes(search.toLowerCase()))
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      }
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  const handleSelect = (cmd: CommandItem) => {
    router.push(cmd.href);
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
    setSearch('');
  };

  if (!isOpen) {
    if (controlledOpen === undefined) {
      return null;
    }
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 fade-in"
        onClick={() => {
          if (onClose) {
            onClose();
          } else {
            setIsOpen(false);
          }
        }}
      />

      {/* Command Palette */}
      <div
        ref={containerRef}
        className="fixed inset-x-0 top-[20%] mx-auto max-w-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border-light dark:border-border-dark">
            <Search className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands, pages, or actions..."
              className="flex-1 bg-transparent text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 outline-none text-base"
            />
            <kbd className="px-2 py-1 text-xs font-semibold text-text-light/60 dark:text-text-dark/60 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">
              ESC
            </kbd>
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setIsOpen(false);
                }
              }}
              className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
            >
              <X className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-12 text-center text-text-light/60 dark:text-text-dark/60">
                <p>No results found</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category} className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-text-light/40 dark:text-text-dark/40 uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const Icon = cmd.icon;
                    const isActive = pathname === cmd.href;
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => handleSelect(cmd)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                          isSelected
                            ? 'bg-primary/20 text-primary'
                            : isActive
                            ? 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark'
                            : 'text-text-light/80 dark:text-text-dark/80 hover:bg-background-light dark:hover:bg-background-dark hover:text-text-light dark:hover:text-text-dark'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`} />
                        <span className="flex-1 font-medium">{cmd.name}</span>
                        {isActive && (
                          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50 flex items-center justify-between text-xs text-text-light/40 dark:text-text-dark/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark rounded border border-border-light dark:border-border-dark">K</kbd>
              <span>to open</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

