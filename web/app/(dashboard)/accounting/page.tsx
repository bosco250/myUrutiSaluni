'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '@/lib/api';
import {
  DollarSign,
  FileText,
  BookOpen,
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Briefcase,
  Download,
  PieChart as PieChartIcon, // Renamed to avoid conflict
  type LucideIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useEmployeePermissions } from '@/hooks/useEmployeePermissions';
import { EmployeePermission } from '@/lib/employee-permissions';
import { useToast } from '@/components/ui/Toast';
import { canViewAllSalons } from '@/lib/permissions';
import { formatCurrency } from '@/lib/currency';

// --- Types ---
interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  salesCount: number;
  expenseCount: number;
}

enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  expenseDate: string;
  categoryId: string;
  category?: { id: string; name: string };
  paymentMethod: string;
  vendorName?: string;
  status: string;
  createdAt: string;
}

interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName?: string;
  accountCode?: string;
  debitAmount: string | number;
  creditAmount: string | number;
  description?: string;
  account?: { code: string; name: string };
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: 'draft' | 'posted';
  totaldebit: string | number;
  totalcredit: string | number;
  lines: JournalEntryLine[];
}

interface ExpenseFormData {
  salonId: string;
  amount: number;
  description: string;
  expenseDate: string;
  categoryId: string;
  paymentMethod: string;
  vendorName?: string;
}

interface Salon {
  id: string;
  name: string;
  ownerId: string;
}

// --- Helper Functions ---


// --- Sub-Components ---

// 1. Stat Card with Trend
function StatCard({
  title,
  amount,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: {
  title: string;
  amount: string;
  subtext?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const styles = {
    blue: {
      border: 'border-blue-200 dark:border-blue-800/50',
      hover: 'hover:border-blue-300 dark:hover:border-blue-700',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      label: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      border: 'border-emerald-200 dark:border-emerald-800/50',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      label: 'text-emerald-600 dark:text-emerald-400',
    },
    red: {
      border: 'border-rose-200 dark:border-rose-800/50',
      hover: 'hover:border-rose-300 dark:hover:border-rose-700',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconText: 'text-rose-600 dark:text-rose-400',
      label: 'text-rose-600 dark:text-rose-400',
    },
    purple: {
      border: 'border-violet-200 dark:border-violet-800/50',
      hover: 'hover:border-violet-300 dark:hover:border-violet-700',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconText: 'text-violet-600 dark:text-violet-400',
      label: 'text-violet-600 dark:text-violet-400',
    },
    orange: {
      border: 'border-amber-200 dark:border-amber-800/50',
      hover: 'hover:border-amber-300 dark:hover:border-amber-700',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600 dark:text-amber-400',
      label: 'text-amber-600 dark:text-amber-400',
    }
  };

  const style = styles[color] || styles.blue;
  
  const trendColor = trend === 'up' ? 'text-emerald-500' 
                   : trend === 'down' ? 'text-rose-500' 
                   : 'text-text-light/40 dark:text-text-dark/40';
  
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <div className={`group relative bg-surface-light dark:bg-surface-dark border ${style.border} ${style.hover} rounded-xl p-3 transition-all`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-[10px] uppercase tracking-wide font-bold ${style.label}`}>{title}</p>
        <div className={`p-1 ${style.iconBg} rounded-md group-hover:scale-110 transition-transform`}>
          <Icon className={`w-3 h-3 ${style.iconText}`} />
        </div>
      </div>
      
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xl font-bold text-text-light dark:text-text-dark leading-tight">{amount}</p>
          {subtext && <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-0.5">{subtext}</p>}
        </div>
        
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-black ${trendColor}`}>
            {TrendIcon && <TrendIcon className="w-2.5 h-2.5" />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Tab Navigation (Pill Style)
function TabNav({
  tabs,
  activeString,
  onChange,
}: {
  tabs: Array<{ id: string; name: string; icon: LucideIcon }>;
  activeString: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex w-fit gap-1 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-1 sm:mb-6">
      {tabs.map((tab) => {
        const isActive = activeString === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors
              ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:bg-background-light dark:hover:bg-background-dark hover:text-text-light dark:hover:text-text-dark'
              }
            `}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// 3. Category Progress Bar
function CategoryProgress({ name, amount, total, colorClass = 'bg-primary' }: { name: string, amount: number, total: number, colorClass?: string }) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-light dark:text-text-dark">{name}</span>
        <span className="text-text-light/60 dark:text-text-dark/60">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border-light/40 dark:bg-border-dark/40">
        <div 
          className={`h-2 rounded-full ${colorClass} transition-all duration-500 ease-out`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}


// --- Page Component ---

// --- Page Component ---

export default function AccountingPage() {
  const { user } = useAuthStore();
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  
  // Date Range State
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [dateRangeLabel, setDateRangeLabel] = useState('This Month');

  // Fetch Salons
  const { data: salons = [], isLoading: isLoadingSalons } = useQuery<Salon[]>({
    queryKey: ['user-salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        const salonsData = response.data?.data || response.data || [];
        const allSalons = Array.isArray(salonsData) ? salonsData : [];

        // If user can view all salons (Admin/District Leader), return all
        if (canViewAllSalons(user?.role)) {
          return allSalons;
        }

        // Otherwise, filter to only salons owned by the user
        return allSalons.filter((s: any) => 
          s.ownerId === user?.id || s.owner?.id === user?.id
        );
      } catch (error) {
        console.error("Error fetching salons", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Set default salon
  useEffect(() => {
    if (salons.length > 0 && !selectedSalon) {
      setSelectedSalon(salons[0]);
    }
  }, [salons, selectedSalon]);

  const salonId = selectedSalon?.id || '';
  
  // Fetch permissions for the selected salon
  const { can, isLoading: isLoadingPermissions } = useEmployeePermissions(salonId);

  // Fetch Expense Categories for Filter
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories', salonId],
    queryFn: async () => {
      try {
        const res = await api.get('/accounting/expense-categories', {
          params: { salonId },
        });
        const categoriesData = res.data?.data || res.data || [];
        return Array.isArray(categoriesData) ? categoriesData : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId,
  });

  // Fetch Financial Summary (Moved up from OverviewTab to be Global)
  const { data: summary, isLoading: isLoadingSummary } = useQuery<FinancialSummary>({
    queryKey: ['financial-summary', salonId, dateRange, filterType, filterCategoryId],
    queryFn: async () => {
       try {
         const params: any = { salonId, ...dateRange };
         if (filterType !== 'all') params.type = filterType;
         if (filterCategoryId !== 'all') params.categoryId = filterCategoryId;

         const res = await api.get('/accounting/financial-summary', { params });
         // Handle wrapped response { data: { ... } } or direct { ... }
         return res.data?.data || res.data || { 
           totalRevenue: 0, 
           totalExpenses: 0, 
           netIncome: 0, 
           salesCount: 0, 
           expenseCount: 0 
         };
       } catch (error) {
         return { totalRevenue: 0, totalExpenses: 0, netIncome: 0, salesCount: 0, expenseCount: 0 };
       }
    },
    enabled: !!salonId
  });

  const netIncome = summary?.netIncome || 0;
  const isProfitable = netIncome >= 0;
  const margin = summary?.totalRevenue ? ((netIncome / summary.totalRevenue) * 100).toFixed(1) : '0.0';

  // Define tabs based on permissions
  const tabs = useMemo(() => {
    const t = [
      { id: 'overview', name: 'Overview', icon: PieChartIcon },
    ];

    if (can(EmployeePermission.VIEW_EXPENSE_REPORTS) || can(EmployeePermission.MANAGE_EXPENSES)) {
      t.push({ id: 'expenses', name: 'Expenses', icon: Receipt });
    }
    
    if (can(EmployeePermission.MANAGE_EXPENSES)) {
      t.push({ id: 'reports', name: 'Reports', icon: TrendingUp });
      t.push({ id: 'accounts', name: 'Chart of Accounts', icon: BookOpen });
      t.push({ id: 'journal', name: 'Journal', icon: FileText });
    }
    return t;
  }, [can]);

  // Redirect if active tab becomes inaccessible
  useEffect(() => {
     if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
     }
  }, [tabs, activeTab]);

  const handlePresetDate = (label: string, start: Date, end: Date) => {
    setDateRangeLabel(label);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRangeLabel('Custom');
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExportCsv = async () => {
    if (!salonId) return;
    try {
      const params: any = {
        salonId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      if (filterType !== 'all') params.type = filterType;
      if (filterCategoryId !== 'all') params.categoryId = filterCategoryId;

      const response = await api.get('/accounting/export/csv', {
        params,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_ledger_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
       console.error('Export failed:', error);
       alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!salonId) return;
    
    info('Generating PDF statement...', { title: 'Export Started', duration: 3000 });
    
    try {
      const params: any = {
        salonId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      if (filterType !== 'all') params.type = filterType;
      // Only include category filter if not 'income' (similar to query logic)
      if (filterType !== 'income' && filterCategoryId !== 'all') params.categoryId = filterCategoryId;

      const response = await api.get('/accounting/export/pdf', {
        params,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pnl_statement_${dateRange.startDate}_to_${dateRange.endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      success('PDF statement downloaded successfully.', { title: 'Export Complete' });
    } catch (err: any) {
       console.error('PDF Export failed:', err);
       
       let message = 'Failed to export PDF. Please try again.';
       
       // Try to parse blob error response to get actual server error
       if (err.response?.data instanceof Blob) {
         try {
           const text = await err.response.data.text();
           const json = JSON.parse(text);
           if (json.message) message = json.message;
         } catch (e) {
           // Ignore parse error, use default message
         }
       }
       
       error(message, { title: 'Export Failed' });
    }
  };


  if (isLoadingSalons) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60 font-medium">Loading accounting data...</p>
        </div>
      </div>
    );
  }

  if (!salonId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState 
          title="No Salon Selected" 
          description="Please create or select a salon to manage your accounting and finances."
          icon={<Briefcase className="w-16 h-16 text-gray-300" />}
          action={
            <Button variant="primary" onClick={() => window.location.href = '/salons/new'}>
              Create Salon
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Accounting</h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            Track your financial health and manage expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Salon Selector */}
          {salons.length > 1 && (
             <div className="relative">
                <select 
                  value={selectedSalon?.id || ''}
                  onChange={(e) => setSelectedSalon(salons.find(s => s.id === e.target.value) || null)}
                  className="appearance-none rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-sm font-medium text-text-light dark:text-text-dark transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-text-light/40 dark:text-text-dark/40" />
             </div>
          )}

          {/* Date Picker Actions */}
          <div className="flex items-center gap-1 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-1 py-1">
            <Button
              type="button"
              size="sm"
              variant={dateRangeLabel === 'This Month' ? 'primary' : 'secondary'}
              onClick={() =>
                handlePresetDate('This Month', startOfMonth(new Date()), endOfMonth(new Date()))
              }
              className="h-7 px-2 text-xs font-medium"
            >
              Month
            </Button>
            <Button
              type="button"
              size="sm"
              variant={dateRangeLabel === 'Last Month' ? 'primary' : 'secondary'}
              onClick={() =>
                handlePresetDate(
                  'Last Month',
                  startOfMonth(subMonths(new Date(), 1)),
                  endOfMonth(subMonths(new Date(), 1))
                )
              }
              className="h-7 px-2 text-xs font-medium"
            >
              Last Month
            </Button>
            <div className="mx-1 h-4 w-px bg-border-light dark:bg-border-dark" />
            <div className="flex items-center gap-2 px-2">
               <input 
                 type="date"
                 className="h-7 rounded-md border border-border-light bg-transparent px-2 text-xs text-text-light dark:border-border-dark dark:text-text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                 value={dateRange.startDate}
                 onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
               />
               <span className="text-text-light/40 select-none">-</span>
               <input 
                 type="date"
                 className="h-7 rounded-md border border-border-light bg-transparent px-2 text-xs text-text-light dark:border-border-dark dark:text-text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                 value={dateRange.endDate}
                 onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
               />
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-border-light dark:border-border-dark pl-2 ml-1">
             <select 
                className="h-9 rounded-md border border-border-light bg-surface-light px-2 text-xs font-medium dark:border-border-dark dark:bg-surface-dark focus:ring-1 focus:ring-primary outline-none"
                value={filterType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFilterType(val);
                  if (val !== 'expense') setFilterCategoryId('all');
                }}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
             </select>

             {filterType === 'expense' && (
               <select 
                  className="h-9 max-w-[150px] rounded-md border border-border-light bg-surface-light px-2 text-xs font-medium dark:border-border-dark dark:bg-surface-dark focus:ring-1 focus:ring-primary outline-none"
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {Array.isArray(categories) && categories.map((c: ExpenseCategory) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
               </select>
             )}
          </div>

          {/* Export Button */}
          <Button
             variant="secondary"
             size="sm"
             onClick={handleExportCsv}
             className="h-9 px-3 text-xs font-semibold"
             title="Export all financial records to CSV"
          >
             <Download className="mr-2 h-4 w-4" />
             CSV
          </Button>

          <Button
             variant="secondary"
             size="sm"
             onClick={handleExportPdf}
             className="h-9 px-3 text-xs font-semibold"
             title="Export Profit & Loss Statement to PDF"
          >
             <FileText className="mr-2 h-4 w-4" />
             PDF
          </Button>
        </div>
      </div>

       {/* Global KPI Cards (Placed ABOVE Navigation as requested) */}
       {isLoadingSummary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-border-light/60 bg-background-light/60 animate-pulse dark:border-border-dark/60 dark:bg-background-dark/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Revenue" 
            amount={formatCurrency(summary?.totalRevenue || 0)} 
            subtext={`${summary?.salesCount || 0} transactions`}
            icon={DollarSign}
            trend="up"
            trendValue="+12.5%" 
            color="green"
          />
          <StatCard 
            title="Total Expenses" 
            amount={formatCurrency(summary?.totalExpenses || 0)} 
            subtext={`${summary?.expenseCount || 0} records`}
            icon={TrendingDown}
            trend="down"
            trendValue="+4.2%" 
            color="red"
          />
          <StatCard 
            title="Net Income" 
            amount={formatCurrency(netIncome)} 
            subtext={isProfitable ? "Profitable Period" : "Loss Period"}
            icon={isProfitable ? TrendingUp : AlertCircle}
            trend={isProfitable ? 'up' : 'down'}
            color={isProfitable ? 'green' : 'orange'}
          />
           <StatCard 
            title="Profit Margin" 
            amount={`${margin}%`} 
            subtext="Net / Revenue"
            icon={Briefcase}
            trend="neutral"
            color="purple"
          />
        </div>
      )}

      {/* Navigation */}
      <TabNav tabs={tabs} activeString={activeTab} onChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && <OverviewTab salonId={salonId} dateRange={dateRange} summary={summary} />}
        {activeTab === 'expenses' && <ExpensesTab salonId={salonId} dateRange={dateRange} />}
        {activeTab === 'reports' && <ReportsTab salonId={salonId} dateRange={dateRange} />}
        {activeTab === 'accounts' && <AccountsTab salonId={salonId} />}
        {activeTab === 'journal' && <JournalEntriesTab salonId={salonId} dateRange={dateRange} />}
      </div>
    </div>
  );
}

// --- Charts Component ---

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

function FinancialCharts({ salonId, dateRange }: { salonId: string; dateRange: any }) {
  const { data: chartData, isLoading } = useQuery({
     queryKey: ['financial-charts', salonId, dateRange],
     queryFn: async () => {
         try {
           const res = await api.get('/accounting/charts/daily', { params: { salonId, ...dateRange }});
           const data = res.data?.data || res.data || [];
           return Array.isArray(data) ? data : [];
         } catch (error) {
            return [];
         }
      },
      enabled: !!salonId
  });

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
         <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
      return (
        <div className="relative flex h-72 flex-col items-center justify-center overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
                 style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} 
            />
            
            <div className="relative z-10 flex flex-col items-center gap-3 text-center p-6">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm">
                  <TrendingUp className="h-6 w-6 text-text-light/40 dark:text-text-dark/40" /> 
               </div>
               <div className="space-y-1">
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark">No Financial Activity</h3>
                  <p className="max-w-[240px] text-xs font-medium text-text-light/50 dark:text-text-dark/50">
                     There are no approved expenses or completed sales for the selected period.
                  </p>
               </div>

            </div>
        </div>
      );
  }

  return (
    <div className="rounded-xl border border-border-light bg-surface-light p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark">
      <div className="mb-6 flex items-center justify-between">
         <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Income & Expenses</h3>
         <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                <div className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue
             </div>
             <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                <div className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
             </div>
         </div>
      </div>
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
             <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
             </defs>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.5} />
             <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(new Date(val), 'd MMM')} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#9CA3AF' }} 
                minTickGap={30}
             />
             <YAxis 
                 fontSize={10} 
                 tickLine={false} 
                 axisLine={false} 
                 tickFormatter={(val) => new Intl.NumberFormat('en-RW', { notation: 'compact', compactDisplay: 'short' }).format(val)} 
                 tick={{ fill: '#9CA3AF' }} 
             />
             <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }} 
                labelStyle={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}
                labelFormatter={(val) => format(new Date(val), 'EEEE, MMM d, yyyy')}
                formatter={(val: number, name: string) => [
                  <span key="val" className="font-semibold text-text-light dark:text-text-dark">
                    {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(val)}
                  </span>, 
                  name
                ]}
             />
             <Area 
               type="monotone" 
               dataKey="revenue" 
               name="Revenue" 
               stroke="#10b981" 
               fillOpacity={1} 
               fill="url(#colorRevenue)" 
               strokeWidth={2} 
             />
             <Bar 
               dataKey="expenses" 
               name="Expenses" 
               fill="#f43f5e" 
               radius={[4, 4, 0, 0]} 
               barSize={12} 
               maxBarSize={40}
             />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- TAB 1: OVERVIEW ---

function OverviewTab({ 
  salonId, 
  dateRange, 
  summary 
}: { 
  salonId: string; 
  dateRange: { startDate: string; endDate: string };
  summary?: FinancialSummary;
}) {
  const { data: expenseSummary } = useQuery({
    queryKey: ['expense-summary', salonId, dateRange],
    queryFn: async () => {
       try {
         const res = await api.get('/accounting/expense-summary', { params: { salonId, ...dateRange }});
         return res.data?.data || res.data || { byCategory: [] };
       } catch (error) {
          return { byCategory: [] };
       }
    },
    enabled: !!salonId
  });

  return (
    <div className="space-y-6">
        {/* Charts & Breakdown - Compacted & Flat */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <FinancialCharts salonId={salonId} dateRange={dateRange} />
          </div>

          {/* Expense Breakdown Card */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 flex flex-col transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-text-light/40">Expense Breakdown</h3>
              <PieChartIcon className="w-3.5 h-3.5 text-text-light/20" />
            </div>

            {expenseSummary?.byCategory?.length > 0 ? (
              <div className="flex flex-col gap-6 flex-1">
                {/* Pie Chart */}
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseSummary.byCategory}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {expenseSummary.byCategory.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(val)}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                          padding: '8px 12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend / List */}
                <div className="space-y-3 overflow-y-auto max-h-60 pr-2 custom-scrollbar">
                  {(expenseSummary.byCategory as Array<{ categoryName: string; total: number }>).map((cat, index) => (
                    <div key={cat.categoryName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[11px] font-bold text-text-light dark:text-text-dark">{cat.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-text-light dark:text-text-dark tracking-tighter">{formatCurrency(cat.total)}</span>
                        <span className="text-[9px] font-black uppercase text-text-light/30 tracking-widest">
                          {summary?.totalExpenses ? Math.round((cat.total / summary.totalExpenses) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border-light/70 py-10 text-center dark:border-border-dark/60">
                <div className="p-3 bg-text-light/5 dark:bg-text-dark/5 rounded-full mb-3">
                  <PieChartIcon className="h-5 w-5 opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light/30">No Data Reported</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

// --- TAB 2: EXPENSES ---

function ExpensesTab({ salonId, dateRange }: { salonId: string; dateRange: { startDate: string; endDate: string } }) {
  const { can } = useEmployeePermissions(salonId);
  const canCreate = can(EmployeePermission.CREATE_EXPENSES) || can(EmployeePermission.MANAGE_EXPENSES);
  const canDelete = can(EmployeePermission.MANAGE_EXPENSES);

  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Reset to page 1 if search/filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, dateRange]);

  // Queries
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', salonId, dateRange, selectedCategory, page],
    queryFn: async () => {
      try {
        const p = { 
          salonId, 
          ...dateRange, 
          page, 
          limit,
          ...(selectedCategory && { categoryId: selectedCategory })
        };
        console.log('[DEBUG] Fetching expenses with params:', p);
        const res = await api.get('/accounting/expenses', { params: p });
        
        const raw = res.data;
        console.log('[DEBUG] Expenses raw response:', raw);
        
        // Normalize response to { data: [], total: 0 }
        let list: Expense[] = [];
        let total = 0;

        if (Array.isArray(raw)) {
            list = raw;
            total = raw.length;
        } else if (raw?.data?.data && Array.isArray(raw.data.data)) {
             // Case: { data: { data: [Array], ... } } - This matches your log
             list = raw.data.data;
             total = raw.data.total || raw.data.count || raw.data.meta?.total || list.length;
        } else if (raw?.data && Array.isArray(raw.data)) {
             // Case: { data: [Array] }
             list = raw.data;
             total = raw.total || raw.count || raw.meta?.total || list.length;
        } else if (raw?.expenses && Array.isArray(raw.expenses)) {
             list = raw.expenses;
             total = raw.total || raw.count || raw.meta?.total || raw.expenses.length;
        }
        
        console.log('[DEBUG] Normalized expenses list:', list);
        return { data: list, total };
      } catch (error) {
        console.error('[DEBUG] Error fetching expenses:', error);
        return { data: [], total: 0 };
      }
    },
    enabled: !!salonId
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
     queryKey: ['expense-categories', salonId],
     queryFn: async () => {
       try {
         const res = await api.get('/accounting/expense-categories', { params: { salonId } });
         const categoriesData = res.data?.data || res.data || [];
         return Array.isArray(categoriesData) ? categoriesData : [];
       } catch (error) {
         return [];
       }
     },
     enabled: !!salonId
  });

  // Mutations
  const createMutation = useMutation({
     mutationFn: (data: ExpenseFormData) => api.post('/accounting/expenses', data),
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
        setShowAddModal(false);
     }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/expenses/${id}`),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['expenses'] });
       queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
       queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
    }
  });

  // Filter
  const filtered = useMemo(() => {
     const list = expensesData?.data || [];
     if (!searchTerm) return list;
     return list.filter((e: Expense) => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [expensesData, searchTerm]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      salonId,
      amount: parseFloat(fd.get('amount') as string),
      description: fd.get('description') as string,
      expenseDate: fd.get('expenseDate') as string,
      categoryId: fd.get('categoryId') as string,
      paymentMethod: fd.get('paymentMethod') as string,
      vendorName: fd.get('vendorName') as string,
    });
  };

  return (
    <div className="space-y-6">
       {/* Actions Bar - Compacted & Flat */}
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40" />
                <input 
                  type="text" 
                  placeholder="Filter expenses..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border-light bg-surface-light py-2 pl-9 pr-3 text-xs font-bold text-text-light shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                />
             </div>
             <select 
               value={selectedCategory}
               onChange={e => setSelectedCategory(e.target.value)}
               className="w-full rounded-xl border border-border-light bg-surface-light px-3 py-2 text-xs font-bold text-text-light transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark sm:w-auto outline-none"
             >
                <option value="">All Categories</option>
                {Array.isArray(categories) && categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          {canCreate && (
            <Button 
              variant="primary" 
              onClick={() => setShowAddModal(true)} 
              className="h-9 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
               <Plus className="mr-2 h-3.5 w-3.5" />
               New Expense
            </Button>
          )}
       </div>

       {/* Data Table - Compacted & Flat */}
       <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
          {isLoading ? (
             <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
             <EmptyState 
                title="No expenses found"
                description={searchTerm ? "Try adjusting your search filters" : "Start tracking your business spending"}
                icon={<Receipt className="w-16 h-16 text-gray-300" />}
                action={(!searchTerm && canCreate) && <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>Create First Expense</Button>}
             />
          ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                     <tr>
                        <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Date</th>
                        <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Description</th>
                        <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Category</th>
                        <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Method</th>
                        <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Amount</th>
                        {canDelete && <th className="px-3 py-2.5 w-12 text-right"></th>}
                     </tr>
                  </thead>
                   <tbody className="divide-y divide-border-light dark:divide-border-dark">
                     {filtered.map((expense: Expense) => (
                        <tr key={expense.id} className="group transition-colors hover:bg-background-light/30 dark:hover:bg-background-dark/20">
                           <td className="whitespace-nowrap px-3 py-2.5 font-medium text-text-light dark:text-text-dark">
                              {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                           </td>
                           <td className="px-3 py-2.5">
                              <div className="font-bold text-text-light dark:text-text-dark">{expense.description}</div>
                              {expense.vendorName && <div className="text-[9px] uppercase font-bold text-text-light/40 tracking-wider font-mono">{expense.vendorName}</div>}
                           </td>
                           <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight bg-primary/10 text-primary border border-primary/20">
                                 {expense.category?.name || 'Uncategorized'}
                              </span>
                           </td>
                           <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-text-light/50 dark:text-text-dark/40">
                              {expense.paymentMethod?.replace('_', ' ') || 'N/A'}
                           </td>
                           <td className="px-3 py-2.5 text-right font-black text-text-light dark:text-text-dark">
                              {formatCurrency(expense.amount)}
                           </td>

                           {canDelete && (
                             <td className="px-3 py-2.5 text-right">
                                <Button
                                  onClick={() => confirm('Delete expense?') && deleteMutation.mutate(expense.id)}
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 w-7 rounded-lg p-0 bg-transparent hover:bg-rose-500/10 hover:text-rose-500 border-none group-hover:opacity-100 opacity-0 transition-opacity"
                                >
                                   <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                             </td>
                           )}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
           )}

           {/* Pagination UI - Compacted & Flat */}
           <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark px-3 py-2.5 bg-background-light/5 dark:bg-background-dark/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-light/40 dark:text-text-dark/40">
                 {expensesData?.total || 0} Records Found
              </span>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black mr-2 opacity-30 uppercase tracking-tighter">Page {page} of {Math.max(1, Math.ceil((expensesData?.total || 0) / limit))}</span>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark"
                 >Prev</Button>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= (expensesData?.total || 0)}
                    className="h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark"
                 >Next</Button>
              </div>
           </div>
        </div>

        {/* Add Expense Modal - Compacted & Flat */}
        {canCreate && (
          <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Expense">
             <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                   <div>
                      <label htmlFor="expense-amount" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Amount (RWF) *</label>
                      <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-light/30">RWF</div>
                         <input 
                            id="expense-amount"
                            type="number" name="amount" required min="1" step="1"
                            className="w-full rounded-2xl border border-border-light bg-surface-light py-3 pl-14 pr-4 text-xl font-black text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                            placeholder="0"
                         />
                      </div>
                   </div>

                   <div>
                      <label htmlFor="expense-description" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Description *</label>
                      <input id="expense-description" type="text" name="description" required placeholder="e.g. Monthly Rent"
                         className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                      />
                   </div>

                   <div className="md:col-span-2">
                      <label htmlFor="expense-date" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Transaction Date *</label>
                      <input id="expense-date" type="date" name="expenseDate" required defaultValue={format(new Date(), 'yyyy-MM-dd')}
                         className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                      />
                   </div>

                   <div>
                      <label htmlFor="expense-category" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Category *</label>
                      <select id="expense-category" name="categoryId" required className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark outline-none">
                         <option value="">Select...</option>
                         {Array.isArray(categories) && categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>

                   <div>
                      <label htmlFor="expense-payment-method" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Payment Method</label>
                      <select id="expense-payment-method" name="paymentMethod" required className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark outline-none">
                         <option value="cash">Cash</option>
                         <option value="mobile_money">Mobile Money</option>
                         <option value="bank_transfer">Bank Transfer</option>
                         <option value="card">Card</option>
                      </select>
                   </div>

                    <div className="md:col-span-2">
                      <label htmlFor="expense-vendor" className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Vendor (Optional)</label>
                      <input id="expense-vendor" type="text" name="vendorName" placeholder="e.g. Landlord"
                         className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                      />
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                   <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="px-6 text-[10px] font-black uppercase tracking-widest">
                      Discard
                   </Button>
                   <Button type="submit" variant="primary" disabled={createMutation.isPending} className="px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                      {createMutation.isPending ? 'Syncing...' : 'Rollout Expense'}
                   </Button>
                </div>
             </form>
          </Modal>
        )}
    </div>
  );
}


// --- TAB 3: ACCOUNTS ---

// --- TAB 3: CATEGORIES (formerly ACCOUNTS) ---

function AccountsTab({ salonId }: { salonId: string }) {
  const queryClient = useQueryClient();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; accountType: AccountType }) => {
      return api.post('/accounting/accounts', {
        code: data.code,
        name: data.name,
        accountType: data.accountType,
        salonId,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories', salonId] });
      setShowCreateCategory(false);
    },
  });

  const { data: accounts = [], isLoading } = useQuery<ExpenseCategory[]>({
      queryKey: ['all-accounts', salonId],
      queryFn: async () => {
         try {
            const res = await api.get('/accounting/accounts', { params: { salonId } });
            const data = res.data?.data || res.data || [];
            return Array.isArray(data) ? data : [];
         } catch (error) {
            return [];
         }
      },
      enabled: !!salonId
  });

  const accountsByType = useMemo(() => {
    const grouped: Record<string, ExpenseCategory[]> = {};
    accounts.forEach(acc => {
      const type = acc.accountType || 'EXPENSE';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(acc);
    });
    return grouped;
  }, [accounts]);

  const [editingAccount, setEditingAccount] = useState<ExpenseCategory | null>(null);

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: string; code: string; name: string; accountType: AccountType }) => {
      return api.patch(`/accounting/accounts/${data.id}`, {
        code: data.code,
        name: data.name,
        accountType: data.accountType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-accounts', salonId] });
      setShowCreateCategory(false);
      setEditingAccount(null);
    },
  });

  const handleEdit = (account: ExpenseCategory) => {
    setEditingAccount(account);
    setShowCreateCategory(true);
  };

  const handleCloseModal = () => {
    setShowCreateCategory(false);
    setEditingAccount(null);
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Chart of Accounts</h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Manage your financial accounts and categories</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setEditingAccount(null); setShowCreateCategory(true); }} className="h-9 px-3 text-sm font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
       </div>
       
       {isLoading ? (
         <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 rounded-xl border border-border-light/60 bg-background-light/60 animate-pulse dark:border-border-dark/60 dark:bg-background-dark/40" />)}
         </div>
       ) : (
          <div className="space-y-8">
             {Object.keys(accountsByType).length === 0 && (
                <EmptyState 
                  title="No Accounts Found" 
                  description="Start by creating your first account."
                  icon={<BookOpen className="w-12 h-12 text-gray-300" />}
                />
             )}
             
             {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => {
               const typeAccounts = accountsByType[type.toLowerCase()] || accountsByType[type] || [];
               if (typeAccounts.length === 0) return null;

               return (
                 <div key={type}>
                   <h3 className="text-xs font-black uppercase tracking-widest text-text-light/40 mb-3 border-b border-border-light dark:border-border-dark pb-1">{type}S</h3>
                   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {typeAccounts.map((cat) => (
                         <div 
                           key={cat.id} 
                           onClick={() => handleEdit(cat)}
                           className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                         >
                            <div className="flex items-center justify-between mb-3">
                               <div className="p-2 bg-primary/5 dark:bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                                  <BookOpen className="w-4 h-4 text-primary" />
                               </div>
                               <span className="text-[9px] font-mono font-black uppercase text-text-light/30 tracking-tighter bg-text-light/5 px-1.5 py-0.5 rounded">{cat.code}</span>
                            </div>
                            <div>
                               <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-1">{cat.accountType}</h3>
                               <p className="text-sm font-black text-text-light dark:text-text-dark leading-tight">{cat.name}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                 </div>
               );
             })}
          </div>
       )}

       <Modal
         isOpen={showCreateCategory}
         onClose={handleCloseModal}
         title={editingAccount ? "Edit Account" : "New Account"}
       >
         <form
           onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const code = String(fd.get('code') || '').trim();
             const name = String(fd.get('name') || '').trim();
             const accountType = (fd.get('accountType') as AccountType) || AccountType.EXPENSE;
             if (!code || !name) return;
             
             if (editingAccount) {
               updateCategoryMutation.mutate({ id: editingAccount.id, code, name, accountType });
             } else {
               createCategoryMutation.mutate({ code, name, accountType });
             }
           }}
           className="space-y-5"
         >
           <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
             <div>
                <label
                   htmlFor="account-code"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2"
                >
                  Code
                </label>
                <input
                  id="account-code"
                  name="code"
                  type="text"
                  defaultValue={editingAccount?.code || ''}
                  placeholder="e.g. EXP-NEW"
                  className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                  required
                />
             </div>
             <div>
                <label
                   htmlFor="account-name"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2"
                >
                  Name
                </label>
                <input
                  id="account-name"
                  name="name"
                  type="text"
                  defaultValue={editingAccount?.name || ''}
                  placeholder="e.g. Insurance"
                  className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark"
                  required
                />
             </div>
             <div className="md:col-span-2">
                <label
                   htmlFor="account-type"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2"
                >
                  Type
                </label>
                <select
                  id="account-type"
                  name="accountType"
                  defaultValue={editingAccount?.accountType || AccountType.EXPENSE}
                  className="w-full rounded-2xl border border-border-light bg-surface-light px-4 py-3 text-sm font-bold text-text-light focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark outline-none"
                  required
                >
                  {Object.values(AccountType).map((t) => (
                    <option key={t} value={t} className="uppercase">{t}</option>
                  ))}
                </select>
             </div>
           </div>
           
           <div className="flex justify-end gap-3 pt-4">
             <Button type="button" variant="secondary" onClick={handleCloseModal} className="px-6 text-[10px] font-black uppercase tracking-widest">
               Discard
             </Button>
             <Button type="submit" variant="primary" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending} className="px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
               {createCategoryMutation.isPending || updateCategoryMutation.isPending ? 'Syncing...' : (editingAccount ? 'Update Account' : 'Rollout Account')}
             </Button>
           </div>
         </form>
       </Modal>
    </div>
  );
}

// --- TAB 4: REPORTS ---

function ReportsTab({ salonId, dateRange }: { salonId: string; dateRange: { startDate: string; endDate: string } }) {
  const { success, error, info } = useToast();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const { data: balanceSheet, isLoading } = useQuery({
    queryKey: ['balance-sheet', salonId, dateRange.endDate],
    queryFn: async () => {
      const res = await api.get('/accounting/reports/balance-sheet', { params: { salonId, asOfDate: dateRange.endDate }});
      return res.data?.data || res.data || { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
    },
    enabled: !!salonId
  });

  const isBalanced = balanceSheet ? Math.abs(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity)) < 1.0 : false;

  const AccountSection = ({ title, accounts, total, color = "text-text-light" }: any) => (
    <div className="rounded-xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark">
       <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3 dark:border-border-dark">
         <h3 className="text-xs font-black uppercase tracking-widest text-text-light/50">{title}</h3>
         <span className={`text-sm font-bold ${color}`}>{formatCurrency(total)}</span>
       </div>
       <div className="space-y-2">
         {accounts.map((acc: any) => (
           <div key={acc.id} className="flex items-center justify-between text-xs">
             <span className="font-medium text-text-light dark:text-text-dark">{acc.code} - {acc.name}</span>
             <span className="font-mono text-text-light/70 dark:text-text-dark/70">{formatCurrency(acc.balance)}</span>
           </div>
         ))}
         {accounts.length === 0 && <span className="text-[10px] text-text-light/30 italic">No accounts with balance.</span>}
       </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
         <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Financial Reports</h2>
         <p className="text-xs text-text-light/60 dark:text-text-dark/60">Balance Sheet as of {format(new Date(dateRange.endDate), 'MMMM d, yyyy')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Sheet Card */}
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Button 
               variant="outline" 
               size="sm"
               className="h-8 w-8 text-text-light/40 hover:text-primary"
               disabled={downloadingReport === 'balance-sheet'}
               onClick={async () => {
                 try {
                   setDownloadingReport('balance-sheet');
                   info('Generating Balance Sheet PDF...', { title: 'Downloading Report' });
                   
                   const response = await api.get('/accounting/reports/balance-sheet/pdf', {
                     params: { salonId, asOfDate: dateRange.endDate },
                     responseType: 'blob' 
                   });
                   const url = window.URL.createObjectURL(new Blob([response.data]));
                   const link = document.createElement('a');
                   link.href = url;
                   link.setAttribute('download', `balance-sheet-${dateRange.endDate}.pdf`);
                   document.body.appendChild(link);
                   link.click();
                   link.remove();
                   
                   success('Balance Sheet downloaded successfully.', { title: 'Success' });
                 } catch (err) {
                   console.error("Download failed", err);
                   error('Failed to download report. Please try again.', { title: 'Error' });
                 } finally {
                   setDownloadingReport(null);
                 }
               }}
             >
               {downloadingReport === 'balance-sheet' ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 <Download className="h-4 w-4" />
               )}
            </Button>
          </div>
          <h3 className="font-bold text-sm text-text-light dark:text-text-dark">Balance Sheet</h3>
          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-1 mb-3">
            Snapshot of financial position as of {new Date(dateRange.endDate).toLocaleDateString()}.
          </p>
          <div className="text-xs font-medium text-emerald-600">
            Assets = Liabilities + Equity
          </div>
        </div>

        {/* Profit & Loss Card */}
        <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <Button 
               variant="outline" 
               size="sm"
               className="h-8 w-8 text-text-light/40 hover:text-primary"
               disabled={downloadingReport === 'profit-loss'}
               onClick={async () => {
                 try {
                   setDownloadingReport('profit-loss');
                   info('Generating Profit & Loss PDF...', { title: 'Downloading Report' });

                   const response = await api.get('/accounting/reports/profit-loss/pdf', {
                     params: { salonId, startDate: dateRange.startDate, endDate: dateRange.endDate },
                     responseType: 'blob' 
                   });
                   const url = window.URL.createObjectURL(new Blob([response.data]));
                   const link = document.createElement('a');
                   link.href = url;
                   link.setAttribute('download', `profit-loss-${dateRange.endDate}.pdf`);
                   document.body.appendChild(link);
                   link.click();
                   link.remove();

                   success('Profit & Loss downloaded successfully.', { title: 'Success' });
                 } catch (err) {
                   console.error("Download failed", err);
                   error('Failed to download report. Please try again.', { title: 'Error' });
                 } finally {
                   setDownloadingReport(null);
                 }
               }}
             >
               {downloadingReport === 'profit-loss' ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 <Download className="h-4 w-4" />
               )}
            </Button>
          </div>
          <h3 className="font-bold text-sm text-text-light dark:text-text-dark">Profit & Loss</h3>
          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-1 mb-3">
            Income and expenses from {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}.
          </p>
          <div className="text-xs font-medium text-blue-600">
            Net Income Calculation
          </div>
        </div>

        {/* Chart of Accounts Card */}
         <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <Button 
               variant="outline" 
               size="sm"
               className="h-8 w-8 text-text-light/40 hover:text-primary"
               disabled={downloadingReport === 'chart-of-accounts'}
               onClick={async () => {
                 try {
                   setDownloadingReport('chart-of-accounts');
                   info('Generating Chart of Accounts PDF...', { title: 'Downloading Report' });

                   const response = await api.get('/accounting/reports/accounts/pdf', {
                     params: { salonId },
                     responseType: 'blob' 
                   });
                   const url = window.URL.createObjectURL(new Blob([response.data]));
                   const link = document.createElement('a');
                   link.href = url;
                   link.setAttribute('download', `chart-of-accounts.pdf`);
                   document.body.appendChild(link);
                   link.click();
                   link.remove();
                   
                   success('Chart of Accounts downloaded successfully.', { title: 'Success' });
                 } catch (err) {
                   console.error("Download failed", err);
                   error('Failed to download report. Please try again.', { title: 'Error' });
                 } finally {
                   setDownloadingReport(null);
                 }
               }}
             >
               {downloadingReport === 'chart-of-accounts' ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 <Download className="h-4 w-4" />
               )}
            </Button>
          </div>
          <h3 className="font-bold text-sm text-text-light dark:text-text-dark">Chart of Accounts</h3>
          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-1 mb-3">
            Complete list of all asset, liability, equity, revenue, and expense accounts.
          </p>
          <div className="text-xs font-medium text-purple-600">
            Master Record
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="h-64 animate-pulse rounded-xl bg-surface-light dark:bg-surface-dark" />
           <div className="h-64 animate-pulse rounded-xl bg-surface-light dark:bg-surface-dark" />
        </div>
      ) : (
        <div className="space-y-6">
           {/* Summary Equation Card */}
           <div className={`rounded-xl border p-4 flex items-center justify-between ${isBalanced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
              <div className="flex items-center gap-4">
                 <div className="text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-text-light/40">Total Assets</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(balanceSheet.totalAssets)}</span>
                 </div>
                 <span className="text-lg font-bold text-text-light/30">=</span>
                 <div className="text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-text-light/40">Liabilities + Equity</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</span>
                 </div>
              </div>
              <div className="text-right">
                 <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                    {isBalanced ? 'Balanced' : 'Unbalanced'}
                 </span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Column */}
              <div className="space-y-6">
                 <AccountSection title="Assets" accounts={balanceSheet.assets} total={balanceSheet.totalAssets} color="text-emerald-600" />
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-6">
                 <AccountSection title="Liabilities" accounts={balanceSheet.liabilities} total={balanceSheet.totalLiabilities} color="text-rose-600" />
                 <AccountSection title="Equity" accounts={balanceSheet.equity} total={balanceSheet.totalEquity} color="text-primary" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- TAB 5: JOURNAL ENTRIES (Existing) ---

function JournalEntriesTab({ salonId, dateRange }: { salonId: string; dateRange: { startDate: string; endDate: string } }) {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: entriesData, isLoading } = useQuery<any>({
    queryKey: ['journal-entries', salonId, dateRange, page],
    queryFn: async () => {
      const res = await api.get('/accounting/journal-entries', { 
        params: { 
          salonId, 
          ...dateRange,
          page,
          limit
        } 
      });
      return res.data;
    },
    enabled: !!salonId
  });

  const { entries, total } = useMemo(() => {
    const raw = entriesData;
    let list: JournalEntry[] = [];
    let t = 0;

    if (Array.isArray(raw)) {
      list = raw;
      t = raw.length;
    } else if (raw?.data && Array.isArray(raw.data)) {
      list = raw.data;
      t = raw.total || raw.count || list.length;
    } else if (raw?.data?.data && Array.isArray(raw.data.data)) {
      list = raw.data.data;
      t = raw.data.total || raw.data.count || list.length;
    }

    return { entries: list, total: t };
  }, [entriesData]);

  const createEntryMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/journal-entries', data),
    onSuccess: () => {
      success('Journal entry posted successfully');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to post journal entry');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Journal Entries</h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Record double-entry adjustments and transfers</p>
         </div>
         <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="h-9 px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
           <Plus className="mr-2 h-3.5 w-3.5" />
           New Entry
         </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-surface-light dark:bg-surface-dark" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-light bg-surface-light/50 p-8 text-center dark:border-border-dark dark:bg-surface-dark/50">
           <BookOpen className="mx-auto h-12 w-12 text-text-light/20 dark:text-text-dark/20 mb-4" />
           <h3 className="text-sm font-bold text-text-light dark:text-text-dark">No Entries Found</h3>
           <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1 max-w-xs mx-auto">
             Create your first journal entry to track adjustments or opening balances.
           </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
                 <div className="flex items-center justify-between mb-3 border-b border-border-light dark:border-border-dark pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">{entry.entryNumber}</span>
                        <span className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">{format(new Date(entry.entryDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <h3 className="text-sm font-bold text-text-light dark:text-text-dark mt-1">{entry.description}</h3>
                    </div>
                    <div className="text-right">
                       <span className="block text-[10px] font-black uppercase tracking-widest text-text-light/40">Total</span>
                       <span className="text-sm font-bold text-text-light dark:text-text-dark">
                         {formatCurrency(entry.lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0))}
                       </span>
                    </div>
                 </div>
                 <div className="bg-background-light/50 dark:bg-background-dark/50 rounded-lg overflow-hidden">
                   <table className="w-full text-left text-xs">
                     <thead className="text-[9px] font-black uppercase tracking-widest text-text-light/40 border-b border-border-light/50 dark:border-border-dark/50">
                       <tr>
                         <th className="px-3 py-2">Account</th>
                         <th className="px-3 py-2 text-right">Debit</th>
                         <th className="px-3 py-2 text-right">Credit</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border-light/30 dark:divide-border-dark/30">
                       {entry.lines.map(line => (
                         <tr key={line.id}>
                           <td className="px-3 py-1.5 font-medium text-text-light dark:text-text-dark">
                             {line.accountCode || line.account?.code} - {line.accountName || line.account?.name}
                             {line.description && <span className="block text-[9px] text-text-light/40 font-normal">{line.description}</span>}
                           </td>
                           <td className="px-3 py-1.5 text-right font-mono text-text-light/70 dark:text-text-dark/70">
                             {Number(line.debitAmount) > 0 ? formatCurrency(Number(line.debitAmount)) : '-'}
                           </td>
                           <td className="px-3 py-1.5 text-right font-mono text-text-light/70 dark:text-text-dark/70">
                             {Number(line.creditAmount) > 0 ? formatCurrency(Number(line.creditAmount)) : '-'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            ))}
          </div>

          {/* Pagination UI */}
          <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark px-3 py-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-light/40 dark:text-text-dark/40">
                 {total} Journals Found
              </span>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black mr-2 opacity-30 uppercase tracking-tighter">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1}
                    className="h-7 px-3 text-[10px] font-black uppercase tracking-widest"
                 >Prev</Button>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                        setPage(p => p + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page * limit >= total}
                    className="h-7 px-3 text-[10px] font-black uppercase tracking-widest"
                 >Next</Button>
              </div>
          </div>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Journal Entry">
         <JournalEntryForm 
           salonId={salonId} 
           onSubmit={(data) => createEntryMutation.mutate(data)} 
           isSubmitting={createEntryMutation.isPending}
           onCancel={() => setShowCreateModal(false)}
         />
      </Modal>
    </div>
  );
}

function JournalEntryForm({ salonId, onSubmit, isSubmitting, onCancel }: { salonId: string; onSubmit: (data: any) => void; isSubmitting: boolean; onCancel: () => void }) {
  const { data: accounts = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['all-accounts', salonId],
    queryFn: async () => {
      const res = await api.get('/accounting/accounts', { params: { salonId } });
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const [lines, setLines] = useState([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' }
  ]);

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Debits must equal Credits');
      return;
    }
    
    const formData = new FormData(e.target as HTMLFormElement);
    const entryData = {
      salonId,
      entryDate: formData.get('entryDate'),
      description: formData.get('description'),
      entryNumber: `JE-${Date.now().toString().slice(-6)}`,
      status: 'posted',
      lines: lines
        .filter(l => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
        .map(l => ({
          accountId: l.accountId,
          debitAmount: l.debit || '0',
          creditAmount: l.credit || '0',
          description: l.description
        }))
    };
    
    onSubmit(entryData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
         <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Entry Date</label>
            <input name="entryDate" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')}
              className="w-full rounded-xl border border-border-light bg-surface-light px-3 py-2 text-sm font-bold text-text-light focus:ring-2 focus:ring-primary/20 outline-none dark:bg-surface-dark dark:text-text-dark dark:border-border-dark"
            />
         </div>
         <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-light/40 mb-2">Reference / Description</label>
            <input name="description" type="text" required placeholder="e.g. Opening Balance"
              className="w-full rounded-xl border border-border-light bg-surface-light px-3 py-2 text-sm font-bold text-text-light focus:ring-2 focus:ring-primary/20 outline-none dark:bg-surface-dark dark:text-text-dark dark:border-border-dark"
            />
         </div>
      </div>

      <div className="border rounded-xl overflow-hidden border-border-light dark:border-border-dark">
         <table className="w-full text-left">
           <thead className="bg-background-light dark:bg-background-dark text-[10px] font-black uppercase tracking-widest text-text-light/50">
             <tr>
               <th className="px-3 py-2">Account</th>
               <th className="px-3 py-2 w-24 text-right">Debit</th>
               <th className="px-3 py-2 w-24 text-right">Credit</th>
               <th className="px-3 py-2 w-8"></th>
             </tr>
           </thead>
           <tbody className="divide-y divide-border-light dark:divide-border-dark">
             {lines.map((line, idx) => (
               <tr key={idx} className="bg-surface-light dark:bg-surface-dark">
                 <td className="p-2">
                    <select 
                      value={line.accountId}
                      onChange={e => updateLine(idx, 'accountId', e.target.value)}
                      required
                      className="w-full bg-transparent text-xs font-bold text-text-light dark:text-text-dark outline-none"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name} ({acc.accountType || 'EXPENSE'})</option>
                      ))}
                    </select>
                 </td>
                 <td className="p-2">
                    <input 
                      type="number" step="0.01" min="0"
                      value={line.debit}
                      onChange={e => updateLine(idx, 'debit', e.target.value)}
                      onBlur={e => {
                        if (parseFloat(e.target.value) > 0) updateLine(idx, 'credit', '');
                      }}
                      className="w-full bg-transparent text-right text-xs font-mono font-bold text-text-light dark:text-text-dark outline-none placeholder:text-text-light/20"
                      placeholder="0.00"
                    />
                 </td>
                 <td className="p-2">
                    <input 
                      type="number" step="0.01" min="0"
                      value={line.credit}
                      onChange={e => updateLine(idx, 'credit', e.target.value)}
                      onBlur={e => {
                        if (parseFloat(e.target.value) > 0) updateLine(idx, 'debit', '');
                      }}
                      className="w-full bg-transparent text-right text-xs font-mono font-bold text-text-light dark:text-text-dark outline-none placeholder:text-text-light/20"
                      placeholder="0.00"
                    />
                 </td>
                 <td className="p-2 text-center">
                   {lines.length > 2 && (
                     <button type="button" onClick={() => removeLine(idx)} className="text-text-light/30 hover:text-red-500">
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
         <div className="p-2 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark">
            <button type="button" onClick={addLine} className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wide hover:underline">
               <Plus className="w-3 h-3" /> Add Line
            </button>
         </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
         <div className="text-xs">
           <div className="flex gap-4">
              <span className="text-text-light/50">Total Debit: <span className="font-mono font-bold text-text-light dark:text-text-dark">{formatCurrency(totalDebit)}</span></span>
              <span className="text-text-light/50">Total Credit: <span className="font-mono font-bold text-text-light dark:text-text-dark">{formatCurrency(totalCredit)}</span></span>
           </div>
         </div>
         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isBalanced ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
            {isBalanced ? 'Balanced' : 'Unbalanced'}
         </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="px-6 text-[10px] font-black uppercase tracking-widest">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting || !isBalanced} className="px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
          {isSubmitting ? 'Posting...' : 'Post Entry'}
        </Button>
      </div>
    </form>
  );
}
