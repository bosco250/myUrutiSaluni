'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  ChevronRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { exportToCSV, formatDateForExport } from '@/lib/export-utils';
import Button from '@/components/ui/Button';

// Refined semantic palette
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
        date: format(date, dateRange === 'year' ? 'MMM' : 'MMM d'), // Shorter date format
        revenue: daySales.reduce((sum: number, sale: any) => sum + (parseFloat(sale.totalAmount) || 0), 0),
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

    const totalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + (parseFloat(sale.totalAmount) || 0), 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

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
      revenueChange: 12.5, // Mock data for demo
      salesChange: 8.2,    // Mock data for demo
      avgOrderChange: -2.4, // Mock data for demo
      aptChange: 15.3,     // Mock data for demo
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
      <div className="max-w-[1600px] mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">Generating reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
            Overview of financial performance and business metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-light dark:bg-surface-dark p-1 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="h-9 pl-9 pr-8 text-sm bg-transparent border-0 rounded-lg text-text-light dark:text-text-dark focus:ring-0 cursor-pointer font-medium hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <div className="w-px h-5 bg-border-light dark:bg-border-dark" />
          
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="h-9 text-primary hover:bg-primary/5 hover:text-primary px-3 border-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total Revenue"
          value={`RWF ${summaryStats.totalRevenue.toLocaleString()}`}
          trend={summaryStats.revenueChange}
          icon={DollarSign}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-500/10"
        />
        <SummaryCard
          title="Total Sales"
          value={summaryStats.totalSales}
          trend={summaryStats.salesChange}
          icon={ShoppingCart}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-500/10"
        />
        <SummaryCard
          title="Avg. Order Value"
          value={`RWF ${Math.round(summaryStats.averageSale).toLocaleString()}`}
          trend={summaryStats.avgOrderChange}
          icon={TrendingUp}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-500/10"
        />
        <SummaryCard
          title="Appointments"
          value={summaryStats.totalAppointments}
          subValue={`${summaryStats.completedAppointments} completed`}
          trend={summaryStats.aptChange}
          icon={Calendar}
          color="text-orange-600 dark:text-orange-400"
          bg="bg-orange-500/10"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trend - Spans 2 cols */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-text-light dark:text-text-dark text-sm">Revenue Trend</h3>
            </div>
          </div>
          <div className="p-4 pl-0">
            {chartData.revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5 text-text-light/20 dark:text-text-dark/20" />
                  <XAxis 
                    dataKey="date" 
                    stroke="currentColor" 
                    className="text-[10px] text-text-light/40 dark:text-text-dark/40"
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="currentColor" 
                    className="text-[10px] text-text-light/40 dark:text-text-dark/40"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-dark)', 
                      borderColor: 'var(--border-dark)', 
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No revenue data for this period" />
            )}
          </div>
        </div>

        {/* Payment Methods - Spans 1 col */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <PieChartIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-text-light dark:text-text-dark text-sm">Payment Methods</h3>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center">
            {chartData.paymentMethods.length > 0 ? (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--surface-dark)', 
                        borderColor: 'var(--border-dark)', 
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#fff'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-text-light/60 dark:text-text-dark/60 ml-1">{value}</span>} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No payment data available" />
            )}
          </div>
        </div>
      </div>

      {/* Detailed Reports Navigation */}
      <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 px-1">Detailed Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCategoryCard 
          title="Financial Reports" 
          icon={FileText} 
          color="text-blue-500" 
          bg="bg-blue-500/10"
          items={[
            { label: 'Income Statement', href: '/accounting' },
            { label: 'Balance Sheet', href: '/accounting' },
            { label: 'Cash Flow Statement', href: '/accounting' },
            { label: 'Trial Balance', href: '/accounting' }
          ]}
        />
        <ReportCategoryCard 
          title="Operational Reports" 
          icon={BarChart3} 
          color="text-green-500" 
          bg="bg-green-500/10"
          items={[
            { label: 'Sales Report', href: '/sales/analytics' },
            { label: 'Appointment Report', href: '/appointments' },
            { label: 'Employee Performance', href: '/commissions' },
            { label: 'Inventory Report', href: '/inventory' }
          ]}
        />
        <ReportCategoryCard 
          title="Loan Reports" 
          icon={FileText} 
          color="text-purple-500" 
          bg="bg-purple-500/10"
          items={[
            { label: 'Loan Performance', href: '/loans' },
            { label: 'Repayment Schedule', href: '/loans' },
            { label: 'Default Report', href: '/loans' },
            { label: 'Credit Score Report', href: '/loans' }
          ]}
        />
      </div>
    </div>
  );
}

// Components

function SummaryCard({ title, value, subValue, trend, icon: Icon, color, bg }: any) {
  const isPositive = trend >= 0;
  
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-4 flex flex-col justify-between h-[110px] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      
      <div>
        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-text-light dark:text-text-dark mt-1 tracking-tight">{value}</h3>
        {subValue && <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-0.5">{subValue}</p>}
      </div>
      
      <div className="flex items-center gap-1.5 mt-auto">
        <span className={`flex items-center text-xs font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {Math.abs(trend)}%
        </span>
        <span className="text-[10px] text-text-light/40 dark:text-text-dark/40">vs last period</span>
      </div>
    </div>
  );
}

function ReportCategoryCard({ title, icon: Icon, color, bg, items }: any) {
  const router = useRouter();
  
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <h3 className="font-bold text-text-light dark:text-text-dark text-sm">{title}</h3>
      </div>
      <ul className="space-y-1">
        {items.map((item: any, idx: number) => (
          <li key={idx}>
            <button
              onClick={() => router.push(item.href)}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm text-text-light/70 dark:text-text-dark/70 hover:bg-background-light dark:hover:bg-background-dark hover:text-primary transition-all group"
            >
              <span>{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
      <div className="w-12 h-12 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-text-light/20 dark:text-text-dark/20" />
      </div>
      <p className="text-sm text-text-light/40 dark:text-text-dark/40">{message}</p>
    </div>
  );
}
