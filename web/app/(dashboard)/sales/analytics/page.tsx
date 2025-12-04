'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Scissors,
  CreditCard,
  Calendar,
  Loader2,
  Download,
} from 'lucide-react';
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

interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalSales: number;
    averageSale: number;
  };
  paymentMethods: Record<string, number>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  topEmployees: Array<{ name: string; sales: number; revenue: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalesAnalyticsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <SalesAnalyticsContent />
    </ProtectedRoute>
  );
}

function SalesAnalyticsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [salonFilter, setSalonFilter] = useState<string>('all');

  // Fetch salons for filter
  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch analytics
  const { data: analytics, isLoading, error } = useQuery<SalesAnalytics>({
    queryKey: ['sales-analytics', salonFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (salonFilter !== 'all') params.append('salonId', salonFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await api.get(`/sales/analytics/summary?${params.toString()}`);
      return response.data;
    },
  });

  // Format payment methods for pie chart
  const paymentMethodData = analytics
    ? Object.entries(analytics.paymentMethods).map(([name, value]) => ({
        name: name
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        value: Number(value),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger">Failed to load analytics. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/sales')}
              variant="secondary"
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Sales Analytics</h1>
              <p className="text-text-light/60 dark:text-text-dark/60 mt-1">Comprehensive sales insights and trends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salons.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Salon
              </label>
              <select
                value={salonFilter}
                onChange={(e) => setSalonFilter(e.target.value)}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Salons</option>
                {salons.map((salon: any) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-text-light dark:text-text-dark">
            RWF {analytics.summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Sales</span>
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-text-light dark:text-text-dark">
            {analytics.summary.totalSales}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Average Sale</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-text-light dark:text-text-dark">
            RWF {analytics.summary.averageSale.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            Monthly Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
              <XAxis
                dataKey="month"
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
                  backgroundColor: 'var(--surface-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Revenue (Last 30 Days) */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            Daily Revenue (Last 30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-xs"
                tick={{ fill: 'currentColor', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Methods & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            Payment Methods
          </h2>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-light)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `RWF ${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-light/60 dark:text-text-dark/60">
              No payment data available
            </div>
          )}
        </div>

        {/* Top Employees */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
            Top Employees by Revenue
          </h2>
          {analytics.topEmployees.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topEmployees} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
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
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-light)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-light/60 dark:text-text-dark/60">
              No employee data available
            </div>
          )}
        </div>
      </div>

      {/* Top Services and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Services */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Top Services</h2>
          </div>
          {analytics.topServices.length > 0 ? (
            <div className="space-y-3">
              {analytics.topServices.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-text-light dark:text-text-dark">{service.name}</p>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      {service.count} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      RWF {service.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-light/60 dark:text-text-dark/60">
              No service data available
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Top Products</h2>
          </div>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-text-light dark:text-text-dark">{product.name}</p>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      {product.count} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      RWF {product.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-light/60 dark:text-text-dark/60">
              No product data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

