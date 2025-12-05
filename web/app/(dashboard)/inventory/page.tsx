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
import { useTheme } from '@/contexts/ThemeContext';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <InventoryContent />
    </div>
  );
}

function InventoryContent() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inventory' | 'non-inventory'>('all');
  
  // Initialize selectedSalonId from localStorage or empty string
  const [selectedSalonId, setSelectedSalonId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inventory-selected-salon-id') || '';
    }
    return '';
  });
  
  // Persist selectedSalonId to localStorage
  useEffect(() => {
    if (selectedSalonId) {
      localStorage.setItem('inventory-selected-salon-id', selectedSalonId);
    }
  }, [selectedSalonId]);

  // Fetch salons
  const { data: salons = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error('Error fetching salons:', error);
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
      // Validate that the stored salon ID still exists
      const storedSalonId = localStorage.getItem('inventory-selected-salon-id');
      const isValidStoredSalon = storedSalonId && salons.some(s => s.id === storedSalonId);
      
      // If only one salon, always select it
      if (salons.length === 1) {
        if (selectedSalonId !== salons[0].id) {
          setSelectedSalonId(salons[0].id);
        }
      }
      // If we have a valid stored salon ID, use it
      else if (isValidStoredSalon && selectedSalonId !== storedSalonId) {
        setSelectedSalonId(storedSalonId);
      }
      // If no salon selected but salons exist, select the first one
      else if (!selectedSalonId && !isValidStoredSalon) {
        setSelectedSalonId(salons[0].id);
      }
    }
    // For admins, don't auto-select - let them choose "All Salons"
  }, [salons, selectedSalonId, salonsLoading, canViewAll]);

  // Determine the effective salon ID for the query
  // Wait for salons to load before determining the effective salon ID
  const effectiveSalonId = useMemo(() => {
    if (salonsLoading) return null; // Still loading, don't query yet
    if (canViewAll) return selectedSalonId || 'all';
    if (salons.length === 0) return null; // No salons, can't query
    return selectedSalonId || (salons.length === 1 ? salons[0].id : 'all-owned');
  }, [selectedSalonId, salons, salonsLoading, canViewAll]);

  // Fetch products - only for selected salon or all owned salons (or all salons for admins)
  const productsQueryKey = [
    'inventory-products',
    effectiveSalonId || 'pending',
  ];
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: async (): Promise<Product[]> => {
      // Early return if no user
      if (!user) {
        return [];
      }

      try {
        // If salon is selected, filter by that salon
        // For admins: if no salon selected, get all products
        // For salon owners: if no salon selected, backend returns all their salons' products
        const params = effectiveSalonId && effectiveSalonId !== 'all' && effectiveSalonId !== 'all-owned' 
          ? { salonId: effectiveSalonId } 
          : {};
        
        const response = await api.get('/inventory/products', { params });

        // Handle different response structures
        let data: Product[] = [];

        if (response?.data) {
          // Check if response.data is an array directly
          if (Array.isArray(response.data)) {
            data = response.data;
          }
          // Check if response.data.data exists and is an array
          else if (response.data.data && Array.isArray(response.data.data)) {
            data = response.data.data;
          }
          // If response.data is an object but not an array, return empty
          else {
            data = [];
          }
        }

        // Always return an array, never undefined or null
        return Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error('[Products Query] Error fetching products:', error);
        // Always return an array, never undefined
        return [];
      }
    },
    enabled: !!user && effectiveSalonId !== null && !salonsLoading, // Wait for salons to load and effectiveSalonId to be determined
    // Retry configuration
    retry: 1,
    retryDelay: 1000,
    // Keep data in cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Refetch on window focus
    refetchOnWindowFocus: true,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      // Also invalidate general products query for other pages
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
    },
  });

  // Filter products
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

  // Stats
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

  // Show message if user has no salons (but not for admins who can view all)
  if (!salonsLoading && salons.length === 0 && !canViewAll) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No Salons Found"
            description="You need to create a salon before you can add products. Please create a salon first."
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
              Inventory & Products
            </h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Manage products, inventory items, and stock
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                window.location.href = '/inventory/stock';
              }}
              variant="outline"
            >
              <Package className="w-4 h-4 mr-2" />
              Stock Management
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Total Products
            </div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              {stats.total}
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Inventory Items
            </div>
            <div className="text-2xl font-bold text-primary">{stats.inventoryItems}</div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
              Non-Inventory
            </div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              {stats.nonInventoryItems}
            </div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Avg. Price</div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">
              RWF {Math.round(stats.avgPrice).toLocaleString()}
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
              placeholder="Search products by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'all' | 'inventory' | 'non-inventory')
              }
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="inventory">Inventory Items</option>
              <option value="non-inventory">Non-Inventory</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
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
                >
                  <Plus className="w-5 h-5" />
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
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowModal(true);
                          }}
                          className="text-primary hover:text-primary/80 transition"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
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
                          className="text-danger hover:text-danger/80 transition"
                          title="Delete product"
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

      {/* Product Modal */}
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
            // Also invalidate general products query for other pages
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </>
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
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save product');
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
              {product ? 'Edit Product' : 'Add New Product'}
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
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional Shampoo"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., SHP-001 (optional)"
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
                placeholder="Product description (optional)"
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Unit Price (RWF)
                </label>
                <input
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
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Tax Rate (%)
                </label>
                <input
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
                  className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isInventoryItem}
                  onChange={(e) => setFormData({ ...formData, isInventoryItem: e.target.checked })}
                  className="w-5 h-5 text-primary border-border-light dark:border-border-dark rounded focus:ring-primary/50 focus:ring-2"
                />
                <span className="text-sm font-medium text-text-light dark:text-text-dark">
                  Track inventory for this item (stock levels will be managed)
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
