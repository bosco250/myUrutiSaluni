'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Users, UserPlus, Mail, Phone, Calendar, Briefcase, X, Check, XCircle, AlertCircle, ChevronDown, DollarSign, Calculator, TrendingUp, ArrowRight, Eye, ArrowLeft, Clock } from 'lucide-react';
import React, { useState, Fragment } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SALON_PROFESSIONAL_TITLES, SALON_SKILLS } from '@/lib/salon-constants';

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
  payFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  hourlyRate?: number;
  overtimeRate?: number;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Salon {
  id: string;
  name: string;
  ownerId: string;
}

export default function SalonEmployeesPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}>
      <SalonEmployeesContent />
    </ProtectedRoute>
  );
}

function SalonEmployeesContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isSalonOwner } = usePermissions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SalonEmployee | null>(null);

  // Fetch salon details
  const { data: salon, isLoading: isLoadingSalon, error: salonError } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      return response.data;
    },
    enabled: !!salonId,
  });

  // Fetch employees - backend will handle authorization
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<SalonEmployee[]>({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/employees`);
      return response.data || [];
    },
    enabled: !!salonId,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      await api.delete(`/salons/${salonId}/employees/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-employees', salonId] });
    },
  });

  if (isLoadingSalon || isLoadingEmployees) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (salonError) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6">
          <p className="text-danger font-semibold">Error loading salon</p>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-sm">
            {(salonError as any)?.response?.data?.message || (salonError as any)?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6">
          <p className="text-danger font-semibold">Salon not found</p>
        </div>
      </div>
    );
  }

  if (employeesError) {
    const errorStatus = (employeesError as any)?.response?.status;
    const errorMessage = (employeesError as any)?.response?.data?.message || (employeesError as any)?.message || 'Unknown error';
    
    // Handle 403 Forbidden (access denied)
    if (errorStatus === 403) {
      return (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-warning/10 border border-warning rounded-2xl p-6">
            <p className="text-warning font-semibold">Access Denied</p>
            <p className="text-text-light/60 dark:text-text-dark/60 mt-1">
              {errorMessage || 'You can only access employees of your own salon.'}
            </p>
          </div>
        </div>
      );
    }
    
    // Handle other errors
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6">
          <p className="text-danger font-semibold">Error loading employees</p>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-sm">
            {(employeesError as any)?.response?.data?.message || (employeesError as any)?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: employees?.length || 0,
    active: employees?.filter((e) => e.isActive).length || 0,
    withCommission: employees?.filter((e) => e.commissionRate > 0).length || 0,
    withSalary: employees?.filter((e) => e.baseSalary && e.baseSalary > 0).length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={() => router.push(`/salons/${salonId}`)} variant="secondary" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Salon
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                  Employees - {salon.name}
                </h1>
                <p className="text-text-light/60 dark:text-text-dark/60">
                  Manage your salon employees and payroll
                </p>
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
              onClick={() => {
                setEditingEmployee(null);
                setShowAddModal(true);
              }}
              variant="primary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
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
                Total Employees
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Active
              </p>
              <p className="text-2xl font-bold text-success">
                {stats.active}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <Check className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                With Commission
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                {stats.withCommission}
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
                With Salary
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                {stats.withSalary}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => router.push(`/payroll?salonId=${salonId}`)}
          className="bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-2xl p-6 text-left text-white transition-all shadow-lg hover:shadow-xl group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-bold mb-1">Calculate Payroll</h3>
          <p className="text-white/80 text-sm">Process payroll for all employees</p>
        </button>

        <button
          onClick={() => router.push('/commissions')}
          className="bg-gradient-to-br from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 rounded-2xl p-6 text-left text-white transition-all shadow-lg hover:shadow-xl group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-bold mb-1">View Commissions</h3>
          <p className="text-white/80 text-sm">Track employee commissions</p>
        </button>

        <button
          onClick={() => router.push(`/payroll?salonId=${salonId}`)}
          className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl p-6 text-left text-white transition-all shadow-lg hover:shadow-xl group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-xl font-bold mb-1">Payroll History</h3>
          <p className="text-white/80 text-sm">View past payroll runs</p>
        </button>
      </div>

      {/* Employees Table */}
      {employees && employees.length > 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Role & Skills
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Payment Type & Compensation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <button
                            onClick={() => router.push(`/salons/${salonId}/employees/${employee.id}`)}
                            className="text-sm font-semibold text-text-light dark:text-text-dark hover:text-primary transition text-left"
                          >
                            {employee.user?.fullName || 'Unknown User'}
                          </button>
                          {employee.hireDate && (
                            <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                              Hired {new Date(employee.hireDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {employee.roleTitle && (
                          <div className="text-sm font-medium text-text-light dark:text-text-dark">
                            {employee.roleTitle}
                          </div>
                        )}
                        {employee.skills && employee.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {employee.skills.slice(0, 3).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {employee.skills.length > 3 && (
                              <span className="px-2 py-0.5 text-text-light/60 dark:text-text-dark/60 rounded text-xs">
                                +{employee.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {employee.user?.email && (
                          <div className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                            <Mail className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            <span className="truncate max-w-[200px]">{employee.user.email}</span>
                          </div>
                        )}
                        {employee.user?.phone && (
                          <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
                            <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            {employee.user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {/* Payment Type Badge - Prominent */}
                        {employee.salaryType ? (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            employee.salaryType === 'COMMISSION_ONLY' 
                              ? 'bg-primary/15 text-primary border-2 border-primary/30 shadow-sm'
                              : employee.salaryType === 'SALARY_ONLY'
                              ? 'bg-success/15 text-success border-2 border-success/30 shadow-sm'
                              : 'bg-warning/15 text-warning border-2 border-warning/30 shadow-sm'
                          }`}>
                            {employee.salaryType === 'COMMISSION_ONLY' && <TrendingUp className="w-4 h-4" />}
                            {employee.salaryType === 'SALARY_ONLY' && <DollarSign className="w-4 h-4" />}
                            {employee.salaryType === 'SALARY_PLUS_COMMISSION' && <Calculator className="w-4 h-4" />}
                            <span className="uppercase tracking-wide">
                              {employee.salaryType === 'COMMISSION_ONLY' && 'Commission Based'}
                              {employee.salaryType === 'SALARY_ONLY' && 'Salary Based'}
                              {employee.salaryType === 'SALARY_PLUS_COMMISSION' && 'Salary + Commission'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-text-light/5 dark:bg-text-dark/5 text-text-light/60 dark:text-text-dark/60 border border-border-light dark:border-border-dark">
                            Not Set
                          </div>
                        )}
                        <div className="space-y-1.5 pt-1">
                          {employee.commissionRate > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="text-text-light dark:text-text-dark">
                                <span className="font-semibold text-primary">{employee.commissionRate}%</span> commission rate
                              </span>
                            </div>
                          )}
                          {employee.baseSalary && employee.baseSalary > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-3.5 h-3.5 text-success flex-shrink-0" />
                              <span className="text-text-light/80 dark:text-text-dark/80">
                                <span className="font-semibold text-success">RWF {Number(employee.baseSalary).toLocaleString()}</span>
                                {employee.payFrequency && (
                                  <span className="text-xs text-text-light/60 dark:text-text-dark/60 ml-1">
                                    / {employee.payFrequency.toLowerCase()}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {employee.hourlyRate && employee.hourlyRate > 0 && (
                            <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {employee.payFrequency === 'DAILY' ? 'Daily' : 'Hourly'} rate: RWF {Number(employee.hourlyRate).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                          employee.isActive
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border border-border-light dark:border-border-dark'
                        }`}
                      >
                        {employee.isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/salons/${salonId}/employees/${employee.id}`)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/payroll?salonId=${salonId}`)}
                          className="p-2 text-success hover:bg-success/10 rounded-lg transition"
                          title="View Payroll"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setShowAddModal(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${employee.user?.fullName || 'this employee'} from the salon?`)) {
                              deleteMutation.mutate(employee.id);
                            }
                          }}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium mb-2">
            No employees yet
          </p>
          <p className="text-text-light/40 dark:text-text-dark/40 text-sm mb-6">
            Add your first employee to get started
          </p>
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setShowAddModal(true);
            }}
            variant="primary"
          >
            <UserPlus className="w-5 h-5" />
            Add Your First Employee
          </Button>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {showAddModal && (
        <EmployeeFormModal
          salonId={salonId}
          employee={editingEmployee}
          onClose={() => {
            setShowAddModal(false);
            setEditingEmployee(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['salon-employees', salonId] });
            setShowAddModal(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function EmployeeCard({
  employee,
  salonId,
  onEdit,
  onDelete,
}: {
  employee: SalonEmployee;
  salonId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:border-primary/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark truncate">
                {employee.user?.fullName || 'Unknown User'}
              </h3>
              {employee.roleTitle && (
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  {employee.roleTitle}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              employee.isActive
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border border-border-light dark:border-border-dark'
            }`}
          >
            {employee.isActive ? (
              <>
                <Check className="w-3 h-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                Inactive
              </>
            )}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {employee.user?.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80 truncate">
              {employee.user.email}
            </span>
          </div>
        )}
        {employee.user?.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              {employee.user.phone}
            </span>
          </div>
        )}
        {employee.hireDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              Hired: {new Date(employee.hireDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {/* Payment Type Badge */}
        {employee.salaryType && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold mb-2 ${
            employee.salaryType === 'COMMISSION_ONLY' 
              ? 'bg-primary/10 text-primary border border-primary/20'
              : employee.salaryType === 'SALARY_ONLY'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-warning/10 text-warning border border-warning/20'
          }`}>
            {employee.salaryType === 'COMMISSION_ONLY' && <TrendingUp className="w-3.5 h-3.5" />}
            {employee.salaryType === 'SALARY_ONLY' && <DollarSign className="w-3.5 h-3.5" />}
            {employee.salaryType === 'SALARY_PLUS_COMMISSION' && <Calculator className="w-3.5 h-3.5" />}
            {employee.salaryType.replace(/_/g, ' ')}
          </div>
        )}
        {employee.commissionRate > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              Commission: <span className="font-semibold text-primary">{employee.commissionRate}%</span>
            </span>
          </div>
        )}
        {employee.baseSalary && employee.baseSalary > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-success flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              {employee.payFrequency === 'DAILY' ? 'Daily Rate' : 'Salary'}: <span className="font-semibold text-success">RWF {Number(employee.baseSalary).toLocaleString()}</span>
              {employee.payFrequency && employee.payFrequency !== 'DAILY' && (
                <span className="text-xs text-text-light/60 dark:text-text-dark/60 ml-1">
                  ({employee.payFrequency.toLowerCase()})
                </span>
              )}
            </span>
          </div>
        )}
        {employee.hourlyRate && employee.hourlyRate > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              {employee.payFrequency === 'DAILY' ? 'Daily' : 'Hourly'} Rate: RWF {Number(employee.hourlyRate).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {employee.skills && employee.skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-2">Skills</p>
          <div className="flex flex-wrap gap-2">
            {employee.skills.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-4 border-t border-border-light dark:border-border-dark">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-sm font-medium transition"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-background-light dark:bg-background-dark hover:bg-danger/10 text-danger rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => router.push(`/payroll?salonId=${salonId}`)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-success/10 to-primary/10 hover:from-success/20 hover:to-primary/20 text-success rounded-lg text-sm font-medium transition border border-success/20"
        >
          <Calculator className="w-4 h-4" />
          View Payroll
        </button>
      </div>
    </div>
  );
}

function EmployeeFormModal({
  salonId,
  employee,
  onClose,
  onSuccess,
}: {
  salonId: string;
  employee?: SalonEmployee | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    userId: employee?.userId || '',
    roleTitle: employee?.roleTitle || '',
    selectedSkills: employee?.skills || [],
    hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
    isActive: employee?.isActive ?? true,
    commissionRate: employee?.commissionRate || 0,
    baseSalary: employee?.baseSalary || '',
    salaryType: employee?.salaryType || 'COMMISSION_ONLY',
    payFrequency: employee?.payFrequency || 'MONTHLY',
    hourlyRate: employee?.hourlyRate || '',
    overtimeRate: employee?.overtimeRate || 1.5,
    employmentType: employee?.employmentType || 'FULL_TIME',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillsSearchQuery, setSkillsSearchQuery] = useState('');

  // Filter skills based on search
  const filteredSkills = SALON_SKILLS.filter((skill) =>
    skill.toLowerCase().includes(skillsSearchQuery.toLowerCase())
  );

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await api.get('/users');
      const allUsers = response.data || [];
      // Filter users client-side (since backend doesn't have search endpoint)
      const filtered = allUsers.filter((user: any) => {
        const searchLower = query.toLowerCase();
        return (
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower)
        );
      });
      setSearchResults(filtered);
    } catch (err) {
      // Error searching users - show empty results
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        userId: formData.userId,
        salonId,
        roleTitle: formData.roleTitle || undefined,
        skills: formData.selectedSkills.length > 0 ? formData.selectedSkills : undefined,
        hireDate: formData.hireDate || undefined,
        isActive: formData.isActive,
        commissionRate: formData.commissionRate || 0,
        baseSalary: formData.baseSalary ? parseFloat(String(formData.baseSalary)) : undefined,
        salaryType: formData.salaryType,
        payFrequency: formData.payFrequency,
        hourlyRate: formData.hourlyRate ? parseFloat(String(formData.hourlyRate)) : undefined,
        overtimeRate: formData.overtimeRate || 1.5,
        employmentType: formData.employmentType,
      };

      if (employee) {
        await api.patch(`/salons/${salonId}/employees/${employee.id}`, payload);
      } else {
        await api.post(`/salons/${salonId}/employees`, payload);
      }

      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to save employee';
      setError(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto slide-in-from-top-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="mb-6 pb-6 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <UserPlus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                      {employee ? 'Edit Employee' : 'Add New Employee'}
                    </h2>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                      {employee ? 'Update employee information and details' : 'Add a new employee to your salon team'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Selection Section */}
              {!employee && (
                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Select Employee</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">Search and select a user to add as an employee</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                      Search for User <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        placeholder="Search by name, email, or phone..."
                        className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      />
                      {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-border-light dark:border-border-dark rounded-xl overflow-hidden bg-background-light dark:bg-background-dark max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, userId: user.id });
                            setSearchQuery(user.fullName || user.email);
                            setSearchResults([]);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-surface-light dark:hover:bg-surface-dark transition border-b border-border-light dark:border-border-dark last:border-0"
                        >
                          <div className="font-medium text-text-light dark:text-text-dark">
                            {user.fullName}
                          </div>
                          <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                            {user.email} {user.phone && `• ${user.phone}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.userId && (
                    <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <p className="text-sm text-primary font-medium">User selected successfully</p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Professional Information Section */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Professional Information</h3>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Employee role, title, and specializations</p>
                  </div>
                </div>

                {/* Role Title */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Professional Title <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTitleDropdown(!showTitleDropdown);
                      setShowSkillsDropdown(false);
                    }}
                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition flex items-center justify-between"
                  >
                    <span className={formData.roleTitle ? 'text-text-light dark:text-text-dark' : 'text-text-light/40 dark:text-text-dark/40'}>
                      {formData.roleTitle || 'Select a professional title...'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-text-light/40 dark:text-text-dark/40 transition-transform ${showTitleDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showTitleDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTitleDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                        {SALON_PROFESSIONAL_TITLES.map((title) => (
                          <button
                            key={title}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, roleTitle: title });
                              setShowTitleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-background-light dark:hover:bg-background-dark transition ${
                              formData.roleTitle === title
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-text-light dark:text-text-dark'
                            }`}
                          >
                            {title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                </div>

                {/* Skills */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Skills & Specializations
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2 min-h-[3rem] p-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl">
                    {formData.selectedSkills.length > 0 ? (
                      formData.selectedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                selectedSkills: formData.selectedSkills.filter((s) => s !== skill),
                              });
                            }}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-text-light/40 dark:text-text-dark/40 text-sm self-center">
                        No skills selected. Click to add skills...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={skillsSearchQuery}
                      onChange={(e) => {
                        setSkillsSearchQuery(e.target.value);
                        setShowSkillsDropdown(true);
                      }}
                      onFocus={() => setShowSkillsDropdown(true)}
                      placeholder="Search and select skills..."
                      className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                    />
                    {showSkillsDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => {
                            setShowSkillsDropdown(false);
                            setSkillsSearchQuery('');
                          }}
                        />
                        <div className="absolute z-20 w-full mt-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                          {filteredSkills.length > 0 ? (
                            filteredSkills
                              .filter((skill) => !formData.selectedSkills.includes(skill))
                              .map((skill) => (
                                <button
                                  key={skill}
                                  type="button"
                                  onClick={() => {
                                    if (!formData.selectedSkills.includes(skill)) {
                                      setFormData({
                                        ...formData,
                                        selectedSkills: [...formData.selectedSkills, skill],
                                      });
                                    }
                                    setSkillsSearchQuery('');
                                    setShowSkillsDropdown(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-background-light dark:hover:bg-background-dark transition text-text-light dark:text-text-dark"
                                >
                                  {skill}
                                </button>
                              ))
                          ) : (
                            <div className="px-4 py-3 text-text-light/60 dark:text-text-dark/60 text-sm">
                              No skills found
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-text-light/50 dark:text-text-dark/50">
                    {formData.selectedSkills.length} skill{formData.selectedSkills.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Employment Details</h3>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Hire date, commission, and employment status</p>
                  </div>
                </div>

                {/* Hire Date */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                {/* Commission Rate - Show if commission is allowed */}
                {(formData.salaryType === 'COMMISSION_ONLY' || formData.salaryType === 'SALARY_PLUS_COMMISSION') && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                      Commission Rate (%) <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                        placeholder="0.00"
                        required={formData.salaryType === 'COMMISSION_ONLY'}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-sm">
                        %
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                      Percentage of service sale amount employee earns as commission (e.g., 15% = RWF 1,500 from RWF 10,000 service)
                    </p>
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/50 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-text-light dark:text-text-dark cursor-pointer flex-1">
                    Employee is currently active
                  </label>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    formData.isActive
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border border-border-light dark:border-border-dark'
                  }`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Salary & Payment Configuration */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Salary & Payment</h3>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Configure employee compensation structure</p>
                  </div>
                </div>

                {/* Salary Type - Enhanced with visual cards */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-3">
                    Payment Type <span className="text-danger">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, salaryType: 'COMMISSION_ONLY', baseSalary: '' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.salaryType === 'COMMISSION_ONLY'
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          formData.salaryType === 'COMMISSION_ONLY' ? 'bg-primary/20' : 'bg-background-light dark:bg-background-dark'
                        }`}>
                          <TrendingUp className={`w-5 h-5 ${formData.salaryType === 'COMMISSION_ONLY' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-text-light dark:text-text-dark">Commission Only</h4>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">Earns from services</p>
                        </div>
                        {formData.salaryType === 'COMMISSION_ONLY' && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, salaryType: 'SALARY_ONLY', commissionRate: 0 })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.salaryType === 'SALARY_ONLY'
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          formData.salaryType === 'SALARY_ONLY' ? 'bg-primary/20' : 'bg-background-light dark:bg-background-dark'
                        }`}>
                          <DollarSign className={`w-5 h-5 ${formData.salaryType === 'SALARY_ONLY' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-text-light dark:text-text-dark">Salary Only</h4>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">Fixed monthly salary</p>
                        </div>
                        {formData.salaryType === 'SALARY_ONLY' && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, salaryType: 'SALARY_PLUS_COMMISSION' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.salaryType === 'SALARY_PLUS_COMMISSION'
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          formData.salaryType === 'SALARY_PLUS_COMMISSION' ? 'bg-primary/20' : 'bg-background-light dark:bg-background-dark'
                        }`}>
                          <Calculator className={`w-5 h-5 ${formData.salaryType === 'SALARY_PLUS_COMMISSION' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-text-light dark:text-text-dark">Salary + Commission</h4>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">Base pay + earnings</p>
                        </div>
                        {formData.salaryType === 'SALARY_PLUS_COMMISSION' && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-text-light/50 dark:text-text-dark/50">
                    {formData.salaryType === 'COMMISSION_ONLY' && 'Employee earns only from commissions on services they provide'}
                    {formData.salaryType === 'SALARY_ONLY' && 'Employee receives fixed salary with no commissions'}
                    {formData.salaryType === 'SALARY_PLUS_COMMISSION' && 'Employee receives base salary plus commissions from services'}
                  </p>
                </div>

                {/* Base Salary - Show if not commission only */}
                {formData.salaryType !== 'COMMISSION_ONLY' && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                        Base Salary {formData.payFrequency === 'DAILY' ? '(Daily Rate)' : '(Annual Amount)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step={formData.payFrequency === 'DAILY' ? '100' : '1000'}
                          value={formData.baseSalary}
                          onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                          className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-sm">
                          RWF
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                        {formData.payFrequency === 'DAILY' 
                          ? 'Daily wage amount (paid per day worked)'
                          : 'Annual base salary amount (will be calculated based on pay frequency)'}
                      </p>
                    </div>

                    {/* Pay Frequency */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                        Pay Frequency <span className="text-danger">*</span>
                      </label>
                      <select
                        value={formData.payFrequency}
                        onChange={(e) => {
                          const newFrequency = e.target.value as any;
                          setFormData({ ...formData, payFrequency: newFrequency });
                          // If switching to DAILY, suggest using hourlyRate instead
                          if (newFrequency === 'DAILY' && !formData.hourlyRate) {
                            // Keep baseSalary as daily rate
                          }
                        }}
                        className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      >
                        <option value="DAILY">Daily (Daily wage employees)</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Bi-weekly (Every 2 weeks)</option>
                        <option value="MONTHLY">Monthly (Fixed monthly salary)</option>
                      </select>
                      <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                        {formData.payFrequency === 'DAILY' && 'For employees paid daily (e.g., daily wage workers)'}
                        {formData.payFrequency === 'MONTHLY' && 'For employees with fixed monthly salary'}
                        {formData.payFrequency === 'WEEKLY' && 'For employees paid every week'}
                        {formData.payFrequency === 'BIWEEKLY' && 'For employees paid every two weeks'}
                      </p>
                    </div>
                  </>
                )}

                {/* Employment Type */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Employment Type
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                    className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>

                {/* Hourly Rate - Optional */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Hourly Rate (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-sm">
                      RWF/hr
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                    For hourly employees or overtime calculations
                  </p>
                </div>

                {/* Overtime Rate */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Overtime Rate Multiplier
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      value={formData.overtimeRate}
                      onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 1.5 })}
                      className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      placeholder="1.5"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-sm">
                      x
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                    Multiplier for overtime pay (e.g., 1.5 = time and a half)
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-border-light dark:border-border-dark">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || (!employee && !formData.userId) || !formData.roleTitle}
                  className="flex-1 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {employee ? 'Updating...' : 'Adding...'}
                    </>
                  ) : employee ? (
                    <>
                      <Check className="w-4 h-4" />
                      Update Employee
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Employee
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

