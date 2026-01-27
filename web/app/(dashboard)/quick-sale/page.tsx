'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
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
  Receipt,
  Loader2,
  Box,
  BadgePercent
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
  const { success, error: toastError } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      const data = response.data?.data || response.data;
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        id: item.id,
        name: item.name,
        // Map backend 'basePrice' to frontend 'price', ensure it's a number
        price: Number(item.basePrice || item.price || 0), 
        // Map backend 'durationMinutes' to frontend 'duration'
        duration: Number(item.durationMinutes || item.duration || 0),
        category: item.category,
      }));
    },
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const response = await api.get('/products');
        const data = response.data?.data || response.data;
        return (Array.isArray(data) ? data : []).map((item: any) => ({
          ...item,
          id: item.id,
          name: item.name,
          // Map backend 'unitPrice' to frontend 'price', ensure it's a number
          price: Number(item.unitPrice || item.price || 0),
          stockQuantity: Number(item.stockQuantity || item.quantity || 0),
          category: item.category,
        }));
      } catch {
        return [];
      }
    },
    initialData: [],
  });

  // Fetch customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
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
      success('Sale completed successfully!');
    },
    onError: () => {
        toastError('Failed to complete sale. Please try again.');
    }
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
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-4 sm:px-6 py-3 shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-5 h-5 text-text-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-light dark:text-text-dark">Quick Sale</h1>
              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider font-semibold">Fast Service Checkout</p>
            </div>
          </div>
          {selectedCustomer && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-xl">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark leading-none">{selectedCustomer.fullName}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 leading-none mt-1">{selectedCustomer.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="ml-1 p-1 text-text-light/40 hover:text-text-light hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Items */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Search and Tabs */}
          <div className="p-4 sm:p-6 space-y-4 border-b border-border-light dark:border-border-dark bg-surface-light/50 dark:bg-surface-dark/50 z-10">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                    />
                </div>
                
                <div className="flex bg-background-secondary dark:bg-background-dark/50 p-1 rounded-xl border border-border-light dark:border-border-dark">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'services'
                            ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm'
                            : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                        }`}
                    >
                        <Scissors className="w-3.5 h-3.5" />
                        Services
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'services' ? 'bg-primary/10' : 'bg-black/5 dark:bg-white/5'}`}>
                            {services.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'products'
                            ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm'
                            : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                        }`}
                    >
                        <Package className="w-3.5 h-3.5" />
                        Products
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'products' ? 'bg-primary/10' : 'bg-black/5 dark:bg-white/5'}`}>
                            {products.length}
                        </span>
                    </button>
                </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background-light/50 dark:bg-background-dark/50">
            {isLoadingServices || isLoadingProducts ? (
                 <div className="flex h-full items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {activeTab === 'services' ? (
                    filteredServices.length > 0 ? (
                        filteredServices.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => addToCart(service, 'service')}
                            className="relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group flex flex-col h-full"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Scissors className="w-12 h-12 text-primary rotate-12" />
                            </div>
                            
                            <div className="mb-auto">
                                <h3 className="text-sm font-bold text-text-light dark:text-text-dark line-clamp-2 mb-1 pr-4">{service.name}</h3>
                                {service.duration && (
                                    <Badge variant="default" size="sm" className="mb-3">
                                        {service.duration} min
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between w-full">
                                <p className="text-lg font-bold text-primary">
                                    {(service.price || 0).toLocaleString()} <span className="text-[10px] font-normal text-text-light/60 dark:text-text-dark/60">RWF</span>
                                </p>
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </button>
                        ))
                    ) : (
                        <div className="col-span-full py-12">
                             <EmptyState
                                icon={<Scissors className="w-12 h-12" />}
                                title="No Services Found"
                                description="Try adjusting your search terms."
                            />
                        </div>
                    )
                ) : (
                    filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product, 'product')}
                            className="relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group flex flex-col h-full"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Box className="w-12 h-12 text-success rotate-12" />
                            </div>

                            <div className="mb-auto">
                                <h3 className="text-sm font-bold text-text-light dark:text-text-dark line-clamp-2 mb-1 pr-4">{product.name}</h3>
                                <Badge 
                                    variant={product.stockQuantity > 10 ? 'success' : 'warning'} 
                                    size="sm" 
                                    className="mb-3"
                                >
                                    {product.stockQuantity} in stock
                                </Badge>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between w-full">
                                <p className="text-lg font-bold text-primary">
                                    {(product.price || 0).toLocaleString()} <span className="text-[10px] font-normal text-text-light/60 dark:text-text-dark/60">RWF</span>
                                </p>
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </button>
                        ))
                    ) : (
                         <div className="col-span-full py-12">
                            <EmptyState
                                icon={<Package className="w-12 h-12" />}
                                title="No Products Found"
                                description="Try adjusting your search terms or verify stock availability."
                            />
                        </div>
                    )
                )}
                </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-80 2xl:w-96 bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark flex flex-col shadow-2xl z-20">
          <div className="p-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wider">Current Cart</h2>
                        <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 font-medium">{cart.length} items</p>
                    </div>
                </div>
                {cart.length > 0 && 
                     <Badge variant="primary" size="lg" className="text-sm">
                        RWF {Math.round(total).toLocaleString()}
                     </Badge>
                }
            </div>

            {!selectedCustomer && (
             <Button
                variant="outline"
                className="w-full justify-start text-text-light/60 dark:text-text-dark/60 border-dashed"
                onClick={() => setShowCustomerSearch(true)}
             >
                <User className="w-4 h-4 mr-2" />
                Add Customer (Optional)
             </Button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 bg-background-light/30 dark:bg-background-dark/30">
            {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                  <div className="w-16 h-16 bg-background-secondary dark:bg-background-dark rounded-full flex items-center justify-center mb-4">
                     <ShoppingCart className="w-6 h-6 text-text-light/40 dark:text-text-dark/40" />
                  </div>
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-1">Cart is Empty</h3>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">Select services or products from the list to add them to the sale.</p>
               </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.type}`} className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 border border-border-light dark:border-border-dark shadow-sm group">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'service' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                        }`}>
                          {item.type === 'service' ? (
                            <Scissors className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate leading-tight">{item.name}</p>
                          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-0.5">
                            Unit: RWF {(item.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.type)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-text-light/30 hover:text-white hover:bg-danger rounded-lg transition-all"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-border-light dark:border-border-dark">
                      <div className="flex items-center gap-1 bg-background-secondary dark:bg-background-dark rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.type, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-surface-dark shadow-sm transition-all"
                        >
                          <Minus className="w-3 h-3 text-text-light dark:text-text-dark" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-text-light dark:text-text-dark">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.type, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-surface-dark shadow-sm transition-all"
                        >
                          <Plus className="w-3 h-3 text-text-light dark:text-text-dark" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        RWF {((item.price || 0) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Area */}
          <div className="p-5 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark z-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
             {cart.length > 0 ? (
                <div className="space-y-4">
                    {/* Payment Method */}
                    <div>
                        <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider mb-2">Payment Method</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'cash', icon: Banknote, label: 'Cash' },
                                { id: 'card', icon: CreditCard, label: 'Card' },
                                { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                            ].map(({ id, icon: Icon, label }) => (
                                <button
                                key={id}
                                onClick={() => setPaymentMethod(id as 'cash' | 'card' | 'mobile')}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                                    paymentMethod === id
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-transparent bg-background-secondary dark:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:bg-background-secondary/80'
                                }`}
                                >
                                <Icon className={`w-4 h-4 ${paymentMethod === id ? 'fill-current' : ''}`} />
                                {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 py-2 border-t border-border-light dark:border-border-dark">
                         <div className="flex justify-between text-xs text-text-light/60 dark:text-text-dark/60">
                            <span>Subtotal</span>
                            <span>RWF {subtotal.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-xs text-text-light/60 dark:text-text-dark/60">
                            <span>Tax (18%)</span>
                            <span>RWF {Math.round(tax).toLocaleString()}</span>
                         </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                         <div>
                             <p className="text-xs text-text-light/50 dark:text-text-dark/50 font-medium uppercase mb-0.5">Total Amount</p>
                             <p className="text-2xl font-black text-primary leading-none">
                                <span className="text-sm align-top mr-0.5 opacity-60 font-medium">RWF</span>
                                {Math.round(total).toLocaleString()}
                             </p>
                         </div>
                    </div>

                    <Button
                        onClick={handleCheckout}
                        variant="primary"
                        className="w-full py-6 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all"
                        disabled={createSaleMutation.isPending}
                        loading={createSaleMutation.isPending}
                    >
                        {!createSaleMutation.isPending && <Receipt className="w-5 h-5 mr-2" />}
                        Complete Transaction
                    </Button>
                </div>
             ) : (
                <div className="text-center opacity-50 py-4">
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 italic">Add items to proceed to checkout</p>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowCustomerSearch(false)}>
            <div 
                className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4"
                onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Select Customer</h3>
                        <p className="text-xs text-text-light/50 dark:text-text-dark/50">Link this sale to a client record</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCustomerSearch(false)} className="p-2 hover:bg-background-secondary dark:hover:bg-background-dark rounded-full transition-colors">
                    <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-light dark:text-text-dark"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {isLoadingCustomers ? (
                     <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : customers.length > 0 ? (
                  <div className="space-y-1">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerSearch(false);
                          setCustomerSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all text-left group"
                      >
                        <div className="h-10 w-10 rounded-full bg-background-secondary dark:bg-background-dark flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                            <span className="font-bold text-sm">{customer.fullName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-light dark:text-text-dark truncate">{customer.fullName}</p>
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">{customer.phone}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check className="w-4 h-4 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : customerSearchQuery.length > 1 ? (
                  <div className="text-center py-12">
                     <div className="w-12 h-12 bg-background-secondary dark:bg-background-dark rounded-full flex items-center justify-center mx-auto mb-3">
                         <User className="w-6 h-6 text-text-light/30 dark:text-text-dark/30" />
                     </div>
                    <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">No customers found</p>
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center">
                    <Search className="w-10 h-10 text-text-light/10 dark:text-text-dark/10 mb-3" />
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40">Start typing to search...</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
