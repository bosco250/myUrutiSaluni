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
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { canViewAllSalons } from '@/lib/permissions';

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
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');

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
    },
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Total
                </p>
                <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
                <Scissors className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Active
                </p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <Scissors className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Avg Price
                </p>
                <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                  RWF {Math.round(stats.avgPrice).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-primary to-primary-dark rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Avg Duration
                </p>
                <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                  {Math.round(stats.avgDuration)} min
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
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

      {/* Services List */}
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
              <thead className="bg-surface-accent-light dark:bg-surface-accent-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Status
                  </th>
                  {(salons.length > 1 || canViewAll) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                      Salon
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                {filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-surface-accent-light dark:hover:bg-surface-accent-dark transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                      {service.code || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                        <Clock className="w-4 h-4" />
                        {service.durationMinutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-text-light dark:text-text-dark">
                        <DollarSign className="w-4 h-4" />
                        {service.basePrice.toLocaleString()} RWF
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={service.isActive ? 'success' : 'default'} size="sm" dot>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {(salons.length > 1 || canViewAll) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                        {service.salon?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setShowModal(true);
                          }}
                          className="text-primary hover:text-primary/80 transition"
                          title="Edit service"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this service? This action cannot be undone.'
                              )
                            ) {
                              deleteMutation.mutate(service.id);
                            }
                          }}
                          className="text-danger hover:text-danger/80 transition"
                          title="Delete service"
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
            setShowModal(false);
            setEditingService(null);
          }}
        />
      )}
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
    basePrice: service?.basePrice || 0,
    isActive: service?.isActive ?? true,
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
    if (formData.basePrice < 0) {
      setError('Base price must be greater than or equal to 0');
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
                        placeholder="What’s included? Any notes for staff/customers."
                        className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                      />
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
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
                          <input
                            id="service-price"
                            type="number"
                            required
                            min="0"
                            step="100"
                            value={formData.basePrice}
                            onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-9 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                          />
                        </div>
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
