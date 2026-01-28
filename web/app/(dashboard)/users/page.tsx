'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Plus,
  Trash2,
  Search,
  User as UserIcon,
  Shield,
  Building2,
  Users,
  Mail,
  Phone,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  Download,
  RefreshCw,
  Crown,
  Briefcase,
  UserCheck,
  AlertCircle,
  Eye,
  Calendar,
  Pencil
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import RoleGuard from '@/components/auth/RoleGuard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
  membershipNumber?: string;
}

const roleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ASSOCIATION_ADMIN]: 'Assoc. Admin',
  [UserRole.DISTRICT_LEADER]: 'District Leader',
  [UserRole.SALON_OWNER]: 'Salon Owner',
  [UserRole.SALON_EMPLOYEE]: 'Employee',
  [UserRole.CUSTOMER]: 'Customer',
};

const roleConfig: Record<UserRole, { color: string; bg: string; icon: any }> = {
  [UserRole.SUPER_ADMIN]: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: Crown },
  [UserRole.ASSOCIATION_ADMIN]: { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', icon: Shield },
  [UserRole.DISTRICT_LEADER]: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Building2 },
  [UserRole.SALON_OWNER]: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', icon: Briefcase },
  [UserRole.SALON_EMPLOYEE]: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', icon: UserCheck },
  [UserRole.CUSTOMER]: { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', icon: UserIcon },
};

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
      <UsersPageContent />
    </ProtectedRoute>
  );
}

function UsersPageContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { canManageUsers } = usePermissions();

  const { data: users, isLoading, error, refetch, isFetching } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data?.data || response.data || [];
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      await api.patch(`/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return (
      users?.filter((user) => {
        const matchesSearch =
          user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []
    );
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stats calculations
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, admins: 0, owners: 0, employees: 0, customers: 0 };
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      admins: users.filter(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ASSOCIATION_ADMIN).length,
      owners: users.filter(u => u.role === UserRole.SALON_OWNER).length,
      employees: users.filter(u => u.role === UserRole.SALON_EMPLOYEE).length,
      customers: users.filter(u => u.role === UserRole.CUSTOMER).length,
    };
  }, [users]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data: { role: newRole },
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive },
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 md:p-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-900/60 dark:text-white/60">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 md:p-4">
        <div className="bg-error/10 border border-error rounded-xl p-4 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-error flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-error mb-1">Error loading users</h3>
            <p className="text-sm text-gray-900/60 dark:text-white/60">
              {(error as any)?.response?.data?.message || 'Failed to load users. Please try again.'}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-sm text-gray-900/60 dark:text-white/60 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9" disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <RoleGuard requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-9">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <StatCard label="Total Users" value={stats.total} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="Active" value={stats.active} icon={Check} color="text-green-600" bg="bg-green-500/10" />
        <StatCard label="Admins" value={stats.admins} icon={Shield} color="text-red-600" bg="bg-red-500/10" />
        <StatCard label="Salon Owners" value={stats.owners} icon={Briefcase} color="text-purple-600" bg="bg-purple-500/10" />
        <StatCard label="Employees" value={stats.employees} icon={UserCheck} color="text-orange-600" bg="bg-orange-500/10" />
        <StatCard label="Customers" value={stats.customers} icon={UserIcon} color="text-gray-600" bg="bg-gray-500/10" />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-3 mb-3">
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-900/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          {/* Role Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', UserRole.SUPER_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`h-9 px-3 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === role
                    ? 'bg-primary text-white'
                    : 'bg-gray-50 dark:bg-gray-900 text-gray-900/60 dark:text-white/60 hover:bg-gray-50/80 dark:hover:bg-background-dark/80 border border-gray-300 dark:border-gray-800'
                }`}
              >
                {role === 'all' ? 'All Roles' : roleLabels[role as UserRole]}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-12 text-center">
          <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-900/20 dark:text-white/20" />
          <p className="text-gray-900/60 dark:text-white/60 font-medium mb-1">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users match your filters' : 'No users found'}
          </p>
          <p className="text-sm text-gray-900/40 dark:text-white/40">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800">
                <tr>
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">User</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Contact</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Role</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Joined</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {paginatedUsers.map((user) => {
                  const config = roleConfig[user.role];
                  const RoleIcon = config?.icon || UserIcon;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-background-dark transition-colors group">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 text-xs rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.fullName}</p>
                            <p className="text-[10px] text-gray-900/40 dark:text-white/40 font-mono">
                              {user.membershipNumber || `ID: ${user.id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-900/70 dark:text-white/70">
                              <Mail className="w-3 h-3 text-gray-900/40 dark:text-white/40 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{user.email}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-900/60 dark:text-white/60">
                              <Phone className="w-3 h-3 text-gray-900/40 dark:text-white/40 flex-shrink-0" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <RoleSelect
                          userId={user.id}
                          currentRole={user.role}
                          onRoleChange={handleRoleChange}
                          disabled={user.id === currentUser?.id || !canManageUsers()}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === currentUser?.id || !canManageUsers()}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                            user.isActive
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                          } ${user.id === currentUser?.id || !canManageUsers() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
                        >
                          {user.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-900/60 dark:text-white/60">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(user.createdAt), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewingUser(user)}
                            className="p-1.5 text-gray-900/40 dark:text-white/40 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManageUsers() && (
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 text-gray-900/40 dark:text-white/40 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canManageUsers() && user.id !== currentUser?.id && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete user "${user.fullName}"?`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              className="p-1.5 text-gray-900/40 dark:text-white/40 hover:text-error hover:bg-error/10 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-3 py-1.5 border-t border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-900/60 dark:text-white/60">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded text-xs focus:outline-none"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'hover:bg-white dark:hover:bg-surface-dark text-gray-900/60 dark:text-white/60'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* View User Modal */}
      {viewingUser && (
        <ViewUserModal user={viewingUser} onClose={() => setViewingUser(null)} />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal 
            user={editingUser} 
            onClose={() => setEditingUser(null)} 
            onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['users'] });
                setEditingUser(null);
            }}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-3 flex items-center gap-2">
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-[10px] text-gray-900/60 dark:text-white/60 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// Role Select Component
function RoleSelect({
  userId,
  currentRole,
  onRoleChange,
  disabled,
}: {
  userId: string;
  currentRole: UserRole;
  onRoleChange: (userId: string, newRole: UserRole) => void;
  disabled?: boolean;
}) {
  const config = roleConfig[currentRole];
  const RoleIcon = config?.icon || UserIcon;

  return (
    <div className="relative">
      <select
        value={currentRole}
        onChange={(e) => onRoleChange(userId, e.target.value as UserRole)}
        disabled={disabled}
        className={`appearance-none pl-7 pr-6 py-1 rounded-lg text-[10px] font-semibold border-0 cursor-pointer transition ${config?.bg} ${config?.color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      >
        {Object.entries(roleLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <RoleIcon className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 ${config?.color}`} />
    </div>
  );
}

// View User Modal
function ViewUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const config = roleConfig[user.role];
  const RoleIcon = config?.icon || UserIcon;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-2xl">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  user.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h2>
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold mt-1 ${config?.bg} ${config?.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  {roleLabels[user.role]}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-50 dark:hover:bg-background-dark rounded-lg transition">
                <X className="w-5 h-5 text-gray-900/60 dark:text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Mail className="w-4 h-4 text-gray-900/40 dark:text-white/40" />
                <div>
                  <p className="text-[10px] text-gray-900/40 dark:text-white/40 uppercase">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white">{user.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Phone className="w-4 h-4 text-gray-900/40 dark:text-white/40" />
                <div>
                  <p className="text-[10px] text-gray-900/40 dark:text-white/40 uppercase">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-white">{user.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-900/40 dark:text-white/40" />
                <div>
                  <p className="text-[10px] text-gray-900/40 dark:text-white/40 uppercase">Joined</p>
                  <p className="text-sm text-gray-900 dark:text-white">{format(new Date(user.createdAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {user.isActive ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-gray-400" />}
                <div>
                  <p className="text-[10px] text-gray-900/40 dark:text-white/40 uppercase">Status</p>
                  <p className={`text-sm font-medium ${user.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Create User Modal
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: UserRole.CUSTOMER,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/users', data);
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createUserMutation.mutateAsync(formData);
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMsg = Array.isArray(errorData?.message)
        ? errorData.message.join(', ')
        : errorData?.message || errorData?.error || 'Failed to create user';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-800 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New User</h2>
                  <p className="text-xs text-gray-900/50 dark:text-white/50">Create a new account</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-50 dark:hover:bg-background-dark rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-900/60 dark:text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {error && (
              <div className="mb-5 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">Failed to create user</p>
                  <p className="text-xs text-error/80 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-900/70 dark:text-white/70 mb-1">
                  Full Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full h-9 pl-10 pr-4 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-900/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              {/* Email & Phone - Two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-900/70 dark:text-white/70 mb-1">
                    Email <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-9 pl-10 pr-4 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-900/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-900/70 dark:text-white/70 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-9 pl-10 pr-4 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-900/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="+250 7XX XXX XXX"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-900/70 dark:text-white/70 mb-1">
                  Password <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-9 pl-10 pr-12 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-900/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-50 dark:hover:bg-background-dark rounded-lg transition-colors"
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4 text-gray-900/40 dark:text-white/40" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-900/40 dark:text-white/40" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-gray-900/40 dark:text-white/40 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Must be at least 6 characters
                </p>
              </div>

              {/* Role Selection - Chips */}
              <div>
                <label className="block text-xs font-semibold text-gray-900/70 dark:text-white/70 mb-3">
                  User Role <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(roleLabels).map(([value, label]) => {
                    const config = roleConfig[value as UserRole];
                    const RoleIcon = config?.icon || UserIcon;
                    const isSelected = formData.role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: value as UserRole })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? `${config?.bg} ${config?.color} border-current ring-2 ring-current/20`
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-800 text-gray-900/60 dark:text-white/60 hover:border-primary/30'
                        }`}
                      >
                        <RoleIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex gap-3">
              <Button 
                type="button" 
                onClick={onClose} 
                variant="outline" 
                className="flex-1 h-9"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                className="flex-1 h-9" 
                loading={loading} 
                loadingText="Creating..."
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Edit User Modal
function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: user.email || '',
    fullName: user.fullName || '',
    phone: user.phone || '',
    role: user.role,
    isActive: user.isActive
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.patch(`/users/${user.id}`, formData);
      onSuccess();
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm ring-2 ring-white dark:ring-gray-800">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{user.fullName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit User</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update account details</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">Failed to update user</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full h-9 pl-10 pr-4 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-9 pl-10 pr-4 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-9 pl-10 pr-4 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  User Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                   {Object.entries(roleLabels).map(([value, label]) => {
                     const config = roleConfig[value as UserRole];
                     const RoleIcon = config?.icon || UserIcon;
                     const isSelected = formData.role === value;
                     return (
                       <button
                         key={value}
                         type="button"
                         onClick={() => setFormData({...formData, role: value as UserRole})}
                         className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                           isSelected
                             ? `${config?.bg} ${config?.color} border-current ring-1 ring-current`
                             : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-800 text-gray-500 hover:border-blue-500/50'
                         }`}
                       >
                         <RoleIcon className="w-3.5 h-3.5" />
                         <span className="truncate">{label}</span>
                       </button>
                     );
                   })}
                </div>
              </div>

              {/* Active Status */}
              <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                          {formData.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                      <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Account Status</p>
                          <p className="text-[10px] text-gray-500">{formData.isActive ? 'User can log in' : 'User access disabled'}</p>
                      </div>
                  </div>
                  <button
                      type="button"
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        formData.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                  >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 mt-4">
                 <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                    Cancel
                 </Button>
                 <Button type="submit" disabled={loading || !formData.fullName || !formData.email}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Save Changes
                 </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
