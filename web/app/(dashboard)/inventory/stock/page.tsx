'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      <StockManagementContent />
    </div>
  );
}

function StockManagementContent() {
  const router = useRouter();
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
        <div className="mb-6">
          <Skeleton variant="text" width={200} height={32} className="mb-2" />
          <Skeleton variant="text" width={300} height={16} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!salonsLoading && salons.length === 0 && !canViewAll) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
        <EmptyState
          icon={<Package className="w-12 h-12" />}
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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/inventory')}
            variant="secondary"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-light dark:text-text-dark">Stock</h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
              Manage inventory levels & history
            </p>
          </div>
        </div>

           {/* Salon Filter */}
        {(salons.length > 1 || canViewAll) && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedSalonId}
              onChange={(e) => setSelectedSalonId(e.target.value)}
              className="w-full sm:w-48 px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      </div>

 
      {/* Stats Cards - Compacted */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                Products
              </p>
              <p className="text-lg font-bold text-text-light dark:text-text-dark mt-0.5">
                {stats.totalProducts}
              </p>
            </div>
            <div className="p-1.5 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
              <Package className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                Low Stock
              </p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.lowStock}
              </p>
            </div>
            <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-rose-500/10 to-red-500/10 border border-rose-500/20 dark:border-rose-500/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                Out of Stock
              </p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {stats.outOfStock}
              </p>
            </div>
            <div className="p-1.5 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg">
              <XCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                Total Value
              </p>
              <p className="text-lg font-bold text-text-light dark:text-text-dark mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.totalValue)}
              </p>
            </div>
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1 mb-4">
        <div className="flex flex-wrap gap-1">
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
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 ${!isActive && 'text-text-light/60 dark:text-text-dark/60 border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
        <EmptyState
          icon={<Package className="w-12 h-12" />}
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
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
          className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Stock</option>
          <option value="low">Low Stock (&lt;10)</option>
          <option value="out">Out of Stock</option>
        </select>
        <Button onClick={onRefresh} variant="secondary" size="sm" className="flex items-center gap-2 h-[34px]">
          <RefreshCw className="w-3.5 h-3.5" />
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
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  Product
                </th>
                {canViewAll && (
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                    Salon
                  </th>
                )}
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {isLoading ? (
                <tr>
                   <td colSpan={7} className="px-4 py-6 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                   </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No products found matching criteria.
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
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-xs text-text-light/50 dark:text-text-dark/50 max-w-[200px] truncate">
                          {product.description}
                        </div>
                      )}
                    </td>
                    {canViewAll && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-text-light/60 dark:text-text-dark/60">
                        {product.salon?.name || '-'}
                      </td>
                    )}
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-text-light/60 dark:text-text-dark/60 font-mono">
                      {product.sku || '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                       <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {product.stockLevel.toFixed(2)}
                       </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-text-light/60 dark:text-text-dark/60">
                      {product.unitPrice
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            product.unitPrice
                          )
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-text-light dark:text-text-dark">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        totalValue
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {isOutOfStock ? (
                        <Badge variant="destructive" size="sm" className="h-[20px] px-1.5 text-[10px]">Out</Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning" size="sm" className="h-[20px] px-1.5 text-[10px]">Low</Badge>
                      ) : (
                        <Badge variant="success" size="sm" className="h-[20px] px-1.5 text-[10px]">In Stock</Badge>
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
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Add Stock (Purchase)</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {(salons.length > 1 || canViewAll) ? (
          <div>
            <label htmlFor="add-stock-salon" className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
              SALON
            </label>
            <select
              id="add-stock-salon"
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value, productId: '' })}
              className="w-full px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
             <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">SALON</label>
             <div className="w-full px-3 py-1.5 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light/60 dark:text-text-dark/60">
                {salons[0]?.name || 'Loading...'}
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
           <div className="col-span-2 sm:col-span-1">
            <label htmlFor="add-stock-product" className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
               PRODUCT
            </label>
            <select
               id="add-stock-product"
               value={formData.productId}
               onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
               className="w-full px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
           
           <div className="col-span-2 sm:col-span-1">
             <label htmlFor="add-stock-quantity" className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
                QUANTITY
             </label>
             <input
                id="add-stock-quantity"
                type="number"
                min="0.001"
                step="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
             />
           </div>
        </div>

        <div>
          <label htmlFor="add-stock-notes" className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
            NOTES (OPTIONAL)
          </label>
          <textarea
            id="add-stock-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Add any notes about this purchase..."
          />
        </div>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={loading} className="w-full">
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
        return <ArrowUp className="w-3.5 h-3.5 text-green-500" />;
      case 'consumption':
        return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
      case 'adjustment':
        return <Edit className="w-3.5 h-3.5 text-yellow-500" />;
      case 'transfer':
        return <RefreshCw className="w-3.5 h-3.5 text-blue-500" />;
      case 'return':
        return <ArrowUp className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
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
    return <Badge variant={config.variant} size="sm" className="h-[20px] px-1.5 text-[10px]">{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
           <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredMovements.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
        <EmptyState
          icon={<History className="w-12 h-12" />}
          title="No Movements Found"
          description="No inventory movements recorded yet."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'purchase' | 'consumption' | 'adjustment')}
          className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Movements</option>
          <option value="purchase">Purchases</option>
          <option value="consumption">Consumptions</option>
          <option value="adjustment">Adjustments</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredMovements.map((movement) => (
          <div
            key={movement.id}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 p-1.5 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-light/10">
                   {getMovementIcon(movement.movementType)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {getMovementBadge(movement.movementType)}
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {movement.product?.name || 'Unknown Product'}
                    </span>
                    {movement.product?.sku && (
                      <span className="text-xs text-text-light/50 dark:text-text-dark/50 font-mono">
                        {movement.product.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                     <div className="text-xs text-text-light/60 dark:text-text-dark/60 space-y-0.5">
                        <div>
                           Quantity: <span className="font-bold text-text-light dark:text-text-dark">{movement.quantity}</span>
                        </div>
                        {canViewAll && movement.salon && (
                           <div>Salon: {movement.salon.name}</div>
                        )}
                        {movement.performedBy && (
                           <div>By: {movement.performedBy.fullName}</div>
                        )}
                        {movement.notes && <div className="italic">"{movement.notes}"</div>}
                     </div>
                     <div className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium whitespace-nowrap ml-2">
                        {format(new Date(movement.createdAt), 'MMM d, p')}
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

// Adjust Stock Tab (Improved)
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
    quantity: '', // Changed to string for better input handling
    notes: '',
  });
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('decrease');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch products with stock for selected salon
  interface ProductOption {
    id: string;
    name: string;
    sku?: string;
    isInventoryItem: boolean;
    stockLevel: number;
  }

  const { data: products = [] } = useQuery<ProductOption[]>({
    queryKey: ['stock-levels', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      const response = await api.get('/inventory/stock-levels', {
        params: { salonId: formData.salonId },
      });
      return response.data || [];
    },
    enabled: !!formData.salonId,
  });

  const inventoryProducts = products.filter((p) => p.isInventoryItem);
  const selectedProduct = inventoryProducts.find((p) => p.id === formData.productId);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const qty = parseFloat(data.quantity);
      const finalQuantity = adjustmentType === 'increase' ? qty : -qty;
      
      return api.post('/inventory/movements', {
        salonId: data.salonId,
        productId: data.productId,
        movementType: 'adjustment',
        quantity: finalQuantity,
        notes: data.notes || `Stock ${adjustmentType}`,
      });
    },
    onSuccess: () => {
      onSuccess();
      setFormData({
        salonId: selectedSalonId || salons[0]?.id || '',
        productId: '',
        quantity: '',
        notes: '',
      });
      setAdjustmentType('decrease');
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

    const qty = parseFloat(formData.quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid positive quantity');
      setLoading(false);
      return;
    }

    // Client-side validation for negative stock
    if (selectedProduct && adjustmentType === 'decrease') {
      if (selectedProduct.stockLevel - qty < 0) {
        setError(`Cannot remove ${qty}. Current stock is only ${selectedProduct.stockLevel.toFixed(2)}`);
        setLoading(false);
        return;
      }
    }

    mutation.mutate(formData);
  };

  const previewNewStock = useMemo(() => {
     if (!selectedProduct || !formData.quantity) return null;
     const qty = parseFloat(formData.quantity);
     if (isNaN(qty)) return null;
     
     const current = selectedProduct.stockLevel;
     const change = adjustmentType === 'increase' ? qty : -qty;
     return current + change;
  }, [selectedProduct, formData.quantity, adjustmentType]);

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">Adjust Stock</h2>
      <p className="text-xs text-text-light/50 dark:text-text-dark/50 mb-4">
        Correct discrepancies like breakage, loss, or found items.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(salons.length > 1 || canViewAll) ? (
          <div>
            <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
              SALON
            </label>
            <select
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value, productId: '' })}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">SALON</label>
            <div className="w-full px-3 py-2 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light/60 dark:text-text-dark/60">
              {salons[0]?.name || 'Loading...'}
            </div>
          </div>
        )}

        {/* Product Selection */}
        <div>
           <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
             PRODUCT
           </label>
           <select
             value={formData.productId}
             onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
             className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
             required
             disabled={!formData.salonId || inventoryProducts.length === 0}
           >
             <option value="">Select Product to Adjust</option>
             {inventoryProducts.map((product) => (
               <option key={product.id} value={product.id}>
                 {product.name} (Stock: {product.stockLevel.toFixed(2)})
               </option>
             ))}
           </select>
        </div>

        {/* Adjustment Type & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
              <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
                 ADJUSTMENT ACTION
              </label>
              <div className="flex bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-1">
                 <button
                    type="button"
                    onClick={() => setAdjustmentType('increase')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${adjustmentType === 'increase' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-light/60 hover:bg-surface-accent-light'}`}
                 >
                    <ArrowUp className="w-3.5 h-3.5" /> Increase
                 </button>
                 <button
                    type="button"
                    onClick={() => setAdjustmentType('decrease')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${adjustmentType === 'decrease' ? 'bg-rose-500 text-white shadow-sm' : 'text-text-light/60 hover:bg-surface-accent-light'}`}
                 >
                    <ArrowDown className="w-3.5 h-3.5" /> Decrease
                 </button>
              </div>
           </div>

           <div>
             <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
               QUANTITY
             </label>
             <input
               type="number"
               step="0.001"
               min="0"
               value={formData.quantity}
               onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
               className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
               required
               placeholder="e.g. 5"
             />
           </div>
        </div>

        {/* Stock Preview */}
        {selectedProduct && (
           <div className="bg-background-light/50 dark:bg-background-dark/50 rounded-lg p-3 border border-border-light dark:border-border-dark flex items-center justify-between">
              <div className="text-sm">
                 <span className="text-text-light/60 dark:text-text-dark/60">Current Stock:</span> 
                 <span className="font-bold text-text-light dark:text-text-dark ml-2">{selectedProduct.stockLevel.toFixed(2)}</span>
              </div>
              <div className="text-text-light/40 dark:text-text-dark/40">
                 <ArrowUp className="w-4 h-4 rotate-90" />
              </div>
              <div className="text-sm">
                 <span className="text-text-light/60 dark:text-text-dark/60">New Stock:</span> 
                 <span className={`font-bold ml-2 ${previewNewStock !== null && previewNewStock < 0 ? 'text-red-500' : 'text-primary'}`}>
                    {previewNewStock !== null ? previewNewStock.toFixed(2) : '-'}
                 </span>
              </div>
           </div>
        )}

        <div>
           <label className="block text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-1">
             REASON (REQUIRED)
           </label>
           <textarea
             value={formData.notes}
             onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
             rows={2}
             className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
             placeholder={adjustmentType === 'decrease' ? "e.g., 'Broken bottle', 'Expired'" : "e.g., 'Found extra stock'"}
             required
           />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Processing...' : `Confirm ${adjustmentType === 'increase' ? 'Increase' : 'Decrease'}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
