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
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { canViewAllSalons } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
      useToast().success('Product deleted successfully');
    },
    onError: () => {
      useToast().error('Failed to delete product');
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

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const stats = useMemo(() => {
    const total = products.length;
    const inventoryItems = products.filter((p) => p.isInventoryItem).length;
    const nonInventoryItems = products.filter((p) => !p.isInventoryItem).length;
    
    // Calculate average only for items with a price value
    const pricedProducts = products.filter(p => (Number(p.unitPrice) || 0) > 0);
    const avgPrice =
      pricedProducts.length > 0
        ? pricedProducts.reduce((sum, p) => sum + (Number(p.unitPrice) || 0), 0) / pricedProducts.length
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
      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Total Products */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 dark:text-indigo-400">Total Products</p>
            <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Package className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.total}</p>
        </div>

        {/* Inventory Items */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Inventory Items</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.inventoryItems}</p>
        </div>

        {/* Non-Inventory */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800/50 rounded-xl p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-600 dark:text-slate-400">Non-Inventory</p>
            <div className="p-1 bg-slate-100 dark:bg-slate-800/50 rounded-md group-hover:scale-110 transition-transform">
              <Filter className="w-3 h-3 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.nonInventoryItems}</p>
        </div>

        {/* Avg Price */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Avg. Price</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
            RWF {Math.round(stats.avgPrice).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {(salons.length > 1 || canViewAll) && (
          <div className="relative min-w-[200px]">
            <select
              value={selectedSalonId}
              onChange={(e) => setSelectedSalonId(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary hover:border-primary/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{canViewAll ? 'All Salons' : 'Select Salon'}</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 pointer-events-none" />
          </div>
        )}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary hover:border-primary/50 transition-colors"
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'inventory' | 'non-inventory')
            }
            className="w-full h-9 pl-8 pr-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary hover:border-primary/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="inventory">Inventory Items</option>
            <option value="non-inventory">Non-Inventory</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 pointer-events-none" />
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
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    SKU
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Product Name
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Unit Price
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Tax Rate
                  </th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                    Type
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
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light dark:text-text-dark">
                      {product.sku || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-text-light dark:text-text-dark">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-[10px] text-text-light/40 dark:text-text-dark/40 mt-0.5 max-w-[200px] truncate">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-text-light dark:text-text-dark">
                        {product.unitPrice ? product.unitPrice.toLocaleString() : '-'} RWF
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light/60 dark:text-text-dark/60 tabular-nums">
                      {product.taxRate ? `${product.taxRate}%` : '0%'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        product.isInventoryItem 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/70 dark:text-text-dark/70'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${product.isInventoryItem ? 'bg-primary' : 'bg-text-light/40 dark:bg-text-dark/40'}`} />
                        {product.isInventoryItem ? 'Inventory' : 'Service'}
                      </span>
                    </td>
                    {(salons.length > 1 || canViewAll) && (
                      <td className="px-3 py-2.5 whitespace-nowrap text-text-light/60 dark:text-text-dark/60">
                        {product.salon?.name || '-'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-background-light dark:hover:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:text-primary transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this product? This action cannot be undone.'
                              )
                            ) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                          className="p-1.5 rounded hover:bg-background-light dark:hover:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete product"
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

          
          {/* Pagination */}
          {filteredProducts.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                <span>
                  Showing{' '}
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {filteredProducts.length}
                  </span>{' '}
                  results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <div className="text-xs font-medium text-text-light dark:text-text-dark">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
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
  const { success, error: errorToast } = useToast();
  const [formData, setFormData] = useState({
    salonId: product?.salonId || salons[0]?.id || '',
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    unitPrice: product?.unitPrice ?? '',
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
      success(product ? 'Product updated successfully' : 'Product created successfully');
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to save product';
      setError(errorMessage);
      errorToast(errorMessage);
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
    const price = Number(formData.unitPrice);
    if (price < 0) {
      setError('Unit price must be greater than or equal to 0');
      setLoading(false);
      return;
    }
    if (formData.taxRate < 0 || formData.taxRate > 100) {
      setError('Tax rate must be between 0 and 100');
      setLoading(false);
      return;
    }

    mutation.mutate({ ...formData, unitPrice: price }, {
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs font-medium text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Salon Selection */}
            {(salons.length > 1 || canViewAllSalons(null)) && (
              <div className="relative">
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  Salon *
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.salonId}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark appearance-none"
                  >
                    <option value="">Select Salon</option>
                    {salons.map((salon) => (
                      <option key={salon.id} value={salon.id}>
                        {salon.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Professional Shampoo"
                  className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. SHP-001"
                  className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  Type
                </label>
                <div className="relative">
                  <select
                     value={formData.isInventoryItem ? 'inventory' : 'service'}
                     onChange={(e) => setFormData({...formData, isInventoryItem: e.target.value === 'inventory'})}
                     className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark appearance-none"
                  >
                     <option value="inventory">Inventory Item (Track Stock)</option>
                     <option value="service">Non-Inventory / Service</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  Unit Price (RWF)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: e.target.value })
                  }
                  className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
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
                  className="w-full h-9 rounded-lg border border-border-light bg-background-light px-3 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[10px] uppercase font-bold text-text-light/50 dark:text-text-dark/50 tracking-wider">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Optional product description..."
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-xs text-text-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark resize-none"
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
