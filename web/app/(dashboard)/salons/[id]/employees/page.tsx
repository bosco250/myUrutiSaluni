'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Users, UserPlus, Mail, Phone, Calendar, Briefcase, X, Check, XCircle, AlertCircle, ChevronDown, X as XIcon } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => router.push('/salons')}
              className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark mb-4 text-sm flex items-center gap-2"
            >
              ← Back to Salons
            </button>
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">
              Employees - {salon.name}
            </h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Manage your salon employees
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setShowAddModal(true);
            }}
            variant="primary"
          >
            <UserPlus className="w-5 h-5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employees List */}
      {employees && employees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              salonId={salonId}
              onEdit={() => {
                setEditingEmployee(employee);
                setShowAddModal(true);
              }}
              onDelete={() => {
                if (confirm(`Are you sure you want to remove ${employee.user?.fullName || 'this employee'} from the salon?`)) {
                  deleteMutation.mutate(employee.id);
                }
              }}
            />
          ))}
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
        {employee.commissionRate > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              Commission: {employee.commissionRate}%
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

      <div className="flex gap-2 pt-4 border-t border-border-light dark:border-border-dark">
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
      console.error('Error searching users:', err);
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
                            <XIcon className="w-3.5 h-3.5" />
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

                {/* Commission Rate */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                    Commission Rate (%)
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
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-sm">
                      %
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                    Enter the commission percentage (0-100) for this employee
                  </p>
                </div>

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

