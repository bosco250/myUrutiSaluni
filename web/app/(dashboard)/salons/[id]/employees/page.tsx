'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Edit, Trash2, Users, UserPlus, Mail, Phone, Calendar, Briefcase, X, Check, XCircle, AlertCircle, ChevronDown, DollarSign, Calculator, TrendingUp, ArrowRight, Eye, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
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

// Stat Card Component
function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-3 flex items-center gap-2">
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-none mb-1">{value}</p>
        <p className="text-[10px] text-gray-900/60 dark:text-white/60 uppercase font-bold tracking-wider">{label}</p>
      </div>
    </div>
  );
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SalonEmployee | null>(null);
  // Fetch salon details
  const { data: salon, isLoading: isLoadingSalon, error: salonError } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      return response.data?.data || response.data;
    },
    enabled: !!salonId,
  });

  // Fetch employees - backend will handle authorization
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<SalonEmployee[]>({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/employees`);
      return response.data?.data || response.data || [];
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

  const stats = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return {
      total: list.length,
      active: list.filter((e) => e.isActive).length,
      withCommission: list.filter((e) => e.commissionRate > 0).length,
      withSalary: list.filter((e) => e.baseSalary && e.baseSalary > 0).length,
    };
  }, [employees]);

  if (isLoadingSalon || isLoadingEmployees) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (salonError) {
    const errorMsg = (salonError as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (salonError as { message?: string })?.message || 'Unknown error';
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <p className="text-error font-semibold text-sm">Error loading salon</p>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-xs">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <p className="text-error font-semibold text-sm">Salon not found</p>
        </div>
      </div>
    );
  }

  if (employeesError) {
    const errorData = employeesError as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const errorStatus = errorData.response?.status;
    const errorMessage = errorData.response?.data?.message || errorData.message || 'Unknown error';
    
    // Handle 403 Forbidden (access denied)
    if (errorStatus === 403) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <p className="text-warning font-semibold text-sm">Access Denied</p>
            <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-xs">
              {errorMessage || 'You can only access employees of your own salon.'}
            </p>
          </div>
        </div>
      );
    }
    
    // Handle other errors
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <p className="text-error font-semibold text-sm">Error loading employees</p>
          <p className="text-text-light/60 dark:text-text-dark/60 mt-1 text-xs">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push(`/salons/${salonId}`)} 
              variant="secondary" 
              size="sm" 
              className="w-9 h-9 p-0 flex items-center justify-center rounded-lg border-gray-200 dark:border-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Employees
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {salon.name} • {stats.total} Staff Members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push(`/payroll?salonId=${salonId}`)}
              variant="outline"
              size="sm"
              className="h-9 flex items-center gap-2 border-gray-200 dark:border-gray-800"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Payroll</span>
            </Button>
            <Button
              onClick={() => {
                setEditingEmployee(null);
                setShowAddModal(true);
              }}
              variant="primary"
              size="sm"
              className="h-9"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatCard label="Total Staff" value={stats.total} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
          <StatCard label="Active" value={stats.active} icon={Check} color="text-green-600" bg="bg-green-500/10" />
          <StatCard label="Commission" value={stats.withCommission} icon={TrendingUp} color="text-primary" bg="bg-primary/10" />
          <StatCard label="Fixed Salary" value={stats.withSalary} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-500/10" />
        </div>
      </div>

      {/* Employees Table */}
      {Array.isArray(employees) && employees.length > 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider hidden lg:table-cell">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider hidden xl:table-cell">
                    Compensation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50 dark:divide-border-dark/50">
                {isLoadingEmployees ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                          Loading...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : Array.isArray(employees) && employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 text-text-light/40 dark:text-text-dark/40 mb-1" />
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
                          No employees found
                        </p>
                        <p className="text-xs text-text-light/40 dark:text-text-dark/40">
                          Add your first employee to get started
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : Array.isArray(employees) ? (
                  employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group border-b border-gray-100 dark:border-gray-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-800 shadow-sm">
                          <Users className="w-4 h-4 text-gray-400 dark:text-white/40" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/salons/${salonId}/employees/${employee.id}`)}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary transition text-left block truncate"
                          >
                            {employee.user?.fullName || 'Unknown User'}
                          </button>
                          {employee.hireDate && (
                            <div className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                              Joined {new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
                      <div className="space-y-1">
                        {employee.roleTitle && (
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {employee.roleTitle}
                          </div>
                        )}
                        {employee.skills && employee.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {employee.skills.slice(0, 2).map((skill, index) => (
                              <span
                                key={index}
                                className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-white/80 rounded uppercase tracking-tight"
                              >
                                {skill}
                              </span>
                            ))}
                            {employee.skills.length > 2 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-gray-500 font-bold uppercase">
                                +{employee.skills.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                      <div className="space-y-1">
                        {employee.user?.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 font-medium">
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{employee.user.email}</span>
                          </div>
                        )}
                        {employee.user?.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-900 dark:text-white font-semibold">
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {employee.user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell whitespace-nowrap">
                      <div className="space-y-1.5">
                        {employee.salaryType ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-white/80 uppercase">
                            <span className="uppercase tracking-tight">
                              {employee.salaryType === 'COMMISSION_ONLY' && 'Commission'}
                              {employee.salaryType === 'SALARY_ONLY' && 'Salary'}
                              {employee.salaryType === 'SALARY_PLUS_COMMISSION' && 'Hybrid'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-900/40 text-[10px] font-bold text-gray-400 uppercase tracking-tight border border-gray-100 dark:border-gray-800">
                            Not Set
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {employee.commissionRate > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {employee.commissionRate}%
                              </span>
                            </div>
                          )}
                          {employee.baseSalary && employee.baseSalary > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <DollarSign className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                RWF {Number(employee.baseSalary).toLocaleString()}
                                {employee.payFrequency && (
                                  <span className="text-[10px] text-gray-400 font-bold uppercase ml-1 tracking-tighter">
                                    /{employee.payFrequency.toLowerCase().slice(0, 3)}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          employee.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-white/40'
                        }`}
                      >
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => router.push(`/salons/${salonId}/employees/${employee.id}`)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setShowAddModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${employee.user?.fullName || 'this employee'}?`)) {
                              deleteMutation.mutate(employee.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium mb-1">
            No employees yet
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mb-4">
            Add your first employee to get started
          </p>
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setShowAddModal(true);
            }}
            variant="primary"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Employee
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
  const [searchResults, setSearchResults] = useState<{ id: string; fullName: string; email: string; phone?: string }[]>([]);
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
      const filtered = allUsers.filter((user: { fullName?: string; email?: string; phone?: string }) => {
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
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { message?: string | string[] } } };
      const errorMessage = errorData.response?.data?.message || 'Failed to save employee';
      setError(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close backdrop"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto slide-in-from-top-4"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
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
                    <label htmlFor="user-search" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                      Search for User <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="user-search"
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
                  <label htmlFor="role-title-btn" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Professional Title <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                  <button
                    id="role-title-btn"
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
                        onKeyDown={(e) => { if (e.key === 'Escape') setShowTitleDropdown(false); }}
                        role="button"
                        tabIndex={-1}
                        aria-label="Close dropdown"
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
                  <label htmlFor="skills-search" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
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
                      id="skills-search"
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
                          onKeyDown={(e) => { if (e.key === 'Escape') setShowSkillsDropdown(false); }}
                          role="button"
                          tabIndex={-1}
                          aria-label="Close dropdown"
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
                  <label htmlFor="hire-date" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Hire Date
                  </label>
                  <input
                    id="hire-date"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                {/* Commission Rate - Show if commission is allowed */}
                {(formData.salaryType === 'COMMISSION_ONLY' || formData.salaryType === 'SALARY_PLUS_COMMISSION') && (
                  <div className="mb-6">
                    <label htmlFor="commission-rate" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                      Commission Rate (%) <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="commission-rate"
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
                  <p className="block text-sm font-semibold text-text-light dark:text-text-dark mb-3">
                    Payment Type <span className="text-danger">*</span>
                  </p>
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
                      <label htmlFor="base-salary" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                        Base Salary {formData.payFrequency === 'DAILY' ? '(Daily Rate)' : '(Annual Amount)'}
                      </label>
                      <div className="relative">
                        <input
                          id="base-salary"
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
                      <label htmlFor="pay-frequency" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                        Pay Frequency <span className="text-danger">*</span>
                      </label>
                      <select
                        id="pay-frequency"
                        value={formData.payFrequency}
                        onChange={(e) => {
                          const newFrequency = e.target.value as 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
                          setFormData({ ...formData, payFrequency: newFrequency });
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
                  <label htmlFor="employment-type" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Employment Type
                  </label>
                  <select
                    id="employment-type"
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' })}
                    className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>

                {/* Hourly Rate - Optional */}
                <div className="mb-6">
                  <label htmlFor="hourly-rate" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Hourly Rate (Optional)
                  </label>
                  <div className="relative">
                    <input
                      id="hourly-rate"
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
                  <label htmlFor="overtime-rate" className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Overtime Rate Multiplier
                  </label>
                  <div className="relative">
                    <input
                      id="overtime-rate"
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

