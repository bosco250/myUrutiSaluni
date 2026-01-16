'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Scissors,
  UserCog,
  Package,
  Settings,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  EmployeePermission,
  PermissionCategory,
  PERMISSION_CATEGORIES,
  PERMISSION_DESCRIPTIONS,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
} from '@/lib/employee-permissions';
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

type TabType = 'overview' | 'commissions' | 'payroll' | 'activity' | 'permissions';

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<EmployeePermission[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<PermissionCategory[]>(ALL_CATEGORIES);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsSuccess, setPermissionsSuccess] = useState(false);

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

  // Fetch employee permissions
  interface PermissionRecord {
    id: string;
    permissionCode: EmployeePermission;
    isActive: boolean;
  }
  const { data: permissionsData, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery<PermissionRecord[]>({
    queryKey: ['employee-permissions', salonId, employeeId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/employees/${employeeId}/permissions`);
        const permissions = response.data?.permissions || [];
        const activePermissions = permissions
          .filter((p: PermissionRecord) => p.isActive)
          .map((p: PermissionRecord) => p.permissionCode);
        setSelectedPermissions(activePermissions);
        return permissions;
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId && !!employeeId && activeTab === 'permissions',
  });

  const currentPermissions: EmployeePermission[] = permissionsData
    ? permissionsData.filter(p => p.isActive).map(p => p.permissionCode)
    : [];

  const handleSavePermissions = async () => {
    if (!salonId || !employeeId) return;
    setPermissionsSaving(true);
    setPermissionsError(null);
    setPermissionsSuccess(false);
    try {
      const toGrant = selectedPermissions.filter(p => !currentPermissions.includes(p));
      const toRevoke = currentPermissions.filter(p => !selectedPermissions.includes(p));
      if (toGrant.length > 0) {
        await api.post(`/salons/${salonId}/employees/${employeeId}/permissions`, { permissions: toGrant });
      }
      if (toRevoke.length > 0) {
        await api.delete(`/salons/${salonId}/employees/${employeeId}/permissions`, { data: { permissions: toRevoke } });
      }
      await refetchPermissions();
      setPermissionsSuccess(true);
      setTimeout(() => setPermissionsSuccess(false), 3000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setPermissionsError(err?.response?.data?.message || err?.message || 'Failed to update permissions');
    } finally {
      setPermissionsSaving(false);
    }
  };

  const togglePermission = (permission: EmployeePermission) => {
    setSelectedPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  const toggleCategory = (category: PermissionCategory) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const permissionsChanged = JSON.stringify([...selectedPermissions].sort()) !== JSON.stringify([...currentPermissions].sort());

  if (employeeLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_EMPLOYEE}</p>
          </div>
        </div>
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-error" />
            <p className="text-error font-semibold text-sm">{MESSAGES.EMPLOYEE_NOT_FOUND}</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-xs">
            {MESSAGES.EMPLOYEE_NOT_FOUND_DESCRIPTION}
          </p>
          <Button onClick={() => router.push(`/salons/${salonId}/employees`)} variant="secondary" size="sm" className="mt-3">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
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
    { id: 'permissions', label: 'Permissions', icon: Shield },
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push(`/salons/${salonId}/employees`)} 
              variant="secondary" 
              size="sm" 
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">
                  {employee.user?.fullName || DEFAULT_VALUES.UNKNOWN_USER}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                    employee.isActive
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border border-border-light dark:border-border-dark'
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
                <p className="text-xs sm:text-sm text-text-light/60 dark:text-text-dark/60">{employee.roleTitle}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/payroll?salonId=${salonId}`)}
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Payroll
            </Button>
            <Button
              onClick={() => setShowEditModal(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Compact Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-0.5">Commission</p>
                <p className="text-lg font-bold text-text-light dark:text-text-dark">{employee.commissionRate}%</p>
              </div>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-0.5">Total</p>
                <p className="text-lg font-bold text-success">
                  {CURRENCY.DEFAULT} {commissionSummary?.totalCommissions?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="w-4 h-4 text-success" />
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-0.5">Unpaid</p>
                <p className="text-lg font-bold text-warning">
                  {CURRENCY.DEFAULT} {commissionSummary?.unpaidCommissions?.toLocaleString() || '0'}
                </p>
              </div>
              <Clock className="w-4 h-4 text-warning" />
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-0.5">Salary</p>
                <p className="text-lg font-bold text-text-light dark:text-text-dark">
                  {employee.baseSalary && employee.baseSalary > 0
                    ? `${CURRENCY.DEFAULT} ${Number(employee.baseSalary).toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <Briefcase className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-border-light dark:border-border-dark">
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:border-border-light dark:hover:border-border-dark'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Employee Information */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Employee Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Phone</p>
                        <p className="text-sm text-text-light dark:text-text-dark font-medium">
                          {employee.user?.phone || DEFAULT_VALUES.NOT_AVAILABLE}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Email</p>
                        <p className="text-sm text-text-light dark:text-text-dark font-medium truncate">
                          {employee.user?.email || DEFAULT_VALUES.NOT_AVAILABLE}
                        </p>
                      </div>
                    </div>
                    {employee.hireDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">Hire Date</p>
                          <p className="text-sm text-text-light dark:text-text-dark font-medium">
                            {format(parseISO(employee.hireDate), DATE_FORMATS.DATE_ONLY)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                        Employment Type
                      </p>
                      <p className="text-sm text-text-light dark:text-text-dark font-medium">
                        {employee.employmentType?.replace(/_/g, ' ') || DEFAULT_VALUES.NOT_AVAILABLE}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                        Payment Type
                      </p>
                      <p className="text-sm text-text-light dark:text-text-dark font-medium">
                        {employee.salaryType?.replace(/_/g, ' ') || DEFAULT_VALUES.COMMISSION_ONLY}
                      </p>
                    </div>
                    {employee.payFrequency && (
                      <div>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                          Pay Frequency
                        </p>
                        <p className="text-sm text-text-light dark:text-text-dark font-medium">
                          {employee.payFrequency.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills */}
              {employee.skills && employee.skills.length > 0 && (
                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                  <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Skills & Specializations
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {employee.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
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
            <div className="space-y-3">
              {commissionsLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_COMMISSIONS}</p>
                </div>
              ) : !commissions || commissions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_COMMISSIONS}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-success flex-shrink-0" />
                            <p className="text-base sm:text-lg font-bold text-text-light dark:text-text-dark">
                              {CURRENCY.DEFAULT} {commission.amount.toLocaleString()}
                            </p>
                          </div>
                          {commission.sale && (
                            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">
                              Sale: {commission.sale.currency} {commission.sale.totalAmount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-text-light/50 dark:text-text-dark/50">
                            {format(parseISO(commission.createdAt), DATE_FORMATS.FULL)}
                          </p>
                          {commission.paid && commission.paymentMethod && (
                            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                              Paid via {commission.paymentMethod}
                              {commission.paymentReference && ` • ${commission.paymentReference}`}
                              {commission.paidAt &&
                                ` on ${format(parseISO(commission.paidAt), 'MMM d, yyyy')}`}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold flex-shrink-0 ${
                            commission.paid
                              ? STATUS_COLORS.SUCCESS + ' border border-success/20'
                              : STATUS_COLORS.WARNING + ' border border-warning/20'
                          }`}
                        >
                          {commission.paid ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />
                              {COMMISSION_STATUS.PAID}
                            </>
                          ) : (
                            COMMISSION_STATUS.UNPAID
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div className="space-y-3">
              {payrollLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_PAYROLL}</p>
                </div>
              ) : !payrollItems || payrollItems.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_PAYROLL}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payrollItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base sm:text-lg font-bold text-text-light dark:text-text-dark mb-1">
                            {CURRENCY.DEFAULT} {item.netPay.toLocaleString()}
                          </p>
                          {item.payrollRun && (
                            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                              {format(parseISO(item.payrollRun.periodStart), DATE_FORMATS.MONTH_DAY)} -{' '}
                              {format(parseISO(item.payrollRun.periodEnd), DATE_FORMATS.DATE_ONLY)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold flex-shrink-0 ${
                            item.paid
                              ? STATUS_COLORS.SUCCESS + ' border border-success/20'
                              : STATUS_COLORS.WARNING + ' border border-warning/20'
                          }`}
                        >
                          {item.paid ? PAYROLL_STATUS.PAID : PAYROLL_STATUS.PENDING}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border-light dark:border-border-dark">
                        <div>
                          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Base Salary</p>
                          <p className="text-xs font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.baseSalary.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Commissions</p>
                          <p className="text-xs font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.commissionAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Gross Pay</p>
                          <p className="text-xs font-medium text-text-light dark:text-text-dark">
                            {CURRENCY.DEFAULT} {item.grossPay.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Deductions</p>
                          <p className="text-xs font-medium text-text-light dark:text-text-dark">
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
            <div className="space-y-3">
              {(appointmentsLoading || salesLoading || commissionsLoading || payrollLoading) ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.LOADING_ACTIVITIES}</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{MESSAGES.NO_ACTIVITY}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border-light dark:bg-border-dark"></div>
                  <div className="space-y-3">
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
                        <div key={idx} className="relative flex gap-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark flex items-center justify-center z-10`}>
                            <IconComponent className={`w-3 h-3 ${iconColor}`} />
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                    {activity.title}
                                  </p>
                                  <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                                    {activity.description}
                                  </p>
                                  <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1">
                                    {format(parseISO(activity.date), DATE_FORMATS.FULL)}
                                  </p>
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded capitalize flex-shrink-0 ${statusColor}`}
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

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">Manage Permissions</h3>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">Select which actions this employee can perform</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {permissionsSuccess && (
                    <span className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" />Saved</span>
                  )}
                  <Button onClick={handleSavePermissions} variant="primary" size="sm" disabled={permissionsSaving || !permissionsChanged} className="flex-1 sm:flex-none">
                    {permissionsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save
                  </Button>
                </div>
              </div>

              {permissionsError && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                  <p className="text-xs text-error">{permissionsError}</p>
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5">
                <p className="text-xs font-medium text-primary">{selectedPermissions.length} of {Object.values(EmployeePermission).length} permissions selected</p>
              </div>

              {permissionsLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading permissions...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ALL_CATEGORIES.map((category) => {
                    const categoryPermissions = PERMISSION_CATEGORIES[category];
                    const grantedCount = categoryPermissions.filter(p => selectedPermissions.includes(p)).length;
                    const isExpanded = expandedCategories.includes(category);
                    return (
                      <div key={category} className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
                        <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-3 hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                              {category === PermissionCategory.APPOINTMENTS && <Calendar className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.SERVICES && <Scissors className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.CUSTOMERS && <Users className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.SALES && <DollarSign className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.STAFF && <UserCog className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.INVENTORY && <Package className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.EXPENSES && <Receipt className="w-3.5 h-3.5 text-primary" />}
                              {category === PermissionCategory.SALON && <Settings className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <span className="text-sm font-medium text-text-light dark:text-text-dark">{CATEGORY_LABELS[category]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-light/60 dark:text-text-dark/60">{grantedCount}/{categoryPermissions.length}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-text-light/40" /> : <ChevronDown className="w-4 h-4 text-text-light/40" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border-light dark:border-border-dark">
                            {categoryPermissions.map((permission) => (
                              <label key={permission} className="flex items-start gap-2 p-2.5 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer border-b border-border-light/50 dark:border-border-dark/50 last:border-b-0">
                                <input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={() => togglePermission(permission)} className="mt-0.5 w-3.5 h-3.5 rounded border-border-light text-primary focus:ring-primary" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-text-light dark:text-text-dark">{permission.replace(/_/g, ' ')}</p>
                                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-0.5">{PERMISSION_DESCRIPTIONS[permission]}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
