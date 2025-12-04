'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  User,
  UserPlus,
  CreditCard,
  DollarSign,
  Percent,
  Users,
  Package,
  Scissors,
  Trash2,
  Receipt,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Download,
  TrendingUp,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  code?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  sku?: string;
  taxRate: number;
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  loyaltyPoints?: number;
}

interface SalonEmployee {
  id: string;
  userId: string;
  roleTitle?: string;
  user?: {
    fullName: string;
  };
}

interface CartItem {
  id: string;
  type: 'service' | 'product';
  item: Service | Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  employeeId?: string;
  employeeName?: string;
  subtotal: number;
}

export default function SalesPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <POSInterface />
    </ProtectedRoute>
  );
}

interface Salon {
  id: string;
  name: string;
  ownerId: string;
}

function POSInterface() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<SalonEmployee | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Fetch user's salons
  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['user-salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        const allSalons = response.data || [];
        // Filter to user's salons if they're a salon owner/employee
        if (user?.role === 'salon_owner' || user?.role === 'salon_employee') {
          return allSalons.filter((s: Salon) => s.ownerId === user.id);
        }
        return allSalons;
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
  });

  // Set default salon
  useEffect(() => {
    if (salons.length > 0 && !selectedSalon) {
      setSelectedSalon(salons[0]);
    }
  }, [salons, selectedSalon]);

  const salonId = selectedSalon?.id;

  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services', salonId],
    queryFn: async () => {
      const response = await api.get(`/services${salonId ? `?salonId=${salonId}` : ''}`);
      return response.data?.data || response.data || [];
    },
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products', salonId],
    queryFn: async (): Promise<Product[]> => {
      try {
        const response = await api.get(`/inventory/products${salonId ? `?salonId=${salonId}` : ''}`);
        const data = response.data?.data || response.data;
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        // Always return an array, never undefined
        return [];
      }
    },
    initialData: [],
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data?.data || response.data || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<SalonEmployee[]>({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const response = await api.get(`/salons/${salonId}/employees`);
      return response.data || [];
    },
    enabled: !!salonId,
  });

  // Filter services and products
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.filter(s => s.basePrice > 0);
    const query = searchQuery.toLowerCase();
    return services.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products.filter(p => p.unitPrice > 0);
    const query = searchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const tax = cart.reduce((sum, item) => {
      if (item.type === 'product') {
        const product = item.item as Product;
        return sum + (item.subtotal * (product.taxRate || 0)) / 100;
      }
      return sum;
    }, 0);
    const total = subtotal - totalDiscount + tax;
    return { subtotal, discount: totalDiscount, tax, total };
  }, [cart]);

  // Add to cart
  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    const cartItem: CartItem = {
      id: `${type}-${item.id}-${Date.now()}`,
      type,
      item,
      quantity: 1,
      unitPrice: type === 'service' ? (item as Service).basePrice : (item as Product).unitPrice,
      discount: 0,
      employeeId: selectedEmployee?.id,
      employeeName: selectedEmployee?.user?.fullName || selectedEmployee?.roleTitle,
      subtotal: type === 'service' ? (item as Service).basePrice : (item as Product).unitPrice,
    };
    setCart([...cart, cartItem]);
    setSearchQuery('');
  };

  // Update cart item
  const updateCartItem = (itemId: string, updates: Partial<CartItem>) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        updated.subtotal = (updated.unitPrice * updated.quantity) - updated.discount;
        return updated;
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (paymentData: { method: string; reference?: string }) => {
      if (cart.length === 0) {
        throw new Error('Cart is empty. Please add items before checkout.');
      }

      if (!salonId) {
        throw new Error('Please select a salon');
      }

      if (!paymentData.method) {
        throw new Error('Please select a payment method');
      }

      const saleItems = cart.map(item => {
        if (!item.item?.id) {
          throw new Error(`Invalid item in cart: ${item.item?.name || 'Unknown'}`);
        }
        
        const saleItem: any = {
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        };
        
        // Set either serviceId or productId based on item type
        if (item.type === 'service') {
          saleItem.serviceId = item.item.id;
        } else {
          saleItem.productId = item.item.id;
        }
        
        // Only include salonEmployeeId if it's actually set and not empty
        if (item.employeeId && String(item.employeeId).trim()) {
          saleItem.salonEmployeeId = String(item.employeeId).trim();
        }
        
        // Only include discountAmount if it's greater than 0
        const discount = Number(item.discount) || 0;
        if (discount > 0) {
          saleItem.discountAmount = discount;
        }
        
        return saleItem;
      });

      const payload: any = {
        salonId: salonId,
        totalAmount: Number(cartTotals.total),
        paymentMethod: paymentData.method,
        items: saleItems,
      };
      
      // Only include customerId if a customer is selected
      if (selectedCustomer?.id) {
        payload.customerId = selectedCustomer.id;
      }
      
      // Only include paymentReference if it's provided
      if (paymentData.reference && paymentData.reference.trim()) {
        payload.paymentReference = paymentData.reference.trim();
      }

      // Validate payment method matches enum
      const validPaymentMethods = ['cash', 'mobile_money', 'card', 'bank_transfer'];
      if (!validPaymentMethods.includes(payload.paymentMethod)) {
        throw new Error(`Invalid payment method: ${payload.paymentMethod}`);
      }

      // Debug logging (remove in production)
      console.log('Creating sale with payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/sales', payload);
      // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
      const saleData = response.data?.data || response.data;
      console.log('[POS] Raw response:', response.data);
      console.log('[POS] Extracted sale data:', saleData);
      return saleData;
    },
    onSuccess: (data) => {
      console.log('[POS] Sale created successfully, received data:', JSON.stringify(data, null, 2));
      console.log('[POS] Sale items:', data?.items);
      console.log('[POS] Sale items length:', data?.items?.length);
      setCompletedSale(data);
      setShowPaymentModal(false);
      setShowReceipt(true);
      setCart([]);
      setSelectedCustomer(null);
      setSelectedEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products', salonId] });
    },
    onError: (error: any) => {
      console.error('Sale creation error:', error);
      const errorData = error?.response?.data || {};
      const errorMessage = errorData?.message || 
                          errorData?.error || 
                          error?.message || 
                          'Failed to create sale. Please check the console for details.';
      
      console.error('Error details:', {
        status: error?.response?.status,
        statusCode: errorData?.statusCode,
        message: errorMessage,
        fullError: errorData,
        stack: errorData?.stack,
      });
      
      // Show user-friendly error message
      alert(`Failed to create sale: ${errorMessage}\n\nCheck the browser console for more details.`);
      
      // Error will be handled by the UI
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }
    if (!salonId) {
      alert('Please select a salon before checkout.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = (method: string, reference?: string) => {
    createSaleMutation.mutate({ method, reference });
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedEmployee(null);
    setShowReceipt(false);
    setCompletedSale(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-6 py-4">
        <div className="flex items-center justify-between">
    <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Point of Sale</h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">Process sales and transactions</p>
          </div>
          <div className="flex items-center gap-3">
            {salons.length > 1 && (
              <select
                value={selectedSalon?.id || ''}
                onChange={(e) => {
                  const salon = salons.find(s => s.id === e.target.value);
                  setSelectedSalon(salon || null);
                }}
                className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              onClick={() => router.push('/sales/history')}
              variant="secondary"
            >
              Sales History
            </Button>
            <Button
              onClick={() => router.push('/sales/analytics')}
              variant="secondary"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            {showReceipt && (
              <Button
                onClick={handleNewSale}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main POS Interface */}
      {showReceipt && completedSale ? (
        <ReceiptView sale={completedSale} onNewSale={handleNewSale} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Products/Services */}
          <div className="w-2/3 border-r border-border-light dark:border-border-dark flex flex-col">
            {/* Search and Tabs */}
            <div className="p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services or products..."
                    className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'services'
                      ? 'bg-primary text-white'
                      : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark'
                  }`}
                >
                  <Scissors className="w-4 h-4 inline mr-2" />
                  Services
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === 'products'
                      ? 'bg-primary text-white'
                      : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Products
                </button>
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'services' ? (
                isLoadingServices ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => addToCart(service, 'service')}
                        className="p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-light dark:text-text-dark group-hover:text-primary transition">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-primary">
                            RWF {service.basePrice.toLocaleString()}
                          </span>
                          {service.durationMinutes && (
                            <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                              {service.durationMinutes}min
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product, 'product')}
                        className="p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-light dark:text-text-dark group-hover:text-primary transition">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-lg font-bold text-primary">
                            RWF {product.unitPrice.toLocaleString()}
                          </span>
                          {product.sku && (
                            <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                              {product.sku}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="w-1/3 flex flex-col bg-surface-light dark:bg-surface-dark">
            {/* Customer & Employee Selection */}
            <div className="p-4 border-b border-border-light dark:border-border-dark space-y-3">
              {/* Customer Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Customer
                </label>
                <button
                  onClick={() => setShowCustomerSearch(true)}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-left flex items-center justify-between hover:border-primary/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                    <span className={selectedCustomer ? 'text-text-light dark:text-text-dark' : 'text-text-light/40 dark:text-text-dark/40'}>
                      {selectedCustomer ? selectedCustomer.fullName : 'Select or add customer'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                </button>
              </div>

              {/* Employee Selection */}
              {employees.length > 0 && (
        <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Assign to Employee
                  </label>
                  <select
                    value={selectedEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setSelectedEmployee(emp || null);
                    }}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">None</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.user?.fullName || emp.roleTitle || 'Employee'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Cart</h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-sm text-danger hover:text-danger/80"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mb-4" />
                  <p className="text-text-light/60 dark:text-text-dark/60">Cart is empty</p>
                  <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                    Add services or products to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      onUpdate={(updates) => updateCartItem(item.id, updates)}
                      onRemove={() => removeFromCart(item.id)}
                      employees={employees}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Cart Totals & Checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-light/60 dark:text-text-dark/60">Subtotal</span>
                    <span className="text-text-light dark:text-text-dark">RWF {cartTotals.subtotal.toLocaleString()}</span>
                  </div>
                  {cartTotals.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-light/60 dark:text-text-dark/60">Discount</span>
                      <span className="text-success">-RWF {cartTotals.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {cartTotals.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-light/60 dark:text-text-dark/60">Tax</span>
                      <span className="text-text-light dark:text-text-dark">RWF {cartTotals.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border-light dark:border-border-dark">
                    <span className="text-text-light dark:text-text-dark">Total</span>
                    <span className="text-primary">RWF {cartTotals.total.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  variant="primary"
                  className="w-full py-3 text-lg font-semibold"
                  disabled={createSaleMutation.isPending}
                >
                  {createSaleMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 mr-2" />
                      Checkout
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <CustomerSearchModal
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSearch(false);
          }}
          onClose={() => setShowCustomerSearch(false)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={cartTotals.total}
          onPay={handlePayment}
          onClose={() => setShowPaymentModal(false)}
          isLoading={createSaleMutation.isPending}
          error={createSaleMutation.error ? (createSaleMutation.error as any)?.response?.data?.message || (createSaleMutation.error as any)?.message || 'Failed to process payment. Please try again.' : null}
        />
      )}
    </div>
  );
}

function CartItemCard({
  item,
  onUpdate,
  onRemove,
  employees,
}: {
  item: CartItem;
  onUpdate: (updates: Partial<CartItem>) => void;
  onRemove: () => void;
  employees: SalonEmployee[];
}) {
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(item.discount.toString());

  const handleDiscount = () => {
    const discount = parseFloat(discountValue) || 0;
    const maxDiscount = item.unitPrice * item.quantity;
    onUpdate({ discount: Math.min(discount, maxDiscount) });
    setShowDiscount(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-text-light dark:text-text-dark">{item.item.name}</h4>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            {item.type === 'service' ? 'Service' : 'Product'}
            {item.employeeName && ` • ${item.employeeName}`}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1 hover:bg-danger/10 rounded text-danger"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => onUpdate({ quantity: Math.max(1, item.quantity - 1) })}
          className="p-1 bg-surface-light dark:bg-surface-dark rounded hover:bg-primary/10"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-16 px-2 py-1 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-text-light dark:text-text-dark"
          min="1"
        />
        <button
          onClick={() => onUpdate({ quantity: item.quantity + 1 })}
          className="p-1 bg-surface-light dark:bg-surface-dark rounded hover:bg-primary/10"
        >
          <Plus className="w-4 h-4" />
        </button>
        <span className="flex-1 text-right font-semibold text-text-light dark:text-text-dark">
          RWF {item.subtotal.toLocaleString()}
        </span>
      </div>

      {showDiscount ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Discount amount"
            className="flex-1 px-2 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light dark:text-text-dark"
          />
          <button
            onClick={handleDiscount}
            className="px-2 py-1 bg-primary text-white rounded text-sm"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setShowDiscount(false);
              setDiscountValue(item.discount.toString());
            }}
            className="px-2 py-1 bg-background-light dark:bg-background-dark rounded text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDiscount(true)}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Percent className="w-3 h-3" />
            {item.discount > 0 ? `Discount: RWF ${item.discount}` : 'Add discount'}
          </button>
          <span className="text-xs text-text-light/60 dark:text-text-dark/60">
            RWF {item.unitPrice.toLocaleString()} each
          </span>
        </div>
      )}
    </div>
  );
}

function CustomerSearchModal({
  customers,
  selectedCustomer,
  onSelect,
  onClose,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: '', phone: '', email: '' });

  const filteredCustomers = customers.filter(
    c =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomer) => {
      const response = await api.post('/customers', data);
      return response.data;
    },
    onSuccess: (data) => {
      onSelect(data);
      setShowAddForm(false);
      setNewCustomer({ fullName: '', phone: '', email: '' });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Select Customer</h2>
            <button onClick={onClose} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!showAddForm ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => onSelect(null as any)}
                  className={`w-full p-3 text-left border rounded-lg transition ${
                    !selectedCustomer
                      ? 'border-primary bg-primary/10'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-text-light dark:text-text-dark">Walk-in Customer</div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60">No customer selected</div>
                </button>

                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className={`w-full p-3 text-left border rounded-lg transition ${
                      selectedCustomer?.id === customer.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-text-light dark:text-text-dark">{customer.fullName}</div>
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      {customer.phone} {customer.email && `• ${customer.email}`}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setShowAddForm(true)}
                variant="secondary"
                className="w-full mt-4"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Customer
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-text-light dark:text-text-dark">Add New Customer</h3>
              <input
                type="text"
                placeholder="Full Name *"
                value={newCustomer.fullName}
                onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => createCustomerMutation.mutate(newCustomer)}
                  variant="primary"
                  className="flex-1"
                  disabled={!newCustomer.fullName || !newCustomer.phone || createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending ? 'Adding...' : 'Add Customer'}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCustomer({ fullName: '', phone: '', email: '' });
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  total,
  onPay,
  onClose,
  isLoading,
  error,
}: {
  total: number;
  onPay: (method: string, reference?: string) => void;
  onClose: () => void;
  isLoading: boolean;
  error?: string | null;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [reference, setReference] = useState('');

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: DollarSign },
    { value: 'mobile_money', label: 'Mobile Money', icon: CreditCard },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: DollarSign },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Payment</h2>
            <button onClick={onClose} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 text-center">
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">Total Amount</p>
            <p className="text-4xl font-bold text-primary">RWF {total.toLocaleString()}</p>
          </div>

          <div className="space-y-2 mb-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.value}
                  onClick={() => setSelectedMethod(method.value)}
                  className={`w-full p-4 border rounded-xl text-left transition ${
                    selectedMethod === method.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-text-light dark:text-text-dark">{method.label}</span>
            </div>
                </button>
              );
            })}
          </div>

          {selectedMethod && selectedMethod !== 'cash' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter transaction reference"
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-sm text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          <Button
            onClick={() => onPay(selectedMethod, reference || undefined)}
            variant="primary"
            className="w-full py-3"
            disabled={!selectedMethod || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Complete Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiptView({
  sale,
  onNewSale,
}: {
  sale: any;
  onNewSale: () => void;
}) {
  console.log('[ReceiptView] Rendering with sale:', sale);
  console.log('[ReceiptView] Sale items:', sale?.items);
  console.log('[ReceiptView] Sale items type:', typeof sale?.items, 'isArray:', Array.isArray(sale?.items));
  
  // Handle items - could be in sale.items or sale.data.items if wrapped
  const items = Array.isArray(sale?.items) ? sale.items : 
                 Array.isArray(sale?.data?.items) ? sale.data.items : [];
  
  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">Payment Successful!</h2>
          <p className="text-text-light/60 dark:text-text-dark/60">Sale completed successfully</p>
      </div>

        {/* Sale Items */}
        {items.length > 0 && (
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Items</h3>
            <div className="space-y-2">
              {items.map((item: any, index: number) => (
                <div key={item.id || index} className="flex justify-between items-start pb-2 border-b border-border-light dark:border-border-dark last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">
                      {item.service?.name || item.product?.name || 'Unknown Item'}
                    </p>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      {item.quantity} × {item.currency || 'RWF'} {Number(item.unitPrice || 0).toLocaleString()}
                      {item.discountAmount > 0 && (
                        <span className="text-success ml-2">
                          - {item.currency || 'RWF'} {Number(item.discountAmount || 0).toLocaleString()} discount
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-text-light dark:text-text-dark ml-4">
                    {item.currency || 'RWF'} {Number(item.lineTotal || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-text-light/60 dark:text-text-dark/60">Sale ID</span>
            <span className="text-text-light dark:text-text-dark font-mono text-sm">{sale?.id?.slice(0, 8) || 'N/A'}</span>
          </div>
          {sale?.customer && (
            <div className="flex justify-between">
              <span className="text-text-light/60 dark:text-text-dark/60">Customer</span>
              <span className="text-text-light dark:text-text-dark">{sale.customer.fullName || sale.customer.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-light/60 dark:text-text-dark/60">Total</span>
            <span className="text-lg font-bold text-primary">
              {sale?.currency || 'RWF'} {Number(sale?.totalAmount || 0).toLocaleString()}
            </span>
          </div>
          {sale?.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-text-light/60 dark:text-text-dark/60">Payment Method</span>
              <span className="text-text-light dark:text-text-dark capitalize">
                {sale.paymentMethod?.replace('_', ' ')}
              </span>
            </div>
          )}
          {sale?.paymentReference && (
            <div className="flex justify-between">
              <span className="text-text-light/60 dark:text-text-dark/60">Reference</span>
              <span className="text-text-light dark:text-text-dark font-mono text-sm">{sale.paymentReference}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => window.print()}
            variant="secondary"
            className="flex-1"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Button
            onClick={async () => {
              try {
                const response = await api.get(`/reports/receipt/${sale.id}`, {
                  responseType: 'blob',
                });
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `receipt-${sale.id?.slice(0, 8)}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Failed to download PDF:', error);
                alert('Failed to download PDF receipt. Please try again.');
              }
            }}
            variant="secondary"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={onNewSale}
            variant="primary"
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
