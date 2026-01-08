'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Search,
  X,
  Check,
  Package,
  Scissors,
  User,
  AlertCircle,
  Zap,
  Receipt
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category?: string;
}

interface CartItem {
  id: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
}

export default function QuickSalePage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <QuickSaleContent />
    </ProtectedRoute>
  );
}

function QuickSaleContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data;
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const response = await api.get('/products');
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    initialData: [],
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers', customerSearchQuery],
    queryFn: async () => {
      const response = await api.get('/customers', {
        params: { search: customerSearchQuery }
      });
      return response.data;
    },
    enabled: showCustomerSearch && customerSearchQuery.length > 1,
  });

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: Record<string, unknown>) => {
      const response = await api.post('/sales', saleData);
      return response.data;
    },
    onSuccess: () => {
      setCart([]);
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Filter items based on search
  const filteredServices = useMemo(() => {
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      product.stockQuantity > 0
    );
  }, [products, searchQuery]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id && cartItem.type === type);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id && cartItem.type === type
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        type,
        name: item.name,
        price: item.price,
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (id: string, type: string, change: number) => {
    setCart(cart.map(item =>
      item.id === id && item.type === type
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string, type: string) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const saleData = {
      customerId: selectedCustomer?.id,
      items: cart.map(item => ({
        [`${item.type}Id`]: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      paymentMethod,
      subtotal,
      tax,
      total,
    };

    createSaleMutation.mutate(saleData);
  };

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-text-light dark:text-text-dark">Quick Sale</h1>
              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">Fast checkout</p>
            </div>
          </div>
          {selectedCustomer && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-xl">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">{selectedCustomer.fullName}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">{selectedCustomer.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="p-1 text-text-light/40 hover:text-text-light hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Items */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Tabs */}
          <div className="p-4 sm:p-6 space-y-3 border-b border-border-light dark:border-border-dark bg-surface-light/50 dark:bg-surface-dark/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                placeholder="Search services or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'services'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70 hover:bg-primary/10'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span className="hidden sm:inline">Services</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20">{services.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeTab === 'products'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70 hover:bg-primary/10'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Products</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20">{products.length}</span>
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {activeTab === 'services' ? (
                filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service, 'service')}
                    className="relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left group"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-3xl" />
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                        <Scissors className="w-5 h-5 text-primary" />
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-background-light dark:bg-background-dark flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1 truncate">{service.name}</h3>
                    <p className="text-lg font-black text-primary">RWF {(service.price || 0).toLocaleString()}</p>
                    {service.duration && (
                      <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1">{service.duration} min</p>
                    )}
                  </button>
                ))
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product, 'product')}
                    className="relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all text-left group"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-3xl" />
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition">
                        <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-background-light dark:bg-background-dark flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1 truncate">{product.name}</h3>
                    <p className="text-lg font-black text-primary">RWF {(product.price || 0).toLocaleString()}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      product.stockQuantity > 10 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {product.stockQuantity} in stock
                    </span>
                  </button>
                ))
              )}
            </div>

            {((activeTab === 'services' && filteredServices.length === 0) ||
              (activeTab === 'products' && filteredProducts.length === 0)) && (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">No {activeTab} found</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-80 lg:w-96 bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark flex flex-col">
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-black text-text-light dark:text-text-dark uppercase tracking-wider">Cart</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">{cart.length}</span>
            </div>

            {!selectedCustomer && (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-background-light dark:bg-background-dark border border-dashed border-border-light dark:border-border-dark hover:border-primary text-text-light/60 dark:text-text-dark/60 hover:text-primary rounded-xl transition text-sm"
              >
                <User className="w-4 h-4" />
                Add Customer (Optional)
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-7 h-7 text-text-light/20 dark:text-text-dark/20" />
                </div>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">Cart is empty</p>
                <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.type}`} className="bg-background-light dark:bg-background-dark rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'service' ? 'bg-primary/10' : 'bg-green-500/10'
                        }`}>
                          {item.type === 'service' ? (
                            <Scissors className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-light dark:text-text-dark truncate">{item.name}</p>
                          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                            RWF {(item.price || 0).toLocaleString()} each
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="p-1 text-text-light/30 hover:text-danger hover:bg-danger/10 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.type, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-lg hover:bg-primary/10 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.type, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-lg hover:bg-primary/10 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-black text-primary">
                        RWF {((item.price || 0) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-border-light dark:border-border-dark space-y-3">
              {/* Payment Method */}
              <div>
                <p className="text-[10px] font-black text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', icon: Banknote, label: 'Cash' },
                    { id: 'card', icon: CreditCard, label: 'Card' },
                    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMethod(id as 'cash' | 'card' | 'mobile')}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition ${
                        paymentMethod === id
                          ? 'bg-primary text-white'
                          : 'bg-background-light dark:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:bg-primary/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Subtotal</span>
                  <span className="font-semibold">RWF {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Tax (18%)</span>
                  <span className="font-semibold">RWF {Math.round(tax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-black pt-2 border-t border-border-light dark:border-border-dark">
                  <span>Total</span>
                  <span className="text-primary">RWF {Math.round(total).toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                variant="primary"
                className="w-full h-12 text-sm font-semibold"
                disabled={createSaleMutation.isPending}
              >
                <Receipt className="w-4 h-4 mr-2" />
                {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" onClick={() => setShowCustomerSearch(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4">
              <div className="p-4 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-black text-text-light dark:text-text-dark">Select Customer</h3>
                  </div>
                  <button onClick={() => setShowCustomerSearch(false)} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition">
                    <X className="w-4 h-4 text-text-light/60" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {customers.length > 0 ? (
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerSearch(false);
                          setCustomerSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl hover:bg-primary/10 hover:border-primary border border-transparent transition text-left"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">{customer.fullName}</p>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">{customer.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : customerSearchQuery.length > 1 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">No customers found</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Start typing to search...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Toast */}
      {createSaleMutation.isSuccess && (
        <div className="fixed bottom-6 right-6 bg-success text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Check className="w-5 h-5" />
          <p className="text-sm font-semibold">Sale completed successfully!</p>
        </div>
      )}
    </div>
  );
}
