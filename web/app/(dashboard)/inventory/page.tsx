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
                        <DollarSign className="w-4 h-4" />
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
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b border-border-light dark:border-border-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.22),transparent_60%)]" />
          <div className="relative p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black tracking-tight">
                    {product ? 'Edit Product' : 'Create Product'}
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Products can be sold; inventory items can also be stock-managed.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 bg-white/10 text-white border border-white/20 hover:bg-white/20"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Specs */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  Unit Price
                </p>
                <p className="text-lg font-black mt-1">
                  RWF {Number(formData.unitPrice || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  Tax Rate
                </p>
                <p className="text-lg font-black mt-1">{Number(formData.taxRate || 0)}%</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl">
                {error}
              </div>
            )}

            {/* Basics */}
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-text-light dark:text-text-dark">Basics</p>
                <span className="text-[10px] uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salons.length > 1 ? (
                  <div className="md:col-span-2">
                    <label
                      htmlFor="inventory-product-salon"
                      className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                    >
                      Salon *
                    </label>
                    <select
                      id="inventory-product-salon"
                      required
                      value={formData.salonId}
                      onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                      className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
                  <div className="md:col-span-2 text-xs text-text-light/60 dark:text-text-dark/60">
                    Salon:{' '}
                    <span className="font-semibold text-text-light dark:text-text-dark">
                      {salons[0].name}
                    </span>
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  <label
                    htmlFor="inventory-product-name"
                    className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Product Name *
                  </label>
                  <input
                    id="inventory-product-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Professional Shampoo"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inventory-product-sku"
                    className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    SKU
                  </label>
                  <input
                    id="inventory-product-sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., SHP-001"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inventory-product-description"
                    className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="inventory-product-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Product description (optional)"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Tax */}
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <p className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Pricing</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="inventory-product-unitPrice"
                    className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Unit Price (RWF)
                  </label>
                  <input
                    id="inventory-product-unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inventory-product-taxRate"
                    className="block text-[10px] font-semibold uppercase tracking-wide text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Tax Rate (%)
                  </label>
                  <input
                    id="inventory-product-taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                </div>

                <div className="md:col-span-2 flex items-start gap-3 p-3 rounded-xl border border-border-light dark:border-border-dark bg-background-light/60 dark:bg-background-dark/40">
                  <input
                    id="inventory-product-track"
                    type="checkbox"
                    checked={formData.isInventoryItem}
                    onChange={(e) =>
                      setFormData({ ...formData, isInventoryItem: e.target.checked })
                    }
                    className="mt-0.5 w-5 h-5 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary/50 focus:ring-2"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor="inventory-product-track"
                      className="text-sm font-semibold text-text-light dark:text-text-dark"
                    >
                      Track inventory
                    </label>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                      Enables stock level management for this item.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky actions */}
          <div className="sticky bottom-0 p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={loading} loadingText="Saving..." className="flex-1">
                {product ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
