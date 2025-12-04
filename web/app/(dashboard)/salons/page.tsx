'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, Edit, Trash2, MapPin, Search, Filter, MoreVertical, Building2, Phone, Mail, Globe, Users, Calendar, LayoutGrid, Table, AlertCircle, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import SalonRegistrationForm from '@/components/forms/SalonRegistrationForm';
import RoleGuard from '@/components/auth/RoleGuard';

interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  website?: string;
  status: string;
  owner: {
    id?: string;
    fullName: string;
  };
  settings?: {
    numberOfEmployees?: number;
    businessType?: string;
  };
}

export default function SalonsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const { canManageSalons, hasAnyRole, isSalonOwner } = usePermissions();
  const router = useRouter();

  // Check membership status for salon owners
  // Using shared hook for better caching and reduced API calls
  const { data: membershipStatus } = useMembershipStatus();

  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.warn('No authentication token found. Please log in.');
      }
    }
  }, [token]);

  const { data: salons, isLoading, error } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
      }
      
      try {
        const response = await api.get('/salons', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const salonsData = response.data?.data || response.data;
        return Array.isArray(salonsData) ? salonsData : [];
      } catch (err: any) {
        const errorData = err.response?.data;
        const errorMsg = Array.isArray(errorData?.message) 
          ? errorData.message.join(', ')
          : errorData?.message || errorData?.error || err.message;
        
        console.error('Error fetching salons:', {
          status: err.response?.status,
          message: errorMsg,
        });
        
        if (err.response?.status === 401 || err.message?.includes('token')) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return [];
          }
        }
        
        return [];
      }
    },
    retry: false,
    enabled: !!token || (typeof window !== 'undefined' && !!localStorage.getItem('token')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/salons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salons'] });
    },
  });

  // Filter salons
  const filteredSalons = salons?.filter((salon) => {
    const matchesSearch = 
      salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salon.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salon.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salon.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || salon.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading salons...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorData = (error as any)?.response?.data;
    const statusCode = (error as any)?.response?.status;
    let errorMessage = 'Unknown error';
    if (Array.isArray(errorData?.message)) {
      errorMessage = errorData.message.join(', ');
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if ((error as any)?.message) {
      errorMessage = (error as any).message;
    }
    
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-danger rounded-2xl p-6">
          <p className="text-danger font-semibold mb-2">Error loading salons</p>
          <p className="text-text-light/60 dark:text-text-dark/60 text-sm">
            {statusCode ? `Status ${statusCode}: ` : ''}{errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // Check if salon owner needs membership (but don't block the page, just show a banner)
  const needsMembership = isSalonOwner() && membershipStatus && !membershipStatus.isMember;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Membership Warning Banner */}
      {needsMembership && (
        <div className="mb-6 bg-warning/10 border border-warning rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">
                Membership Required to Add Salons
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
                You need to be an approved member of the association to add salons.{' '}
                {membershipStatus?.application?.status === 'pending' 
                  ? 'Your application is currently under review.'
                  : membershipStatus?.application?.status === 'rejected'
                  ? 'Your previous application was rejected. Please apply again.'
                  : 'Please apply for membership first.'}
              </p>
              <div className="flex gap-3">
                {membershipStatus?.application?.status !== 'pending' && (
                  <Button onClick={() => router.push('/membership/apply')} variant="primary" className="text-sm">
                    Apply for Membership
                  </Button>
                )}
                <Button onClick={() => router.push('/membership/status')} variant="secondary" className="text-sm">
                  Check Application Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">Salons</h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Manage and monitor salon businesses
            </p>
          </div>
          <RoleGuard
            requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}
          >
            <Button
              onClick={() => {
                // Check membership before opening modal for salon owners
                if (isSalonOwner() && membershipStatus && !membershipStatus.isMember) {
                  alert('You need to be an approved member to add salons. Please apply for membership first.');
                  return;
                }
                setEditingSalon(null);
                setShowModal(true);
              }}
              variant="primary"
            >
              <Plus className="w-5 h-5" />
              Add Salon
            </Button>
          </RoleGuard>
        </div>

        {/* Search, Filter, and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search salons by name, location, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'cards'
                  ? 'bg-primary text-white'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
              title="Table View"
            >
              <Table className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Total Salons</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{salons?.length || 0}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Active</p>
          <p className="text-2xl font-bold text-success">
            {salons?.filter(s => s.status === 'active').length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Pending</p>
          <p className="text-2xl font-bold text-warning">
            {salons?.filter(s => s.status === 'pending').length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-text-light/60 dark:text-text-dark/60">
            {salons?.filter(s => s.status === 'inactive').length || 0}
          </p>
        </div>
      </div>

      {/* Salons View */}
      {filteredSalons.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No salons match your filters' : 'No salons found'}
          </p>
          <p className="text-text-light/40 dark:text-text-dark/40 text-sm mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first salon to get started'}
          </p>
          {(!searchQuery && statusFilter === 'all') && (
            <RoleGuard
              requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}
            >
              <Button
                onClick={() => {
                  setEditingSalon(null);
                  setShowModal(true);
                }}
                variant="primary"
              >
                <Plus className="w-5 h-5" />
                Add Your First Salon
              </Button>
            </RoleGuard>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              onEdit={() => {
                setEditingSalon(salon);
                setShowModal(true);
              }}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this salon?')) {
                  deleteMutation.mutate(salon.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <SalonsTable
          salons={filteredSalons}
          onEdit={(salon) => {
            setEditingSalon(salon);
            setShowModal(true);
          }}
          onDelete={(id) => {
            if (confirm('Are you sure you want to delete this salon?')) {
              deleteMutation.mutate(id);
            }
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <SalonRegistrationForm
          salon={editingSalon}
          onClose={() => {
            setShowModal(false);
            setEditingSalon(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['salons'] });
            setShowModal(false);
            setEditingSalon(null);
          }}
        />
      )}
    </div>
  );
}

function SalonCard({
  salon,
  onEdit,
  onDelete,
}: {
  salon: Salon;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { canManageSalons, user, hasAnyRole } = usePermissions();
  
  // Check if user can edit/delete this salon
  const canEdit = canManageSalons() && (
    hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) ||
    (user?.id === salon.owner?.id) // Salon owner can edit their own salon
  );
  const canDelete = hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]);

  const statusColors = {
    active: 'bg-success/20 text-success border-success/30',
    inactive: 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark',
    pending: 'bg-warning/20 text-warning border-warning/30',
  };

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 overflow-hidden">
      {/* Gradient Background on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/salons/${salon.id}`}
                  className="block hover:text-primary transition"
                >
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark truncate">
                    {salon.name}
                  </h3>
                </Link>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  {salon.owner?.fullName}
                </p>
              </div>
            </div>
          </div>
          
          {/* Menu Button */}
          {(canEdit || canDelete) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
              >
                <MoreVertical className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
              
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl z-20 overflow-hidden">
                    {canEdit && (
                      <button
                        onClick={() => {
                          onEdit();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          onDelete();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-background-light dark:hover:bg-background-dark transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${
              statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive
            }`}
          >
            {salon.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80 truncate">
              {salon.city}, {salon.district}
            </span>
          </div>
          
          {salon.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-text-light/80 dark:text-text-dark/80">{salon.phone}</span>
            </div>
          )}
          
          {salon.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-text-light/80 dark:text-text-dark/80 truncate">{salon.email}</span>
            </div>
          )}
          
          {salon.website && (
            <div className="flex items-center gap-3 text-sm">
              <Globe className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <a
                href={salon.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {salon.website}
              </a>
            </div>
          )}

          {salon.settings?.numberOfEmployees && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-text-light/80 dark:text-text-dark/80">
                {salon.settings.numberOfEmployees} employees
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex gap-2">
          {canManageSalons() && (
            <Link
              href={`/salons/${salon.id}/employees`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-sm font-medium transition"
            >
              <UserPlus className="w-4 h-4" />
              Employees
            </Link>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-sm font-medium transition"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-background-light dark:bg-background-dark hover:bg-danger/10 text-danger rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonsTable({
  salons,
  onEdit,
  onDelete,
}: {
  salons: Salon[];
  onEdit: (salon: Salon) => void;
  onDelete: (id: string) => void;
}) {
  const { canManageSalons, user, hasAnyRole } = usePermissions();
  
  const statusColors = {
    active: 'bg-success/20 text-success border-success/30',
    inactive: 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark',
    pending: 'bg-warning/20 text-warning border-warning/30',
  };

  const canEditSalon = (salon: Salon) => {
    return canManageSalons() && (
      hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) ||
      (user?.id === salon.owner?.id)
    );
  };

  const canDeleteSalon = () => {
    return hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                Salon Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                Contact
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
            {salons.map((salon) => (
              <tr
                key={salon.id}
                className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {salon.name}
                      </div>
                      {salon.settings?.businessType && (
                        <div className="text-xs text-text-light/60 dark:text-text-dark/60 capitalize">
                          {salon.settings.businessType.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-light dark:text-text-dark">
                    {salon.owner?.fullName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
                    <MapPin className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                    <div>
                      <div className="text-text-light dark:text-text-dark">{salon.city}</div>
                      <div className="text-xs text-text-light/60 dark:text-text-dark/60">{salon.district}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {salon.phone && (
                      <div className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                        <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                        {salon.phone}
                      </div>
                    )}
                    {salon.email && (
                      <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
                        <Mail className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                        <span className="truncate max-w-[200px]">{salon.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${
                      statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive
                    }`}
                  >
                    {salon.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEditSalon(salon) && (
                      <button
                        onClick={() => onEdit(salon)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteSalon() && (
                      <button
                        onClick={() => onDelete(salon.id)}
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
  );
}

