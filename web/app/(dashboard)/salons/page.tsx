'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { clearAllSessionData } from '@/lib/auth';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Phone,
  Mail,
  Globe,
  Users,
  LayoutGrid,
  Table,
  UserPlus,
  Eye,
  Scissors,
  Sparkles,
  Heart,
  Star,
  Car,
  User,
  Clock,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { format, isWithinInterval, parse } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import SalonRegistrationForm from '@/components/forms/SalonRegistrationForm';
import RoleGuard from '@/components/auth/RoleGuard';

import { Salon } from '@/types/models';

export default function SalonsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { isSalonOwner, canManageSalons, canViewAllSalons, hasAnyRole, user } = usePermissions();
  const router = useRouter();

  const statusColors: Record<string, string> = {
    active: 'bg-success/20 text-success border-success/30',
    inactive:
      'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark',
    pending: 'bg-warning/20 text-warning border-warning/30',
  };

  const canEditSalon = (salon: Salon) => {
    return (
      canManageSalons() &&
      (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) ||
        user?.id === salon.ownerId ||
        user?.id === salon.owner?.id)
    );
  };

  const canDeleteSalon = () => {
    return hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]);
  };

  // Check membership status for salon owners
  // Using shared hook for better caching and reduced API calls
  const { data: membershipStatus } = useMembershipStatus();

  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        // No token found - user will be redirected by auth guard
      }
    }
  }, [token]);

  const {
    data: salons,
    isLoading,
    error,
  } = useQuery<Salon[]>({
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
      } catch (err: unknown) {
        if (
          (err as { response?: { status?: number } }).response?.status === 401 ||
          (err as Error).message?.includes('token')
        ) {
          if (typeof window !== 'undefined') {
            // Session expired - clear all localStorage data
            clearAllSessionData();
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
  const filteredSalons =
    salons?.filter((salon) => {
      // Role-based filtering: Non-admin users (like salon owners) should only see their own salons
      const canViewAll = canViewAllSalons();
      const isOwner =
        salon.ownerId === user?.id ||
        salon.owner?.id === user?.id;

      if (!canViewAll && !isOwner) {
        return false;
      }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading salons...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorData = (
      error as { response?: { data?: { message?: string | string[]; error?: string } } }
    )?.response?.data;
    const statusCode = (error as { response?: { status?: number } })?.response?.status;
    let errorMessage = 'Unknown error';
    if (Array.isArray(errorData?.message)) {
      errorMessage = errorData.message.join(', ');
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if ((error as Error)?.message) {
      errorMessage = (error as Error).message;
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-danger rounded-xl p-4">
          <p className="text-danger font-semibold text-sm mb-1">Error loading salons</p>
          <p className="text-text-light/60 dark:text-text-dark/60 text-xs">
            {statusCode ? `Status ${statusCode}: ` : ''}
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // Check if salon owner needs membership (but don't block the page, just show a banner)
  const needsMembership = isSalonOwner() && membershipStatus && !membershipStatus.isMember;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Membership Status Banners */}
      {isSalonOwner() && membershipStatus && (
        <>
          {/* No membership application */}
          {!membershipStatus.application && (
            <div className="mb-6 bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-primary font-semibold text-sm mb-1">Membership Required</p>
                <p className="text-xs text-primary/80">
                  You must apply for membership before you can add a salon.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => router.push('/membership/apply')}>
                Apply for Membership
              </Button>
            </div>
          )}

          {/* Membership application pending */}
          {membershipStatus.application?.status === 'pending' && (
            <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-warning font-semibold text-sm mb-1">Application Pending</p>
                <p className="text-xs text-warning/80">
                  Your membership application is being reviewed. You&apos;ll be notified once
                  it&apos;s approved.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/membership/status')}
              >
                View Status
              </Button>
            </div>
          )}

          {/* Membership application rejected */}
          {membershipStatus.application?.status === 'rejected' && (
            <div className="mb-6 bg-danger/10 border border-danger/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-danger font-semibold text-sm mb-1">Application Not Approved</p>
                <p className="text-xs text-danger/80">
                  Your membership application was not approved. You can re-apply with updated
                  information.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => router.push('/membership/apply')}>
                Apply Again
              </Button>
            </div>
          )}
        </>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Salons</h1>
          <p className="text-sm text-gray-900/60 dark:text-white/60 mt-0.5">
            Manage and monitor salon businesses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['salons'] })} className="h-9">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <RoleGuard
            requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}
          >
            <Button
              onClick={() => {
                if (isSalonOwner() && membershipStatus && !membershipStatus.isMember) {
                  alert(
                    'You must apply for membership and wait for approval before adding a salon.'
                  );
                  return;
                }
                setEditingSalon(null);
                setShowModal(true);
              }}
              variant="primary"
              size="sm"
              className="h-9"
              disabled={isSalonOwner() && membershipStatus && !membershipStatus.isMember}
              title={
                isSalonOwner() && membershipStatus && !membershipStatus.isMember
                  ? 'Apply for membership and wait for approval to add a salon.'
                  : ''
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Salon
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
        <StatCard label="Total Salons" value={salons?.length || 0} icon={Building2} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="Active Salons" value={salons?.filter((s) => s.status === 'active').length || 0} icon={Check} color="text-green-600" bg="bg-green-500/10" />
        <StatCard label="Pending Approval" value={salons?.filter((s) => s.status === 'pending').length || 0} icon={Clock} color="text-warning" bg="bg-warning/10" />
        <StatCard label="Inactive" value={salons?.filter((s) => s.status === 'inactive').length || 0} icon={X} color="text-gray-600" bg="bg-gray-500/10" />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-950 rounded-xl p-0 mb-3">
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search salons by name, city, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-900/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg">
               {['all', 'active', 'pending', 'inactive'].map((status) => (
                 <button
                   key={status}
                   onClick={() => setStatusFilter(status)}
                   className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                     statusFilter === status
                       ? 'bg-primary text-white shadow-sm'
                       : 'text-gray-900/40 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'
                   }`}
                 >
                   {status}
                 </button>
               ))}
             </div>

             <div className="h-9 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1 hidden lg:block" />

             {/* View Toggle */}
             <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-1 h-9">
               <button
                 onClick={() => setViewMode('cards')}
                 className={`p-1 rounded-md transition ${
                   viewMode === 'cards'
                     ? 'bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-gray-200 dark:ring-gray-700'
                     : 'text-gray-900/40 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'
                 }`}
                 title="Card View"
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setViewMode('table')}
                 className={`p-1 rounded-md transition ${
                   viewMode === 'table'
                     ? 'bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-gray-200 dark:ring-gray-700'
                     : 'text-gray-900/40 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'
                 }`}
                 title="Table View"
               >
                 <Table className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Salons View */}
      {filteredSalons.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-sm font-medium mb-1">
            {searchQuery || statusFilter !== 'all'
              ? 'No salons match your filters'
              : 'No salons found'}
          </p>
          <p className="text-text-light/40 dark:text-text-dark/40 text-xs mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : isSalonOwner() && membershipStatus && !membershipStatus.isMember
                ? 'Complete membership to create your first salon'
                : 'Create your first salon to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <RoleGuard
              requiredRoles={[
                UserRole.SUPER_ADMIN,
                UserRole.ASSOCIATION_ADMIN,
                UserRole.SALON_OWNER,
              ]}
            >
              {/* Only show button if salon owner has approved membership OR user is admin */}
              {!isSalonOwner() || (membershipStatus && membershipStatus.isMember) ? (
                <Button
                  onClick={() => {
                    setEditingSalon(null);
                    setShowModal(true);
                  }}
                  variant="primary"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Salon
                </Button>
              ) : null}
            </RoleGuard>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => (
            <SalonCard
              key={salon.id}
              salon={salon}
              statusColors={statusColors}
              canEdit={canEditSalon(salon)}
              canDelete={canDeleteSalon()}
              canManageSalons={canManageSalons}
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
          statusColors={statusColors}
          canManageSalons={canManageSalons}
          canEditSalon={canEditSalon}
          canDeleteSalon={canDeleteSalon}
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

const BUSINESS_ICONS: Record<string, any> = {
  hair_salon: Scissors,
  beauty_spa: Sparkles,
  nail_salon: Heart,
  barbershop: Scissors,
  full_service: Star,
  mobile: Car,
};

const CLIENTELE_ICONS: Record<string, any> = {
  men: User,
  women: User,
  both: Users,
};

function isSalonOpen(operatingHours?: string): boolean {
  if (!operatingHours) return false;
  try {
    const hours = JSON.parse(operatingHours);
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = hours[day];

    if (!todayHours || !todayHours.isOpen) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    return currentTime >= openTime && currentTime <= closeTime;
  } catch {
    return false;
  }
}

function SalonCard({
  salon,
  statusColors,
  canManageSalons,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  salon: Salon;
  statusColors: Record<string, string>;
  canManageSalons: () => boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden">
      {/* Gradient Background on Hover */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-primary/5 dark:bg-primary/10 flex items-center justify-center relative">
                {salon.images?.[0] || salon.image ? (
                  <img
                    src={salon.images?.[0] || salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/salons/${salon.id}`}
                  className="block hover:text-primary transition group"
                >
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate group-hover:text-primary">
                    {salon.name}
                  </h3>
                </Link>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">
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
                className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded-md transition"
              >
                <MoreVertical className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowMenu(false);
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label="Close menu"
                  />
                  <div className="absolute right-0 mt-1 w-36 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-xl z-20 overflow-hidden">
                    <Link
                      href={`/salons/${salon.id}`}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                      onClick={() => setShowMenu(false)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => {
                          onEdit();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          onDelete();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-background-light dark:hover:bg-background-dark transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status & Open Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
              statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive
            }`}
          >
            {salon.status}
          </span>
          {isSalonOpen(salon.settings?.operatingHours) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-success/10 text-success border-success/20">
              <Clock className="w-3 h-3" />
              Open Now
            </span>
          )}
        </div>

        {/* Business Types & Clientele */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {salon.settings?.businessTypes?.slice(0, 3).map((type) => {
            const Icon = BUSINESS_ICONS[type] || Star;
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-[10px] font-medium text-text-light/80 dark:text-text-dark/80"
              >
                <Icon className="w-3 h-3 text-primary" />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </span>
            );
          })}
          {/* Fallback for single businessType */}
          {!salon.settings?.businessTypes && salon.settings?.businessType && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-[10px] font-medium text-text-light/80 dark:text-text-dark/80">
              <Star className="w-3 h-3 text-primary" />
              <span className="capitalize">{salon.settings.businessType.replace('_', ' ')}</span>
            </span>
          )}

          {salon.settings?.targetClientele && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-[10px] font-medium text-text-light/80 dark:text-text-dark/80">
              {(() => {
                const Icon = CLIENTELE_ICONS[salon.settings.targetClientele] || Users;
                return <Icon className="w-3 h-3 text-secondary" />;
              })()}
              <span className="capitalize">{salon.settings.targetClientele}</span>
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80 truncate">
              {salon.city}, {salon.district}
            </span>
          </div>

          {salon.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-text-light/80 dark:text-text-dark/80">{salon.phone}</span>
            </div>
          )}

          {salon.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-text-light/80 dark:text-text-dark/80 truncate">
                {salon.email}
              </span>
            </div>
          )}

          {salon.website && (
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
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

          <div className="flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
            <span className="text-text-light/80 dark:text-text-dark/80">
              {salon.employeeCount ?? 0}{' '}
              {(salon.employeeCount ?? 0) === 1 ? 'employee' : 'employees'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark flex gap-1.5">
          <Link
            href={`/salons/${salon.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-xs font-medium transition"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
          {canManageSalons() && (
            <>
              <Link
                href={`/salons/${salon.id}/customers`}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-xs font-medium transition"
              >
                <Users className="w-3.5 h-3.5" />
                Cust.
              </Link>
              <Link
                href={`/salons/${salon.id}/employees`}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg text-xs font-medium transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Staff
              </Link>
            </>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="px-2 py-1.5 bg-background-light dark:bg-background-dark hover:bg-primary/10 text-primary rounded-lg transition"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="px-2 py-1.5 bg-background-light dark:bg-background-dark hover:bg-danger/10 text-danger rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonsTable({
  salons,
  statusColors,
  canManageSalons,
  canEditSalon,
  canDeleteSalon,
  onEdit,
  onDelete,
}: {
  salons: Salon[];
  statusColors: Record<string, string>;
  canManageSalons: () => boolean;
  canEditSalon: (salon: Salon) => boolean;
  canDeleteSalon: () => boolean;
  onEdit: (salon: Salon) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Salon
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Type & Clientele
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {salons.map((salon) => (
              <tr key={salon.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-primary flex items-center justify-center text-white ring-1 ring-gray-200 dark:ring-gray-800">
                      {salon.images?.[0] || salon.image ? (
                        <img
                          src={salon.images?.[0] || salon.image}
                          alt={salon.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/salons/${salon.id}`}
                        className="text-sm font-bold text-gray-900 dark:text-white hover:text-primary transition"
                      >
                        {salon.name}
                      </Link>
                      <div className="text-xs text-gray-500 font-medium">
                        {salon.owner?.fullName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {salon.settings?.businessTypes?.slice(0, 2).map((type) => {
                      const Icon = BUSINESS_ICONS[type] || Star;
                      return (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-white/80 uppercase"
                        >
                          <Icon className="w-3 h-3 text-primary" />
                          <span>{type.replace('_', ' ')}</span>
                        </span>
                      );
                    })}
                    {salon.settings?.targetClientele && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-white/80 uppercase">
                        <User className="w-3 h-3 text-secondary" />
                        <span>{salon.settings.targetClientele}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-white/80">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold">{salon.city}</div>
                      <div className="text-[10px] text-gray-500">{salon.district}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="space-y-0.5">
                    {salon.phone && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {salon.phone}
                      </div>
                    )}
                    {salon.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[140px]">{salon.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        statusColors[salon.status as keyof typeof statusColors] ||
                        statusColors.inactive
                      }`}
                    >
                      {salon.status}
                    </span>
                    {isSalonOpen(salon.settings?.operatingHours) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 uppercase">
                        <Clock className="w-3 h-3" />
                        Open
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/salons/${salon.id}`}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {canEditSalon(salon) && (
                      <button
                        onClick={() => onEdit(salon)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canManageSalons() && (
                      <Link
                        href={`/salons/${salon.id}/customers`}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                        title="View Customers"
                      >
                        <Users className="w-4 h-4" />
                      </Link>
                    )}
                    {canDeleteSalon() && (
                      <button
                        onClick={() => onDelete(salon.id)}
                        className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition"
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
