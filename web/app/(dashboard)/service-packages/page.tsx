'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Layers,
  Percent,
  Search,
  Filter,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Service {
  id: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  packagePrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  durationMinutes: number;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  services: Service[];
  salon: {
    id: string;
    name: string;
  };
}

export default function ServicePackagesPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <ServicePackagesContent />
    </ProtectedRoute>
  );
}

function ServicePackagesContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<ServicePackage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch salons
  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data || [];
    },
  });

  // Fetch packages
  const { data: packages = [], isLoading } = useQuery<ServicePackage[]>({
    queryKey: ['service-packages'],
    queryFn: async () => {
      const response = await api.get('/service-packages');
      return response.data?.data || response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/service-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-packages'] });
      success('Package deleted successfully');
      setDeleteConfirmation(null);
    },
    onError: () => {
      toastError('Failed to delete package');
    },
  });

  const filteredPackages = useMemo(() => {
    if (!searchQuery) return packages;
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [packages, searchQuery]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-light/50 dark:text-text-dark/50 mt-4">
              Loading packages...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            Service Packages
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
            Create bundled service offers with discounts
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPackage(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Package
        </Button>
      </div>

      {/* Search Filter */}
      {packages.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          />
        </div>
      )}

      {/* Content */}
      {filteredPackages.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
          <EmptyState
            icon={<Layers className="w-16 h-16" />}
            title={packages.length === 0 ? 'No Service Packages' : 'No packages found'}
            description={
              packages.length === 0
                ? 'Create bundled service offers to increase sales and customer value.'
                : 'Try adjusting your search criteria.'
            }
            action={
              packages.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingPackage(null);
                    setShowModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Package
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="p-5">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-sm">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-light dark:text-text-dark line-clamp-1">
                        {pkg.name}
                      </h3>
                      {!pkg.isActive && (
                        <div className="inline-flex items-center mt-1">
                           <Badge variant="warning" size="sm">Inactive</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingPackage(pkg);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-text-light/40 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation(pkg)}
                      className="p-1.5 text-text-light/40 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {pkg.description && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4 line-clamp-2 min-h-[2.5em]">
                    {pkg.description}
                  </p>
                )}

                {/* Services List */}
                <div className="space-y-2 mb-5 bg-background-light/50 dark:bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-text-light/40 dark:text-text-dark/40 mb-1">
                    Includes
                  </p>
                  {pkg.services.slice(0, 3).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="truncate">{service.name}</span>
                    </div>
                  ))}
                  {pkg.services.length > 3 && (
                    <p className="text-xs text-text-light/50 dark:text-text-dark/50 pl-5.5">
                      +{pkg.services.length - 3} more services
                    </p>
                  )}
                </div>

                {/* Pricing & Footer */}
                <div className="border-t border-border-light dark:border-border-dark pt-4">
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-text-light/40 dark:text-text-dark/40">
                        Package Price
                      </p>
                      <p className="text-xl font-bold text-text-light dark:text-text-dark">
                        {pkg.packagePrice.toLocaleString()} <span className="text-xs font-normal text-text-light/50">RWF</span>
                      </p>
                    </div>
                    {pkg.discountPercentage && (
                        <div className="text-right">
                            <span className="text-xs line-through text-text-light/40 dark:text-text-dark/40 block">
                                {pkg.originalPrice?.toLocaleString()} RWF
                            </span>
                            <Badge variant="success" size="sm" className="mt-1">
                                Save {pkg.discountPercentage.toFixed(0)}%
                            </Badge>
                        </div>
                    )}
                  </div>
                </div>
              </div>
              
               {/* Footer Info Strip */}
               <div className="bg-surface-accent-light dark:bg-surface-accent-dark px-5 py-2.5 flex items-center justify-between text-xs text-text-light/60 dark:text-text-dark/60 border-t border-border-light dark:border-border-dark">
                   <div className="flex items-center gap-1.5">
                     <Clock className="w-3.5 h-3.5" />
                     {pkg.durationMinutes} min
                   </div>
                   <div className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />
                      {pkg.services.length} items
                   </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ServicePackageModal
          onClose={() => {
            setShowModal(false);
            setEditingPackage(null);
          }}
          onSubmit={async (data) => {
            if (editingPackage) {
              await api.patch(`/service-packages/${editingPackage.id}`, data);
            } else {
              await api.post('/service-packages', data);
            }
            queryClient.invalidateQueries({ queryKey: ['service-packages'] });
            success(editingPackage ? 'Package updated' : 'Package created');
            setShowModal(false);
            setEditingPackage(null);
          }}
          package={editingPackage}
          salons={salons}
          services={services}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          if (deleteConfirmation) deleteMutation.mutate(deleteConfirmation.id);
        }}
        title="Delete Package"
        message={`Are you sure you want to delete "${deleteConfirmation?.name}"?`}
        variant="danger"
        confirmLabel="Delete"
        isProcessing={deleteMutation.isPending}
      />
    </div>
  );
}

function ServicePackageModal({
  onClose,
  onSubmit,
  package: pkg,
  salons,
  services,
}: {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  package: ServicePackage | null;
  salons: Array<{ id: string; name: string }>;
  services: Service[];
}) {
  const [formData, setFormData] = useState({
    salonId: pkg?.salon?.id || salons[0]?.id || '',
    name: pkg?.name || '',
    description: pkg?.description || '',
    serviceIds: pkg?.services?.map((s) => s.id) || [],
    packagePrice: pkg?.packagePrice || 0,
    originalPrice: pkg?.originalPrice || undefined,
    discountPercentage: pkg?.discountPercentage || undefined,
    durationMinutes: pkg?.durationMinutes || 0,
    isActive: pkg?.isActive ?? true,
    validFrom: pkg?.validFrom ? format(new Date(pkg.validFrom), 'yyyy-MM-dd') : '',
    validTo: pkg?.validTo ? format(new Date(pkg.validTo), 'yyyy-MM-dd') : '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate original price and discount when services change
  const selectedServices = services.filter((s) => formData.serviceIds.includes(s.id));
  const calculatedOriginalPrice = selectedServices.reduce((sum, s) => sum + (s.basePrice || 0), 0);
  const calculatedDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        originalPrice: formData.originalPrice || calculatedOriginalPrice,
        durationMinutes: formData.durationMinutes || calculatedDuration,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validTo: formData.validTo ? new Date(formData.validTo).toISOString() : undefined,
      });
    } catch (error) {
       // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-border-light dark:border-border-dark"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                  {pkg ? 'Edit Package' : 'Create Package'}
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                   Bundle services for special offers
                </p>
             </div>
          </div>
          <button 
             onClick={onClose} 
             className="text-text-light/40 hover:text-text-light dark:text-text-dark/40 dark:hover:text-text-dark transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6">
            <form id="package-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Salon *
                  </label>
                  <select
                    required
                    value={formData.salonId}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  >
                    <option value="">Select Salon</option>
                    {salons.map((salon) => (
                      <option key={salon.id} value={salon.id}>
                        {salon.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                    placeholder="e.g., Summer Glow Package"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="Describe the benefits of this package..."
                />
              </div>

              {/* Services Selection */}
              <div>
                <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-2 uppercase">
                  Select Services * <span className="text-primary normal-case">({formData.serviceIds.length} selected)</span>
                </label>
                
                <div className="border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
                    <div className="bg-background-secondary dark:bg-background-dark p-2 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                         <span className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">Available Services</span>
                         {selectedServices.length > 0 && (
                            <span className="text-xs font-bold text-primary">
                                Orig: {calculatedOriginalPrice.toLocaleString()} RWF
                            </span>
                         )}
                    </div>
                    <div className="max-h-56 overflow-y-auto p-2 bg-background-light dark:bg-background-dark/50">
                      {services.length === 0 ? (
                        <p className="text-sm text-text-light/50 dark:text-text-dark/50 p-4 text-center">No services available</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {services.map((service) => (
                            <label
                              key={service.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                formData.serviceIds.includes(service.id)
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/30'
                              }`}
                            >
                              <div className="mt-0.5">
                                 <input
                                    type="checkbox"
                                    checked={formData.serviceIds.includes(service.id)}
                                    onChange={() => handleServiceToggle(service.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                 />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${formData.serviceIds.includes(service.id) ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>{service.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-text-light/50 dark:text-text-dark/50">
                                   <span>{service.basePrice.toLocaleString()} RWF</span>
                                   <span>•</span>
                                   <span>{service.durationMinutes}m</span>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Package Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-xs">RWF</span>
                    <input
                        type="number"
                        required
                        min="0"
                        value={formData.packagePrice}
                        onChange={(e) => setFormData({ ...formData, packagePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition font-mono"
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Original Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-xs">RWF</span>
                    <input
                        type="number"
                        min="0"
                        value={formData.originalPrice || calculatedOriginalPrice}
                        onChange={(e) =>
                        setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || undefined })
                        }
                        className="w-full pl-10 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition font-mono"
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Discount %
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 text-xs">%</span>
                    <input
                        type="number"
                        value={
                        formData.discountPercentage ||
                        (formData.originalPrice && formData.packagePrice
                            ? ((formData.originalPrice - formData.packagePrice) / formData.originalPrice) * 100
                            : 0)
                        }
                        readOnly
                        className="w-full pl-3 pr-8 py-2.5 bg-background-secondary dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark opacity-70 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Valid From
                  </label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                      <input
                        type="date"
                        value={formData.validFrom}
                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                    Valid To
                  </label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                      <input
                        type="date"
                        value={formData.validTo}
                        onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                      />
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-secondary/30 dark:bg-background-dark/30">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        id="isActive" 
                        className="sr-only peer"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-border-light dark:bg-border-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                  <label htmlFor="isActive" className="cursor-pointer">
                      <p className="text-sm font-bold text-text-light dark:text-text-dark">Active Package</p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60">Visible to customers and staff</p>
                  </label>
              </div>
            </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-end gap-3 rounded-b-2xl">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              form="package-form"
              type="submit"
              disabled={isSubmitting || formData.serviceIds.length === 0}
              loading={isSubmitting}
            >
              {pkg ? 'Update Package' : 'Create Package'}
            </Button>
        </div>
      </div>
    </div>
  );
}

