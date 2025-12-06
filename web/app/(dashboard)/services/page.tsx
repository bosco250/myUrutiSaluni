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
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/contexts/ThemeContext';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <ServicesContent />
    </div>
  );
}

function ServicesContent() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
      <div className="mb-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-light dark:text-text-dark mb-2">
              Services
            </h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Manage salon services and offerings
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingService(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Service</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Total Services
            </div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              {stats.total}
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Active Services
            </div>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Avg. Price</div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              RWF {Math.round(stats.avgPrice).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Avg. Duration
            </div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              {Math.round(stats.avgDuration)} min
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {(salons.length > 1 || canViewAll) && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search services by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
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
            console.log(
              '[Service Modal] Service saved, invalidating queries for:',
              servicesQueryKey
            );
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
  const [formData, setFormData] = useState({
    salonId: service?.salonId || salons[0]?.id || '',
    code: service?.code || '',
    name: service?.name || '',
    description: service?.description || '',
    durationMinutes: service?.durationMinutes || 30,
    basePrice: service?.basePrice || 0,
    isActive: service?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save service');
      setLoading(false);
    },
  });

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

    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
              {service ? 'Edit Service' : 'Add New Service'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark transition"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {salons.length > 1 ? (
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Salon *
                </label>
                <select
                  required
                  value={formData.salonId}
                  onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                >
                  <option value="">Select salon</option>
                  {salons.map((salon) => (
                    <option key={salon.id} value={salon.id}>
                      {salon.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : salons.length === 1 ? (
              <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                Salon:{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {salons[0].name}
                </span>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Service Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Haircut - Men"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Service Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., SRV-HC-M (optional)"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Service description (optional)"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Base Price (RWF) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary/50 focus:ring-2"
                />
                <span className="text-sm font-medium text-text-light dark:text-text-dark">
                  Service is active (available for booking and sales)
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
