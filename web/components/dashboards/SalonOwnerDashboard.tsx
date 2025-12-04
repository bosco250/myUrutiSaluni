'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import {
  DollarSign,
  Users,
  Calendar,
  ShoppingCart,
  Building2,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Clock,
  MapPin,
  Phone,
  Mail,
  Eye,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  status: string;
  settings?: {
    numberOfEmployees?: number;
  };
}

interface Appointment {
  id: string;
  scheduledStart: string;
  status: string;
  customer?: {
    id: string;
    fullName?: string;
    name?: string;
  };
  service?: {
    id: string;
    name: string;
  };
  salon: {
    id: string;
    name: string;
  };
}

interface SaleItem {
  id: string;
  service?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
  };
  quantity: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  totalAmount: number;
  createdAt: string;
  customer?: {
    id: string;
    fullName?: string;
    name?: string;
  };
  salon: {
    id: string;
    name: string;
  };
  items?: SaleItem[];
}

interface SalonOwnerStats {
  totalSalons: number;
  totalEmployees: number;
  todayAppointments: number;
  upcomingAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  todaySales: number;
  monthSales: number;
  lowStockItems: number;
  activeLoans: number;
}

export default function SalonOwnerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Fetch salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/appointments');
        const allAppointments = response.data || [];
        // Filter today and upcoming
        const now = new Date();
        return allAppointments.filter((apt: Appointment) => {
          const aptDate = parseISO(apt.scheduledStart);
          return aptDate >= now;
        }).slice(0, 5); // Get next 5
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['recent-sales', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/sales?page=1&limit=5');
        // Handle paginated response: { data: [...], total: ..., page: ..., limit: ... }
        const salesData = response.data?.data || response.data || [];
        const sales = Array.isArray(salesData) ? salesData : salesData.data || [];
        console.log('[SALON OWNER DASHBOARD] Recent sales:', {
          responseData: response.data,
          salesData,
          sales,
          firstSaleItems: sales[0]?.items,
        });
        return sales.slice(0, 5); // Get latest 5
      } catch (error) {
        console.error('[SALON OWNER DASHBOARD] Error fetching sales:', error);
        return [];
      }
    },
  });

  // Calculate stats with enhanced analytics
  const { data: stats, isLoading: statsLoading } = useQuery<SalonOwnerStats & {
    weeklyRevenue: Array<{ date: string; revenue: number }>;
    dailyRevenue: Array<{ date: string; revenue: number }>;
    topServices: Array<{ name: string; count: number; revenue: number }>;
    revenueGrowth: number;
    salesGrowth: number;
  }>({
    queryKey: ['salon-owner-stats', user?.id, salons.length],
    queryFn: async () => {
      try {
        const appointmentsResponse = await api.get('/appointments');
        const allAppointments = appointmentsResponse.data || [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const todayAppointments = allAppointments.filter((apt: Appointment) => {
          const aptDate = parseISO(apt.scheduledStart);
          return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });

        const upcomingAppointments = allAppointments.filter((apt: Appointment) => {
          const aptDate = parseISO(apt.scheduledStart);
          return aptDate >= now;
        });

        const salesResponse = await api.get('/sales?page=1&limit=10000');
        const salesData = salesResponse.data?.data || salesResponse.data || [];
        const allSales = Array.isArray(salesData) ? salesData : salesData.data || [];
        
        const todaySales = allSales.filter((sale: Sale) => {
          const saleDate = parseISO(sale.createdAt);
          return saleDate >= today;
        });

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthSales = allSales.filter((sale: Sale) => {
          const saleDate = parseISO(sale.createdAt);
          return saleDate >= monthStart;
        });

        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthSales = allSales.filter((sale: Sale) => {
          const saleDate = parseISO(sale.createdAt);
          return saleDate >= lastMonthStart && saleDate <= lastMonthEnd;
        });

        const todayRevenue = todaySales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);
        const monthRevenue = monthSales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);
        const lastMonthRevenue = lastMonthSales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0);

        // Calculate growth percentages
        const revenueGrowth = lastMonthRevenue > 0 
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;
        const salesGrowth = lastMonthSales.length > 0
          ? ((monthSales.length - lastMonthSales.length) / lastMonthSales.length) * 100
          : 0;

        // Weekly revenue (last 7 days)
        const weekStart = subDays(now, 7);
        const weeklyRevenue = eachDayOfInterval({ start: weekStart, end: now }).map((date) => {
          const daySales = allSales.filter((sale: Sale) => {
            const saleDate = parseISO(sale.createdAt);
            return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          });
          return {
            date: format(date, 'MMM d'),
            revenue: daySales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0),
          };
        });

        // Daily revenue (last 30 days)
        const monthDays = eachDayOfInterval({ start: monthStart, end: now });
        const dailyRevenue = monthDays.map((date) => {
          const daySales = allSales.filter((sale: Sale) => {
            const saleDate = parseISO(sale.createdAt);
            return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          });
          return {
            date: format(date, 'MMM d'),
            revenue: daySales.reduce((sum: number, sale: Sale) => sum + (sale.totalAmount || 0), 0),
          };
        });

        // Top services
        const serviceCounts: Record<string, { count: number; revenue: number }> = {};
        allSales.forEach((sale: Sale) => {
          sale.items?.forEach((item: SaleItem) => {
            if (item.service?.name) {
              if (!serviceCounts[item.service.name]) {
                serviceCounts[item.service.name] = { count: 0, revenue: 0 };
              }
              serviceCounts[item.service.name].count += item.quantity;
              serviceCounts[item.service.name].revenue += item.lineTotal;
            }
          });
        });
        const topServices = Object.entries(serviceCounts)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const totalEmployees = salons.reduce((sum: number, salon: Salon) => 
          sum + (salon.settings?.numberOfEmployees || 0), 0
        );

        return {
          totalSalons: salons.length,
          totalEmployees,
          todayAppointments: todayAppointments.length,
          upcomingAppointments: upcomingAppointments.length,
          todayRevenue,
          monthRevenue,
          todaySales: todaySales.length,
          monthSales: monthSales.length,
          lowStockItems: 0,
          activeLoans: 0,
          weeklyRevenue,
          dailyRevenue,
          topServices,
          revenueGrowth,
          salesGrowth,
        };
      } catch (error) {
        return {
          totalSalons: salons.length,
          totalEmployees: 0,
          todayAppointments: 0,
          upcomingAppointments: 0,
          todayRevenue: 0,
          monthRevenue: 0,
          todaySales: 0,
          monthSales: 0,
          lowStockItems: 0,
          activeLoans: 0,
          weeklyRevenue: [],
          dailyRevenue: [],
          topServices: [],
          revenueGrowth: 0,
          salesGrowth: 0,
        };
      }
    },
    enabled: salons.length > 0 || !salonsLoading,
  });

  const isLoading = salonsLoading || statsLoading;

  // Format date for display
  const formatAppointmentDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-success/20 text-success border-success/30';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'cancelled':
        return 'bg-danger/20 text-danger border-danger/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Empty state - no salons
  if (salons.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
            Welcome, {user?.fullName || 'Salon Owner'}!
          </h1>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Get started by adding your first salon to begin managing your business.
          </p>
          <Button
            onClick={() => router.push('/salons')}
            variant="primary"
            className="flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Add Your First Salon
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 text-center">
            <Building2 className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-text-light dark:text-text-dark mb-2">Add Salons</h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Register all your salon locations
            </p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-text-light dark:text-text-dark mb-2">Manage Employees</h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Add and manage your team members
            </p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 text-center">
            <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-text-light dark:text-text-dark mb-2">Schedule Appointments</h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Start booking customer appointments
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-light dark:text-text-dark mb-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Salon Owner'}!
          </h1>
          <p className="text-text-light/60 dark:text-text-dark/60">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Here's your business overview
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/salons')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            My Salons
          </Button>
          <Button
            onClick={() => router.push('/salons')}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Salon
          </Button>
        </div>
      </div>

      {/* Key Metrics - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-2xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-2 py-1 rounded-lg">
              Today
            </span>
          </div>
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Today's Revenue</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats?.todayRevenue?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>vs yesterday</span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-1 rounded-lg">
              Today
            </span>
          </div>
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Today's Appointments</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats?.todayAppointments || 0}
          </p>
          <Link href="/appointments" className="flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition">
            <span>{stats?.upcomingAppointments || 0} upcoming</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Total Salons */}
        <Link href="/salons" className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Total Salons</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats?.totalSalons || 0}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
            <Users className="w-3 h-3" />
            <span>{stats?.totalEmployees || 0} employees</span>
          </div>
        </Link>

        {/* Month Revenue */}
        <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-2 py-1 rounded-lg">
              This Month
            </span>
          </div>
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats?.monthRevenue?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {stats?.revenueGrowth !== undefined && (
              <span className={stats.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                {stats.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                {' '}{Math.abs(stats.revenueGrowth).toFixed(1)}% vs last month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {stats && (stats.weeklyRevenue?.length > 0 || stats.topServices?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          {stats.weeklyRevenue && stats.weeklyRevenue.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Revenue Trend</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Last 7 days</p>
                </div>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                  <XAxis 
                    dataKey="date" 
                    stroke="currentColor"
                    className="text-xs"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="currentColor"
                    className="text-xs"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-dark)', 
                      border: '1px solid var(--border-dark)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Services Chart */}
          {stats.topServices && stats.topServices.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Top Services</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">By revenue</p>
                </div>
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                  <XAxis 
                    type="number"
                    stroke="currentColor"
                    className="text-xs"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="currentColor"
                    className="text-xs"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-dark)', 
                      border: '1px solid var(--border-dark)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `RWF ${value.toLocaleString()} • ${props.payload.count} bookings`,
                      'Revenue'
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Upcoming Appointments</h2>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                  Next {appointments.length} appointments
                </p>
              </div>
              <Link href="/appointments">
                <Button variant="secondary" className="flex items-center gap-2 text-sm">
                  View All
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                <p className="text-text-light/60 dark:text-text-dark/60 mb-4">No upcoming appointments</p>
                <Button
                  onClick={() => router.push('/appointments')}
                  variant="primary"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Schedule Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/appointments/${appointment.id}`}
                    className="block p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-light dark:text-text-dark truncate">
                              {appointment.customer?.fullName || appointment.customer?.name || 'Walk-in Customer'}
                            </p>
                            <p className="text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                              {appointment.service?.name || 'Service'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-[52px]">
                          <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                            <Clock className="w-4 h-4" />
                            <span>{formatAppointmentDate(appointment.scheduledStart)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{appointment.salon?.name || 'Salon'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getAppointmentStatusColor(appointment.status)}`}>
                          {appointment.status || 'Scheduled'}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Recent Sales</h2>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                  Latest transactions
                </p>
              </div>
              <Link href="/sales">
                <Button variant="secondary" className="flex items-center gap-2 text-sm">
                  View All
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {salesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                <p className="text-text-light/60 dark:text-text-dark/60 mb-4">No sales yet</p>
                <Button
                  onClick={() => router.push('/sales')}
                  variant="primary"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Record Sale
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="block p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-light dark:text-text-dark">
                            {sale.customer?.fullName || sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                            {sale.salon?.name || 'Salon'} • {format(parseISO(sale.createdAt), 'MMM d, h:mm a')}
                          </p>
                          {sale.items && sale.items.length > 0 && (
                            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                              {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}: {sale.items.slice(0, 2).map(item => item.service?.name || item.product?.name || 'Item').join(', ')}
                              {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <p className="text-lg font-bold text-text-light dark:text-text-dark">
                          RWF {sale.totalAmount?.toLocaleString() || '0'}
                        </p>
                        <ArrowUpRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* My Salons */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">My Salons</h2>
              <Link href="/salons">
                <Button variant="secondary" className="flex items-center gap-2 text-sm">
                  View All
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {salons.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">No salons yet</p>
                <Button
                  onClick={() => router.push('/salons')}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add Salon
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {salons.slice(0, 3).map((salon) => (
                  <Link
                    key={salon.id}
                    href={`/salons/${salon.id}`}
                    className="block p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-light dark:text-text-dark truncate mb-1">
                          {salon.name}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-text-light/60 dark:text-text-dark/60">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{salon.city}</span>
                          </div>
                          {salon.settings?.numberOfEmployees && (
                            <div className="flex items-center gap-1.5 text-xs text-text-light/60 dark:text-text-dark/60">
                              <Users className="w-3 h-3" />
                              <span>{salon.settings.numberOfEmployees} employees</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition flex-shrink-0" />
                    </div>
                  </Link>
                ))}
                {salons.length > 3 && (
                  <Link
                    href="/salons"
                    className="block text-center py-3 text-sm text-primary hover:text-primary/80 transition font-medium"
                  >
                    View all {salons.length} salons →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/appointments"
                className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-text-light dark:text-text-dark">Appointments</p>
              </Link>
              <Link
                href="/sales"
                className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-text-light dark:text-text-dark">Sales</p>
              </Link>
              <Link
                href="/inventory"
                className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-text-light dark:text-text-dark">Inventory</p>
              </Link>
              <Link
                href="/users"
                className="group p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-text-light dark:text-text-dark">Employees</p>
              </Link>
            </div>
          </div>

          {/* Alerts & Notifications */}
          {(stats?.lowStockItems || 0) > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-1">
                    Low Stock Alert
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-3">
                    {stats?.lowStockItems} item{(stats?.lowStockItems || 0) !== 1 ? 's' : ''} need restocking
                  </p>
                  <Link href="/inventory">
                    <Button variant="secondary" size="sm" className="w-full">
                      Check Inventory
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
