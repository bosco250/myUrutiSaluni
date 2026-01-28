'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Scissors,
  Loader2,
  BarChart3,
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
} from '@/components/charts/LazyCharts';

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

interface Salon {
  id: string;
  name: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalesAnalyticsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <SalesAnalyticsContent />
    </ProtectedRoute>
  );
}

function SalesAnalyticsContent() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [salonFilter, setSalonFilter] = useState<string>('all');

  // Fetch salons for filter
  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch analytics
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<SalesAnalytics>({
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Loading analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger">Failed to load analytics. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            onClick={() => router.back()}
            variant="secondary"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-3">
              Sales Analytics
            </h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Comprehensive sales insights and trends
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {/* Summary Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Total Revenue */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Total Revenue</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">RWF {analytics.summary.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Gross sales volume
             </span>
          </div>
        </div>

        {/* Total Sales */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Total Sales</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{analytics.summary.totalSales}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               Completed transactions
            </span>
          </div>
        </div>

        {/* Average Sale */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-purple-600 dark:text-purple-400">Avg. Sale</p>
            <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform">
              <TrendingUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">RWF {analytics.summary.averageSale.toFixed(0)}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Per transaction
             </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-orange-600 dark:text-orange-400">Sort by Method</p>
            <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md group-hover:scale-110 transition-transform">
              <BarChart3 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">{analytics.paymentMethods['cash'] || 0}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">{analytics.paymentMethods['card'] || 0}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">
                 {(analytics.paymentMethods['mobile_money'] || 0) + (analytics.paymentMethods['airtel_money'] || 0) + (analytics.paymentMethods['wallet'] || 0)}
               </span>
             </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-2.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {salons.length > 0 && (
            <div>
              <label
                htmlFor="salon-select"
                className="block text-[10px] font-semibold text-text-light/60 dark:text-text-dark/60 mb-0.5"
              >
                Salon
              </label>
              <select
                id="salon-select"
                value={salonFilter}
                onChange={(e) => setSalonFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Salons</option>
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label
              htmlFor="start-date"
              className="block text-[10px] font-semibold text-text-light/60 dark:text-text-dark/60 mb-0.5"
            >
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label
              htmlFor="end-date"
              className="block text-[10px] font-semibold text-text-light/60 dark:text-text-dark/60 mb-0.5"
            >
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Trend */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
            Monthly Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
              <XAxis
                dataKey="month"
                stroke="currentColor"
                className="text-[10px]"
                tick={{ fill: 'currentColor', fontSize: 10 }}
              />
              <YAxis
                stroke="currentColor"
                className="text-[10px]"
                tick={{ fill: 'currentColor', fontSize: 10 }}
                tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
            Daily Revenue (Last 30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-[10px]"
                tick={{ fill: 'currentColor', fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="currentColor"
                className="text-[10px]"
                tick={{ fill: 'currentColor', fontSize: 10 }}
                tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Methods & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
            Payment Methods
          </h2>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
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
                  style={{ fontSize: '10px' }}
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
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => `RWF ${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-text-light/60 dark:text-text-dark/60">
              No payment data available
            </div>
          )}
        </div>

        {/* Top Employees */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
            Top Employees by Revenue
          </h2>
          {analytics.topEmployees.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.topEmployees} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-30" />
                <XAxis
                  type="number"
                  stroke="currentColor"
                  className="text-[10px]"
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  tickFormatter={(value) => `RWF ${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="currentColor"
                  className="text-[10px]"
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-light)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`RWF ${value.toLocaleString()}`, 'Revenue']}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-text-light/60 dark:text-text-dark/60">
              No employee data available
            </div>
          )}
        </div>
      </div>

      {/* Top Services and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Services */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark">Top Services</h2>
          </div>
          {analytics.topServices.length > 0 ? (
            <div className="space-y-3">
              {analytics.topServices.map((service, index) => (
                <div
                  key={index}
                  className="block p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {service.name}
                      </p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                        {service.count} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary whitespace-nowrap">
                        RWF {service.revenue.toLocaleString()}
                      </p>
                    </div>
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark">Top Products</h2>
          </div>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div
                  key={index}
                  className="block p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                        {product.count} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary whitespace-nowrap">
                        RWF {product.revenue.toLocaleString()}
                      </p>
                    </div>
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
