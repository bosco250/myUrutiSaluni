'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Package,
  Plus,
  TrendingUp,
  AlertTriangle,
  History,
  Edit,
  XCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { canViewAllSalons } from '@/lib/permissions';
import { format } from 'date-fns';

interface ProductWithStock {
  id: string;
  salonId: string;
  sku?: string;
  name: string;
  description?: string;
  unitPrice?: number;
  taxRate?: number;
  isInventoryItem: boolean;
  stockLevel: number;
  salon?: {
    id: string;
    name: string;
  };
}

interface InventoryMovement {
  id: string;
  salonId: string;
  productId?: string;
  movementType: 'purchase' | 'consumption' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  referenceId?: string;
  notes?: string;
  performedById?: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  salon?: {
    id: string;
    name: string;
  };
  performedBy?: {
    id: string;
    fullName: string;
  };
}

interface Salon {
  id: string;
  name: string;
}

type TabType = 'levels' | 'add-stock' | 'movements' | 'adjust';

export default function StockManagementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <StockManagementContent />
    </div>
  );
}

function StockManagementContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('levels');
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
      if (salons.length === 1) {
        if (selectedSalonId !== salons[0].id) {
          setSelectedSalonId(salons[0].id);
        }
      } else if (!selectedSalonId) {
        setSelectedSalonId(salons[0].id);
      }
    }
  }, [salons, selectedSalonId, salonsLoading, canViewAll]);

  // Fetch stock levels
  const { data: productsWithStock = [], isLoading: stockLoading, refetch: refetchStock } = useQuery<ProductWithStock[]>({
    queryKey: ['stock-levels', selectedSalonId || (canViewAll ? 'all' : 'all-owned')],
    queryFn: async (): Promise<ProductWithStock[]> => {
      if (!user) return [];
      try {
        const params = selectedSalonId ? { salonId: selectedSalonId } : {};
        const response = await api.get('/inventory/stock-levels', { params });
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && (salons.length > 0 || canViewAll) && !salonsLoading,
    refetchOnWindowFocus: true,
  });

  // Fetch movements
  const { data: movements = [], isLoading: movementsLoading } = useQuery<InventoryMovement[]>({
    queryKey: ['inventory-movements', selectedSalonId || (canViewAll ? 'all' : 'all-owned')],
    queryFn: async (): Promise<InventoryMovement[]> => {
      if (!user) return [];
      try {
        const params = selectedSalonId ? { salonId: selectedSalonId } : {};
        const response = await api.get('/inventory/movements', { params });
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && (salons.length > 0 || canViewAll) && !salonsLoading,
    refetchOnWindowFocus: true,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = productsWithStock.length;
    const lowStock = productsWithStock.filter((p) => p.stockLevel < 10).length;
    const outOfStock = productsWithStock.filter((p) => p.stockLevel <= 0).length;
    const totalValue = productsWithStock.reduce(
      (sum, p) => sum + (p.stockLevel * (p.unitPrice || 0)),
      0
    );

    return { totalProducts, lowStock, outOfStock, totalValue };
  }, [productsWithStock]);

  const tabs = [
    { id: 'levels' as TabType, label: 'Stock Levels', icon: Package },
    { id: 'add-stock' as TabType, label: 'Add Stock', icon: Plus },
    { id: 'movements' as TabType, label: 'History', icon: History },
    { id: 'adjust' as TabType, label: 'Adjust', icon: Edit },
  ];

  if (stockLoading || salonsLoading) {
    return (
      <>
        <div className="mb-8">
          <Skeleton variant="text" width={300} height={40} className="mb-2" />
          <Skeleton variant="text" width={400} height={20} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!salonsLoading && salons.length === 0 && !canViewAll) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
        <EmptyState
          icon={<Package className="w-16 h-16" />}
          title="No Salons Found"
          description="You need to create a salon before you can manage inventory. Please create a salon first."
          action={
            <Button onClick={() => (window.location.href = '/salons')}>Go to Salons</Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Stock</h1>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
          Track inventory levels, add stock, and view movement history
        </p>
      </div>

      {/* Salon Filter */}
      {(salons.length > 1 || canViewAll) && (
        <div className="mb-4">
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Total Products
              </p>
              <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                {stats.totalProducts}
              </p>
            </div>
            <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
              <Package className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Low Stock
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.lowStock}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-rose-500/10 to-red-500/10 border border-rose-500/20 dark:border-rose-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Out of Stock
              </p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {stats.outOfStock}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg">
              <XCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                Total Value
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValue)}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'levels' && (
        <StockLevelsTab
          products={productsWithStock}
          isLoading={stockLoading}
          onRefresh={refetchStock}
          canViewAll={canViewAll}
        />
      )}

      {activeTab === 'add-stock' && (
        <AddStockTab
          salons={salons}
          selectedSalonId={selectedSalonId}
          canViewAll={canViewAll}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            setActiveTab('levels');
          }}
        />
      )}

      {activeTab === 'movements' && (
        <MovementsTab movements={movements} isLoading={movementsLoading} canViewAll={canViewAll} />
      )}

      {activeTab === 'adjust' && (
        <AdjustStockTab
          salons={salons}
          selectedSalonId={selectedSalonId}
          canViewAll={canViewAll}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            setActiveTab('levels');
          }}
        />
      )}
    </div>
  );
}

// Stock Levels Tab
function StockLevelsTab({
  products,
  isLoading,
  onRefresh,
  canViewAll,
}: {
  products: ProductWithStock[];
  isLoading: boolean;
  onRefresh: () => void;
  canViewAll: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && product.stockLevel > 0 && product.stockLevel < 10) ||
        (stockFilter === 'out' && product.stockLevel <= 0);

      return matchesSearch && matchesStock;
    });
  }, [products, searchQuery, stockFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
        <EmptyState
          icon={<Package className="w-16 h-16" />}
          title="No Products Found"
          description={
            stockFilter === 'low'
              ? 'No products with low stock levels'
              : stockFilter === 'out'
              ? 'No products are out of stock'
              : 'No inventory items found. Create products and add stock to get started.'
          }
        />
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
          className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Stock</option>
          <option value="low">Low Stock (&lt;10)</option>
          <option value="out">Out of Stock</option>
        </select>
        <Button onClick={onRefresh} variant="secondary" size="sm" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Product
                </th>
                {canViewAll && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                    Salon
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-text-light/60 dark:text-text-dark/60">
                        Loading stock levels...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <EmptyState
                      icon={<Package />}
                      title="No products found"
                      description={
                        searchQuery
                          ? 'Try adjusting your search criteria.'
                          : 'No inventory items found. Add products to track stock levels.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                const isLowStock = product.stockLevel > 0 && product.stockLevel < 10;
                const isOutOfStock = product.stockLevel <= 0;
                const totalValue = product.stockLevel * (product.unitPrice || 0);

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {product.description}
                        </div>
                      )}
                    </td>
                    {canViewAll && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                        {product.salon?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">
                          {product.stockLevel.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                      {product.unitPrice
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            product.unitPrice
                          )
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        totalValue
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOutOfStock ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Add Stock Tab
function AddStockTab({
  salons,
  selectedSalonId,
  canViewAll,
  onSuccess,
}: {
  salons: Salon[];
  selectedSalonId: string;
  canViewAll: boolean;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    salonId: selectedSalonId || salons[0]?.id || '',
    productId: '',
    quantity: 1,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch products for selected salon
  interface InventoryProductOption {
    id: string;
    name: string;
    sku?: string;
    isInventoryItem: boolean;
  }

  const { data: products = [] } = useQuery<InventoryProductOption[]>({
    queryKey: ['products', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      const response = await api.get(`/inventory/products?salonId=${formData.salonId}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!formData.salonId,
  });

  const inventoryProducts = products.filter((p) => p.isInventoryItem);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/inventory/movements', {
        salonId: data.salonId,
        productId: data.productId,
        movementType: 'purchase',
        quantity: data.quantity,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      onSuccess();
      setFormData({
        salonId: selectedSalonId || salons[0]?.id || '',
        productId: '',
        quantity: 1,
        notes: '',
      });
      setError('');
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to add stock');
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

    if (!formData.productId) {
      setError('Please select a product');
      setLoading(false);
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
      <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Add Stock (Purchase)</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(salons.length > 1 || canViewAll) ? (
          <div>
            <label htmlFor="add-stock-salon" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <select
              id="add-stock-salon"
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value, productId: '' })}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select Salon</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="add-stock-salon-disabled" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <input
              id="add-stock-salon-disabled"
              type="text"
              value={salons[0]?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-text-light/60 dark:text-text-dark/60 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label htmlFor="add-stock-product" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Product
          </label>
          <select
            id="add-stock-product"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            disabled={!formData.salonId || inventoryProducts.length === 0}
          >
            <option value="">Select Product</option>
            {inventoryProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''}
              </option>
            ))}
          </select>
          {!formData.salonId && (
            <p className="mt-1 text-sm text-text-light/60 dark:text-text-dark/60">
              Please select a salon first
            </p>
          )}
          {formData.salonId && inventoryProducts.length === 0 && (
            <p className="mt-1 text-sm text-text-light/60 dark:text-text-dark/60">
              No inventory items found for this salon
            </p>
          )}
        </div>

        <div>
          <label htmlFor="add-stock-quantity" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Quantity
          </label>
          <input
            id="add-stock-quantity"
            type="number"
            min="0.001"
            step="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        <div>
          <label htmlFor="add-stock-notes" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="add-stock-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Add any notes about this purchase..."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Adding...' : 'Add Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Movements Tab
function MovementsTab({
  movements,
  isLoading,
  canViewAll,
}: {
  movements: InventoryMovement[];
  isLoading: boolean;
  canViewAll: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'purchase' | 'consumption' | 'adjustment'>('all');

  const filteredMovements = useMemo(() => {
    if (filter === 'all') return movements;
    return movements.filter((m) => m.movementType === filter);
  }, [movements, filter]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'consumption':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      case 'adjustment':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'transfer':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'return':
        return <ArrowUp className="w-4 h-4 text-purple-500" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const variants: Record<
      string,
      { label: string; variant: 'success' | 'destructive' | 'warning' | 'default' }
    > = {
      purchase: { label: 'Purchase', variant: 'success' },
      consumption: { label: 'Consumption', variant: 'destructive' },
      adjustment: { label: 'Adjustment', variant: 'warning' },
      transfer: { label: 'Transfer', variant: 'default' },
      return: { label: 'Return', variant: 'default' },
    };
    const config = variants[type] || { label: type, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredMovements.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8">
        <EmptyState
          icon={<History className="w-16 h-16" />}
          title="No Movements Found"
          description="No inventory movements recorded yet. Add stock to see movement history."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'purchase' | 'consumption' | 'adjustment')}
          className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Movements</option>
          <option value="purchase">Purchases</option>
          <option value="consumption">Consumptions</option>
          <option value="adjustment">Adjustments</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredMovements.map((movement) => (
          <div
            key={movement.id}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1">{getMovementIcon(movement.movementType)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getMovementBadge(movement.movementType)}
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {movement.product?.name || 'Unknown Product'}
                    </span>
                    {movement.product?.sku && (
                      <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                        ({movement.product.sku})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60 space-y-1">
                    <div>
                      Quantity: <span className="font-medium">{movement.quantity}</span>
                    </div>
                    {canViewAll && movement.salon && (
                      <div>Salon: {movement.salon.name}</div>
                    )}
                    {movement.performedBy && (
                      <div>Performed by: {movement.performedBy.fullName}</div>
                    )}
                    {movement.notes && <div>Notes: {movement.notes}</div>}
                    <div>
                      {format(new Date(movement.createdAt), 'PPp')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Adjust Stock Tab
function AdjustStockTab({
  salons,
  selectedSalonId,
  canViewAll,
  onSuccess,
}: {
  salons: Salon[];
  selectedSalonId: string;
  canViewAll: boolean;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    salonId: selectedSalonId || salons[0]?.id || '',
    productId: '',
    quantity: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch products for selected salon
  interface InventoryProductOption {
    id: string;
    name: string;
    sku?: string;
    isInventoryItem: boolean;
  }

  const { data: products = [] } = useQuery<InventoryProductOption[]>({
    queryKey: ['products', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      const response = await api.get(`/inventory/products?salonId=${formData.salonId}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!formData.salonId,
  });

  const inventoryProducts = products.filter((p) => p.isInventoryItem);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/inventory/movements', {
        salonId: data.salonId,
        productId: data.productId,
        movementType: 'adjustment',
        quantity: data.quantity,
        notes: data.notes || 'Stock adjustment',
      });
    },
    onSuccess: () => {
      onSuccess();
      setFormData({
        salonId: selectedSalonId || salons[0]?.id || '',
        productId: '',
        quantity: 0,
        notes: '',
      });
      setError('');
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to adjust stock');
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

    if (!formData.productId) {
      setError('Please select a product');
      setLoading(false);
      return;
    }

    if (formData.quantity === 0) {
      setError('Quantity cannot be zero');
      setLoading(false);
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
      <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">Adjust Stock</h2>
      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
        Use positive values to increase stock, negative values to decrease stock.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(salons.length > 1 || canViewAll) ? (
          <div>
            <label htmlFor="adjust-stock-salon" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <select
              id="adjust-stock-salon"
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value, productId: '' })}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select Salon</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="adjust-stock-salon-disabled" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <input
              id="adjust-stock-salon-disabled"
              type="text"
              value={salons[0]?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-text-light/60 dark:text-text-dark/60 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label htmlFor="adjust-stock-product" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Product
          </label>
          <select
            id="adjust-stock-product"
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            disabled={!formData.salonId || inventoryProducts.length === 0}
          >
            <option value="">Select Product</option>
            {inventoryProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="adjust-stock-quantity" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Adjustment Quantity
          </label>
          <input
            id="adjust-stock-quantity"
            type="number"
            step="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            placeholder="Positive to increase, negative to decrease"
          />
          <p className="mt-1 text-sm text-text-light/60 dark:text-text-dark/60">
            Use positive values (+) to increase stock, negative values (-) to decrease stock
          </p>
        </div>

        <div>
          <label htmlFor="adjust-stock-notes" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Notes (Required)
          </label>
          <textarea
            id="adjust-stock-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Reason for adjustment (e.g., 'Damaged items', 'Found inventory', 'Correction')"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
}

