'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  PieChart,
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

// --- Types ---
interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  salesCount: number;
  expenseCount: number;
}

interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
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
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

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
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-rose-500/10 text-rose-500',
    purple: 'bg-violet-500/10 text-violet-500',
    orange: 'bg-amber-500/10 text-amber-500',
  };

  const trendBadgeClass =
    trend === 'up'
      ? 'bg-emerald-500/10 text-emerald-500'
      : trend === 'down'
        ? 'bg-rose-500/10 text-rose-500'
        : 'bg-gray-100 dark:bg-gray-800 text-text-light/60 dark:text-text-dark/60';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]} group-hover:scale-105 transition-transform`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${trendBadgeClass}`}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">{title}</p>
        <h3 className="text-xl font-bold text-text-light dark:text-text-dark">{amount}</h3>
        {subtext && <p className="text-xs text-text-light/40 dark:text-text-dark/40">{subtext}</p>}
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

export default function AccountingPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  
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
        const allSalons = response.data || [];
        if (user?.role === 'salon_owner') {
          return allSalons.filter((s: Salon) => s.ownerId === user.id);
        }
        return allSalons;
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

  // Define tabs based on permissions
  const tabs = useMemo(() => {
    const t = [
      { id: 'overview', name: 'Overview', icon: PieChart },
    ];

    if (can(EmployeePermission.VIEW_EXPENSE_REPORTS) || can(EmployeePermission.MANAGE_EXPENSES)) {
      t.push({ id: 'expenses', name: 'Expenses', icon: Receipt });
    }
    
    // Assuming Accounts/Journals require MANAGE_EXPENSES for now as they are advanced
    // Adjust permissions as needed for these tabs
    if (can(EmployeePermission.MANAGE_EXPENSES)) {
      t.push({ id: 'accounts', name: 'Accounts', icon: BookOpen });
      t.push({ id: 'journals', name: 'Journals', icon: FileText });
    }
    return t;
  }, [can]);

  // Redirect if active tab becomes inaccessible
  useEffect(() => {
     if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
     }
  }, [tabs, activeTab]);

  // Logic for quick date sets
  const handlePresetDate = (label: string, start: Date, end: Date) => {
    setDateRangeLabel(label);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-16">
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
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border-light/60 bg-background-secondary text-text-light/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark/40">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <TabNav tabs={tabs} activeString={activeTab} onChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && <OverviewTab salonId={salonId} dateRange={dateRange} />}
        {activeTab === 'expenses' && <ExpensesTab salonId={salonId} dateRange={dateRange} />}
        {activeTab === 'accounts' && <AccountsTab salonId={salonId} />}
        {activeTab === 'journals' && <JournalsTab />}
      </div>
    </div>
  );
}

// --- TAB 1: OVERVIEW ---

function OverviewTab({ salonId, dateRange }: { salonId: string; dateRange: { startDate: string; endDate: string } }) {
  const { data: summary, isLoading: isLoadingSummary } = useQuery<FinancialSummary>({
    queryKey: ['financial-summary', salonId, dateRange],
    queryFn: async () => {
       const res = await api.get('/accounting/financial-summary', { params: { salonId, ...dateRange }});
       return res.data;
    },
    enabled: !!salonId
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ['expense-summary', salonId, dateRange],
    queryFn: async () => {
       const res = await api.get('/accounting/expense-summary', { params: { salonId, ...dateRange }});
       return res.data;
    },
    enabled: !!salonId
  });

  if (isLoadingSummary) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border-light/60 bg-background-light/60 animate-pulse dark:border-border-dark/60 dark:bg-background-dark/40"
          />
        ))}
      </div>
    );
  }

  const netIncome = summary?.netIncome || 0;
  const isProfitable = netIncome >= 0;
  const margin = summary?.totalRevenue ? ((netIncome / summary.totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          amount={formatCurrency(summary?.totalRevenue || 0)} 
          subtext={`${summary?.salesCount || 0} transactions`}
          icon={DollarSign}
          trend="up"
          trendValue="+12.5%" // Mock trend for now
          color="blue"
        />
        <StatCard 
          title="Total Expenses" 
          amount={formatCurrency(summary?.totalExpenses || 0)} 
          subtext={`${summary?.expenseCount || 0} records`}
          icon={TrendingDown}
          trend="down"
          trendValue="+4.2%" // Mock trend
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

       {/* Breakdown Section */}
       <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main Chart Placeholder */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light p-4 shadow-sm dark:bg-surface-dark lg:col-span-2">
             <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Financial Performance</h3>
                <Badge variant="default" size="sm" className="text-[10px]">
                  Coming Soon
                </Badge>
             </div>
             <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed border-border-light/70 bg-background-light/60 text-center dark:border-border-dark/60 dark:bg-background-dark/40">
                <PieChart className="mb-2 h-8 w-8 text-text-light/30 dark:text-text-dark/30" />
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">Visual charts will appear here</p>
             </div>
          </div>

          {/* Expense Categories */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light p-4 shadow-sm dark:bg-surface-dark">
             <h3 className="mb-3 text-sm font-bold text-text-light dark:text-text-dark">Top Expenses</h3>
             <div className="space-y-3">
               {expenseSummary?.byCategory?.length > 0 ? (
                 (expenseSummary.byCategory as Array<{ categoryName: string; total: number }>).slice(0, 5).map((cat) => (
                   <CategoryProgress 
                     key={cat.categoryName} 
                     name={cat.categoryName} 
                     amount={cat.total} 
                     total={summary?.totalExpenses || 1}
                     colorClass="bg-rose-500"
                   />
                 ))
               ) : (
                  <div className="rounded-lg border border-dashed border-border-light/70 py-6 text-center text-xs text-text-light/50 dark:border-border-dark/60 dark:text-text-dark/50">No expenses recorded</div>
               )}
             </div>
             {expenseSummary?.byCategory?.length > 5 && (
                <Button variant="secondary" size="sm" className="mt-3 w-full text-xs font-medium">
                  View All Categories
                </Button>
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

  // Queries
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', salonId, dateRange, selectedCategory],
    queryFn: async () => {
      const p = { salonId, ...dateRange, ...(selectedCategory && { categoryId: selectedCategory })};
      const res = await api.get('/accounting/expenses', { params: p });
      return res.data;
    },
    enabled: !!salonId
  });

  const { data: categories } = useQuery<ExpenseCategory[]>({
     queryKey: ['expense-categories', salonId],
     queryFn: async () => {
        const res = await api.get('/accounting/expense-categories', { params: { salonId } });
        return res.data;
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
       {/* Actions Bar */}
       <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-background-light py-2 pl-9 pr-3 text-sm text-text-light shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
             </div>
             <select 
               value={selectedCategory}
               onChange={e => setSelectedCategory(e.target.value)}
               className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-background-dark dark:text-text-dark sm:w-auto"
             >
                <option value="">All Categories</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          {canCreate && (
            <Button variant="primary" onClick={() => setShowAddModal(true)} className="h-9 whitespace-nowrap text-sm font-semibold">
               <Plus className="mr-2 h-4 w-4" />
               Add Expense
            </Button>
          )}
       </div>

       {/* Data Table */}
       <div className="min-h-[400px] overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
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
               <table className="w-full text-left text-sm">
                  <thead className="border-b border-border-light/80 bg-background-light/80 text-[11px] font-semibold uppercase text-text-light/60 dark:border-border-dark/70 dark:bg-background-dark/60 dark:text-text-dark/60">
                     <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        {canDelete && <th className="px-5 py-3 w-16"></th>}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                     {filtered.map((expense: Expense) => (
                        <tr key={expense.id} className="group transition-colors hover:bg-background-light/60 dark:hover:bg-background-dark/40">
                           <td className="whitespace-nowrap px-5 py-3 text-sm text-text-light dark:text-text-dark">
                              {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                           </td>
                           <td className="px-5 py-3">
                              <div className="text-sm font-medium text-text-light dark:text-text-dark">{expense.description}</div>
                              {expense.vendorName && <div className="text-[11px] text-text-light/60 dark:text-text-dark/60">{expense.vendorName}</div>}
                           </td>
                           <td className="px-5 py-3">
                              <Badge variant="default" size="sm" className="bg-primary/10 text-primary">
                                 {expense.category?.name || 'Uncategorized'}
                              </Badge>
                           </td>
                           <td className="px-5 py-3 text-sm capitalize text-text-light/60 dark:text-text-dark/60">
                              {expense.paymentMethod?.replace('_', ' ') || 'N/A'}
                           </td>
                           <td className="px-5 py-3 text-right text-sm font-semibold text-text-light dark:text-text-dark">
                              {formatCurrency(expense.amount)}
                           </td>

                           {canDelete ? (
                             <td className="px-5 py-3 text-right">
                               <Button
                                 onClick={() => confirm('Delete expense?') && deleteMutation.mutate(expense.id)}
                                 variant="secondary"
                                 size="sm"
                                 className="h-8 w-8 rounded-lg p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error/10 hover:text-error dark:hover:bg-error/20"
                                 title="Delete expense"
                                 aria-label="Delete expense"
                               >
                                  <Trash2 className="h-4 w-4" />
                               </Button>
                             </td>
                           ) : (
                             // Empty cell to maintain layout if header exists? No, conditional header means conditional cell
                             null
                           )}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}
       </div>

       {/* Add Expense Modal */}
       {canCreate && (
         <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Expense">
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                     <label htmlFor="expense-amount" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Amount (RWF) *</label>
                     <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-light/60 dark:text-text-dark/60">RWF</div>
                        <input 
                           id="expense-amount"
                           type="number" name="amount" required min="1" step="1"
                           className="w-full rounded-lg border border-border-light bg-background-light py-2 pl-12 pr-4 text-lg font-semibold text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                           placeholder="0"
                        />
                     </div>
                  </div>

                  <div>
                     <label htmlFor="expense-description" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Description *</label>
                     <input id="expense-description" type="text" name="description" required placeholder="e.g. Monthly Rent"
                        className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                     />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                     <label htmlFor="expense-date" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Date *</label>
                     <input id="expense-date" type="date" name="expenseDate" required defaultValue={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                     />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                     <label htmlFor="expense-category" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Category *</label>
                     <select id="expense-category" name="categoryId" required className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark">
                        <option value="">Select...</option>
                        {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                     <label htmlFor="expense-payment-method" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Payment Method</label>
                     <select id="expense-payment-method" name="paymentMethod" required className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark">
                        <option value="cash">Cash</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                     </select>
                  </div>

                   <div className="md:col-span-2 space-y-1">
                     <label htmlFor="expense-vendor" className="block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">Vendor (Optional)</label>
                     <input id="expense-vendor" type="text" name="vendorName" placeholder="e.g. Landlord"
                        className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="h-9 px-4 text-sm font-semibold">
                     Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={createMutation.isPending} className="h-9 px-4 text-sm font-semibold">
                     {createMutation.isPending ? 'Saving...' : 'Add Expense'}
                  </Button>
               </div>
            </form>
         </Modal>
       )}
    </div>
  );
}


// --- TAB 3: ACCOUNTS ---

function AccountsTab({ salonId }: { salonId: string }) {
  const queryClient = useQueryClient();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { code: string; name: string }) => {
      return api.post('/accounting/accounts', {
        code: data.code,
        name: data.name,
        accountType: 'expense',
        salonId,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories', salonId] });
      setShowCreateCategory(false);
    },
  });

  const { data: categories, isLoading } = useQuery<ExpenseCategory[]>({
      queryKey: ['expense-categories', salonId],
      queryFn: async () => {
         const res = await api.get('/accounting/expense-categories', { params: { salonId } });
         return res.data;
      },
      enabled: !!salonId
  });

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Chart of Accounts</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCreateCategory(true)} className="h-9 px-3 text-sm font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
       </div>
       
       {isLoading ? (
         <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 rounded-xl border border-border-light/60 bg-background-light/60 animate-pulse dark:border-border-dark/60 dark:bg-background-dark/40" />)}
         </div>
       ) : (
         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories?.map((cat) => (
               <div key={cat.id} className="group rounded-xl border border-border-light bg-surface-light p-4 transition-all hover:border-primary/40 hover:shadow-md dark:border-border-dark dark:bg-surface-dark">
                  <div className="mb-3 flex items-start justify-between">
                     <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 transition-transform group-hover:scale-105">
                        <BookOpen className="h-4 w-4" />
                     </div>
                     <span className="text-[11px] font-mono text-text-light/50 dark:text-text-dark/50">{cat.code}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">{cat.name}</h3>
                  <p className="text-[11px] text-text-light/50 dark:text-text-dark/50">Expense Category</p>
                </div>
             ))}
             {/* Add New Card */}
             <button
                type="button"
                onClick={() => setShowCreateCategory(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-light/70 p-4 text-sm font-medium text-text-light/50 transition-colors hover:text-primary dark:border-border-dark/60 dark:text-text-dark/50 dark:hover:bg-background-dark/40"
             >
                <Plus className="h-6 w-6" />
                <span>Add Category</span>
             </button>
          </div>
       )}

       <Modal
         isOpen={showCreateCategory}
         onClose={() => setShowCreateCategory(false)}
         title="New Expense Category"
       >
         <form
           onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             const code = String(fd.get('code') || '').trim();
             const name = String(fd.get('name') || '').trim();
             if (!code || !name) return;
             createCategoryMutation.mutate({ code, name });
           }}
           className="space-y-4"
         >
           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
             <div>
                <label
                  htmlFor="account-code"
                 className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60"
               >
                 Code
               </label>
               <input
                 id="account-code"
                 name="code"
                 type="text"
                 placeholder="e.g. EXP-NEW"
                 className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                 required
               />
             </div>
             <div>
                <label
                  htmlFor="account-name"
                 className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60"
               >
                 Name
               </label>
               <input
                 id="account-name"
                 name="name"
                 type="text"
                 placeholder="e.g. Insurance"
                 className="w-full rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                 required
               />
             </div>
           </div>
           
           <div className="flex justify-end gap-2 pt-4">
             <Button type="button" variant="secondary" onClick={() => setShowCreateCategory(false)} className="h-9 px-4 text-sm font-semibold">
               Cancel
             </Button>
             <Button type="submit" variant="primary" disabled={createCategoryMutation.isPending} className="h-9 px-4 text-sm font-semibold">
               {createCategoryMutation.isPending ? 'Saving...' : 'Create Category'}
             </Button>
           </div>
         </form>
       </Modal>
    </div>
  );
}

function JournalsTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-light bg-surface-light p-10 text-center shadow-sm dark:border-border-dark dark:bg-surface-dark">
       <div className="rounded-full bg-blue-500/10 p-4 text-blue-500">
          <FileText className="h-7 w-7" />
       </div>
       <div className="space-y-2">
         <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Journal Entries</h3>
         <p className="max-w-sm text-sm text-text-light/60 dark:text-text-dark/60">
            Advanced journal entry management is coming soon. You can currently manage entries through the backend API.
         </p>
       </div>
       <Button variant="outline" disabled className="h-9 px-4 text-sm font-semibold">View Journals</Button>
    </div>
  );
}
