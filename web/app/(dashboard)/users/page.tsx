'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Search, Filter, User as UserIcon, Shield, Building2, Users, Mail, Phone, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import RoleGuard from '@/components/auth/RoleGuard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const roleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ASSOCIATION_ADMIN]: 'Association Admin',
  [UserRole.DISTRICT_LEADER]: 'District Leader',
  [UserRole.SALON_OWNER]: 'Salon Owner',
  [UserRole.SALON_EMPLOYEE]: 'Salon Employee',
  [UserRole.CUSTOMER]: 'Customer',
};

const roleColors: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  [UserRole.ASSOCIATION_ADMIN]: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  [UserRole.DISTRICT_LEADER]: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  [UserRole.SALON_OWNER]: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  [UserRole.SALON_EMPLOYEE]: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  [UserRole.CUSTOMER]: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { canManageUsers } = usePermissions();

  const { data: users, isLoading, error } = useQuery<User[]>({
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
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data: { role: newRole },
      });
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive },
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-danger rounded-2xl p-6">
          <p className="text-danger font-semibold mb-2">Error loading users</p>
          <p className="text-text-light/60 dark:text-text-dark/60 text-sm">
            {(error as any)?.response?.data?.message || 'Failed to load users'}
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
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">Users</h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Manage users and assign roles
            </p>
          </div>
          <RoleGuard requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
            <Button
              onClick={() => {
                setEditingUser(null);
                setShowCreateModal(true);
              }}
              variant="primary"
            >
              <Plus className="w-5 h-5" />
              Create User
            </Button>
          </RoleGuard>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-4 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{users?.length || 0}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Active</p>
          <p className="text-2xl font-bold text-success">
            {users?.filter(u => u.isActive).length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Admins</p>
          <p className="text-2xl font-bold text-primary">
            {users?.filter(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ASSOCIATION_ADMIN).length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Salon Owners</p>
          <p className="text-2xl font-bold text-warning">
            {users?.filter(u => u.role === UserRole.SALON_OWNER).length || 0}
          </p>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-12 text-center">
          <UserIcon className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium mb-2">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users match your filters' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Role
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
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-light dark:text-text-dark">
                            {user.fullName}
                          </div>
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                            <Mail className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
                            <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleSelect
                        userId={user.id}
                        currentRole={user.role}
                        onRoleChange={handleRoleChange}
                        disabled={user.id === currentUser?.id || !canManageUsers()}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={user.id === currentUser?.id || !canManageUsers()}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                          user.isActive
                            ? 'bg-success/20 text-success border-success/30'
                            : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark'
                        } ${user.id === currentUser?.id || !canManageUsers() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                      >
                        {user.isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManageUsers() && user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete user "${user.fullName}"?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowCreateModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

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
  return (
    <select
      value={currentRole}
      onChange={(e) => onRoleChange(userId, e.target.value as UserRole)}
      disabled={disabled}
      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition appearance-none cursor-pointer ${
        roleColors[currentRole]
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
    >
      {Object.entries(roleLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: UserRole.CUSTOMER,
  });
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
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Create User</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
              >
                <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-xl text-danger text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light/80 dark:text-text-dark/80 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
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
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

