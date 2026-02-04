import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth, useRefresh } from "../../context";
import {
  salonService,
  SalonProduct,
  SalonEmployee,
  SalonDetails,
} from "../../services/salon";
import { salesService, CreateSaleDto } from "../../services/sales";
import { api } from "../../services/api";
import { EmployeePermissionGate } from "../../components/permissions/EmployeePermissionGate";
import { EmployeePermission } from "../../constants/employeePermissions";
import { useEmployeePermissionCheck } from "../../hooks/useEmployeePermissionCheck";
import { showToast } from "../../utils/toast";

// Senior Dev: Extracted components for better performance
import { SalesHeader } from "./components/SalesHeader";
import { SalesSearchBar } from "./components/SalesSearchBar";
import { SalesTabs } from "./components/SalesTabs";
import { SalesServicesList } from "./components/SalesServicesList";
import { SalesProductsList } from "./components/SalesProductsList";

interface SalesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
}

interface CartItem {
  id: string;
  type: "service" | "product";
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  fullName: string;
  phone?: string;
}

type PaymentMethod = "cash" | "card" | "mobile_money";

export default function SalesScreen({ navigation }: SalesScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [currentSalonId, setCurrentSalonId] = useState<string | undefined>(undefined);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | undefined>(undefined);

  // Load salon and employee IDs for permission checks
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
        try {
          const employees = await salonService.getEmployeeRecordsByUserId(String(user.id));
          if (employees && employees.length > 0) {
            setCurrentSalonId(employees[0].salonId);
            setCurrentEmployeeId(employees[0].id);
          }
        } catch (error) {
          console.error('Error loading employee data:', error);
        }
      }
    };
    if (user?.id) {
      loadEmployeeData();
    }
  }, [user?.id, user?.role]);

  useEmployeePermissionCheck({
    salonId: currentSalonId,
    employeeId: currentEmployeeId,
    autoFetch: false,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<SalonProduct[]>([]);
  const [employees, setEmployees] = useState<SalonEmployee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "products">(
    "services"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedEmployee, setSelectedEmployee] =
    useState<SalonEmployee | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Global refresh trigger - refetches data when triggerRefresh() is called anywhere
  const { refreshKey, triggerRefresh } = useRefresh();

  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
    modal: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
    },
  };

  const loadData = useCallback(async () => {
    try {
      if (!user?.id) return;

      // PERFORMANCE: Add timeout to prevent hanging
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      // Step 1: Get salon first (critical)
      // For employees, use salonId from employee record; for owners, fetch from API
      let salon: SalonDetails | null = null;
      
      if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
        // For employees, use the salonId from their employee record
        if (currentSalonId) {
          try {
            salon = await Promise.race([
              salonService.getSalonDetails(currentSalonId),
              timeout(5000)
            ]).catch(() => null) as SalonDetails | null;
          } catch (error) {
            console.error('Error fetching salon details for employee:', error);
          }
        }
      } else {
        // For owners, get salon by owner ID
        const salonResponse = await Promise.race([
          salonService.getSalonByOwnerId(String(user.id)),
          timeout(5000)
        ]).catch(() => null);
        salon = salonResponse as SalonDetails | null;
      }

      if (!salon?.id) {
        setLoading(false);
        return;
      }

      setSalonId(salon.id);
      setLoading(false); // Show UI immediately

      // Step 2: Load all data in parallel (non-blocking)
      const salonIdToUse = salon.id;
      Promise.all([
        // Load services
        salonService.getServices(salonIdToUse)
          .then((servicesData) => {
            const mappedServices = servicesData.map((s: any) => ({
              id: s.id,
              name: s.name,
              price: s.price || s.basePrice || 0,
              duration: s.duration || s.durationMinutes,
              imageUrl: s.imageUrl,
            }));
            setServices(mappedServices);
          })
          .catch(() => setServices([])),

        // Load products
        salonService.getProducts(salonIdToUse)
          .then(setProducts)
          .catch(() => setProducts([])),

        // Load employees
        salonService.getEmployees(salonIdToUse)
          .then(setEmployees)
          .catch(() => setEmployees([])),

        // Load customers
        (async () => {
          try {
            setLoadingCustomers(true);
            const customersResponse = await api.get<any>(
              `/salons/${salonIdToUse}/customers`,
              { cache: true, cacheDuration: 120000 }
            );
            const customersData = Array.isArray(customersResponse)
              ? customersResponse
              : customersResponse?.data || [];
            const mappedCustomers = customersData
              .map((sc: any) => ({
                id: sc.customerId || sc.customer?.id,
                fullName: sc.customer?.fullName || "Unknown",
                phone: sc.customer?.phone,
              }))
              .filter((c: any) => c.id);
            setCustomers(mappedCustomers);
          } catch (err) {
            console.log("Could not load customers:", err);
            setCustomers([]);
          } finally {
            setLoadingCustomers(false);
          }
        })(),
      ]).catch((error) => {
        console.error("Error loading parallel data:", error);
      });
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  }, [user?.id, user?.role, currentSalonId]);

  useEffect(() => {
    // For employees, wait for salon ID to be loaded; for owners, load immediately
    if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
      if (currentSalonId) {
        loadData();
      }
    } else if (user?.id) {
      loadData();
    }
  }, [loadData, user?.id, user?.role, currentSalonId, refreshKey]); // refreshKey triggers refetch

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const tax = useMemo(() => subtotal * 0.18, [subtotal]); // 18% tax
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Senior Dev: Filtering logic moved to SalesServicesList and SalesProductsList components

  const addToCart = (
    item: ServiceItem | SalonProduct,
    type: "service" | "product"
  ) => {
    const price =
      type === "service"
        ? (item as ServiceItem).price
        : (item as SalonProduct).unitPrice || 0;

    const existing = cart.find((c) => c.id === item.id && c.type === type);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id && c.type === type
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          type,
          name: item.name,
          price,
          quantity: 1,
        },
      ]);
    }
    showToast(`You added ${item.name} to cart`, 'success');
  };

  const updateQuantity = (id: string, type: string, change: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id && item.type === type
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string, type: string) => {
    const itemToRemove = cart.find((item) => item.id === id && item.type === type);
    if (itemToRemove) {
      showToast(`You removed ${itemToRemove.name} from cart`, 'info');
    }
    setCart(cart.filter((item) => !(item.id === id && item.type === type)));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert("Error", "Cart is empty");
      return;
    }

    if (!salonId) {
      Alert.alert("Error", "Salon not found. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      // Build items array with proper data types
      const items = cart.map((item) => ({
        serviceId: item.type === "service" ? item.id : undefined,
        productId: item.type === "product" ? item.id : undefined,
        salonEmployeeId: selectedEmployee?.id || undefined,
        unitPrice: Number(item.price),
        quantity: Number(item.quantity),
        discountAmount: 0, // Can be added as feature later
      }));

      // Validate items - at least one must have serviceId or productId
      const invalidItems = items.filter((i) => !i.serviceId && !i.productId);
      if (invalidItems.length > 0) {
        Alert.alert(
          "Error",
          "Some items are invalid. Please remove them and try again."
        );
        setSubmitting(false);
        return;
      }

      const saleData: CreateSaleDto = {
        salonId: salonId,
        customerId: selectedCustomer?.id || undefined,
        totalAmount: Math.round(total * 100) / 100, // Round to 2 decimal places
        paymentMethod: selectedPayment,
        items: items,
      };

      await salesService.createSale(saleData);

      // Trigger global refresh so AccountingScreen updates
      triggerRefresh();

      setShowCart(false);
      setShowSuccessModal(true);
      setCart([]);
      setSelectedCustomer(null);
      setSelectedEmployee(null);

      setTimeout(() => {
        setShowSuccessModal(false);
        // Navigate to Sales History after sale completion
        navigation.navigate("SalesHistory");
      }, 2000);
    } catch (error: any) {
      console.error("Sale creation failed:", error);
      Alert.alert(
        "Error",
        error.message ||
          error.response?.data?.message ||
          "Failed to complete sale. Please check your data and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployeePermissionGate
      requiredPermission={EmployeePermission.PROCESS_PAYMENTS}
      salonId={currentSalonId}
      employeeId={currentEmployeeId}
      showUnauthorizedMessage={true}
    >
      {loading ? (
        <SafeAreaView style={[styles.loadingContainer, dynamicStyles.container]} edges={['top', 'bottom']}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Senior Dev: Extracted Header Component */}
      <SalesHeader
        cartCount={cartCount}
        onBack={() => navigation.goBack()}
        onCartPress={() => setShowCart(true)}
        isDark={isDark}
        dynamicStyles={dynamicStyles}
      />

      {/* Senior Dev: Extracted Search Component */}
      <SalesSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search services or products..."
        isDark={isDark}
        dynamicStyles={dynamicStyles}
      />

      {/* Senior Dev: Extracted Tabs Component */}
      <SalesTabs
        activeTab={activeTab}
        serviceCount={services.length}
        productCount={products.length}
        onTabChange={setActiveTab}
        isDark={isDark}
        dynamicStyles={dynamicStyles}
      />

      {/* Senior Dev: Replaced ScrollView with FlatList Components for Performance */}
      {activeTab === "services" ? (
        <SalesServicesList
          services={services}
          searchQuery={searchQuery}
          onAddToCart={(service) => addToCart(service, "service")}
          isDark={isDark}
          dynamicStyles={dynamicStyles}
        />
      ) : (
        <SalesProductsList
          products={products}
          searchQuery={searchQuery}
          onAddToCart={(product) => addToCart(product, "product")}
          isDark={isDark}
          dynamicStyles={dynamicStyles}
        />
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.cartModal, dynamicStyles.modal]}>
            {/* Cart Header */}
            <View style={styles.cartHeader}>
              <Text style={[styles.cartTitle, dynamicStyles.text]}>
                Cart ({cartCount} items)
              </Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={dynamicStyles.text.color}
                />
              </TouchableOpacity>
            </View>

            {/* Assign Customer & Employee */}
            <View style={styles.assignSection}>
              <TouchableOpacity
                style={[styles.assignButton, dynamicStyles.input]}
                onPress={() => setShowCustomerModal(true)}
              >
                <MaterialIcons
                  name="person"
                  size={20}
                  color={
                    selectedCustomer
                      ? theme.colors.success
                      : dynamicStyles.textSecondary.color
                  }
                />
                <Text
                  style={[styles.assignText, dynamicStyles.text]}
                  numberOfLines={1}
                >
                  {selectedCustomer
                    ? selectedCustomer.fullName
                    : "Add Customer (Optional)"}
                </Text>
                {selectedCustomer && (
                  <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.assignButton, dynamicStyles.input]}
                onPress={() => setShowEmployeeModal(true)}
              >
                <MaterialIcons
                  name="badge"
                  size={20}
                  color={
                    selectedEmployee
                      ? theme.colors.success
                      : dynamicStyles.textSecondary.color
                  }
                />
                <Text
                  style={[styles.assignText, dynamicStyles.text]}
                  numberOfLines={1}
                >
                  {selectedEmployee
                    ? selectedEmployee.user?.fullName || "Employee"
                    : "Assign Staff (Commission)"}
                </Text>
                {selectedEmployee && (
                  <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <ScrollView
              style={styles.cartItems}
              showsVerticalScrollIndicator={false}
            >
              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <MaterialIcons
                    name="shopping-cart"
                    size={48}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text
                    style={[styles.emptyCartText, dynamicStyles.textSecondary]}
                  >
                    Cart is empty
                  </Text>
                </View>
              ) : (
                cart.map((item) => (
                  <View
                    key={`${item.id}-${item.type}`}
                    style={[styles.cartItem, dynamicStyles.card]}
                  >
                    <View style={styles.cartItemInfo}>
                      <Text
                        style={[styles.cartItemName, dynamicStyles.text]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.cartItemPrice,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        RWF {item.price.toLocaleString()} × {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.cartItemActions}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, dynamicStyles.input]}
                        onPress={() => updateQuantity(item.id, item.type, -1)}
                      >
                        <MaterialIcons
                          name="remove"
                          size={18}
                          color={dynamicStyles.text.color}
                        />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, dynamicStyles.text]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, dynamicStyles.input]}
                        onPress={() => updateQuantity(item.id, item.type, 1)}
                      >
                        <MaterialIcons
                          name="add"
                          size={18}
                          color={dynamicStyles.text.color}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.id, item.type)}
                      >
                        <MaterialIcons
                          name="delete"
                          size={22}
                          color={theme.colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={[
                        styles.cartItemTotal,
                        { color: theme.colors.primary },
                      ]}
                    >
                      RWF {(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Checkout */}
            {cart.length > 0 && (
              <View style={styles.checkoutSection}>
                {/* Payment */}
                <Text
                  style={[styles.paymentLabel, dynamicStyles.textSecondary]}
                >
                  Payment Method
                </Text>
                <View style={styles.paymentRow}>
                  {[
                    { id: "cash", icon: "payments", label: "Cash" },
                    { id: "card", icon: "credit-card", label: "Card" },
                    {
                      id: "mobile_money",
                      icon: "phone-android",
                      label: "Mobile",
                    },
                  ].map((pm) => (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.paymentBtn,
                        selectedPayment === pm.id
                          ? { backgroundColor: theme.colors.primary }
                          : dynamicStyles.input,
                      ]}
                      onPress={() => setSelectedPayment(pm.id as PaymentMethod)}
                    >
                      <MaterialIcons
                        name={pm.icon as any}
                        size={18}
                        color={
                          selectedPayment === pm.id
                            ? theme.colors.white
                            : dynamicStyles.text.color
                        }
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          color:
                            selectedPayment === pm.id
                              ? theme.colors.white
                              : dynamicStyles.text.color,
                        }}
                      >
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Summary */}
                <View style={styles.summaryRow}>
                  <Text style={dynamicStyles.textSecondary}>Subtotal</Text>
                  <Text style={dynamicStyles.text}>
                    RWF {subtotal.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={dynamicStyles.textSecondary}>Tax (18%)</Text>
                  <Text style={dynamicStyles.text}>
                    RWF {Math.round(tax).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={[styles.totalLabel, dynamicStyles.text]}>
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.totalAmount,
                      { color: theme.colors.primary },
                    ]}
                  >
                    RWF {Math.round(total).toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.checkoutBtn,
                    {
                      backgroundColor: submitting
                        ? theme.colors.gray400
                        : theme.colors.primary,
                    },
                  ]}
                  onPress={handleCheckout}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={theme.colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={22}
                        color={theme.colors.white}
                      />
                      <Text style={styles.checkoutText}>Complete Sale</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Employee Selection Modal */}
      <Modal visible={showEmployeeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.selectionModal, dynamicStyles.modal]}>
            <View style={styles.selectionHeader}>
              <Text style={[styles.selectionTitle, dynamicStyles.text]}>
                Assign Staff
              </Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={dynamicStyles.text.color}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.selectionHint, dynamicStyles.textSecondary]}>
              Select staff member for commission
            </Text>
            <ScrollView style={styles.selectionList}>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.selectionItem, dynamicStyles.card]}
                  onPress={() => {
                    setSelectedEmployee(emp);
                    setShowEmployeeModal(false);
                  }}
                >
                  <View
                    style={[
                      styles.selectionIcon,
                      { backgroundColor: theme.colors.primary + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={22}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.selectionInfo}>
                    <Text style={[styles.selectionName, dynamicStyles.text]}>
                      {emp.user?.fullName || "Employee"}
                    </Text>
                    <Text
                      style={[
                        styles.selectionMeta,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      {emp.position || "Staff"} • {emp.commissionRate || 0}%
                      commission
                    </Text>
                  </View>
                  {selectedEmployee?.id === emp.id && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={theme.colors.success}
                    />
                  )}
                </TouchableOpacity>
              ))}
              {employees.length === 0 && (
                <View style={styles.emptySelection}>
                  <Text style={dynamicStyles.textSecondary}>
                    No employees found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal visible={showCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.selectionModal, dynamicStyles.modal]}>
            <View style={styles.selectionHeader}>
              <Text style={[styles.selectionTitle, dynamicStyles.text]}>
                Select Customer
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={dynamicStyles.text.color}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.selectionHint, dynamicStyles.textSecondary]}>
              Optional - for loyalty points & customer tracking
            </Text>

            {/* Customer Search */}
            <View style={[styles.customerSearchBox, dynamicStyles.input]}>
              <MaterialIcons
                name="search"
                size={20}
                color={dynamicStyles.textSecondary.color}
              />
              <TextInput
                style={[
                  styles.customerSearchInput,
                  { color: dynamicStyles.text.color },
                ]}
                placeholder="Search by name or phone..."
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
              />
              {customerSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearchQuery("")}>
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              )}
            </View>

            {loadingCustomers ? (
              <View style={styles.emptySelection}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.selectionList}>
                {/* Show filtered customers */}
                {customers
                  .filter(
                    (c) =>
                      !customerSearchQuery ||
                      c.fullName
                        ?.toLowerCase()
                        .includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                  )
                  .map((cust) => (
                    <TouchableOpacity
                      key={cust.id}
                      style={[styles.selectionItem, dynamicStyles.card]}
                      onPress={() => {
                        setSelectedCustomer(cust);
                        setShowCustomerModal(false);
                        setCustomerSearchQuery("");
                      }}
                    >
                      <View
                        style={[
                          styles.selectionIcon,
                          { backgroundColor: theme.colors.success + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="person"
                          size={22}
                          color={theme.colors.success}
                        />
                      </View>
                      <View style={styles.selectionInfo}>
                        <Text
                          style={[styles.selectionName, dynamicStyles.text]}
                        >
                          {cust.fullName || "Unknown"}
                        </Text>
                        <Text
                          style={[
                            styles.selectionMeta,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          {cust.phone || "No phone"}
                        </Text>
                      </View>
                      {selectedCustomer?.id === cust.id && (
                        <MaterialIcons
                          name="check-circle"
                          size={24}
                          color={theme.colors.success}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                {customers.length === 0 && (
                  <View style={styles.emptySelection}>
                    <MaterialIcons
                      name="people-outline"
                      size={48}
                      color={dynamicStyles.textSecondary.color}
                    />
                    <Text
                      style={[
                        styles.emptySelectionText,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      No customers found
                    </Text>
                  </View>
                )}
                {customers.length > 0 &&
                  customers.filter(
                    (c) =>
                      !customerSearchQuery ||
                      c.fullName
                        ?.toLowerCase()
                        .includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                  ).length === 0 && (
                    <View style={styles.emptySelection}>
                      <MaterialIcons
                        name="search-off"
                        size={48}
                        color={dynamicStyles.textSecondary.color}
                      />
                      <Text
                        style={[
                          styles.emptySelectionText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        No customers match your search
                      </Text>
                    </View>
                  )}
              </ScrollView>
            )}

            {/* Skip button */}
            <TouchableOpacity
              style={[
                styles.skipCustomerBtn,
                { borderColor: theme.colors.primary },
              ]}
              onPress={() => {
                setSelectedCustomer(null);
                setShowCustomerModal(false);
                setCustomerSearchQuery("");
              }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
                Continue Without Customer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, dynamicStyles.modal]}>
            <View style={styles.successIcon}>
              <MaterialIcons
                name="check"
                size={48}
                color={theme.colors.success}
              />
            </View>
            <Text style={[styles.successTitle, dynamicStyles.text]}>
              Sale Complete!
            </Text>
            <Text style={[styles.successText, dynamicStyles.textSecondary]}>
              Transaction processed successfully
            </Text>
          </View>
        </View>
      </Modal>
        </SafeAreaView>
      )}
    </EmployeePermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === "android" ? 45 : 55,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  itemsContent: {
    paddingBottom: theme.spacing.xl,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "bold",
    marginRight: theme.spacing.sm,
  },
  addIcon: {
    marginLeft: theme.spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  cartModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  assignSection: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  assignText: {
    flex: 1,
    fontSize: 14,
  },
  cartItems: {
    maxHeight: 200,
    paddingHorizontal: theme.spacing.md,
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCartText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
  },
  cartItem: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
  },
  cartItemInfo: {
    marginBottom: theme.spacing.sm,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  cartItemPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  cartItemTotal: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: theme.spacing.sm,
  },
  checkoutSection: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  paymentRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  paymentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalRow: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    gap: 8,
  },
  checkoutText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  selectionModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  selectionHint: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    fontSize: 13,
  },
  selectionList: {
    paddingHorizontal: theme.spacing.md,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  selectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  selectionName: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptySelection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptySelectionText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
  },
  skipBtn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 20,
  },
  successModal: {
    padding: theme.spacing.xl,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: theme.spacing.xl,
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
  },
  successText: {
    fontSize: 14,
  },
  customerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  customerSearchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 15,
    paddingVertical: 4,
  },
  skipCustomerBtn: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
});
