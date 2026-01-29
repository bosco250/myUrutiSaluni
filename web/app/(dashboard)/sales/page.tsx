'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';
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
  Receipt,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Download,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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
  stockQuantity?: number;
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
  isActive?: boolean;
  commissionRate?: number;
  user?: {
    fullName: string;
  };
}

interface Appointment {
  id: string;
  customerId?: string;
  serviceId?: string;
  salonEmployeeId?: string;
  scheduledStart: string;
  customer?: {
    fullName: string;
    phone: string;
  };
  service?: {
    name: string;
    basePrice: number;
    durationMinutes?: number;
  };
  status?: string;
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
  appointmentId?: string;
}

export default function SalesPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <POSInterface />
    </ProtectedRoute>
  );
}

interface Salon {
  id: string;
  name: string;
  ownerId: string;
  owner?: {
    id: string;
    fullName: string;
  };
}

function POSInterface() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canViewAllSalons } = usePermissions();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'services' | 'products' | 'appointments'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<SalonEmployee | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<unknown>(null);
  const [convertedAppointmentId, setConvertedAppointmentId] = useState<string | null>(null);

  // Fetch user's salons
  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['user-salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        const salonsData = response.data?.data || response.data || [];
        const allSalons = Array.isArray(salonsData) ? salonsData : [];
        
        // If user can view all salons (Admin/District Leader), return all
        if (canViewAllSalons()) {
          return allSalons;
        }
        
        // Otherwise, filter to only salons owned by the user
        // (Note: Employees might need different logic, but standardizing on ownership for now)
        return allSalons.filter((s: Salon) => 
          s.ownerId === user?.id || s.owner?.id === user?.id
        );
      } catch (error) {
        console.error('Error fetching salons for POS:', error);
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
      // For non-admins, salonId IS REQUIRED to fetch services
      if (!salonId && !canViewAllSalons()) {
        return [];
      }
      const response = await api.get(`/services${salonId ? `?salonId=${salonId}` : ''}`);
      return response.data?.data || response.data || [];
    },
    enabled: !!user && (!!salonId || canViewAllSalons()),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Fetch products
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: ['products', salonId],
    queryFn: async (): Promise<Product[]> => {
      try {
        if (!salonId) {
          return [];
        }

        // Use the stock-levels endpoint which includes stock levels
        const response = await api.get(`/inventory/stock-levels?salonId=${salonId}`);

        // Handle different response structures
        let data = response.data;

        // TransformInterceptor wraps as: { data: [...], statusCode: 200, timestamp: "..." }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Check if it has a 'data' property that is an array
          if ('data' in data && Array.isArray(data.data)) {
            data = data.data;
          }
          // Try to extract any array from the response object
          else {
            const possibleArray = Object.values(data as Record<string, unknown>).find((val) =>
              Array.isArray(val)
            );
            if (possibleArray) {
              data = possibleArray as Product[];
            } else {
              return [];
            }
          }
        } else if (!Array.isArray(data)) {
          return [];
        }

        // Ensure we always return an array
        return Array.isArray(data) ? (data as Product[]) : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId, // Only fetch when salonId is available
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Disable to prevent disappearing products
    refetchOnMount: true, // Always refetch on mount
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<SalonEmployee[]>({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const response = await api.get(`/salons/${salonId}/employees`);
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    },
    enabled: !!salonId,
  });

  // Fetch pending appointments
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['pos-appointments', salonId],
    queryFn: async () => {
      const response = await api.get('/appointments', {
        params: { salonId, status: 'confirmed' },
      });
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    },
    enabled: !!salonId && activeTab === 'appointments',
  });

  // Filter services and products
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.filter((s) => s.basePrice > 0);
    const query = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // If search query exists, filter by search terms
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    // Calculate subtotal (before discount and tax)
    const subtotal = cart.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      return sum + itemSubtotal;
    }, 0);

    // Calculate total discount
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);

    // Calculate tax on products (tax is applied to the amount after discount)
    const tax = cart.reduce((sum, item) => {
      if (item.type === 'product') {
        const product = item.item as Product;
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemAfterDiscount = itemSubtotal - item.discount;
        const itemTax = (itemAfterDiscount * (product.taxRate || 0)) / 100;
        return sum + itemTax;
      }
      return sum;
    }, 0);

    // Total = (Subtotal - Discount) + Tax
    const total = subtotal - totalDiscount + tax;

    return {
      subtotal: Math.max(0, subtotal),
      discount: Math.max(0, totalDiscount),
      tax: Math.max(0, tax),
      total: Math.max(0, total),
    };
  }, [cart]);

  // Add to cart
  const addToCart = (
    item: Service | Product,
    type: 'service' | 'product',
    appointmentId?: string
  ) => {
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
      appointmentId,
    };

    setCart([...cart, cartItem]);
    setSearchQuery('');
  };

  const convertAppointment = (apt: Appointment) => {
    if (
      apt.status !== 'confirmed' &&
      apt.status !== 'in_progress' &&
      apt.status !== 'booked'
    ) {
      toast.error('Please confirm this appointment before adding to cart');
      return;
    }

    // Check if cart already has an appointment
    const existingAppointmentItem = cart.find((item) => item.appointmentId);
    if (existingAppointmentItem) {
      if (existingAppointmentItem.appointmentId === apt.id) {
        toast.error('This appointment is already in the cart');
      } else {
        toast.error(
          'You can only process one appointment at a time. Please clear the cart first.'
        );
      }
      return;
    }

    if (!apt.service) return;

    // Set customer
    if (apt.customerId) {
      const customer = customers.find((c) => c.id === apt.customerId);
      if (customer) setSelectedCustomer(customer);
    }

    // Set employee
    if (apt.salonEmployeeId) {
      const emp = employees.find((e) => e.id === apt.salonEmployeeId);
      if (emp) setSelectedEmployee(emp);
    }

    // Add service to cart
    addToCart(
      {
        id: apt.serviceId!,
        name: apt.service.name,
        basePrice: apt.service.basePrice,
        durationMinutes: apt.service.durationMinutes || 0,
      } as Service,
      'service',
      apt.id
    );

    setConvertedAppointmentId(apt.id);
  };

  // Update cart item
  const updateCartItem = (itemId: string, updates: Partial<CartItem>) => {
    setCart(
      cart.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          updated.subtotal = updated.unitPrice * updated.quantity - updated.discount;
          return updated;
        }
        return item;
      })
    );
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (item?.appointmentId === convertedAppointmentId) {
      setConvertedAppointmentId(null);
    }
    setCart(cart.filter((item) => item.id !== itemId));
  };

  // Auto-assign global employee to service items when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      const serviceItemsWithoutEmployee = cart.filter(
        (item) => item.type === 'service' && !item.employeeId
      );

      if (serviceItemsWithoutEmployee.length > 0) {
        setCart((prevCart) =>
          prevCart.map((item) => {
            if (item.type === 'service' && !item.employeeId) {
              return {
                ...item,
                employeeId: selectedEmployee.id,
                employeeName: selectedEmployee.user?.fullName || selectedEmployee.roleTitle,
              };
            }
            return item;
          })
        );
      }
    }
  }, [selectedEmployee, cart]);

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

      const saleItems = cart.map((item) => {
        if (!item.item?.id) {
          throw new Error(`Invalid item in cart: ${item.item?.name || 'Unknown'}`);
        }

        const unitPrice = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;
        const discount = Number(item.discount) || 0;

        // Validate required fields
        if (unitPrice <= 0) {
          throw new Error(`Invalid unit price for item: ${item.item.name}`);
        }
        if (quantity <= 0) {
          throw new Error(`Invalid quantity for item: ${item.item.name}`);
        }

        const saleItem: Record<string, unknown> = {
          unitPrice: Math.max(0, unitPrice),
          quantity: Math.max(1, quantity),
        };

        // Set either serviceId or productId based on item type (required by DTO)
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
        if (discount > 0) {
          saleItem.discountAmount = Math.min(discount, unitPrice * quantity); // Ensure discount doesn't exceed line total
        }

        return saleItem;
      });

      // Calculate total from items to ensure accuracy
      const calculatedTotal = saleItems.reduce((sum, item) => {
        const lineTotal =
          (item.unitPrice as number) * (item.quantity as number) -
          ((item.discountAmount as number) || 0);
        return sum + Math.max(0, lineTotal);
      }, 0);

      // Add tax for products
      const productTax = cart.reduce((sum, item) => {
        if (item.type === 'product') {
          const product = item.item as Product;
          const itemSubtotal = item.unitPrice * item.quantity;
          const itemAfterDiscount = itemSubtotal - (item.discount || 0);
          const itemTax = (itemAfterDiscount * (product.taxRate || 0)) / 100;
          return sum + Math.max(0, itemTax);
        }
        return sum;
      }, 0);

      const finalTotal = calculatedTotal + productTax;

      // Ensure total is a valid number
      if (isNaN(finalTotal) || finalTotal < 0) {
        throw new Error('Invalid total amount calculated. Please check cart items.');
      }

      const payload: Record<string, unknown> = {
        salonId: salonId,
        totalAmount: Math.round(finalTotal * 100) / 100, // Round to 2 decimal places, ensure >= 0
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

      // Add appointmentId if this sale was converted from an appointment
      if (convertedAppointmentId) {
        payload.appointmentId = convertedAppointmentId;
      }

      // Validate payment method matches enum
      const validPaymentMethods = ['cash', 'mobile_money', 'card', 'bank_transfer'];
      if (!validPaymentMethods.includes(payload.paymentMethod as string)) {
        throw new Error(`Invalid payment method: ${payload.paymentMethod}`);
      }

      // Validate payload before sending
      if (!payload.salonId) {
        throw new Error('Salon ID is required');
      }
      if (!payload.items || (payload.items as unknown[]).length === 0) {
        throw new Error('At least one item is required');
      }
      if (isNaN(payload.totalAmount as number) || (payload.totalAmount as number) < 0) {
        throw new Error(`Invalid total amount: ${payload.totalAmount}`);
      }

      // Validate each item has required fields
      (payload.items as Array<Record<string, unknown>>).forEach((item, index) => {
        if (!item.serviceId && !item.productId) {
          throw new Error(`Item ${index + 1}: Either serviceId or productId is required`);
        }
        if (item.serviceId && item.productId) {
          throw new Error(`Item ${index + 1}: Cannot have both serviceId and productId`);
        }
        if (isNaN(item.unitPrice as number) || (item.unitPrice as number) <= 0) {
          throw new Error(`Item ${index + 1}: Invalid unit price`);
        }
        if (isNaN(item.quantity as number) || (item.quantity as number) <= 0) {
          throw new Error(`Item ${index + 1}: Invalid quantity`);
        }
      });

      const response = await api.post('/sales', payload);
      // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
      return response.data?.data || response.data;
    },
    onSuccess: (data: unknown) => {
      setCompletedSale(data);
      setShowPaymentModal(false);
      setShowReceipt(true);
      setCart([]);
      setSelectedCustomer(null);
      setSelectedEmployee(null);
      setConvertedAppointmentId(null);
      // Invalidate and refetch queries to update stock levels
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products', salonId] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['pos-appointments'] });
      // Refetch products to show updated stock
      queryClient.refetchQueries({ queryKey: ['products', salonId] });
    },
    onError: (error: unknown) => {
      const errorData =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data ||
        {};
      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        (error as Error)?.message ||
        'Failed to create sale. Please try again.';

      toast.error(`Failed to create sale: ${errorMessage}`);
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty. Please add items before checkout.');
      return;
    }
    if (!salonId) {
      toast.error('Please select a salon before checkout.');
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
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                Point of Sale
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Process sales and transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {salons.length > 1 && (
              <select
                value={selectedSalon?.id || ''}
                onChange={(e) => {
                  const salon = salons.find((s) => s.id === e.target.value);
                  setSelectedSalon(salon || null);
                }}
                className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {salons.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={() => router.push('/sales/history')} variant="secondary" size="sm">
              <Receipt className="w-4 h-4 mr-1.5" />
              History
            </Button>
            <Button onClick={() => router.push('/sales/analytics')} variant="secondary" size="sm">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Analytics
            </Button>
            {showReceipt && (
              <Button onClick={handleNewSale} variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
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
            <div className="p-3 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services or products..."
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'services'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10 border border-border-light dark:border-border-dark'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 inline mr-1.5" />
                  Services
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'products'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10 border border-border-light dark:border-border-dark'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 inline mr-1.5" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'appointments'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10 border border-border-light dark:border-border-dark'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                  Bookings
                </button>
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-3 bg-background-light dark:bg-background-dark">
              {activeTab === 'services' ? (
                isLoadingServices ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        Loading services...
                      </p>
                    </div>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Scissors className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mb-4" />
                    <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                      No services found
                    </p>
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                      {searchQuery ? 'Try a different search term' : 'No services available'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => addToCart(service, 'service')}
                        className="p-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-1.5 group-hover:bg-primary/20 transition">
                              <Scissors className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-sm text-text-light dark:text-text-dark group-hover:text-primary transition mb-0.5 line-clamp-1">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 line-clamp-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
                          <span className="text-sm font-bold text-primary">
                            RWF {service.basePrice.toLocaleString()}
                          </span>
                          {service.durationMinutes && (
                            <span className="text-[10px] text-text-light/40 dark:text-text-dark/40 bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded">
                              {service.durationMinutes}min
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : activeTab === 'products' ? (
                !salonId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mb-4" />
                    <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                      Please select a salon
                    </p>
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                      Select a salon to view products
                    </p>
                  </div>
                ) : isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        Loading products...
                      </p>
                    </div>
                  </div>
                ) : productsError ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="w-16 h-16 text-danger/20 mb-4" />
                    <p className="text-danger font-medium">Error loading products</p>
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                      {productsError instanceof Error
                        ? productsError.message
                        : 'Failed to fetch products'}
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-2">
                      Check console for details
                    </p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mb-4" />
                    <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                      No products found
                    </p>
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                      No products have been added to this salon yet
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-2">
                      Products: {products.length} | Filtered: {filteredProducts.length}
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mb-4" />
                    <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                      No products match your search
                    </p>
                    <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-1">
                      Try a different search term
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-2">
                      Total products: {products.length}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => {
                      const stockQuantity =
                        (product as unknown as { stockLevel?: number; stockQuantity?: number })
                          .stockLevel ??
                        (product as unknown as { stockLevel?: number; stockQuantity?: number })
                          .stockQuantity ??
                        0;
                      const isLowStock = stockQuantity > 0 && stockQuantity <= 10;
                      const isOutOfStock = stockQuantity === 0;

                      return (
                        <button
                          key={product.id}
                          onClick={() => !isOutOfStock && addToCart(product, 'product')}
                          disabled={isOutOfStock}
                          className={`p-3 bg-surface-light dark:bg-surface-dark border rounded-lg transition-all text-left group ${
                            isOutOfStock
                              ? 'border-border-light/50 dark:border-border-dark/50 opacity-60 cursor-not-allowed'
                              : 'border-border-light dark:border-border-dark hover:border-primary hover:shadow-md'
                          } ${isLowStock ? 'border-warning/50' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition ${
                                  isOutOfStock
                                    ? 'bg-danger/10'
                                    : isLowStock
                                      ? 'bg-warning/10 group-hover:bg-warning/20'
                                      : 'bg-primary/10 group-hover:bg-primary/20'
                                }`}
                              >
                                <Package
                                  className={`w-4 h-4 ${
                                    isOutOfStock
                                      ? 'text-danger'
                                      : isLowStock
                                        ? 'text-warning'
                                        : 'text-primary'
                                  }`}
                                />
                              </div>
                              <h3
                                className={`font-semibold text-sm mb-0.5 line-clamp-1 transition ${
                                  isOutOfStock
                                    ? 'text-text-light/40 dark:text-text-dark/40'
                                    : 'text-text-light dark:text-text-dark group-hover:text-primary'
                                }`}
                              >
                                {product.name}
                              </h3>
                              {product.description && (
                                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 line-clamp-1 mb-1">
                                  {product.description}
                                </p>
                              )}
                              {product.sku && (
                                <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-mono">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
                            <div className="flex-1">
                              <span
                                className={`text-sm font-bold block ${
                                  isOutOfStock
                                    ? 'text-text-light/40 dark:text-text-dark/40'
                                    : 'text-primary'
                                }`}
                              >
                                {product.unitPrice && Number(product.unitPrice) > 0
                                  ? `RWF ${Number(product.unitPrice).toLocaleString()}`
                                  : 'Price: N/A'}
                              </span>
                              <span
                                className={`text-[10px] font-medium block ${
                                  isOutOfStock
                                    ? 'text-danger'
                                    : isLowStock
                                      ? 'text-warning'
                                      : 'text-success'
                                }`}
                              >
                                {isOutOfStock
                                  ? 'Out of Stock'
                                  : stockQuantity > 0
                                    ? `${stockQuantity} in stock`
                                    : 'Stock: 0'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {isLoadingAppointments ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : appointments.filter(
                      (apt) =>
                        new Date(apt.scheduledStart).toDateString() === new Date().toDateString() &&
                        apt.status !== 'completed' &&
                        apt.status !== 'cancelled'
                    ).length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="w-12 h-12 text-text-light/20 dark:text-text-dark/20 mb-4" />
                      <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                        No confirmed bookings for today
                      </p>
                      {appointments.length > 0 && (
                        <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
                          (You have {appointments.length} upcoming bookings on other dates)
                        </p>
                      )}
                    </div>
                  ) : (
                    appointments
                      .filter(
                        (apt) =>
                          new Date(apt.scheduledStart).toDateString() === new Date().toDateString() &&
                          apt.status !== 'completed' &&
                          apt.status !== 'cancelled'
                      )
                      .map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => convertAppointment(apt)}
                          className="p-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-1.5 group-hover:bg-primary/20 transition">
                                <Calendar className="w-4 h-4 text-primary" />
                              </div>
                              <h3 className="font-semibold text-sm text-text-light dark:text-text-dark group-hover:text-primary transition mb-0.5 line-clamp-1">
                                {apt.service?.name || 'Service'}
                              </h3>
                              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 truncate">
                                {apt.customer?.fullName || 'Walk-in'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
                            <span className="text-sm font-bold text-primary">
                              RWF {apt.service?.basePrice?.toLocaleString() || '0'}
                            </span>
                            <span className="text-[9px] text-text-light/40 uppercase font-bold">
                              {new Date(apt.scheduledStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="w-1/3 flex flex-col bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark min-h-0">
            {/* Customer & Employee Selection - Sticky Header */}
            <div className="p-3 border-b border-border-light dark:border-border-dark space-y-2 bg-background-light dark:bg-background-dark shrink-0">
              {/* Customer Selection */}
              <div className="relative">
                <span className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5">
                  Customer
                </span>
                <button
                  onClick={() => setShowCustomerSearch(true)}
                  className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-left flex items-center justify-between hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span
                      className={`truncate text-sm ${
                        selectedCustomer
                          ? 'text-text-light dark:text-text-dark font-medium'
                          : 'text-text-light/40 dark:text-text-dark/40'
                      }`}
                    >
                      {selectedCustomer ? selectedCustomer.fullName : 'Select or add customer'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 shrink-0 ml-2" />
                </button>
              </div>

              {/* Employee Selection */}
              {employees.length > 0 && (
                <div>
                  <label
                    htmlFor="employee-assign-select"
                    className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5"
                  >
                    Assign to Employee
                  </label>
                  <select
                    id="employee-assign-select"
                    value={selectedEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = employees.find((emp) => emp.id === e.target.value);
                      setSelectedEmployee(emp || null);

                      // Auto-assign this employee to all service items in cart that don't have an employee
                      if (emp) {
                        setCart((prevCart) =>
                          prevCart.map((item) => {
                            if (item.type === 'service' && !item.employeeId) {
                              return {
                                ...item,
                                employeeId: emp.id,
                                employeeName: emp.user?.fullName || emp.roleTitle,
                              };
                            }
                            return item;
                          })
                        );
                      }
                    }}
                    className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition text-sm"
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

            {/* Cart Header - Sticky */}
            <div className="px-4 py-2 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-text-light dark:text-text-dark">
                    Cart {cart.length > 0 && <span className="text-primary">({cart.length})</span>}
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-danger hover:text-danger/80 font-medium transition px-2 py-1 hover:bg-danger/10 rounded-lg"
                    title="Clear all items"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark min-h-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-primary/40" />
                  </div>
                  <p className="text-text-light/60 dark:text-text-dark/60 font-medium mb-1">
                    Cart is empty
                  </p>
                  <p className="text-sm text-text-light/40 dark:text-text-dark/40">
                    Add services or products to get started
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
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

            {/* Cart Totals & Checkout - Sticky Footer */}
            {cart.length > 0 && (
              <div className="p-3 border-t-2 border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-lg shrink-0">
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-light/60 dark:text-text-dark/60">Subtotal</span>
                    <span className="text-text-light dark:text-text-dark font-medium">
                      RWF {cartTotals.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {cartTotals.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-light/60 dark:text-text-dark/60">Discount</span>
                      <span className="text-success font-medium">
                        -RWF {cartTotals.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {cartTotals.tax > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-light/60 dark:text-text-dark/60">Tax</span>
                      <span className="text-text-light dark:text-text-dark font-medium">
                        RWF {cartTotals.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t-2 border-border-light dark:border-border-dark">
                    <span className="text-text-light dark:text-text-dark">Total</span>
                    <span className="text-primary">RWF {cartTotals.total.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  variant="primary"
                  className="w-full py-3 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                  disabled={createSaleMutation.isPending}
                >
                  {createSaleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
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
          error={
            createSaleMutation.error
              ? (
                  createSaleMutation.error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                  }
                )?.response?.data?.message ||
                (
                  createSaleMutation.error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                  }
                )?.message ||
                'Failed to process payment. Please try again.'
              : null
          }
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
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 hover:shadow-md transition-all">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {item.type === 'service' ? (
              <Scissors className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <Package className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <h4 className="font-semibold text-sm text-text-light dark:text-text-dark truncate">
              {item.item.name}
            </h4>
          </div>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">
            {item.type === 'service' ? 'Service' : 'Product'}
            {item.employeeName && ` • ${item.employeeName}`}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-danger/10 rounded-lg text-danger transition shrink-0 ml-2"
          title="Remove item"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quantity and Price Row */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => onUpdate({ quantity: Math.max(1, item.quantity - 1) })}
          className="w-7 h-7 flex items-center justify-center bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary transition shrink-0"
          title="Decrease quantity"
        >
          <Minus className="w-3.5 h-3.5 text-text-light dark:text-text-dark" />
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-14 px-2 py-1 text-center bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          min="1"
        />
        <button
          onClick={() => onUpdate({ quantity: item.quantity + 1 })}
          className="w-7 h-7 flex items-center justify-center bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-primary/10 hover:border-primary transition shrink-0"
          title="Increase quantity"
        >
          <Plus className="w-3.5 h-3.5 text-text-light dark:text-text-dark" />
        </button>
        <span className="flex-1 text-right font-bold text-primary text-base ml-2">
          RWF {item.subtotal.toLocaleString()}
        </span>
      </div>

      {/* Discount Section */}
      {showDiscount ? (
        <div className="flex items-center gap-2 pt-2 border-t border-border-light dark:border-border-dark">
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Discount amount"
            className="flex-1 px-2.5 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleDiscount}
            className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition shrink-0"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setShowDiscount(false);
              setDiscountValue(item.discount.toString());
            }}
            className="px-2.5 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark transition shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiscount(true)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition"
            >
              <Percent className="w-3 h-3" />
              {item.discount > 0
                ? `Discount: RWF ${item.discount.toLocaleString()}`
                : 'Add discount'}
            </button>
            {item.type === 'service' && employees.length > 0 && (
              <select
                value={item.employeeId || ''}
                onChange={(e) => {
                  const emp = employees.find((emp) => emp.id === e.target.value);
                  onUpdate({
                    employeeId: e.target.value || undefined,
                    employeeName: emp?.user?.fullName || emp?.roleTitle || undefined,
                  });
                }}
                className="text-xs px-2 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                title="Assign employee for commission tracking"
              >
                <option value="">No employee</option>
                {employees
                  .filter((emp) => emp.isActive !== false)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.fullName || emp.roleTitle || 'Employee'}
                      {(emp.commissionRate ?? 0) > 0
                        ? ` (${emp.commissionRate ?? 0}% commission)`
                        : ' (0% commission)'}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <span className="text-xs text-text-light/60 dark:text-text-dark/60">
            RWF {item.unitPrice.toLocaleString()} each
          </span>
        </div>
      )}

      {/* Employee Assignment for Services */}
      {item.type === 'service' && employees.length > 0 && (
        <div className="pt-2 border-t border-border-light dark:border-border-dark mt-2">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
            <label
              htmlFor={`employee-select-${item.id}`}
              className="text-xs text-text-light/60 dark:text-text-dark/60"
            >
              Assign Employee:
            </label>
            <select
              id={`employee-select-${item.id}`}
              value={item.employeeId || ''}
              onChange={(e) => {
                const emp = employees.find((emp) => emp.id === e.target.value);
                onUpdate({
                  employeeId: e.target.value || undefined,
                  employeeName: emp?.user?.fullName || emp?.roleTitle || undefined,
                });
              }}
              className="flex-1 text-xs px-2 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              title="Assign employee for commission tracking"
            >
              <option value="">No employee (no commission)</option>
              {employees
                .filter((emp) => emp.isActive !== false)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user?.fullName || emp.roleTitle || 'Employee'}
                    {(emp.commissionRate ?? 0) > 0
                      ? ` (${emp.commissionRate ?? 0}% commission)`
                      : ' (0% commission)'}
                  </option>
                ))}
            </select>
          </div>
          {item.employeeId && (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Commission will be recorded automatically
            </p>
          )}
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
    (c) =>
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
        className="absolute inset-0"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div
        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col relative z-10"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                Select Customer
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                Choose a customer or add a new one
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-lg transition"
            >
              <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
          {!showAddForm ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full pl-10 pr-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => onSelect(null as unknown as Customer)}
                  className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                    !selectedCustomer
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-light dark:text-text-dark">
                        Walk-in Customer
                      </div>
                      <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                        No customer selected
                      </div>
                    </div>
                  </div>
                </button>

                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-surface-light dark:hover:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedCustomer?.id === customer.id ? 'bg-primary/20' : 'bg-primary/10'
                        }`}
                      >
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-text-light dark:text-text-dark">
                          {customer.fullName}
                        </div>
                        <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {customer.phone} {customer.email && `• ${customer.email}`}
                        </div>
                      </div>
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
              <div>
                <h3 className="font-bold text-text-light dark:text-text-dark mb-1">
                  Add New Customer
                </h3>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Fill in the customer details below
                </p>
              </div>
              <input
                type="text"
                placeholder="Full Name *"
                value={newCustomer.fullName}
                onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createCustomerMutation.mutate(newCustomer)}
                  variant="primary"
                  className="flex-1"
                  disabled={
                    !newCustomer.fullName || !newCustomer.phone || createCustomerMutation.isPending
                  }
                >
                  {createCustomerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Customer'
                  )}
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
    {
      value: 'cash',
      label: 'Cash',
      description: 'Physical currency',
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      value: 'mobile_money',
      label: 'Mobile Money',
      description: 'MTN / Airtel',
      icon: CreditCard,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      value: 'card',
      label: 'Card',
      description: 'Debit / Credit',
      icon: CreditCard,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      value: 'bank_transfer',
      label: 'Bank Transfer',
      description: 'Direct deposit',
      icon: DollarSign,
      gradient: 'from-orange-500 to-red-500',
    },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />
      <div className="bg-surface-light dark:bg-surface-dark w-full max-w-3xl rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-surface-light dark:bg-surface-dark sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
              Checkout
            </h2>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-0.5">
              Complete the payment transaction
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-full transition text-text-light/60 hover:text-text-light dark:text-text-dark/60 dark:hover:text-text-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-background-light/50 dark:bg-background-dark/50">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Left Column: Summary */}
            <div className="md:w-1/3 space-y-4">
               {/* Total Card */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5 text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
                 <span className="text-xs font-bold uppercase tracking-wider text-primary/80 block mb-1">Total Amount</span>
                 <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-semibold text-primary/60">RWF</span>
                    <span className="text-2xl font-bold text-primary">{total.toLocaleString()}</span>
                 </div>
              </div>

               {/* Reference Input */}
               <div className={`transition-all duration-300 ${selectedMethod && selectedMethod !== 'cash' ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                 <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-1.5 uppercase tracking-wide">
                   Transaction Ref <span className="text-danger">*</span>
                 </label>
                 <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="ID / Reference"
                  disabled={isLoading || selectedMethod === 'cash'}
                  className="w-full px-3 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-text-light dark:text-text-dark placeholder:text-text-light/40"
                />
               </div>
            </div>

            {/* Right Column: Methods */}
            <div className="md:w-2/3">
              <label className="block text-xs font-semibold text-text-light dark:text-text-dark mb-3 uppercase tracking-wide">
                Payment Method
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => !isLoading && setSelectedMethod(method.value)}
                      disabled={isLoading}
                      className={`
                        relative p-3 rounded-xl border text-left transition-all duration-200 group flex flex-col gap-3
                        ${isSelected 
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' 
                          : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/50 hover:shadow-sm'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2 bg-gradient-to-br ${method.gradient} rounded-lg shadow-sm group-hover:scale-105 transition-transform`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        {isSelected && (
                          <div className="text-primary animate-in zoom-in spin-in-90 duration-300">
                             <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className={`font-bold text-sm leading-tight ${isSelected ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
                          {method.label}
                        </div>
                        <div className="text-[10px] text-text-light/60 dark:text-text-dark/60 font-medium mt-0.5">
                          {method.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 p-3 bg-warning/10 border border-warning/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs font-medium text-warning-dark dark:text-warning-light">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex justify-end gap-3 sticky bottom-0 z-20">
          <Button
            onClick={onClose}
            variant="secondary"
            className="text-sm font-medium"
            disabled={isLoading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onPay(selectedMethod, reference || undefined)}
            variant="primary"
            className="text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30"
            disabled={!selectedMethod || isLoading || (selectedMethod !== 'cash' && !reference.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Payment
                <Check className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiptView({ sale, onNewSale }: { sale: unknown; onNewSale: () => void }) {
  const toast = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  // Handle items - could be in sale.items or sale.data.items if wrapped
  const saleData = sale as {
    id?: string;
    items?: Array<{
      id: string;
      service?: { name: string };
      product?: { name: string };
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      lineTotal: number;
      currency?: string;
    }>;
    data?: {
      items?: Array<{
        id: string;
        service?: { name: string };
        product?: { name: string };
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        lineTotal: number;
        currency?: string;
      }>;
    };
    customer?: { fullName: string; name: string };
    paymentMethod?: string;
    paymentReference?: string;
    totalAmount?: number;
    currency?: string;
  };

  const items =
    (Array.isArray(saleData?.items)
      ? saleData.items
      : Array.isArray(saleData?.data?.items)
        ? saleData.data.items
        : []) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark w-full max-w-lg rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex flex-col items-center justify-center sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 animate-in zoom-in spin-in-180 duration-500">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
                Payment Successful!
              </h2>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Transaction completed
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-background-light/50 dark:bg-background-dark/50">
          <div className="space-y-4">
            
            {/* Amount Card */}
             <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 block mb-1">Total Paid</span>
                <div className="flex items-center justify-center gap-1.5 text-3xl font-bold text-green-700 dark:text-green-400">
                  <span className="text-lg font-medium opacity-70">RWF</span>
                  {Number(saleData?.totalAmount || 0).toLocaleString()}
                </div>
                {saleData?.paymentMethod && (
                   <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-light dark:bg-surface-dark border border-green-500/20 text-[10px] font-semibold text-text-light dark:text-text-dark capitalize">
                      <CreditCard className="w-3 h-3 text-green-500" />
                      {saleData.paymentMethod.replace('_', ' ')}
                   </div>
                )}
             </div>

            {/* Details Grid */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-border-light dark:border-border-dark">
               <h3 className="text-xs font-bold text-text-light dark:text-text-dark uppercase tracking-wider mb-3 border-b border-border-light dark:border-border-dark pb-2">Transaction Details</h3>
               <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <span className="block text-text-light/60 dark:text-text-dark/60 text-xs mb-0.5">Sale ID</span>
                    <span className="font-mono text-text-light dark:text-text-dark bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded text-xs border border-border-light dark:border-border-dark">{saleData?.id?.slice(0, 8) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-text-light/60 dark:text-text-dark/60 text-xs mb-0.5">Customer</span>
                    <span className="font-semibold text-text-light dark:text-text-dark truncate block">{saleData?.customer?.fullName || saleData?.customer?.name || 'Walk-in Customer'}</span>
                  </div>
                  {saleData?.paymentReference && (
                    <div className="col-span-2">
                      <span className="block text-text-light/60 dark:text-text-dark/60 text-xs mb-0.5">Reference</span>
                      <span className="font-mono text-text-light dark:text-text-dark text-xs">{saleData.paymentReference}</span>
                    </div>
                  )}
               </div>
            </div>

            {/* Items Summary */}
            {items.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
                <div className="px-4 py-2 bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-light dark:text-text-dark uppercase tracking-wider">Items Purchased</span>
                  <span className="text-[10px] font-semibold text-text-light/60 dark:text-text-dark/60 bg-surface-light dark:bg-surface-dark px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark">{items.length}</span>
                </div>
                <div className="p-2 max-h-40 overflow-y-auto custom-scrollbar">
                   {items.map((item, index) => (
                      <div key={item.id || index} className="flex justify-between items-center p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                         <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                               {item.service ? <Scissors className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                               <div className="text-xs font-semibold text-text-light dark:text-text-dark truncate">{item.service?.name || item.product?.name || 'Item'}</div>
                               <div className="text-[10px] text-text-light/60 dark:text-text-dark/60">Qty: {item.quantity}</div>
                            </div>
                         </div>
                         <div className="font-medium text-xs text-text-light dark:text-text-dark">
                            {Number(item.lineTotal || 0).toLocaleString()}
                         </div>
                      </div>
                   ))}
                </div>
              </div>
            )}
          
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark sticky bottom-0 z-20">
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="h-10 text-xs font-semibold"
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Print
            </Button>
            <Button
              onClick={async () => {
                if (isDownloading) return;
                setIsDownloading(true);
                toast.info('Generating receipt...', { duration: 2000 });

                try {
                  const response = await api.post(
                    `/reports/receipt/${saleData.id}`,
                    {},
                    {
                      responseType: 'blob',
                    }
                  );
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `receipt-${saleData.id?.slice(0, 8)}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                  toast.success('Receipt downloaded successfully');
                } catch (error: any) {
                  console.error('Download error:', error);
                  let message = 'Failed to download receipt';

                  if (!error.response) {
                    toast.error(
                      'Download failed. Please disable IDM (Internet Download Manager) for this site.',
                      { duration: 6000 }
                    );
                    return;
                  }

                  if (error.response?.data instanceof Blob) {
                    try {
                      const text = await error.response.data.text();
                      const json = JSON.parse(text);
                      if (json.message) message = json.message;
                    } catch (e) {}
                  } else if (error.response?.data?.message) {
                    message = error.response.data.message;
                  }
                  toast.error(message);
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              variant="outline"
              className="h-10 text-xs font-semibold"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              Download
            </Button>
            <Button
              onClick={onNewSale}
              variant="primary"
              className="h-10 text-xs font-bold shadow-md shadow-primary/20 hover:shadow-primary/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
