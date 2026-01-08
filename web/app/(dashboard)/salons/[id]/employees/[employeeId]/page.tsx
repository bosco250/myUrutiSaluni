'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Briefcase,
  Users,
  X,
  Check,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Activity,
  CheckCircle2,
  Award,
  Calculator,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  EMPLOYEE_ACTIVITY_TYPES,
  COMMISSION_STATUS,
  PAYROLL_STATUS,
  DEFAULT_VALUES,
  MESSAGES,
  API_ENDPOINTS,
  QUERY_KEYS,
  QUERY_PARAMS,
  DEFAULT_LIMITS,
  DATE_FORMATS,
  CURRENCY,
  ACTIVITY_COLORS,
  STATUS_COLORS,
  STATUS_MAPPING,
} from '@/lib/employee-constants';

// Activity icon mapping
const ACTIVITY_ICON_MAP = {
  [EMPLOYEE_ACTIVITY_TYPES.APPOINTMENT]: Calendar,
  [EMPLOYEE_ACTIVITY_TYPES.SALE]: ShoppingBag,
  [EMPLOYEE_ACTIVITY_TYPES.COMMISSION]: TrendingUp,
  [EMPLOYEE_ACTIVITY_TYPES.PAYROLL]: DollarSign,
} as const;

interface SalonEmployee {
  id: string;
  userId: string;
  salonId: string;
  roleTitle?: string;
  skills?: string[];
  hireDate?: string;
  isActive: boolean;
  commissionRate: number;
  baseSalary?: number;
  salaryType?: 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION';
  payFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  hourlyRate?: number;
  overtimeRate?: number;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  salon?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Commission {
  id: string;
  amount: number;
  paid: boolean;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  sale?: {
    id: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
  };
  createdAt: string;
}

interface CommissionSummary {
  totalCommissions: number;
  paidCommissions: number;
  unpaidCommissions: number;
  totalSales: number;
  count: number;
}

interface PayrollItem {
  id: string;
  baseSalary: number;
  commissionAmount: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  paid: boolean;
  payrollRun?: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: string;
  };
}

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  service?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    fullName: string;
  };
  salon?: {
    id: string;
    name: string;
  };
  metadata?: {
    preferredEmployeeId?: string;
  };
  createdAt: string;
}

interface Sale {
  id: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  salon?: {
    id: string;
    name: string;
  };
  items?: Array<{
    id: string;
    salonEmployeeId?: string;
    service?: { name: string };
    product?: { name: string };
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

type TabType = 'overview' | 'commissions' | 'payroll' | 'activity';

export default function EmployeeDetailPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}>
      <EmployeeDetailContent />
    </ProtectedRoute>
  );
}

function EmployeeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const employeeId = params.employeeId as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch employee details
  const { data: employee, isLoading: employeeLoading, error: employeeError } = useQuery<SalonEmployee>({
    queryKey: QUERY_KEYS.SALON_EMPLOYEE(salonId, employeeId),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.EMPLOYEES(salonId));
      const employees = response.data || [];
      const found = employees.find((e: SalonEmployee) => e.id === employeeId);
      if (!found) throw new Error(MESSAGES.EMPLOYEE_NOT_FOUND);
      return found;
    },
    enabled: !!salonId && !!employeeId,
  });

  // Fetch commission summary
  const { data: commissionSummary } = useQuery<CommissionSummary>({
    queryKey: QUERY_KEYS.EMPLOYEE_COMMISSION_SUMMARY(employeeId),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.COMMISSION_SUMMARY(employeeId));
      return response.data;
    },
    enabled: !!employeeId,
  });

  // Fetch commissions
  const { data: commissions, isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: QUERY_KEYS.EMPLOYEE_COMMISSIONS(employeeId),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.COMMISSIONS(employeeId));
      return response.data || [];
    },
    enabled: !!employeeId,
  });

  // Fetch payroll items for this employee
  const { data: payrollItems, isLoading: payrollLoading } = useQuery<PayrollItem[]>({
    queryKey: QUERY_KEYS.EMPLOYEE_PAYROLL(employeeId),
    queryFn: async () => {
      try {
        const response = await api.get(API_ENDPOINTS.PAYROLL(salonId));
        const payrollRuns = response.data || [];
        const items: PayrollItem[] = [];
        // Flatten payroll items from all runs
        for (const run of payrollRuns) {
          if (run.items) {
            const employeeItems = run.items.filter(
              (item: { salonEmployeeId: string }) => item.salonEmployeeId === employeeId
            );
            items.push(
              ...employeeItems.map((item: PayrollItem) => ({
                ...item,
                payrollRun: {
                  id: run.id,
                  periodStart: run.periodStart,
                  periodEnd: run.periodEnd,
                  status: run.status,
                },
              }))
            );
          }
        }
        return items;
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId && !!employeeId,
  });

  // Fetch appointments assigned to this employee
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: QUERY_KEYS.EMPLOYEE_APPOINTMENTS(employeeId),
    queryFn: async () => {
      try {
        // Get all appointments for the salon
        const response = await api.get(API_ENDPOINTS.APPOINTMENTS(salonId));
        const allAppointments = response.data?.data || response.data || [];
        // Filter appointments where this employee is preferred
        return allAppointments.filter((apt: Appointment) => 
          apt.metadata?.preferredEmployeeId === employeeId
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId && !!employeeId,
  });

  // Fetch sales where this employee was assigned to items
  const { data: sales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: QUERY_KEYS.EMPLOYEE_SALES(employeeId),
    queryFn: async () => {
      try {
        // Get all sales for the salon
        const response = await api.get(`${API_ENDPOINTS.SALES(salonId)}&${QUERY_PARAMS.LIMIT}=${DEFAULT_LIMITS.SALES}`);
        const allSales = response.data?.data || response.data || [];
        // Filter sales where this employee was assigned to at least one item
        return allSales.filter((sale: Sale) => 
          sale.items?.some((item) => item.salonEmployeeId === employeeId)
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId && !!employeeId,
  });

  if (employeeLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_EMPLOYEE}</p>
          </div>
        </div>
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-danger font-semibold">{MESSAGES.EMPLOYEE_NOT_FOUND}</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-2">
            {MESSAGES.EMPLOYEE_NOT_FOUND_DESCRIPTION}
          </p>
          <Button onClick={() => router.push(`/salons/${salonId}/employees`)} variant="secondary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {MESSAGES.BACK_TO_EMPLOYEES}
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'commissions', label: 'Commissions', icon: TrendingUp },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  // Combine all activities for activity timeline
  const activities = [
    // Appointments
    ...(appointments || []).map((appointment) => ({
      type: EMPLOYEE_ACTIVITY_TYPES.APPOINTMENT,
      date: appointment.scheduledStart,
      title: `Appointment: ${appointment.service?.name || DEFAULT_VALUES.SERVICE}`,
      description: appointment.customer
        ? `Customer: ${appointment.customer.fullName} • ${format(parseISO(appointment.scheduledStart), DATE_FORMATS.FULL)}`
        : format(parseISO(appointment.scheduledStart), DATE_FORMATS.FULL),
      status: appointment.status,
      data: appointment,
    })),
    // Sales
    ...(sales || []).map((sale) => {
      const employeeItems = sale.items?.filter((item) => item.salonEmployeeId === employeeId) || [];
      const itemsDescription = employeeItems
        .map((item) => `${item.service?.name || item.product?.name} (${item.quantity}x)`)
        .join(', ');
      return {
        type: EMPLOYEE_ACTIVITY_TYPES.SALE,
        date: sale.createdAt,
        title: `Sale: ${sale.currency} ${sale.totalAmount.toLocaleString()}`,
        description: itemsDescription || DEFAULT_VALUES.ASSIGNED_ITEMS,
        status: sale.status,
        data: sale,
      };
    }),
    // Commissions
    ...(commissions || []).map((commission) => ({
      type: EMPLOYEE_ACTIVITY_TYPES.COMMISSION,
      date: commission.createdAt,
      title: `Commission: ${CURRENCY.DEFAULT} ${commission.amount.toLocaleString()}`,
      description: commission.paid
        ? `Paid via ${commission.paymentMethod || DEFAULT_VALUES.PAYMENT_METHOD_PAYROLL}`
        : COMMISSION_STATUS.UNPAID,
      status: commission.paid ? COMMISSION_STATUS.PAID : COMMISSION_STATUS.UNPAID,
      data: commission,
    })),
    // Payroll
    ...(payrollItems || []).map((item) => ({
      type: EMPLOYEE_ACTIVITY_TYPES.PAYROLL,
      date: item.payrollRun?.periodStart || new Date().toISOString(),
      title: `Payroll: ${CURRENCY.DEFAULT} ${item.netPay.toLocaleString()}`,
      description: `Period: ${format(parseISO(item.payrollRun?.periodStart || ''), DATE_FORMATS.MONTH_DAY)} - ${format(parseISO(item.payrollRun?.periodEnd || ''), DATE_FORMATS.DATE_ONLY)}`,
      status: item.paid ? PAYROLL_STATUS.PAID : PAYROLL_STATUS.PENDING,
      data: item,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={() => router.push(`/salons/${salonId}/employees`)} variant="secondary" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
                    {employee.user?.fullName || DEFAULT_VALUES.UNKNOWN_USER}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      employee.isActive
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark'
                    }`}
                  >
                    {employee.isActive ? (
                      <>
                        <Check className="w-3 h-3 inline mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 inline mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </div>
                {employee.roleTitle && (
                  <p className="text-text-light/60 dark:text-text-dark/60">{employee.roleTitle}</p>
                )}
                {employee.salon?.name && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                    {employee.salon.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/payroll?salonId=${salonId}`)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Payroll
            </Button>
            <Button
              onClick={() => setShowEditModal(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {MESSAGES.EDIT_EMPLOYEE}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Commission Rate
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                {employee.commissionRate}%
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Total Commissions
              </p>
              <p className="text-2xl font-bold text-success">
                {CURRENCY.DEFAULT} {commissionSummary?.totalCommissions?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Unpaid
              </p>
              <p className="text-2xl font-bold text-warning">
                {CURRENCY.DEFAULT} {commissionSummary?.unpaidCommissions?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-xl">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Base Salary
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                {employee.baseSalary && employee.baseSalary > 0
                  ? `${CURRENCY.DEFAULT} ${Number(employee.baseSalary).toLocaleString()}`
                  : DEFAULT_VALUES.NOT_AVAILABLE}
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Briefcase className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl">
        <div className="border-b border-border-light dark:border-border-dark">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:border-border-light dark:hover:border-border-dark'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Employee Information */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <Phone className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                      <div>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">Phone</p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {employee.user?.phone || DEFAULT_VALUES.NOT_AVAILABLE}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                      <div>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">Email</p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {employee.user?.email || DEFAULT_VALUES.NOT_AVAILABLE}
                        </p>
                      </div>
                    </div>
                    {employee.hireDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                        <div>
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Hire Date</p>
                          <p className="text-text-light dark:text-text-dark font-medium">
                            {format(parseISO(employee.hireDate), DATE_FORMATS.DATE_ONLY)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
                        Employment Type
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {employee.employmentType?.replace(/_/g, ' ') || DEFAULT_VALUES.NOT_AVAILABLE}
                      </p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
                        Payment Type
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {employee.salaryType?.replace(/_/g, ' ') || DEFAULT_VALUES.COMMISSION_ONLY}
                      </p>
                    </div>
                    {employee.payFrequency && (
                      <div>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
                          Pay Frequency
                        </p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {employee.payFrequency.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills */}
              {employee.skills && employee.skills.length > 0 && (
                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Skills & Specializations
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-4">
              {commissionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_COMMISSIONS}</p>
                </div>
              ) : !commissions || commissions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_COMMISSIONS}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-success" />
                            <p className="text-lg font-bold text-text-light dark:text-text-dark">
                              {CURRENCY.DEFAULT} {commission.amount.toLocaleString()}
                            </p>
                          </div>
                          {commission.sale && (
                            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                              Sale: {commission.sale.currency} {commission.sale.totalAmount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {format(parseISO(commission.createdAt), DATE_FORMATS.FULL)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            commission.paid
                              ? STATUS_COLORS.SUCCESS + ' border border-success/20'
                              : STATUS_COLORS.WARNING + ' border border-warning/20'
                          }`}
                        >
                          {commission.paid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              {COMMISSION_STATUS.PAID}
                            </>
                          ) : (
                            COMMISSION_STATUS.UNPAID
                          )}
                        </span>
                      </div>
                      {commission.paid && commission.paymentMethod && (
                        <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                            Paid via {commission.paymentMethod}
                            {commission.paymentReference && ` • ${commission.paymentReference}`}
                            {commission.paidAt &&
                              ` on ${format(parseISO(commission.paidAt), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div className="space-y-4">
              {payrollLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_PAYROLL}</p>
                </div>
              ) : !payrollItems || payrollItems.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_PAYROLL}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payrollItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-lg font-bold text-text-light dark:text-text-dark mb-1">
                            {CURRENCY.DEFAULT} {item.netPay.toLocaleString()}
                          </p>
                          {item.payrollRun && (
                            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                              Period: {format(parseISO(item.payrollRun.periodStart), DATE_FORMATS.MONTH_DAY)} -{' '}
                              {format(parseISO(item.payrollRun.periodEnd), DATE_FORMATS.DATE_ONLY)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            item.paid
                              ? STATUS_COLORS.SUCCESS + ' border border-success/20'
                              : STATUS_COLORS.WARNING + ' border border-warning/20'
                          }`}
                        >
                          {item.paid ? PAYROLL_STATUS.PAID : PAYROLL_STATUS.PENDING}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-light dark:border-border-dark">
                        <div>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                            Base Salary
                          </p>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.baseSalary.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                            Commissions
                          </p>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.commissionAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                            Gross Pay
                          </p>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.grossPay.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                            Deductions
                          </p>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.deductions.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {(appointmentsLoading || salesLoading || commissionsLoading || payrollLoading) ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_ACTIVITIES}</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_ACTIVITY}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-light dark:bg-border-dark"></div>
                  <div className="space-y-6">
                    {activities.map((activity, idx) => {
                      const IconComponent = ACTIVITY_ICON_MAP[activity.type] || DollarSign;
                      const iconColor = 
                        activity.type === EMPLOYEE_ACTIVITY_TYPES.APPOINTMENT ? ACTIVITY_COLORS.APPOINTMENT :
                        activity.type === EMPLOYEE_ACTIVITY_TYPES.SALE ? ACTIVITY_COLORS.SALE :
                        activity.type === EMPLOYEE_ACTIVITY_TYPES.COMMISSION ? ACTIVITY_COLORS.COMMISSION :
                        ACTIVITY_COLORS.PAYROLL;

                      let statusColor: string = STATUS_COLORS.DEFAULT;
                      const status = String(activity.status);
                      if ((STATUS_MAPPING.PAID as readonly string[]).includes(status)) {
                        statusColor = STATUS_COLORS.SUCCESS;
                      } else if ((STATUS_MAPPING.PENDING as readonly string[]).includes(status)) {
                        statusColor = STATUS_COLORS.WARNING;
                      } else if ((STATUS_MAPPING.CANCELLED as readonly string[]).includes(status)) {
                        statusColor = STATUS_COLORS.DANGER;
                      }

                      return (
                        <div key={idx} className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark flex items-center justify-center z-10`}>
                            <IconComponent className={`w-4 h-4 ${iconColor}`} />
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-text-light dark:text-text-dark">
                                    {activity.title}
                                  </p>
                                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                                    {activity.description}
                                  </p>
                                  <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                                    {format(parseISO(activity.date), DATE_FORMATS.FULL)}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded capitalize ${statusColor}`}
                                >
                                  {activity.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal - Simple redirect to employees list */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowEditModal(false);
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close modal"
          />
          <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{MESSAGES.EDIT_EMPLOYEE}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
              {MESSAGES.EDIT_EMPLOYEE_DESCRIPTION}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="secondary"
                className="flex-1"
              >
                {MESSAGES.CANCEL}
              </Button>
              <Button
                onClick={() => router.push(`/salons/${salonId}/employees`)}
                variant="primary"
                className="flex-1"
              >
                {MESSAGES.GO_TO_EMPLOYEES_LIST}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
