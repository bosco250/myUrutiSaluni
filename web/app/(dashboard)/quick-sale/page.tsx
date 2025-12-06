'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  Tag
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
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
      } catch (error) {
        // Always return an array, never undefined
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
    mutationFn: async (saleData: any) => {
      const response = await api.post('/sales', saleData);
      return response.data;
    },
    onSuccess: () => {
      // Clear cart and customer
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
  const tax = subtotal * 0.18; // 18% tax
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
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Quick Sale</h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">Fast checkout for services and products</p>
          </div>
          {selectedCustomer && (
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-xl">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-text-light dark:text-text-dark">{selectedCustomer.fullName}</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-text-light/40 hover:text-text-light">
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
          <div className="p-6 space-y-4 border-b border-border-light dark:border-border-dark">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                placeholder="Search services or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                  activeTab === 'services'
                    ? 'bg-primary text-white'
                    : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10'
                }`}
              >
                <Scissors className="w-4 h-4" />
                Services ({services.length})
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                  activeTab === 'products'
                    ? 'bg-primary text-white'
                    : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10'
                }`}
              >
                <Package className="w-4 h-4" />
                Products ({products.length})
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeTab === 'services' ? (
                filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service, 'service')}
                    className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary transition text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Scissors className="w-8 h-8 text-primary/60 group-hover:text-primary transition" />
                      <Plus className="w-5 h-5 text-text-light/40 group-hover:text-primary transition" />
                    </div>
                    <h3 className="font-medium text-text-light dark:text-text-dark mb-1 truncate">{service.name}</h3>
                    <p className="text-lg font-bold text-primary">RWF {service.price.toLocaleString()}</p>
                    {service.duration && (
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">{service.duration} min</p>
                    )}
                  </button>
                ))
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product, 'product')}
                    className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary transition text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package className="w-8 h-8 text-primary/60 group-hover:text-primary transition" />
                      <Plus className="w-5 h-5 text-text-light/40 group-hover:text-primary transition" />
                    </div>
                    <h3 className="font-medium text-text-light dark:text-text-dark mb-1 truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-primary">RWF {product.price.toLocaleString()}</p>
                    <Badge variant={product.stockQuantity > 10 ? 'success' : 'warning'} size="sm" className="mt-1">
                      {product.stockQuantity} in stock
                    </Badge>
                  </button>
                ))
              )}
            </div>

            {((activeTab === 'services' && filteredServices.length === 0) ||
              (activeTab === 'products' && filteredProducts.length === 0)) && (
              <div className="text-center py-12">
                <p className="text-text-light/60 dark:text-text-dark/60">
                  No {activeTab} found
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-96 bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark flex flex-col">
          <div className="p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Cart ({cart.length})</h2>
            </div>

            {!selectedCustomer && (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition"
              >
                <User className="w-4 h-4" />
                Add Customer (Optional)
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
                <p className="text-text-light/60 dark:text-text-dark/60">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.type}`} className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'service' ? (
                            <Scissors className="w-4 h-4 text-primary" />
                          ) : (
                            <Package className="w-4 h-4 text-primary" />
                          )}
                          <p className="font-medium text-text-light dark:text-text-dark text-sm">{item.name}</p>
                        </div>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          RWF {item.price.toLocaleString()} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="text-danger hover:text-danger/80 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.type, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-lg hover:bg-primary/10 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.type, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-lg hover:bg-primary/10 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="font-bold text-primary">
                        RWF {(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-border-light dark:border-border-dark space-y-4">
              {/* Payment Method */}
              <div>
                <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${
                      paymentMethod === 'cash'
                        ? 'bg-primary text-white'
                        : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-primary/10'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${
                      paymentMethod === 'card'
                        ? 'bg-primary text-white'
                        : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-primary/10'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('mobile')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${
                      paymentMethod === 'mobile'
                        ? 'bg-primary text-white'
                        : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-primary/10'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">Mobile</span>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Subtotal</span>
                  <span className="font-medium">RWF {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Tax (18%)</span>
                  <span className="font-medium">RWF {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border-light dark:border-border-dark">
                  <span>Total</span>
                  <span className="text-primary">RWF {total.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                variant="primary"
                className="w-full flex items-center justify-center gap-2 py-4 text-lg"
                disabled={createSaleMutation.isPending}
              >
                <Check className="w-5 h-5" />
                {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowCustomerSearch(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Select Customer</h3>
                  <button onClick={() => setShowCustomerSearch(false)} className="text-text-light/60 hover:text-text-light">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                        className="w-full flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl hover:bg-primary/10 transition text-left"
                      >
                        <User className="w-10 h-10 p-2 bg-primary/10 text-primary rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium text-text-light dark:text-text-dark">{customer.fullName}</p>
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60">{customer.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : customerSearchQuery.length > 1 ? (
                  <p className="text-center py-8 text-text-light/60 dark:text-text-dark/60">No customers found</p>
                ) : (
                  <p className="text-center py-8 text-text-light/60 dark:text-text-dark/60">Start typing to search...</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Toast */}
      {createSaleMutation.isSuccess && (
        <div className="fixed bottom-6 right-6 bg-success text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Check className="w-5 h-5" />
          <p className="font-medium">Sale completed successfully!</p>
        </div>
      )}
    </div>
  );
}
