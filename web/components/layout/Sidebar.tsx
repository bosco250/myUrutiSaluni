'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  LogOut,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Salons', href: '/salons', icon: Scissors },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Memberships', href: '/memberships', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Services', href: '/services', icon: Sparkles },
  { name: 'Sales & POS', href: '/sales', icon: ShoppingCart },
  { name: 'Commissions', href: '/commissions', icon: TrendingUp },
  { name: 'Payroll', href: '/payroll', icon: DollarSign },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Accounting', href: '/accounting', icon: DollarSign },
  { name: 'Loans', href: '/loans', icon: CreditCard },
  { name: 'Wallets', href: '/wallets', icon: Wallet },
  { name: 'Airtel', href: '/airtel', icon: Phone },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="w-64 bg-surface-dark text-text-inverse min-h-screen flex flex-col">
      <div className="p-6 border-b border-border-dark">
        <h1 className="text-xl font-bold">Salon Association</h1>
        <p className="text-sm text-text-secondary mt-1">Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-primary text-text-inverse'
                  : 'text-text-secondary hover:bg-surface-dark hover:text-text-inverse'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-dark">
        <div className="mb-4 px-4 py-2 bg-surface-dark rounded-lg">
          <p className="text-sm font-medium">{user?.fullName}</p>
          <p className="text-xs text-text-secondary">{user?.email}</p>
          <p className="text-xs text-text-tertiary mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-text-secondary hover:bg-surface-dark hover:text-text-inverse rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

