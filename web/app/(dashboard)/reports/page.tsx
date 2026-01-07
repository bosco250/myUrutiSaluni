'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { FileText, Download, Calendar, TrendingUp, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, parseISO } from 'date-fns';
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from '@/lib/export-utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}

function ReportsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Calculate date range
  const dateRangeData = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date = now;

    switch (dateRange) {
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  }, [dateRange]);

  // Fetch sales data
  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['reports-sales', dateRange],
    queryFn: async () => {
      const response = await api.get('/sales?page=1&limit=10000');
      const sales = response.data?.data || response.data || [];
      return Array.isArray(sales) ? sales : sales.data || [];
    },
  });

  // Fetch appointments data
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['reports-appointments', dateRange],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return response.data?.data || response.data || [];
    },
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!salesData.length) return { revenue: [], sales: [], paymentMethods: [] };

    const filteredSales = salesData.filter((sale: any) => {
      const saleDate = parseISO(sale.createdAt);
      return saleDate >= dateRangeData.start && saleDate <= dateRangeData.end;
    });

    // Revenue by day
    const days = eachDayOfInterval({ start: dateRangeData.start, end: dateRangeData.end });
    const revenueData = days.map((date) => {
      const daySales = filteredSales.filter((sale: any) => {
        const saleDate = parseISO(sale.createdAt);
        return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
      return {
        date: format(date, dateRange === 'year' ? 'MMM' : dateRange === 'quarter' ? 'MMM d' : 'MMM d'),
        revenue: daySales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0),
        sales: daySales.length,
      };
    });

    // Payment methods
    const paymentMethodCounts: Record<string, number> = {};
    filteredSales.forEach((sale: any) => {
      const method = sale.paymentMethod || 'unknown';
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });
    const paymentMethodData = Object.entries(paymentMethodCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));

    return {
      revenue: revenueData,
      sales: revenueData,
      paymentMethods: paymentMethodData,
    };
  }, [salesData, dateRangeData, dateRange]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const filteredSales = salesData.filter((sale: any) => {
      const saleDate = parseISO(sale.createdAt);
      return saleDate >= dateRangeData.start && saleDate <= dateRangeData.end;
    });

    const totalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const filteredAppointments = appointmentsData.filter((apt: any) => {
      const aptDate = parseISO(apt.scheduledStart);
      return aptDate >= dateRangeData.start && aptDate <= dateRangeData.end;
    });

    return {
      totalRevenue,
      totalSales,
      averageSale,
      totalAppointments: filteredAppointments.length,
      completedAppointments: filteredAppointments.filter((apt: any) => apt.status === 'completed').length,
    };
  }, [salesData, appointmentsData, dateRangeData]);

  const handleExport = () => {
    const filteredSales = salesData.filter((sale: any) => {
      const saleDate = parseISO(sale.createdAt);
      return saleDate >= dateRangeData.start && saleDate <= dateRangeData.end;
    });

    const exportData = filteredSales.map((sale: any) => ({
      Date: formatDateForExport(sale.createdAt, 'yyyy-MM-dd'),
      Time: format(parseISO(sale.createdAt), 'HH:mm'),
      'Sale ID': sale.id,
      Customer: sale.customer?.fullName || sale.customer?.name || 'Walk-in',
      'Total Amount': sale.totalAmount,
      Currency: sale.currency || 'RWF',
      'Payment Method': sale.paymentMethod || 'N/A',
      Status: sale.status || 'completed',
      Salon: sale.salon?.name || 'N/A',
      Items: sale.items?.map((item: any) => 
        `${item.service?.name || item.product?.name} (x${item.quantity})`
      ).join('; ') || '',
    }));

    exportToCSV(exportData, { filename: `sales-report-${dateRange}` });
  };

  if (salesLoading || appointmentsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Financial reports and business insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                RWF {summaryStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {summaryStats.totalSales}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                RWF {Math.round(summaryStats.averageSale).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Appointments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {summaryStats.totalAppointments}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryStats.completedAppointments} completed
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h2>
          {chartData.revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                <XAxis 
                  dataKey="date" 
                  stroke="currentColor"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <YAxis 
                  stroke="currentColor"
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
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No data available for selected period
            </div>
          )}
        </div>

        {/* Sales Count */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Count</h2>
          {chartData.sales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                <XAxis 
                  dataKey="date" 
                  stroke="currentColor"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <YAxis 
                  stroke="currentColor"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--surface-dark)', 
                    border: '1px solid var(--border-dark)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No data available for selected period
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods Chart */}
      {chartData.paymentMethods.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Reports</h3>
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => router.push('/accounting')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Income Statement
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/accounting')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Balance Sheet
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/accounting')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Cash Flow Statement
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/accounting')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Trial Balance
              </button>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Operational Reports</h3>
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => router.push('/sales/analytics')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Sales Report
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/appointments')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Appointment Report
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/commissions')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Employee Performance
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/inventory')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Inventory Report
              </button>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Loan Reports</h3>
            <FileText className="w-6 h-6 text-purple-500" />
          </div>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => router.push('/loans')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Loan Performance
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/loans')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Repayment Schedule
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/loans')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Default Report
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push('/loans')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm hover:underline"
              >
                Credit Score Report
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
