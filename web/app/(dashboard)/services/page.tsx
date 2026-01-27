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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data?.data || response.data || [];
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
  const servicesQueryKey = ['services', selectedSalonId || (canViewAll ? 'all' : 'all-owned')];
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: servicesQueryKey,
    queryFn: async (): Promise<Service[]> => {
      if (!user) {
        return [];
      }
      try {
        // If salon is selected, filter by that salon
        // For admins: if no salon selected, get all services
        // For salon owners: if no salon selected, backend returns all their salons' services
        const params = selectedSalonId ? { salonId: selectedSalonId } : {};
        const response = await api.get('/services', { params });
        const data = response.data?.data || response.data;
        // Ensure we always return an array
        const servicesArray = Array.isArray(data) ? data : [];
        return servicesArray;
      } catch (error) {
        // Always return an array, never undefined
        return [];
      }
    },
    enabled: !!user && (salons.length > 0 || canViewAll) && !salonsLoading, // Wait for salons to load (or allow admins to view all)
    // Don't use initialData - let it fetch from server
    // Refetch on window focus to catch new services
    refetchOnWindowFocus: true,
    // Keep data in cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            {
              label: 'Total',
              value: stats.total,
              icon: Scissors,
              gradient: 'from-blue-500 to-cyan-500',
              border: 'hover:border-blue-500/50',
            },
            {
              label: 'Active',
              value: stats.active,
              icon: Scissors,
              gradient: 'from-emerald-500 to-green-600',
              border: 'hover:border-emerald-500/50',
            },
            {
              label: 'Avg Price',
              value: `RWF ${Math.round(stats.avgPrice).toLocaleString()}`,
              icon: DollarSign,
              gradient: 'from-violet-500 to-purple-500',
              border: 'hover:border-violet-500/50',
            },
            {
              label: 'Avg Duration',
              value: `${Math.round(stats.avgDuration)} min`,
              icon: Clock,
              gradient: 'from-amber-500 to-orange-600',
              border: 'hover:border-amber-500/50',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 hover:shadow-lg transition-all ${stat.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 bg-gradient-to-br ${stat.gradient} rounded-lg`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] uppercase tracking-wide font-semibold text-text-light/60 dark:text-text-dark/60">
                  {stat.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-text-light dark:text-text-dark leading-none">
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light dark:divide-border-dark text-sm">
              <thead className="bg-surface-accent-light dark:bg-surface-accent-dark">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Service
                  </th>
                   <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Status
                  </th>
                  {(salons.length > 1 || canViewAll) && (
                    <th className="px-4 py-3 text-left font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                      Salon
                    </th>
                  )}
                  <th className="px-4 py-3 text-right font-semibold text-text-light/60 dark:text-text-dark/60 text-[10px] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {currentServices.map((service) => (
                  <tr
                    key={service.id}
                    className="group hover:bg-background-secondary/50 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Service Name & Image */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-accent-light dark:bg-surface-accent-dark border border-border-light dark:border-border-dark flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {service.imageUrl ? (
                             // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={service.imageUrl} 
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Scissors className="w-4 h-4 text-text-light/30 dark:text-text-dark/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-text-light dark:text-text-dark truncate">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-[11px] text-text-light/50 dark:text-text-dark/50 truncate max-w-[200px]">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                       <span className="font-mono text-[11px] text-text-light/60 dark:text-text-dark/60 bg-surface-accent-light dark:bg-surface-accent-dark px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark">
                         {service.code || '—'}
                       </span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-text-light/80 dark:text-text-dark/80">
                        <Clock className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                        <span className="text-xs font-medium tabular-nums">{service.durationMinutes} m</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-bold text-text-light dark:text-text-dark tabular-nums">
                        {service.basePrice.toLocaleString()} <span className="text-[10px] font-normal text-text-light/50 dark:text-text-dark/50">RWF</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                       <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                          service.isActive 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-text-light/5 border-text-light/10 text-text-light/50 dark:bg-text-dark/5 dark:border-text-dark/10 dark:text-text-dark/50'
                       }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${service.isActive ? 'bg-emerald-500' : 'bg-text-light/40 dark:bg-text-dark/40'}`} />
                          {service.isActive ? 'Active' : 'Inactive'}
                       </div>
                    </td>

                    {/* Salon (If multiple) */}
                    {(salons.length > 1 || canViewAll) && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-text-light/50 dark:text-text-dark/50">
                        {service.salon?.name || '-'}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-text-light/40 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(service)}
                          className="p-1.5 text-text-light/40 hover:text-danger hover:bg-danger/10 rounded transition-colors"
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
}: {
  service?: Service | null;
  salons: Salon[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  // Initialize images array from service data
  const initialImages = service?.images?.length 
    ? service.images 
    : (service?.imageUrl ? [service.imageUrl] : []);
  
  const [formData, setFormData] = useState({
    salonId: service?.salonId || salons[0]?.id || '',
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
        headers: {
          'Content-Type': undefined, // Let browser set boundary
        },
      });

      if (response.data && response.data.url) {
        setImageUrls((prev) => [...prev, response.data.url]);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Header - Clean aesthetics, no gradients */}
        <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-text-light dark:text-text-dark">
                  {service ? 'Edit Service' : 'Create Service'}
                </h2>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                  Configure service details, pricing, and duration.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Close"
            >
              <XCircle className="w-5 h-5 opacity-60 hover:opacity-100" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form id="service-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Basic Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-4 uppercase tracking-wide">
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Salon Selection */}
                    {salons.length > 1 ? (
                      <div>
                        <label className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                          Salon *
                        </label>
                        <select
                          required
                          value={formData.salonId}
                          onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                          className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                        >
                          <option value="">Select salon</option>
                          {salons.map((salon) => (
                            <option key={salon.id} value={salon.id}>
                              {salon.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {/* Service Name */}
                    <div>
                      <label htmlFor="service-name" className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                        Service Name *
                      </label>
                      <input
                        id="service-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Haircut - Men"
                        className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      />
                    </div>

                    {/* Service Code */}
                    <div>
                      <label htmlFor="service-code" className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                        Service Code
                      </label>
                      <input
                        id="service-code"
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g., SRV-HC-M"
                        className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="service-description" className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                        Description
                      </label>
                      <textarea
                        id="service-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="What's included? Any notes for staff/customers."
                        className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                      />
                    </div>

                    {/* Category Selection - Multi Select */}
                    <div>
                      <label className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        Service Categories
                      </label>
                      <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mb-2">
                        Select all that apply
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'haircut', label: 'Haircut & Styling' },
                          { id: 'coloring', label: 'Hair Coloring' },
                          { id: 'treatment', label: 'Hair Treatment' },
                          { id: 'braiding', label: 'Braiding & Weaving' },
                          { id: 'nails', label: 'Nails & Manicure' },
                          { id: 'makeup', label: 'Makeup & Beauty' },
                          { id: 'facial', label: 'Facial & Skincare' },
                          { id: 'massage', label: 'Massage & Spa' },
                          { id: 'waxing', label: 'Waxing & Hair Removal' },
                          { id: 'barber', label: 'Barber Services' },
                        ].map((cat) => {
                          const categories = formData.category ? formData.category.split(',') : [];
                          const isSelected = categories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                let updated: string[];
                                if (isSelected) {
                                  updated = categories.filter((c) => c !== cat.id);
                                } else {
                                  updated = [...categories, cat.id];
                                }
                                setFormData({ ...formData, category: updated.join(',') });
                              }}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                                isSelected
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/80 dark:text-text-dark/80 hover:border-primary/50'
                              }`}
                            >
                              <span className="flex-1 text-left">{cat.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Gender */}
                    <div>
                      <label className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-2 uppercase flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        Target Gender
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'all', label: 'Everyone' },
                          { value: 'male', label: 'Men' },
                          { value: 'female', label: 'Women' },
                        ].map((option) => {
                          const isSelected = formData.targetGender === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, targetGender: option.value })}
                              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                                isSelected
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-text-light/80 dark:text-text-dark/80 hover:border-primary/50'
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-4 uppercase tracking-wide">
                    Pricing & Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Price */}
                      <div>
                        <label htmlFor="service-price" className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                          Price (RWF) *
                        </label>
                        <input
                          id="service-price"
                          type="number"
                          required
                          min="0"
                          step="100"
                          value={formData.basePrice}
                          onChange={(e) => setFormData({ ...formData, basePrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                          placeholder="Enter price"
                          className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <label htmlFor="service-duration" className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                          Duration (min) *
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
                          <input
                            id="service-duration"
                            type="number"
                            required
                            min="1"
                            value={formData.durationMinutes}
                            onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })}
                            className="w-full pl-9 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                        Service Images <span className="font-normal opacity-70">({imageUrls.length}/{MAX_IMAGES})</span>
                      </label>
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {/* Horizontal Image Gallery */}
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {/* Add Photo Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || imageUrls.length >= MAX_IMAGES}
                          className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-primary" />
                              <span className="text-xs font-medium text-primary">Add Photo</span>
                            </>
                          )}
                        </button>
                        
                        {/* Image Thumbnails */}
                        {imageUrls.map((url, index) => (
                          <div key={`${url}-${index}`} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={url} 
                              alt={`Service image ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <XCircle className="w-4 h-4 text-white" />
                            </button>
                            {/* Primary badge */}
                            {index === 0 && (
                              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-primary/90 text-white text-[9px] font-bold uppercase">
                                Primary
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {imageUrls.length === 0 && !uploading && (
                        <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-2 text-center">
                          Add up to {MAX_IMAGES} photos for this service
                        </p>
                      )}
                    </div>

                    {/* Active Toggle */}
                    <div className="p-4 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">Active Service</p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">Visible for booking</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-border-light dark:bg-border-dark peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-form"
            loading={loading || uploading}
            loadingText={uploading ? 'Uploading...' : 'Saving...'}
          >
            {service ? 'Save Value' : 'Create Service'}
          </Button>
        </div>
      </div>
    </div>
  );
}
