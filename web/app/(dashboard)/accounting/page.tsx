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
  LucideIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

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
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    purple: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  const trendColor = trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <div className="relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-all duration-300 shadow-sm group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorMap[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && TrendIcon && (
          <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-rose-100 dark:bg-rose-500/10'} ${trendColor}`}>
            <TrendIcon className="w-3 h-3 mr-1" />
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">{amount}</h3>
        {subtext && <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{subtext}</p>}
      </div>
      {/* Background Decor */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 pointer-events-none ${color.replace('text-', 'bg-').split(' ')[0]}`} />
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
    <div className="flex p-1 space-x-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl w-fit mb-6">
      {tabs.map((tab) => {
        const isActive = activeString === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive ? 'bg-primary text-white shadow-md' : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
          >
            <Icon className="w-4 h-4" />
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
    <div className="group">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-text-light dark:text-text-dark">{name}</span>
        <span className="text-text-light/60 dark:text-text-dark/60">{formatCurrency(amount)}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full ${colorClass} transition-all duration-500 ease-out group-hover:brightness-110`} 
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: PieChart },
    { id: 'expenses', name: 'Expenses', icon: Receipt },
    { id: 'accounts', name: 'Accounts', icon: BookOpen },
    { id: 'journals', name: 'Journals', icon: FileText },
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Accounting</h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            Track your financial health and manage expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Salon Selector */}
          {salons.length > 1 && (
             <div className="relative group">
                <select 
                  value={selectedSalon?.id || ''}
                  onChange={(e) => setSelectedSalon(salons.find(s => s.id === e.target.value) || null)}
                  className="appearance-none pl-4 pr-10 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer hover:border-primary/50 transition-all"
                >
                  {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
             </div>
          )}

          {/* Date Picker Actions */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-1 flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={dateRangeLabel === 'This Month' ? 'primary' : 'secondary'}
              onClick={() =>
                handlePresetDate('This Month', startOfMonth(new Date()), endOfMonth(new Date()))
              }
              className="h-7 px-2 text-xs"
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
              className="h-7 px-2 text-xs"
            >
              Last Month
            </Button>
            <div className="h-4 w-px bg-border-light dark:bg-border-dark mx-1" />
            <div className="p-1 rounded bg-background-secondary dark:bg-background-dark text-text-light/40 border border-border-light/50">
              <Calendar className="w-3 h-3" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-background-secondary dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl animate-pulse"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Chart Placeholder */}
          <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-text-light dark:text-text-dark">Financial Performance</h3>
                <Badge variant="default" size="sm">Coming Soon</Badge>
             </div>
             <div className="h-64 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                <PieChart className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Visual charts will appear here</p>
             </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm">
             <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Top Expenses</h3>
             <div className="space-y-4">
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
                  <div className="text-center py-8 text-gray-400 text-sm">No expenses recorded</div>
               )}
             </div>
             {expenseSummary?.byCategory?.length > 5 && (
                <Button variant="secondary" size="sm" className="w-full mt-4">
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
       <div className="flex flex-col sm:flex-row justify-between gap-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex flex-1 gap-3">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
             </div>
             <select 
               value={selectedCategory}
               onChange={e => setSelectedCategory(e.target.value)}
               className="px-3 py-2 bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
             >
                <option value="">All Categories</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="whitespace-nowrap">
             <Plus className="w-4 h-4 mr-2" />
             Add Expense
          </Button>
       </div>

       {/* Data Table */}
       <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm min-h-[400px]">
          {isLoading ? (
             <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
             <EmptyState 
                title="No expenses found"
                description={searchTerm ? "Try adjusting your search filters" : "Start tracking your business spending"}
                icon={<Receipt className="w-16 h-16 text-gray-300" />}
                action={!searchTerm && <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>Create First Expense</Button>}
             />
          ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700">
                     <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 w-20"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {filtered.map((expense: Expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                           <td className="px-6 py-4 text-text-light dark:text-text-dark whitespace-nowrap">
                              {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                           </td>
                           <td className="px-6 py-4">
                              <div className="font-medium text-text-light dark:text-text-dark">{expense.description}</div>
                              {expense.vendorName && <div className="text-xs text-gray-400">{expense.vendorName}</div>}
                           </td>
                           <td className="px-6 py-4">
                              <Badge variant="default" size="sm" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                 {expense.category?.name || 'Uncategorized'}
                              </Badge>
                           </td>
                           <td className="px-6 py-4 capitalize text-gray-500">
                              {expense.paymentMethod?.replace('_', ' ')}
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-text-light dark:text-text-dark">
                              {formatCurrency(expense.amount)}
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button
                                onClick={() => confirm('Delete expense?') && deleteMutation.mutate(expense.id)}
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                                title="Delete expense"
                                aria-label="Delete expense"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}
       </div>

       {/* Add Expense Modal */}
       <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Expense">
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (RWF) *</label>
                   <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">RWF</div>
                      <input 
                         id="expense-amount"
                         type="number" name="amount" required min="1" step="1"
                         className="w-full pl-12 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                         placeholder="0"
                      />
                   </div>
                </div>

                <div className="col-span-2">
                   <label htmlFor="expense-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                   <input id="expense-description" type="text" name="description" required placeholder="e.g. Monthly Rent"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                   />
                </div>

                <div className="col-span-1">
                   <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                   <input id="expense-date" type="date" name="expenseDate" required defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                   />
                </div>

                <div className="col-span-1">
                   <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                   <select id="expense-category" name="categoryId" required className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Select...</option>
                      {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>

                <div className="col-span-1">
                   <label htmlFor="expense-payment-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                   <select id="expense-payment-method" name="paymentMethod" required className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                   </select>
                </div>

                 <div className="col-span-1">
                   <label htmlFor="expense-vendor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor (Optional)</label>
                   <input id="expense-vendor" type="text" name="vendorName" placeholder="e.g. Landlord"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                   />
                </div>
             </div>

             <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                   {createMutation.isPending ? 'Saving...' : 'Add Expense'}
                </Button>
             </div>
          </form>
       </Modal>
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
       <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Chart of Accounts</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCreateCategory(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
       </div>
       
       {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
       ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {categories?.map((cat) => (
                <div key={cat.id} className="group bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                   <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                         <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-gray-400">{cat.code}</span>
                   </div>
                   <h3 className="font-semibold text-text-light dark:text-text-dark mb-1">{cat.name}</h3>
                   <p className="text-xs text-text-light/40 dark:text-text-dark/40">Expense Category</p>
                </div>
             ))}
             {/* Add New Card */}
             <button
                type="button"
                onClick={() => setShowCreateCategory(true)}
                className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors text-text-light/40 dark:text-text-dark/40 hover:text-primary"
             >
                <Plus className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">Add Category</span>
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
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label
                 htmlFor="account-code"
                 className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
               >
                 Code
               </label>
               <input
                 id="account-code"
                 name="code"
                 type="text"
                 placeholder="e.g. EXP-NEW"
                 className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                 required
               />
             </div>
             <div>
               <label
                 htmlFor="account-name"
                 className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
               >
                 Name
               </label>
               <input
                 id="account-name"
                 name="name"
                 type="text"
                 placeholder="e.g. Insurance"
                 className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                 required
               />
             </div>
           </div>
           <div className="flex justify-end gap-2 pt-2">
             <Button type="button" variant="secondary" onClick={() => setShowCreateCategory(false)}>
               Cancel
             </Button>
             <Button type="submit" variant="primary" disabled={createCategoryMutation.isPending} loading={createCategoryMutation.isPending} loadingText="Saving...">
               Create
             </Button>
           </div>
         </form>
       </Modal>
    </div>
  );
}


// --- TAB 4: JOURNALS ---

function JournalsTab() {
  return (
     <EmptyState 
        title="Journal Entries"
        description="View generic ledgers and double-entry records. Automatic entries are created from sales and expenses."
        icon={<FileText className="w-16 h-16 text-gray-300" />}
        action={<Button variant="outline" disabled>View General Ledger (Coming Soon)</Button>} 
        className="min-h-[400px]"
     />
  );
}
