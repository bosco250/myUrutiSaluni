'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
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
  Plus,
  Clock,
  MapPin,
  AlertCircle,
  BarChart3,
  Activity,
  User,
  FileText,
  RefreshCw,
  XCircle,
  CheckCircle,
  Star,
} from 'lucide-react';
import {
  format,
  isToday,
  isTomorrow,
  parseISO,
  subDays,
  startOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import {
  LazyLineChart as LineChart,
  LazyBarChart as BarChart,
  LazyLine as Line,
  LazyBar as Bar,
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyResponsiveContainer as ResponsiveContainer,
} from '@/components/charts/LazyCharts';

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
  metadata?: {
    preferredEmployeeId?: string;
    preferredEmployeeName?: string;
    [key: string]: unknown;
  };
  customer?: {
    id: string;
    fullName?: string;
    name?: string;
  };
  service?: {
    id: string;
    name: string;
  };
  salon?: {
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

  monthExpenses: number;
  expenseGrowth: number;
  lowStockItems: number;
  activeLoans: number;
}

export default function SalonOwnerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Check membership status
  const { data: membershipStatus } = useMembershipStatus();

  // Fetch salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        // Unwrap TransformInterceptor envelope
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },
  });

  // Get employee records for current user (if they are an employee)
  const { data: employeeRecords = [] } = useQuery({
    queryKey: ['my-employee-records-dashboard', user?.id],
    queryFn: async () => {
      if (user?.role !== 'salon_employee' && user?.role !== 'SALON_EMPLOYEE') {
        return [];
      }
      try {
        // Reuse cached salons if available or fetch fresh
        let allSalons = [];
        try {
          const salonsResponse = await api.get('/salons');
          allSalons = salonsResponse.data?.data || salonsResponse.data || [];
        } catch (e) {
          // Fallback or empty
          return [];
        }

        const salonIds = allSalons.map((s: { id: string }) => s.id);

        // Fetch all employee records in parallel
        const recordPromises = salonIds.map(async (salonId: string) => {
          try {
            const empResponse = await api.get(`/salons/${salonId}/employees`);
            const employees = empResponse.data?.data || empResponse.data || [];
            return employees.find((emp: { userId: string }) => emp.userId === user?.id);
          } catch (error) {
            return null;
          }
        });

        const results = await Promise.all(recordPromises);
        return results.filter(Boolean);
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && (user.role === 'salon_employee' || user.role === 'SALON_EMPLOYEE'),
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/appointments');
        // Unwrap TransformInterceptor envelope
        const data = response.data?.data || response.data;
        const allAppointments = Array.isArray(data) ? data : [];
        // Filter today and upcoming
        const now = new Date();
        return allAppointments
          .filter((apt: Appointment) => {
            const aptDate = parseISO(apt.scheduledStart);
            return aptDate >= now;
          })
          .slice(0, 10); // Get next 10 to show more appointments
      } catch (error) {
        return [];
      }
    },
  });

  // Separate appointments into "My Appointments" and "Other Appointments" for employees
  const { myAppointments, otherAppointments } = useMemo(() => {
    if (user?.role !== 'salon_employee' && user?.role !== 'SALON_EMPLOYEE') {
      return { myAppointments: [], otherAppointments: appointments };
    }

    const myAppts: Appointment[] = [];
    const otherAppts: Appointment[] = [];

    appointments.forEach((apt) => {
      const isMyAppointment = employeeRecords.some(
        (emp: { id: string }) => emp.id === apt.metadata?.preferredEmployeeId
      );

      if (isMyAppointment) {
        myAppts.push(apt);
      } else {
        otherAppts.push(apt);
      }
    });

    return { myAppointments: myAppts, otherAppointments: otherAppts };
  }, [appointments, employeeRecords, user?.role]);

  // Fetch recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['recent-sales', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/sales?page=1&limit=5');
        // Handle paginated response: { data: [...], total: ..., page: ..., limit: ... }
        const salesData = response.data?.data || response.data || [];
        const sales = Array.isArray(salesData) ? salesData : salesData.data || [];
        return sales.slice(0, 5); // Get latest 5
      } catch (error) {
        // Error fetching sales
        return [];
      }
    },
  });

  // Calculate stats with enhanced analytics
  const { data: stats, isLoading: statsLoading } = useQuery<
    SalonOwnerStats & {
      weeklyRevenue: Array<{ date: string; revenue: number }>;
      dailyRevenue: Array<{ date: string; revenue: number }>;
      topServices: Array<{ name: string; count: number; revenue: number }>;
      revenueGrowth: number;
      salesGrowth: number;
    }
  >({
    queryKey: ['salon-owner-stats', user?.id, salons.length],
    queryFn: async () => {
      try {
        const now = new Date();
        // Optimize: Fetch data in parallel to avoid waterfall
        // Also limit sales fetch to this year/month if possible, but keeping logic consistent for now
        const [appointmentsResponse, salesResponse] = await Promise.all([
          api.get('/appointments'),
          api.get('/sales?page=1&limit=2000') // Reduced limit, optimized
        ]);

        // Unwrap TransformInterceptor envelopes
        const appointmentsData = appointmentsResponse.data?.data || appointmentsResponse.data;
        const allAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
        const salesData = salesResponse.data?.data || salesResponse.data || [];
        const allSales = Array.isArray(salesData) ? salesData : salesData.data || [];

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const todayAppointments = allAppointments.filter((apt: Appointment) => {
          const aptDate = parseISO(apt.scheduledStart);
          return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });

        const upcomingAppointments = allAppointments.filter((apt: Appointment) => {
          const aptDate = parseISO(apt.scheduledStart);
          return aptDate >= now;
        });

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

        const todayRevenue = todaySales.reduce(
          (sum: number, sale: Sale) => sum + Number(sale.totalAmount || 0),
          0
        );
        const monthRevenue = monthSales.reduce(
          (sum: number, sale: Sale) => sum + Number(sale.totalAmount || 0),
          0
        );
        const lastMonthRevenue = lastMonthSales.reduce(
          (sum: number, sale: Sale) => sum + Number(sale.totalAmount || 0),
          0
        );

        // Calculate Monthly Expenses

        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = format(monthStart, 'yyyy-MM-dd');
        const endDate = format(monthEnd, 'yyyy-MM-dd');

        // Last Month Dates

        const lastMonthStartDate = format(lastMonthStart, 'yyyy-MM-dd');
        const lastMonthEndDate = format(lastMonthEnd, 'yyyy-MM-dd');
        
        // Fetch Current Month Expenses
        const expenses = await Promise.all(
          salons.map((salon) => 
            api.get('/accounting/financial-summary', { 
              params: { 
                salonId: salon.id, 
                startDate, 
                endDate 
              } 
            })
            .then(res => {
               const data = res.data?.data || res.data || {};
               // console.log(`[Dashboard] Fetched expenses for salon ${salon.id}:`, data.totalExpenses);
               return Number(data.totalExpenses || 0);
            })
            .catch((err) => {
               console.error(`[Dashboard] Error fetching expenses for salon ${salon.id}:`, err);
               return 0;
            })
          )
        );
        const monthExpenses = expenses.reduce((sum, val) => sum + val, 0);

        // Fetch Last Month Expenses
        const lastMonthExpensesList = await Promise.all(
          salons.map((salon) => 
            api.get('/accounting/financial-summary', { 
              params: { 
                salonId: salon.id, 
                startDate: lastMonthStartDate, 
                endDate: lastMonthEndDate
              } 
            })
            .then(res => {
               const data = res.data?.data || res.data || {};
               return Number(data.totalExpenses || 0);
            })
            .catch(() => 0)
          )
        );
        const lastMonthExpenses = lastMonthExpensesList.reduce((sum, val) => sum + val, 0);

        // Calculate growth percentages
        const revenueGrowth =
          lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
        const salesGrowth =
          lastMonthSales.length > 0
            ? ((monthSales.length - lastMonthSales.length) / lastMonthSales.length) * 100
            : 0;
            
        const expenseGrowth = 
          lastMonthExpenses > 0 ? ((monthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

        // Weekly revenue (last 7 days)
        const weekStart = subDays(now, 7);
        const weeklyRevenue = eachDayOfInterval({ start: weekStart, end: now }).map((date) => {
          const daySales = allSales.filter((sale: Sale) => {
            const saleDate = parseISO(sale.createdAt);
            return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          });
          return {
            date: format(date, 'MMM d'),
            revenue: daySales.reduce(
              (sum: number, sale: Sale) => sum + Number(sale.totalAmount || 0),
              0
            ),
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
            revenue: daySales.reduce(
              (sum: number, sale: Sale) => sum + Number(sale.totalAmount || 0),
              0
            ),
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
              serviceCounts[item.service.name].count += Number(item.quantity || 0);
              serviceCounts[item.service.name].revenue += Number(item.lineTotal || 0);
            }
          });
        });
        const topServices = Object.entries(serviceCounts)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        const totalEmployees = salons.reduce(
          (sum: number, salon: Salon) => sum + Number(salon.settings?.numberOfEmployees || 0),
          0
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
          monthExpenses,
          expenseGrowth,
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
          monthExpenses: 0,
          expenseGrowth: 0,
        };
      }
    },
    enabled: salons.length > 0 || !salonsLoading,
  });

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

  // Note: loading.tsx handles the initial loading skeleton
  // We only show minimal inline loading for data refresh, not full-page loaders

  // If user is already marked as a member, skip all membership prompts and show dashboard
  // This handles cases where membershipStatus.application might be null but isMember is true
  if (membershipStatus?.isMember) {
    // User is a full member - proceed to check if they have salons
    // (Skip all membership application prompts)
  } else if (membershipStatus && !membershipStatus.application) {
    // No membership application - prompt to apply
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Welcome, {user?.fullName || 'Salon Owner'}!
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            To start managing your salon business, you need to apply for membership first.
          </p>
          <Button onClick={() => router.push('/membership/apply')} variant="primary" className="flex items-center gap-2 mx-auto">
            <FileText className="w-4 h-4" />
            Apply for Membership
          </Button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 mt-8">
          <h3 className="font-bold text-text-light dark:text-text-dark text-sm mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Apply for Membership</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">Submit your business information</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-border-light dark:bg-border-dark rounded-full flex items-center justify-center text-text-light/60 dark:text-text-dark/60 text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">Wait for Approval</p>
                <p className="text-xs text-text-light/40 dark:text-text-dark/40">Usually within 24-48 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-border-light dark:bg-border-dark rounded-full flex items-center justify-center text-text-light/60 dark:text-text-dark/60 text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">Create Your Salon</p>
                <p className="text-xs text-text-light/40 dark:text-text-dark/40">Set up your salon profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Membership application pending
  if (membershipStatus?.application?.status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Application Pending
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Your membership application is being reviewed. We&apos;ll notify you once it&apos;s approved.
          </p>
          <Button onClick={() => router.push('/membership/status')} variant="secondary" className="flex items-center gap-2 mx-auto">
            <Clock className="w-4 h-4" />
            View Application Status
          </Button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 mt-8">
          <h3 className="font-bold text-text-light dark:text-text-dark text-sm mb-4">Application Status</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Application Submitted</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">Your application has been received</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-warning rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Under Review</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">Usually takes 24-48 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-border-light dark:bg-border-dark rounded-full flex items-center justify-center text-text-light/60 dark:text-text-dark/60 text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">Approval & Salon Creation</p>
                <p className="text-xs text-text-light/40 dark:text-text-dark/40">Coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Membership application rejected
  if (membershipStatus?.application?.status === 'rejected') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Application Not Approved
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Unfortunately, your application was not approved. You can apply again with updated information.
          </p>
          <Button onClick={() => router.push('/membership/apply')} variant="primary" className="flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" />
            Apply Again
          </Button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 mt-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-text-light dark:text-text-dark text-sm mb-1">Need Help?</h3>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Contact our support team to learn more about why your application was not approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Membership approved but unpaid/inactive
  if (membershipStatus?.application?.status === 'approved' && !membershipStatus.isMember) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Application Approved!
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
            Your application has been approved, but your membership is not yet active.
          </p>
          
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-6 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-warning/20 rounded-full">
                <DollarSign className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                Membership Payment Required
              </h3>
              <p className="text-sm text-center text-text-light/80 dark:text-text-dark/80 mb-2">
                To activate your account and start managing salons, you need to pay the membership fee.
              </p>
              <div className="bg-background-light dark:bg-background-dark p-3 rounded-lg border border-border-light dark:border-border-dark w-full">
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Required Amount: 3,000 RWF</p>
              </div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                Please visit the association office or contact an administrator to complete your payment.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center gap-4">
             <Button onClick={() => router.push('/membership/status')} variant="secondary">
                View Application Details
             </Button>
          </div>
        </div>
      </div>
    );
  }

  // Membership approved but no salons - show create salon prompt
  if (salons && salons.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Welcome, {user?.fullName || 'Salon Owner'}!
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Your membership has been approved! Now let&apos;s set up your salon.
          </p>
          <Button onClick={() => router.push('/salons')} variant="primary" className="flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Create Your First Salon
          </Button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 mt-8">
          <h3 className="font-bold text-text-light dark:text-text-dark text-sm mb-4">Get Started</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Membership Approved</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">You&apos;re now a verified salon owner</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Create Your Salon</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">Add your salon info and location</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-border-light dark:bg-border-dark rounded-full flex items-center justify-center text-text-light/60 dark:text-text-dark/60 text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">Add Services & Staff</p>
                <p className="text-xs text-text-light/40 dark:text-text-dark/40">Set up your offerings</p>
              </div>
            </div>
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
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Salon Owner'}!
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Here&apos;s your business overview
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
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Today's Revenue */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
              Today
            </span>
          </div>
          <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-0.5">
            Today&apos;s Revenue
          </p>
          <p className="text-xl font-bold text-text-light dark:text-text-dark">
            RWF {Number(stats?.todayRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>vs yesterday</span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 hover:shadow-lg transition-all flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
              Today
            </span>
          </div>
          <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-0.5">
            Today&apos;s Appointments
          </p>
          <p className="text-xl font-bold text-text-light dark:text-text-dark">
            {stats?.todayAppointments || 0}
          </p>
          <Link
            href="/appointments"
            className="flex items-center gap-1 mt-1 text-[10px] text-blue-400 hover:text-blue-300 transition"
          >
            <span>{stats?.upcomingAppointments || 0} upcoming</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Monthly Expenses */}
        <Link
          href="/accounting"
          className="group relative bg-surface-light dark:bg-surface-dark border border-red-500/20 dark:border-red-500/30 rounded-xl p-4 hover:shadow-lg transition-all flex-1"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
              This Month
            </span>
          </div>
          <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-0.5">
            Monthly Expenses
          </p>
          <p className="text-xl font-bold text-text-light dark:text-text-dark">
             RWF {Number(stats?.monthExpenses || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
             {stats?.expenseGrowth !== undefined && (
               <span className={stats.expenseGrowth > 0 ? 'text-red-400' : 'text-green-400'}>
                 {stats.expenseGrowth > 0 ? (
                   <TrendingUp className="w-3 h-3 inline" />
                 ) : (
                   <TrendingDown className="w-3 h-3 inline" />
                 )}{' '}
                 {Math.abs(stats.expenseGrowth).toFixed(1)}% vs last month
               </span>
             )}
          </div>
        </Link>

        {/* Month Revenue */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-orange-500/20 dark:border-orange-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
              This Month
            </span>
          </div>
          <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-0.5">
            Monthly Revenue
          </p>
          <p className="text-xl font-bold text-text-light dark:text-text-dark">
            RWF {Number(stats?.monthRevenue || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            {stats?.revenueGrowth !== undefined && (
              <span className={stats.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                {stats.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 inline" />
                ) : (
                  <TrendingDown className="w-3 h-3 inline" />
                )}{' '}
                {Math.abs(stats.revenueGrowth).toFixed(1)}% vs last month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {stats && (stats.weeklyRevenue?.length > 0 || stats.topServices?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Trend Chart */}
          {stats.weeklyRevenue && stats.weeklyRevenue.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    Revenue Trend
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Last 7 days</p>
                </div>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.weeklyRevenue}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="opacity-20"
                  />
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
                      borderRadius: '8px',
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
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    Top Services
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">By revenue</p>
                </div>
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topServices} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="opacity-20"
                  />
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
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `RWF ${value.toLocaleString()} • ${props.payload.count} bookings`,
                      'Revenue',
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
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                  {user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE'
                    ? 'My Appointments'
                    : 'Upcoming Appointments'}
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                  {user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE'
                    ? `${myAppointments.length} assigned to you • ${otherAppointments.length} other appointments`
                    : `Next ${appointments.length} appointments`}
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
              <div className="flex items-center justify-center py-8">
                <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-2" />
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-3">
                  No upcoming appointments
                </p>
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
              <div className="space-y-4">
                {/* Show "My Appointments" section for employees */}
                {(user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') &&
                  myAppointments.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-primary">Assigned to Me</h3>
                        <div className="flex-1 h-px bg-primary/20" />
                      </div>
                      <div className="space-y-3">
                        {myAppointments.slice(0, 5).map((appointment) => {
                          const isMyAppointment = true;
                          return (
                            <Link
                              key={appointment.id}
                              href={`/appointments/${appointment.id}`}
                              className={`block p-4 rounded-xl hover:shadow-md transition-all group ${
                                isMyAppointment
                                  ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary/50 dark:border-primary/50'
                                  : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isMyAppointment
                                          ? 'bg-gradient-to-br from-primary to-primary/80'
                                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                      }`}
                                    >
                                      <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-text-light dark:text-text-dark truncate">
                                          {appointment.customer?.fullName ||
                                            appointment.customer?.name ||
                                            'Walk-in Customer'}
                                        </p>
                                        {isMyAppointment && (
                                          <span className="px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Assigned to Me
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                                        {appointment.service?.name || 'Service'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 ml-[52px] flex-wrap">
                                    <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {formatAppointmentDate(appointment.scheduledStart)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                                      <Building2 className="w-4 h-4" />
                                      <span className="truncate">
                                        {appointment.salon?.name || 'Salon'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getAppointmentStatusColor(appointment.status)}`}
                                  >
                                    {appointment.status || 'Scheduled'}
                                  </span>
                                  <ArrowUpRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Show "Other Appointments" section for employees, or all appointments for owners */}
                {((user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') &&
                  otherAppointments.length > 0) ||
                (user?.role !== 'salon_employee' && user?.role !== 'SALON_EMPLOYEE') ? (
                  <div>
                    {(user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') && (
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                        <h3 className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">
                          Other Appointments
                        </h3>
                        <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {(user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE'
                        ? otherAppointments
                        : appointments
                      )
                        .slice(
                          0,
                          user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE' ? 5 : 5
                        )
                        .map((appointment) => {
                          const isMyAppointment = employeeRecords.some(
                            (emp: { id: string }) => emp.id === appointment.metadata?.preferredEmployeeId
                          );
                          return (
                            <Link
                              key={appointment.id}
                              href={`/appointments/${appointment.id}`}
                              className={`block p-4 rounded-xl hover:shadow-md transition-all group ${
                                isMyAppointment
                                  ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary/50 dark:border-primary/50'
                                  : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isMyAppointment
                                          ? 'bg-gradient-to-br from-primary to-primary/80'
                                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                      }`}
                                    >
                                      <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-text-light dark:text-text-dark truncate">
                                          {appointment.customer?.fullName ||
                                            appointment.customer?.name ||
                                            'Walk-in Customer'}
                                        </p>
                                        {isMyAppointment && (
                                          <span className="px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Assigned to Me
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                                        {appointment.service?.name || 'Service'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 ml-[52px] flex-wrap">
                                    <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {formatAppointmentDate(appointment.scheduledStart)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-text-light/60 dark:text-text-dark/60">
                                      <Building2 className="w-4 h-4" />
                                      <span className="truncate">
                                        {appointment.salon?.name || 'Salon'}
                                      </span>
                                    </div>
                                    {appointment.metadata?.preferredEmployeeName &&
                                      !isMyAppointment && (
                                        <div className="flex items-center gap-1.5 text-sm text-primary">
                                          <User className="w-4 h-4" />
                                          <span className="truncate">
                                            {appointment.metadata.preferredEmployeeName}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getAppointmentStatusColor(appointment.status)}`}
                                  >
                                    {appointment.status || 'Scheduled'}
                                  </span>
                                  <ArrowUpRight className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                  Recent Sales
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
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
                            {sale.salon?.name || 'Salon'} •{' '}
                            {format(parseISO(sale.createdAt), 'MMM d, h:mm a')}
                          </p>
                          {sale.items && sale.items.length > 0 && (
                            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                              {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}:{' '}
                              {sale.items
                                .slice(0, 2)
                                .map((item) => item.service?.name || item.product?.name || 'Item')
                                .join(', ')}
                              {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <p className="text-lg font-bold text-text-light dark:text-text-dark">
                          RWF {Number(sale.totalAmount || 0).toLocaleString()}
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
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">My Salons</h2>
              <Link href="/salons">
                <Button variant="secondary" className="flex items-center gap-2 text-xs h-8 px-3">
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {salons.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
                  No salons yet
                </p>
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
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/appointments"
                className="group p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-semibold text-text-light dark:text-text-dark uppercase tracking-wide">
                  Appointments
                </p>
              </Link>
              <Link
                href="/sales"
                className="group p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-semibold text-text-light dark:text-text-dark uppercase tracking-wide">Sales</p>
              </Link>
              <Link
                href="/inventory"
                className="group p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-semibold text-text-light dark:text-text-dark uppercase tracking-wide">
                  Inventory
                </p>
              </Link>
              <Link
                href="/users"
                className="group p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-semibold text-text-light dark:text-text-dark uppercase tracking-wide">
                  Employees
                </p>
              </Link>
            </div>
          </div>

          {/* Alerts & Notifications */}
          {(stats?.lowStockItems || 0) > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-1">
                    Low Stock Alert
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-3">
                    {stats?.lowStockItems} item{(stats?.lowStockItems || 0) !== 1 ? 's' : ''} need
                    restocking
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
