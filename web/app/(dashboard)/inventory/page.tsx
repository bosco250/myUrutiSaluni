'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Plus,
  Package,
  Edit,
  Trash2,
  Search,
  Filter,
  DollarSign,
  Percent,
  XCircle,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { canViewAllSalons } from '@/lib/permissions';

interface Product {
  id: string;
  salonId: string;
  sku?: string;
  name: string;
  description?: string;
  unitPrice?: number;
  taxRate?: number;
  isInventoryItem: boolean;
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

export default function InventoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InventoryContent />
    </div>
  );
}

function InventoryContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inventory' | 'non-inventory'>('all');

  const [selectedSalonId, setSelectedSalonId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inventory-selected-salon-id') || '';
    }
    return '';
  });

  useEffect(() => {
    if (selectedSalonId) {
      localStorage.setItem('inventory-selected-salon-id', selectedSalonId);
    }
  }, [selectedSalonId]);

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

  const canViewAll = canViewAllSalons(user?.role);

  useEffect(() => {
    if (!salonsLoading && salons.length > 0 && !canViewAll) {
      const storedSalonId = localStorage.getItem('inventory-selected-salon-id');
      const isValidStoredSalon = storedSalonId && salons.some((s) => s.id === storedSalonId);

      if (salons.length === 1) {
        if (selectedSalonId !== salons[0].id) {
          setSelectedSalonId(salons[0].id);
        }
      } else if (isValidStoredSalon && selectedSalonId !== storedSalonId) {
        setSelectedSalonId(storedSalonId);
      } else if (!selectedSalonId && !isValidStoredSalon) {
        setSelectedSalonId(salons[0].id);
      }
    }
  }, [salons, selectedSalonId, salonsLoading, canViewAll]);

  const effectiveSalonId = useMemo(() => {
    if (salonsLoading) return null;
    if (canViewAll) return selectedSalonId || 'all';
    if (salons.length === 0) return null;
    return selectedSalonId || (salons.length === 1 ? salons[0].id : 'all-owned');
  }, [selectedSalonId, salons, salonsLoading, canViewAll]);

  const productsQueryKey = ['inventory-products', effectiveSalonId || 'pending'];

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: async (): Promise<Product[]> => {
      if (!user) {
        return [];
      }

      try {
        const params =
          effectiveSalonId && effectiveSalonId !== 'all' && effectiveSalonId !== 'all-owned'
            ? { salonId: effectiveSalonId }
            : {};

        const response = await api.get('/inventory/products', { params });

        let data: Product[] = [];

        if (response?.data) {
          if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            data = response.data.data;
          } else {
            data = [];
          }
        }

        return Array.isArray(data) ? data : [];
      } catch (error: unknown) {
        return [];
      }
    },
    enabled: !!user && effectiveSalonId !== null && !salonsLoading,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
    },
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'inventory' && product.isInventoryItem) ||
        (typeFilter === 'non-inventory' && !product.isInventoryItem);

      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const inventoryItems = products.filter((p) => p.isInventoryItem).length;
    const nonInventoryItems = products.filter((p) => !p.isInventoryItem).length;
    const avgPrice =
      products.length > 0
        ? products.reduce((sum, p) => sum + (p.unitPrice || 0), 0) / products.length
        : 0;

    return { total, inventoryItems, nonInventoryItems, avgPrice };
  }, [products]);

  if (productsLoading || salonsLoading) {
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

  if (!salonsLoading && salons.length === 0 && !canViewAll) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No Salons Found"
            description="You need to create a salon before you can add products. Please create a salon first."
            action={
              <Button
                onClick={() => (window.location.href = '/salons')}
                variant="primary"
                className="flex items-center gap-2"
              >
                Go to Salons
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Inventory</h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            Manage products, inventory items, and stock
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              window.location.href = '/inventory/stock';
            }}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Stock Management
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Total Products
              </p>
              <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                {stats.total}
              </p>
            </div>
            <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
              <Package className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Inventory Items
              </p>
              <p className="text-2xl font-black text-primary mt-1">{stats.inventoryItems}</p>
            </div>
            <div className="p-2 bg-gradient-to-br from-primary to-primary-dark rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/20 dark:border-gray-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Non-Inventory
              </p>
              <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                {stats.nonInventoryItems}
              </p>
            </div>
            <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
              <Filter className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Avg. Price
              </p>
              <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                RWF {Math.round(stats.avgPrice).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
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
              placeholder="Search products by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'all' | 'inventory' | 'non-inventory')
              }
              className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="inventory">Inventory Items</option>
              <option value="non-inventory">Non-Inventory</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl">
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title={products.length === 0 ? 'No products yet' : 'No products found'}
            description={
              products.length === 0
                ? 'Add your first product to get started. Products can be sold and tracked in inventory.'
                : 'Try adjusting your search or filter criteria.'
            }
            action={
              products.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowModal(true);
                  }}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Product
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
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Tax Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Type
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
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-surface-accent-light dark:hover:bg-surface-accent-dark transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-text-light dark:text-text-dark">
                        {product.unitPrice ? product.unitPrice.toLocaleString() : '-'} RWF
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                        <Percent className="w-4 h-4" />
                        {product.taxRate ? `${product.taxRate}%` : '0%'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={product.isInventoryItem ? 'primary' : 'default'}
                        size="sm"
                        dot
                      >
                        {product.isInventoryItem ? 'Inventory' : 'Non-Inventory'}
                      </Badge>
                    </td>
                    {(salons.length > 1 || canViewAll) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                        {product.salon?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowModal(true);
                          }}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this product? This action cannot be undone.'
                              )
                            ) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          salons={salons}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: productsQueryKey });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  salons,
  onClose,
  onSuccess,
}: {
  product?: Product | null;
  salons: Salon[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    salonId: product?.salonId || salons[0]?.id || '',
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    unitPrice: product?.unitPrice || 0,
    taxRate: product?.taxRate || 0,
    isInventoryItem: product?.isInventoryItem ?? true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (product) {
        return api.patch(`/inventory/products/${product.id}`, data);
      } else {
        return api.post('/inventory/products', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to save product'
      );
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.salonId) {
      setError('Please select a salon');
      setLoading(false);
      return;
    }
    if (!formData.name.trim()) {
      setError('Product name is required');
      setLoading(false);
      return;
    }
    if (formData.unitPrice < 0) {
      setError('Unit price must be greater than or equal to 0');
      setLoading(false);
      return;
    }
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      setError('Tax rate must be between 0 and 100');
      setLoading(false);
      return;
    }

    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-surface-light shadow-2xl dark:bg-surface-dark flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
            {product ? 'Edit Product' : 'New Product'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-light/50 hover:bg-background-light hover:text-text-light dark:text-text-dark/50 dark:hover:bg-background-dark dark:hover:text-text-dark transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Salon Selection */}
            {(salons.length > 1 || canViewAllSalons(null)) && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Salon *
                </label>
                <select
                  required
                  value={formData.salonId}
                  onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                >
                  <option value="">Select Salon</option>
                  {salons.map((salon) => (
                    <option key={salon.id} value={salon.id}>
                      {salon.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Professional Shampoo"
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. SHP-001"
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Type
                </label>
                 <select
                    value={formData.isInventoryItem ? 'inventory' : 'service'}
                    onChange={(e) => setFormData({...formData, isInventoryItem: e.target.value === 'inventory'})}
                    className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                 >
                    <option value="inventory">Inventory Item (Track Stock)</option>
                    <option value="service">Non-Inventory / Service</option>
                 </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Unit Price (RWF)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Optional product description..."
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border-dark dark:bg-background-dark dark:text-text-dark resize-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-light bg-surface-light px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-9 px-4 text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            onClick={handleSubmit} // Explicitly trigger submit here if button is outside form, or rely on form id but putting it inside form or trigger is easier. Putting click handler is safe.
            loadingText="Saving..."
            className="h-9 px-4 text-sm font-semibold"
          >
            {product ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}
