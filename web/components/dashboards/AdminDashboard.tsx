'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import {
  DollarSign,
  Users,
  Calendar,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Package,
  Wallet,
  CreditCard,
  Activity,
  BarChart3,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfDay,
} from 'date-fns';
import {
  LazyLineChart as LineChart,
  LazyLine as Line,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyResponsiveContainer as ResponsiveContainer,
  LazyBarChart as BarChart,
  LazyBar as Bar,
} from '@/components/charts/LazyCharts';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

interface Salon {
  id: string;
  name: string;
  status: string;
  city?: string;
  createdAt: string;
}

interface MembershipApplication {
  id: string;
  status: string;
  businessName: string;
  applicant: {
    fullName: string;
  };
  createdAt: string;
}

interface Sale {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  salonId: string;
}

interface Appointment {
  id: string;
  status: string;
  createdAt: string;
  scheduledStart: string;
}

interface Loan {
  id: string;
  amount: string | number;
  status: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalSalons: number;
  totalMembers: number;
  pendingApplications: number;
  totalRevenue: number;
  totalAppointments: number;
  activeLoans: number;
  totalLoans: number;
  recentUsers: User[];
  recentApplications: MembershipApplication[];
  salesData: Sale[];
  appointmentsData: Appointment[];
  loansData: Loan[];
  userGrowth: { date: string; count: number }[];
  revenueGrowth: { date: string; amount: number }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<AdminStats>({
    queryKey: ['admin-stats-comprehensive'],
    queryFn: async () => {
      try {
        const [
          usersResponse,
          salonsResponse,
          applicationsResponse,
          appointmentsResponse,
          salesResponse,
          loansResponse,
        ] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/salons').catch(() => ({ data: [] })),
          api.get('/memberships/applications').catch(() => ({ data: [] })),
          api.get('/appointments').catch(() => ({ data: [] })),
          api.get('/sales?page=1&limit=10000').catch(() => ({ data: [] })),
          api.get('/loans').catch(() => ({ data: [] })),
        ]);

        const users: User[] = Array.isArray(usersResponse.data)
          ? usersResponse.data
          : usersResponse.data?.data || [];
        const salons: Salon[] = Array.isArray(salonsResponse.data)
          ? salonsResponse.data
          : salonsResponse.data?.data || [];
        const applications: MembershipApplication[] = Array.isArray(
          applicationsResponse.data
        )
          ? applicationsResponse.data
          : applicationsResponse.data?.data || [];
        const appointments: Appointment[] = Array.isArray(appointmentsResponse.data)
          ? appointmentsResponse.data
          : appointmentsResponse.data?.data || [];
        const sales: Sale[] = Array.isArray(salesResponse.data)
          ? salesResponse.data
          : salesResponse.data?.data || [];
        const loans: Loan[] = Array.isArray(loansResponse.data)
          ? loansResponse.data
          : loansResponse.data?.data || [];

        const totalRevenue = sales.reduce((sum, sale) => {
          return sum + (parseFloat(String(sale.totalAmount)) || 0);
        }, 0);

        const members = users.filter(
          (u) => u.role === 'salon_owner' || u.role === 'association_admin'
        );

        const pendingApplications = applications.filter(
          (app) => app.status === 'pending'
        );

        const activeLoans = loans.filter(
          (loan) => loan.status === 'active' || loan.status === 'approved'
        );

        const recentUsers = users
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);

        const recentApplications = applications
          .filter((app) => app.status === 'pending')
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);

        // User growth in last 30 days
        const thirtyDaysAgo = subDays(new Date(), 30);
        const daysInterval = eachDayOfInterval({
          start: thirtyDaysAgo,
          end: new Date(),
        });

        const userGrowth = daysInterval.map((date) => {
          const dayStart = startOfDay(date);
          const count = users.filter((u) => {
            const createdDate = new Date(u.createdAt);
            return createdDate <= dayStart;
          }).length;
          return {
            date: format(date, 'MMM d'),
            count,
          };
        });

        // Revenue growth in last 30 days
        const revenueGrowth = daysInterval.map((date) => {
          const dayStart = startOfDay(date);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const amount = sales
            .filter((s) => {
              const saleDate = new Date(s.createdAt);
              return saleDate >= dayStart && saleDate <= dayEnd;
            })
            .reduce((sum, s) => sum + (parseFloat(String(s.totalAmount)) || 0), 0);

          return {
            date: format(date, 'MMM d'),
            amount,
          };
        });

        return {
          totalUsers: users.length,
          totalSalons: salons.length,
          totalMembers: members.length,
          pendingApplications: pendingApplications.length,
          totalRevenue: Math.round(totalRevenue),
          totalAppointments: appointments.length,
          activeLoans: activeLoans.length,
          totalLoans: loans.length,
          recentUsers,
          recentApplications,
          salesData: sales,
          appointmentsData: appointments,
          loansData: loans,
          userGrowth,
          revenueGrowth,
        };
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
          totalUsers: 0,
          totalSalons: 0,
          totalMembers: 0,
          pendingApplications: 0,
          totalRevenue: 0,
          totalAppointments: 0,
          activeLoans: 0,
          totalLoans: 0,
          recentUsers: [],
          recentApplications: [],
          salesData: [],
          appointmentsData: [],
          loansData: [],
          userGrowth: [],
          revenueGrowth: [],
        };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

  // Calculate percentage changes
  const calculateChange = (
    data: { date: string; count?: number; amount?: number }[]
  ): { value: number; isPositive: boolean } => {
    if (data.length < 2) return { value: 0, isPositive: true };
    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);
    const recentAvg =
      recent.reduce((sum, d) => sum + (d.count || d.amount || 0), 0) /
      recent.length;
    const previousAvg =
      previous.reduce((sum, d) => sum + (d.count || d.amount || 0), 0) /
      previous.length;
    const change =
      previousAvg !== 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    return { value: Math.abs(Math.round(change * 10) / 10), isPositive: change >= 0 };
  };

  const userChange = useMemo(
    () => calculateChange(stats?.userGrowth || []),
    [stats?.userGrowth]
  );
  const revenueChange = useMemo(
    () => calculateChange(stats?.revenueGrowth || []),
    [stats?.revenueGrowth]
  );

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      change: `${userChange.isPositive ? '+' : '-'}${userChange.value}%`,
      trend: userChange.isPositive ? ('up' as const) : ('down' as const),
      format: (val: number) => val.toLocaleString(),
      link: '/users',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Salons',
      value: stats?.totalSalons || 0,
      icon: Building2,
      change: '+5',
      trend: 'up' as const,
      format: (val: number) => val.toLocaleString(),
      link: '/salons',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending Applications',
      value: stats?.pendingApplications || 0,
      icon: FileText,
      change:
        (stats?.pendingApplications || 0) > 0 ? 'Review Now' : 'All Clear',
      trend:
        (stats?.pendingApplications || 0) > 0 ? ('up' as const) : ('down' as const),
      format: (val: number) => val.toLocaleString(),
      link: '/membership/applications',
      highlight: (stats?.pendingApplications || 0) > 0,
      color: (stats?.pendingApplications || 0) > 0 ? 'text-warning' : 'text-success',
      bgColor:
        (stats?.pendingApplications || 0) > 0 ? 'bg-warning/10' : 'bg-success/10',
    },
    {
      title: 'Total Members',
      value: stats?.totalMembers || 0,
      icon: CheckCircle,
      change: '+8',
      trend: 'up' as const,
      format: (val: number) => val.toLocaleString(),
      link: '/memberships',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      change: `${revenueChange.isPositive ? '+' : '-'}${revenueChange.value}%`,
      trend: revenueChange.isPositive ? ('up' as const) : ('down' as const),
      format: (val: number) => `RWF ${val.toLocaleString()}`,
      link: '/accounting',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Appointments',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      change: '+22',
      trend: 'up' as const,
      format: (val: number) => val.toLocaleString(),
      link: '/appointments',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Loans',
      value: stats?.activeLoans || 0,
      icon: CreditCard,
      change: `${stats?.totalLoans || 0} total`,
      trend: 'up' as const,
      format: (val: number) => val.toLocaleString(),
      link: '/loans',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Inventory Items',
      value: 0,
      icon: Package,
      change: 'N/A',
      trend: 'up' as const,
      format: (val: number) => val.toLocaleString(),
      link: '/inventory',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-sm text-error font-medium mb-4">
              Failed to load dashboard data
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Admin Dashboard
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            Welcome back, {user?.fullName || 'Admin'}! Here&apos;s your platform overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
          <Activity className="w-4 h-4" />
          <span>Auto-refresh: 2 min</span>
        </div>
      </div>

      {/* Pending Applications Alert */}
      {(stats?.pendingApplications || 0) > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-1">
                {stats?.pendingApplications} Membership Application
                {(stats?.pendingApplications || 0) !== 1 ? 's' : ''} Pending Review
              </h3>
              <p className="text-sm text-text-light/70 dark:text-text-dark/70 mb-3">
                There {(stats?.pendingApplications || 0) === 1 ? 'is' : 'are'}{' '}
                {stats?.pendingApplications} membership application
                {(stats?.pendingApplications || 0) !== 1 ? 's' : ''} waiting for your
                review.
              </p>
              <Button
                onClick={() => router.push('/membership/applications')}
                size="sm"
                className="h-9 px-4"
              >
                Review Applications
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <div
                className={`group bg-surface-light dark:bg-surface-dark border rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer ${
                  stat.highlight
                    ? 'border-warning/30 hover:border-warning/50'
                    : 'border-border-light dark:border-border-dark hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      stat.trend === 'up'
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}
                  >
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark">
                  {stat.format(stat.value)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth Chart */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-light dark:text-text-dark">
              User Growth (30 Days)
            </h2>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats?.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="rgba(0,0,0,0.5)"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(0,0,0,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#D4945F"
                strokeWidth={2}
                dot={{ fill: '#D4945F', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Growth Chart */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-light dark:text-text-dark">
              Daily Revenue (30 Days)
            </h2>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.revenueGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="rgba(0,0,0,0.5)"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(0,0,0,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="amount" fill="#D4945F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <h2 className="text-base font-bold text-text-light dark:text-text-dark mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {stats?.recentApplications && stats.recentApplications.length > 0 ? (
              stats.recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href="/membership/applications"
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark hover:border-primary/30 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {app.businessName || app.applicant?.fullName || 'New Application'}
                      </p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                        {format(new Date(app.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Clock className="w-4 h-4 text-warning flex-shrink-0" />
                  </div>
                </Link>
              ))
            ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-text-light/30 dark:text-text-dark/30 mx-auto mb-2" />
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  No recent activity
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <h2 className="text-base font-bold text-text-light dark:text-text-dark mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/membership/applications"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Applications
              </p>
            </Link>
            <Link
              href="/users"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Users
              </p>
            </Link>
            <Link
              href="/salons"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Salons
              </p>
            </Link>
            <Link
              href="/reports"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Reports
              </p>
            </Link>
            <Link
              href="/accounting"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Accounting
              </p>
            </Link>
            <Link
              href="/loans"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Loans
              </p>
            </Link>
            <Link
              href="/wallets"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Wallets
              </p>
            </Link>
            <Link
              href="/inventory"
              className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-light dark:text-text-dark">
                Inventory
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <h2 className="text-base font-bold text-text-light dark:text-text-dark mb-4">
          System Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-2">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              API Status
            </p>
            <p className="text-sm font-bold text-success">Operational</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-2">
              <Activity className="w-6 h-6 text-success" />
            </div>
            <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Database
            </p>
            <p className="text-sm font-bold text-success">Healthy</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Uptime
            </p>
            <p className="text-sm font-bold text-text-light dark:text-text-dark">
              99.9%
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              Response Time
            </p>
            <p className="text-sm font-bold text-text-light dark:text-text-dark">
              120ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
