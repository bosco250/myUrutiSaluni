'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Plus,
  Scissors,
  Edit,
  Trash2,
  Search,
  Filter,
  Clock,
  DollarSign,
  XCircle,
  Upload,
  Tag,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { canViewAllSalons } from '@/lib/permissions';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Service {
  id: string;
  salonId: string;
  code?: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  isActive: boolean;
  imageUrl?: string;
  images?: string[];
  category?: string;
  targetGender?: string;
  salon?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Salon {
  id: string;
  name: string;
}

export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <ServicesContent />
    </div>
  );
}

function ServicesContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');
  
  // Resolve image URLs
  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) {
      // If the URL contains localhost but we are accessing via IP, translate it
      if (
        url.includes('localhost') && 
        typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost')
      ) {
        const port = url.split(':').pop()?.split('/')[0];
        return `http://${window.location.hostname}:${port || '4000'}${url.split(port || '4000')[1]}`;
      }
      return url;
    }
    
    // Handle relative paths
    const apiBase = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://161.97.148.53:4000';
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        const salonsData = response.data?.data || response.data || [];
        const allSalons = Array.isArray(salonsData) ? salonsData : [];

        // If user can view all salons (Admin/District Leader), return all
        if (canViewAllSalons(user?.role)) {
          return allSalons;
        }

        // Otherwise, filter to only salons owned by the user
        return allSalons.filter((s: any) => 
          s.ownerId === user?.id || s.owner?.id === user?.id
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
  });

  // Check if user can view all salons (admin)
  const canViewAll = canViewAllSalons(user?.role);

  // Auto-select first salon if only one or if none selected (but not for admins)
  useEffect(() => {
    if (!salonsLoading && salons.length > 0 && !canViewAll) {
      // If only one salon, always select it
      if (salons.length === 1) {
        if (selectedSalonId !== salons[0].id) {
          setSelectedSalonId(salons[0].id);
        }
      }
      // If no salon selected but salons exist, select the first one
      else if (!selectedSalonId) {
        setSelectedSalonId(salons[0].id);
      }
    }
    // For admins, don't auto-select - let them choose "All Salons"
  }, [salons, selectedSalonId, salonsLoading, canViewAll]);

  // Fetch services - only for selected salon or all owned salons (or all salons for admins)
  const servicesQueryKey = ['services', selectedSalonId || (canViewAll ? 'all' : 'all-owned'), user?.id];
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: servicesQueryKey,
    queryFn: async (): Promise<Service[]> => {
      if (!user) {
        return [];
      }
      try {
        // Build query params
        const params: any = {};
        
        if (selectedSalonId) {
          params.salonId = selectedSalonId;
        } else if (!canViewAll) {
          // If no specific salon selected and not an admin, we still need to filter by the user's salons
          // In some backends, this is handled automatically if salonId is omitted, 
          // but we ensure consistency here.
          const ownedSalonIds = salons.map(s => s.id);
          if (ownedSalonIds.length > 0) {
            // For now, if no salon selected, let the backend handle the 'all owned' case
            // or we could potentially fetch them one by one (less efficient).
            // We'll stick to the current backend behavior but make it safer.
          }
        }

        const response = await api.get('/services', { params });
        const data = response.data?.data || response.data;
        // Ensure we always return an array
        let servicesArray = Array.isArray(data) ? data : [];

        // Extra safety: for non-admins, ensure the services returned belong to their salons
        if (!canViewAll && !selectedSalonId && salons.length > 0) {
          const ownedSalonIds = new Set(salons.map(s => s.id));
          servicesArray = servicesArray.filter(s => ownedSalonIds.has(s.salonId));
        }

        return servicesArray;
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && (salons.length > 0 || canViewAll) && !salonsLoading,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      // Invalidate all service queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['services'] });
      // Also invalidate the specific query for the selected salon
      queryClient.invalidateQueries({ queryKey: servicesQueryKey });
      // Force refetch
      queryClient.refetchQueries({ queryKey: servicesQueryKey });
      
      success('Service deleted successfully');
      setDeleteConfirmation(null);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to delete service');
    }
  });

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        searchQuery === '' ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && service.isActive) ||
        (statusFilter === 'inactive' && !service.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedSalonId]);

  // Pagination Logic
  const totalItems = filteredServices.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentServices = filteredServices.slice(startIndex, endIndex);

  // Stats
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const inactive = services.filter((s) => !s.isActive).length;
    const avgPrice =
      services.length > 0 ? services.reduce((sum, s) => sum + s.basePrice, 0) / services.length : 0;
    const avgDuration =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.durationMinutes, 0) / services.length
        : 0;

    return { total, active, inactive, avgPrice, avgDuration };
  }, [services]);

  if (servicesLoading || salonsLoading) {
    return (
      <>
        <div className="mb-8">
          <Skeleton variant="text" width={300} height={40} className="mb-2" />
          <Skeleton variant="text" width={400} height={20} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4"
            >
              <Skeleton variant="text" width={80} height={16} className="mb-2" />
              <Skeleton variant="text" width={60} height={32} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  // Show message if user has no salons (but not for admins who can view all)
  if (!salonsLoading && salons.length === 0 && !canViewAll) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
          <EmptyState
            icon={<Scissors className="w-16 h-16" />}
            title="No Salons Found"
            description="You need to create a salon before you can add services. Please create a salon first."
            action={
              <Button onClick={() => (window.location.href = '/salons')}>Go to Salons</Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Services</h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Manage salon services and offerings
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingService(null);
              setShowModal(true);
            }}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </Button>
        </div>

        {/* Stats Grid - Compacted & Flat */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Total Services */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Total Services</p>
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
                <Scissors className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-text-light dark:text-text-dark leading-tight">{stats.total}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">All salon offerings</span>
            </div>
          </div>

          {/* Active Services */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Active</p>
              <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-text-light dark:text-text-dark leading-tight">{stats.active}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 font-medium">Currently bookable</span>
            </div>
          </div>

          {/* Avg Price */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-violet-200 dark:border-violet-800/50 rounded-xl p-3 hover:border-violet-300 dark:hover:border-violet-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-violet-600 dark:text-violet-400">Avg. Price</p>
              <div className="p-1 bg-violet-100 dark:bg-violet-900/30 rounded-md group-hover:scale-110 transition-transform">
                <DollarSign className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-text-light dark:text-text-dark leading-tight">
              {Math.round(stats.avgPrice).toLocaleString()} <span className="text-[10px] font-normal opacity-50">RWF</span>
            </p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">Base service average</span>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 hover:border-amber-300 dark:hover:border-amber-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-amber-600 dark:text-amber-400">Avg. Time</p>
              <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-md group-hover:scale-110 transition-transform">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-text-light dark:text-text-dark leading-tight">
              {Math.round(stats.avgDuration)} <span className="text-[10px] font-normal opacity-50">MIN</span>
            </p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">Per appointment</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {(salons.length > 1 || canViewAll) && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
              >
                <option value="">{canViewAll ? 'All Salons' : 'Select Salon'}</option>
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search services by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services List - Compact & Visual */}
      {filteredServices.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl">
          <EmptyState
            icon={<Scissors className="w-16 h-16" />}
            title={services.length === 0 ? 'No services yet' : 'No services found'}
            description={
              services.length === 0
                ? 'Add your first service to get started. Services can be booked as appointments and added to sales.'
                : 'Try adjusting your search or filter criteria.'
            }
            action={
              services.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setShowModal(true);
                  }}
                >
                  <Plus className="w-5 h-5" />
                  Add First Service
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Service
                  </th>
                   <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Code
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Duration
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Price
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Status
                  </th>
                  {(salons.length > 1 || canViewAll) && (
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                      Salon
                    </th>
                  )}
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {currentServices.map((service) => (
                  <tr
                    key={service.id}
                    className="group hover:bg-background-light dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Service Name & Image */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-accent-light dark:bg-surface-accent-dark border border-border-light dark:border-border-dark flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {service.imageUrl || (service.images && service.images.length > 0) ? (
                             // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={getImageUrl(service.imageUrl || service.images?.[0])} 
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Scissors className="w-3 h-3 text-text-light/30 dark:text-text-dark/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-text-light dark:text-text-dark truncate">
                            {service.name}
                          </div>
                          {service.category && (
                            <div className="text-[9px] uppercase font-bold text-primary/60 dark:text-primary/40 tracking-tight">
                              {service.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-3 py-2.5">
                       <span className="font-mono text-[10px] text-text-light/60 dark:text-text-dark/60">
                         {service.code || '—'}
                       </span>
                    </td>

                    {/* Duration */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-text-light/80 dark:text-text-dark/80">
                        <Clock className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                        <span className="font-bold tabular-nums">{service.durationMinutes}m</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-text-light dark:text-text-dark tabular-nums">
                        {service.basePrice.toLocaleString()} <span className="text-[9px] font-normal text-text-light/40">RWF</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                       <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${
                          service.isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-text-light/5 text-text-light/50 dark:bg-text-dark/5 dark:text-text-dark/50'
                       }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>

                    {/* Salon (If multiple) */}
                    {(salons.length > 1 || canViewAll) && (
                      <td className="px-3 py-2.5 text-[10px] text-text-light/50 dark:text-text-dark/50 font-medium">
                        {service.salon?.name || '-'}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setShowModal(true);
                          }}
                          className="h-7 w-7 flex items-center justify-center text-text-light/40 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(service)}
                          className="h-7 w-7 flex items-center justify-center text-text-light/40 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="px-4 py-3 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between">
              <div className="text-xs text-text-light/50 dark:text-text-dark/50">
                Showing <span className="font-medium text-text-light dark:text-text-dark">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-text-light dark:text-text-dark">{endIndex}</span> of{' '}
                <span className="font-medium text-text-light dark:text-text-dark">{totalItems}</span> results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:text-primary hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-light/60 disabled:hover:border-border-light transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                 <div className="text-xs font-medium text-text-light dark:text-text-dark">
                    Page {currentPage} of {totalPages}
                 </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:text-primary hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-light/60 disabled:hover:border-border-light transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Modal */}
      {showModal && (
        <ServiceModal
          service={editingService}
          salons={salons}
          defaultSalonId={selectedSalonId}
          getImageUrl={getImageUrl}
          onClose={() => {
            setShowModal(false);
            setEditingService(null);
          }}
          onSuccess={() => {
            // Invalidate all service queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['services'] });
            // Also invalidate the specific query for the selected salon
            queryClient.invalidateQueries({ queryKey: servicesQueryKey });
            // Force refetch
            queryClient.refetchQueries({ queryKey: servicesQueryKey });
            
            success(editingService ? 'Service updated successfully' : 'Service created successfully');
            setShowModal(false);
            setEditingService(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          if (deleteConfirmation) {
            deleteMutation.mutate(deleteConfirmation.id);
          }
        }}
        title="Delete Service"
        message={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={deleteMutation.isPending}
      />
    </>
  );
}

function ServiceModal({
  service,
  salons,
  onClose,
  onSuccess,
  getImageUrl,
  defaultSalonId,
}: {
  service?: Service | null;
  salons: Salon[];
  onSuccess: () => void;
  onClose: () => void;
  getImageUrl: (url?: string) => string;
  defaultSalonId?: string;
}) {
  // Initialize images array from service data correctly
  const initialImages = useMemo(() => {
    if (!service) return [];
    
    const urls: string[] = [];
    
    // Add primary image if exists
    if (service.imageUrl) {
      urls.push(service.imageUrl);
    }
    
    // Add other images if they exist and aren't duplicates
    if (service.images && Array.isArray(service.images)) {
      service.images.forEach(img => {
        if (img && !urls.includes(img)) {
          urls.push(img);
        }
      });
    }
    
    return urls;
  }, [service]);
  
  const [formData, setFormData] = useState({
    salonId: service?.salonId || defaultSalonId || salons[0]?.id || '',
    code: service?.code || '',
    name: service?.name || '',
    description: service?.description || '',
    durationMinutes: service?.durationMinutes || 30,
    basePrice: service?.basePrice ?? '',
    isActive: service?.isActive ?? true,
    category: service?.category || '',
    targetGender: service?.targetGender || 'all',
  });
  const [imageUrls, setImageUrls] = useState<string[]>(initialImages);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep state in sync with prop changes
  useEffect(() => {
    setImageUrls(initialImages);
  }, [initialImages]);
  
  const MAX_IMAGES = 5;

  const mutation = useMutation({
    mutationFn: async (data: typeof formData & { imageUrl: string; images: string[] }) => {
      if (service) {
        const response = await api.patch(`/services/${service.id}`, data);
        return response;
      } else {
        const response = await api.post('/services', data);
        return response;
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to save service'
      );
      setLoading(false);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check max images limit
    if (imageUrls.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    // Validate size (10MB limit matching backend)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size too large. Max 10MB.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await api.post('/uploads/service', uploadFormData, {
        headers: { 'Content-Type': undefined },
      });

      const resData = response.data;
      const fileRef = resData?.url || resData?.id || resData?.data?.url || resData?.data?.id;

      if (fileRef) {
        const finalUrl = (typeof fileRef === 'string' && fileRef.startsWith('http')) 
          ? fileRef 
          : (resData?.url || `/uploads/${resData?.id || resData?.data?.id}`);
          
        setImageUrls((prev) => [...prev, finalUrl]);
      } else {
        throw new Error('Invalid server response format');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload image';
      setError(errorMsg);
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.salonId) {
      setError('Please select a salon');
      setLoading(false);
      return;
    }
    if (!formData.name.trim()) {
      setError('Service name is required');
      setLoading(false);
      return;
    }
    const priceValue = typeof formData.basePrice === 'string' ? parseFloat(formData.basePrice) : formData.basePrice;
    if (formData.basePrice === '' || isNaN(priceValue) || priceValue < 0) {
      setError('Please enter a valid price');
      setLoading(false);
      return;
    }
    if (formData.durationMinutes < 1) {
      setError('Duration must be at least 1 minute');
      setLoading(false);
      return;
    }

    // Prepare submission data with images
    const submitData = {
      ...formData,
      basePrice: priceValue, // Ensure it's a number
      imageUrl: imageUrls[0] || '', // Primary image
      images: imageUrls, // All images
    };

    mutation.mutate(submitData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/55 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Header - Premium Compacted & Flat */}
        <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-text-light dark:text-text-dark">
                  {service ? 'Refine Service' : 'New Service Offering'}
                </h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-text-light/40">
                  Configure professional salon treatment
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full bg-background-light dark:bg-background-dark border-none"
            >
              <XCircle className="w-5 h-5 opacity-60" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-text-light dark:text-text-dark">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
               <XCircle className="w-4 h-4 text-red-500" />
               <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form id="service-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Basic Info & Categories */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Core Identity</h3>
                  
                  <div className="space-y-4">
                    {/* Salon Selection */}
                    {salons.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-1.5 ml-1">
                          Salon Location
                        </label>
                        <select
                          required
                          value={formData.salonId}
                          onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                          className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="">Select salon</option>
                          {salons.map((salon) => (
                            <option key={salon.id} value={salon.id}>{salon.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-1.5 ml-1">
                          Service Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Signature Balayage"
                          className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-1.5 ml-1">
                          Code
                        </label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="SRV-01"
                          className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-1.5 ml-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Detail the experience..."
                        className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Categories & Targeting</h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'haircut', label: 'Haircut' },
                        { id: 'coloring', label: 'Coloring' },
                        { id: 'treatment', label: 'Treatment' },
                        { id: 'braiding', label: 'Braiding' },
                        { id: 'nails', label: 'Nails' },
                        { id: 'makeup', label: 'Makeup' },
                        { id: 'facial', label: 'Facial' },
                        { id: 'massage', label: 'Massage' },
                        { id: 'waxing', label: 'Waxing' },
                      ].map((cat) => {
                        const categories = formData.category ? formData.category.split(',') : [];
                        const isSelected = categories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected 
                                ? categories.filter((c) => c !== cat.id)
                                : [...categories, cat.id];
                              setFormData({ ...formData, category: updated.join(',') });
                            }}
                            className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                              isSelected
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/50 dark:text-text-dark/40 hover:border-primary/50'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <div className="flex bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark p-1 rounded-xl">
                        {[
                          { value: 'all', label: 'Everyone' },
                          { value: 'male', label: 'Men' },
                          { value: 'female', label: 'Women' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, targetGender: option.value })}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              formData.targetGender === option.value
                                ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm'
                                : 'text-text-light/40 hover:text-text-light/60'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing, Visuals & Status */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Investment & Duration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl">
                      <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-2">Base Price</label>
                       <div className="flex items-end gap-2">
                        <input
                          type="number"
                          required
                          value={formData.basePrice}
                          onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                          className="w-full bg-transparent text-2xl font-black text-text-light dark:text-text-dark outline-none tabular-nums"
                          placeholder="0"
                        />
                        <span className="text-xs font-bold text-text-light/40 mb-1">RWF</span>
                      </div>
                    </div>
                    <div className="p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl">
                      <label className="block text-[10px] font-black uppercase text-text-light/40 tracking-widest mb-2">Duration</label>
                       <div className="flex items-end gap-2">
                        <input
                          type="number"
                          required
                          value={formData.durationMinutes}
                          onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent text-2xl font-black text-text-light dark:text-text-dark outline-none tabular-nums"
                          placeholder="30"
                        />
                        <span className="text-xs font-bold text-text-light/40 mb-1">MIN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Media Portfolio</h3>
                  <div className="grid grid-cols-4 gap-2">
                     {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border-light dark:border-border-dark group bg-black/[0.02] dark:bg-white/[0.02]">
                           <img 
                              src={getImageUrl(url)} 
                              alt="Service" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                           />
                           {idx === 0 && imageUrls.length > 0 && (
                             <div className="absolute top-1 left-1 bg-primary text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm z-10">
                               Primary
                             </div>
                           )}
                           <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <Trash2 className="w-5 h-5 text-white" />
                           </button>
                        </div>
                     ))}
                     {imageUrls.length < MAX_IMAGES && (
                       <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 group"
                          disabled={uploading}
                       >
                          <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce text-primary' : 'text-text-light/20 group-hover:text-primary/50'}`} />
                          <span className="text-[9px] font-black uppercase text-text-light/30">Add Media</span>
                       </button>
                     )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                <div className="pt-4">
                   <div 
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      formData.isActive 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-400' 
                        : 'bg-background-light dark:bg-background-dark border-border-light text-text-light/50'
                    }`}
                   >
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-emerald-500 text-white' : 'bg-text-light/10 text-text-light/30'}`}>
                            <Check className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase tracking-wider">Service Status</p>
                            <p className="text-[10px] font-bold opacity-60">Availability for bookings</p>
                         </div>
                      </div>
                      <div className="font-black text-xs uppercase tracking-[0.1em]">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-background-light/50 dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="px-4 text-[10px] font-black uppercase tracking-widest"
          >
            Discard
          </Button>
          <Button
            type="submit"
            form="service-form"
            variant="primary"
            size="sm"
            loading={loading || uploading}
            loadingText="Syncing..."
            className="px-6 shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest"
          >
            {service ? 'Refine Service' : 'Rollout Service'}
          </Button>
        </div>
      </div>
    </div>
  );
}
