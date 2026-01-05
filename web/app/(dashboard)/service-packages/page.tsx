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
  DollarSign,
  Clock,
  Scissors,
  Tag,
  X,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

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
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <ServicePackagesContent />
    </ProtectedRoute>
  );
}

function ServicePackagesContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

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
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Packages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create bundled service offers with discounts
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPackage(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create Package
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading packages...</p>
          </div>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Service Packages</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create bundled service offers to increase sales and customer value
          </p>
          <button
            onClick={() => {
              setEditingPackage(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create Your First Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pkg.name}</h3>
                    {!pkg.isActive && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{pkg.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPackage(pkg);
                      setShowModal(true);
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this package?')) {
                        deleteMutation.mutate(pkg.id);
                      }
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Services */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Includes:</p>
                <div className="space-y-1">
                  {pkg.services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Scissors className="w-3 h-3" />
                      <span>{service.name}</span>
                    </div>
                  ))}
                  {pkg.services.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +{pkg.services.length - 3} more services
                    </p>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Package Price</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    RWF {pkg.packagePrice.toLocaleString()}
                  </span>
                </div>
                {pkg.originalPrice && pkg.originalPrice > pkg.packagePrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                      RWF {pkg.originalPrice.toLocaleString()}
                    </span>
                    {pkg.discountPercentage && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        Save {pkg.discountPercentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{pkg.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    <span>{pkg.services.length} services</span>
                  </div>
                </div>
              </div>

              {/* Validity */}
              {(pkg.validFrom || pkg.validTo) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pkg.validFrom && `Valid from: ${format(new Date(pkg.validFrom), 'MMM d, yyyy')}`}
                    {pkg.validFrom && pkg.validTo && ' • '}
                    {pkg.validTo && `Until: ${format(new Date(pkg.validTo), 'MMM d, yyyy')}`}
                  </p>
                </div>
              )}
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
            setShowModal(false);
            setEditingPackage(null);
          }}
          package={editingPackage}
          salons={salons}
          services={services}
        />
      )}
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
      alert('Failed to save package. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {pkg ? 'Edit Service Package' : 'Create Service Package'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bundle multiple services together with special pricing
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Salon *
              </label>
              <select
                required
                value={formData.salonId}
                onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., Complete Beauty Package"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe what's included in this package..."
            />
          </div>

          {/* Services Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Services * ({formData.serviceIds.length} selected)
            </label>
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
              {services.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No services available</p>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          RWF {service.basePrice.toLocaleString()} • {service.durationMinutes} min
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedServices.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Original Price: <strong>RWF {calculatedOriginalPrice.toLocaleString()}</strong> • Total Duration:{' '}
                  <strong>{calculatedDuration} minutes</strong>
                </p>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Price *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.packagePrice}
                onChange={(e) => setFormData({ ...formData, packagePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Original Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.originalPrice || calculatedOriginalPrice}
                onChange={(e) =>
                  setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || undefined })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  formData.discountPercentage ||
                  (formData.originalPrice && formData.packagePrice
                    ? ((formData.originalPrice - formData.packagePrice) / formData.originalPrice) * 100
                    : 0)
                }
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid From
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid To
              </label>
              <input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Active Package</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Active packages are visible to customers and can be booked
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.serviceIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : pkg ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

