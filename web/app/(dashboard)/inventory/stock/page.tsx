'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Package,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  Edit,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/contexts/ThemeContext';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <StockManagementContent />
    </div>
  );
}

function StockManagementContent() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
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
        console.error('Error fetching stock levels:', error);
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
        console.error('Error fetching movements:', error);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
          Stock Management
        </h1>
        <p className="text-text-light/60 dark:text-text-dark/60">
          Track inventory levels, add stock, and view movement history
        </p>
      </div>

      {/* Salon Filter */}
      {(salons.length > 1 || canViewAll) && (
        <div className="mb-6">
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Products</span>
            <Package className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.totalProducts}</p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Low Stock</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-500">{stats.lowStock}</p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Out of Stock</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">{stats.outOfStock}</p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Value</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-500">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValue)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border-light dark:border-border-dark">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
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
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
          className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Stock</option>
          <option value="low">Low Stock (&lt;10)</option>
          <option value="out">Out of Stock</option>
        </select>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
              {filteredProducts.map((product) => {
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
              })}
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
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    salonId: selectedSalonId || salons[0]?.id || '',
    productId: '',
    quantity: 1,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch products for selected salon
  const { data: products = [] } = useQuery({
    queryKey: ['products', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      const response = await api.get(`/inventory/products?salonId=${formData.salonId}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!formData.salonId,
  });

  const inventoryProducts = products.filter((p: any) => p.isInventoryItem);

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
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to add stock');
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <select
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <input
              type="text"
              value={salons[0]?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-text-light/60 dark:text-text-dark/60 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Product
          </label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            disabled={!formData.salonId || inventoryProducts.length === 0}
          >
            <option value="">Select Product</option>
            {inventoryProducts.map((product: any) => (
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
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Quantity
          </label>
          <input
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
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Notes (Optional)
          </label>
          <textarea
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
    const variants: Record<string, any> = {
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
          onChange={(e) => setFilter(e.target.value as any)}
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
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    salonId: selectedSalonId || salons[0]?.id || '',
    productId: '',
    quantity: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch products for selected salon
  const { data: products = [] } = useQuery({
    queryKey: ['products', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      const response = await api.get(`/inventory/products?salonId=${formData.salonId}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!formData.salonId,
  });

  const inventoryProducts = products.filter((p: any) => p.isInventoryItem);

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
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to adjust stock');
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <select
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Salon
            </label>
            <input
              type="text"
              value={salons[0]?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-background-light/50 dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-lg text-text-light/60 dark:text-text-dark/60 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Product
          </label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            disabled={!formData.salonId || inventoryProducts.length === 0}
          >
            <option value="">Select Product</option>
            {inventoryProducts.map((product: any) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Adjustment Quantity
          </label>
          <input
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
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
            Notes (Required)
          </label>
          <textarea
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

