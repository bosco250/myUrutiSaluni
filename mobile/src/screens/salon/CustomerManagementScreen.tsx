import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { salonService } from "../../services/salon";
import { api } from "../../services/api";
import { Loader } from "../../components/common";
import { EmployeePermissionGate } from "../../components/permissions/EmployeePermissionGate";
import { EmployeePermission } from "../../constants/employeePermissions";
import { useEmployeePermissionCheck } from "../../hooks/useEmployeePermissionCheck";

interface CustomerManagementScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
    };
  };
}

interface SalonCustomer {
  id: string;
  customerId: string;
  salonId: string;
  visitCount: number;
  totalSpent: number;
  lastVisitDate: string | null;
  firstVisitDate: string | null;
  tags: string[];
  notes?: string;
  customer: {
    id: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  averageOrderValue?: number;
  daysSinceLastVisit?: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  averageCLV: number;
  averageVisitFrequency: number;
  topCustomers: SalonCustomer[];
}

export default function CustomerManagementScreen({
  navigation,
  route,
}: CustomerManagementScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [currentSalonId, setCurrentSalonId] = useState<string | undefined>(
    route?.params?.salonId
  );
  const [currentEmployeeId, setCurrentEmployeeId] = useState<
    string | undefined
  >(undefined);

  // Load employee ID for permission checks
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE") {
        try {
          const employees = await salonService.getEmployeeRecordsByUserId(
            String(user.id)
          );
          if (employees && employees.length > 0) {
            setCurrentSalonId(employees[0].salonId);
            setCurrentEmployeeId(employees[0].id);
            if (employees[0].salonId) {
              setSalonId(employees[0].salonId);
            }
          }
        } catch (error) {
          console.error("Error loading employee data:", error);
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

  const [salonId, setSalonId] = useState<string | null>(
    route?.params?.salonId || null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<SalonCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<SalonCustomer[]>(
    []
  );
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "new" | "inactive"
  >("all");

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    tableHeader: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray50,
    },
    tableRow: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderBottomColor: isDark
        ? theme.colors.gray700
        : theme.colors.borderLight,
    },
    searchBox: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray300,
    },
  };

  const loadData = useCallback(async () => {
    try {
      // Use salonId from state, or currentSalonId from employee record, or fetch for owners
      let salonIdToUse: string | null = salonId || currentSalonId || null;

      // If no salonId provided, get salon from user
      if (!salonIdToUse && user?.id) {
        if (
          user?.role === "salon_employee" ||
          user?.role === "SALON_EMPLOYEE"
        ) {
          // For employees, use salonId from employee record (already loaded in useEffect above)
          salonIdToUse = currentSalonId || null;
          if (salonIdToUse) {
            setSalonId(salonIdToUse);
          } else {
            // If still not set, wait for it to load
            return;
          }
        } else {
          // For owners, get salon by owner ID
          const salon = await salonService.getSalonByOwnerId(String(user.id));
          if (salon?.id) {
            salonIdToUse = salon.id;
            setSalonId(salon.id);
          }
        }
      }

      if (!salonIdToUse) {
        console.log("No salon ID available");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch customers and analytics in parallel
      const [customersResponse, analyticsResponse] = await Promise.all([
        api
          .get<any>(`/salons/${salonIdToUse}/customers`)
          .catch(() => ({ data: [] })),
        api
          .get<CustomerAnalytics>(`/salons/${salonIdToUse}/customers/analytics`)
          .catch(() => null),
      ]);

      // Handle the response format
      const customersData = Array.isArray(customersResponse)
        ? customersResponse
        : customersResponse?.data || [];

      setCustomers(customersData);
      setFilteredCustomers(customersData);

      if (analyticsResponse) {
        setAnalytics(analyticsResponse as CustomerAnalytics);
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, user?.id, user?.role, currentSalonId]);

  useEffect(() => {
    // For employees, wait for salon ID to be loaded; for owners, load immediately
    if (user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE") {
      if (currentSalonId) {
        loadData();
      }
    } else if (user?.id) {
      loadData();
    }
  }, [loadData, user?.id, user?.role, currentSalonId]);

  const filterCustomers = useCallback(() => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer?.fullName?.toLowerCase().includes(query) ||
          c.customer?.phone?.includes(query) ||
          c.customer?.email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    switch (activeFilter) {
      case "active":
        filtered = filtered.filter(
          (c) => c.lastVisitDate && new Date(c.lastVisitDate) >= thirtyDaysAgo
        );
        break;
      case "new":
        filtered = filtered.filter(
          (c) => c.firstVisitDate && new Date(c.firstVisitDate) >= thirtyDaysAgo
        );
        break;
      case "inactive":
        filtered = filtered.filter(
          (c) => !c.lastVisitDate || new Date(c.lastVisitDate) < ninetyDaysAgo
        );
        break;
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, activeFilter, customers]);

  useEffect(() => {
    filterCustomers();
  }, [filterCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };



  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (customer: SalonCustomer) => {
    if (!customer.lastVisitDate) return theme.colors.gray400;
    const daysSince = customer.daysSinceLastVisit || 0;
    if (daysSince <= 30) return theme.colors.success;
    if (daysSince <= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string
  ) => (
    <View style={[styles.statCard, dynamicStyles.card]}>
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
      >
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, dynamicStyles.text]}>{value}</Text>
      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
        {title}
      </Text>
    </View>
  );

  const renderFilterChip = (
    filter: "all" | "active" | "new" | "inactive",
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        activeFilter === filter && styles.filterChipActive,
        activeFilter !== filter && {
          borderColor: isDark ? theme.colors.gray600 : theme.colors.gray300,
        },
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterChipText,
          activeFilter === filter
            ? styles.filterChipTextActive
            : dynamicStyles.text,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Render table row
  const renderTableRow = (customer: SalonCustomer) => {
    const statusColor = getStatusColor(customer);
    const daysSince = customer.daysSinceLastVisit || 0;
    const statusLabel =
      daysSince === 0
        ? "Today"
        : daysSince <= 30
          ? "Active"
          : daysSince <= 90
            ? "Inactive"
            : "Churned";

    return (
      <TouchableOpacity
        style={[styles.tableRow, dynamicStyles.tableRow]}
        onPress={() =>
          navigation.navigate("CustomerDetail", {
            customerId: customer.customerId,
            salonId: salonId,
            customer,
          })
        }
        activeOpacity={0.7}
      >
        {/* Customer Name */}
        <View style={styles.tableCell}>
          <View style={styles.customerNameRow}>
            <View
              style={[
                styles.avatarSmall,
                { backgroundColor: theme.colors.primary + "20" },
              ]}
            >
              <Text
                style={[
                  styles.avatarTextSmall,
                  { color: theme.colors.primary },
                ]}
              >
                {getInitials(customer.customer?.fullName)}
              </Text>
            </View>
            <View style={styles.customerNameContainer}>
              <Text
                style={[styles.tableCellText, dynamicStyles.text]}
                numberOfLines={1}
              >
                {customer.customer?.fullName || "Unknown Customer"}
              </Text>
              <Text
                style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
                numberOfLines={1}
              >
                {customer.customer?.phone ||
                  customer.customer?.email ||
                  "No contact"}
              </Text>
            </View>
          </View>
        </View>

        {/* Visits */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {customer.visitCount}
          </Text>
          <Text
            style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {customer.visitCount === 1 ? "visit" : "visits"}
          </Text>
        </View>

        {/* Total Spent */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            RWF {Number(customer.totalSpent || 0).toLocaleString()}
          </Text>
          {customer.averageOrderValue && (
            <Text
              style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              Avg: RWF {Number(customer.averageOrderValue).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Last Visit */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {formatDate(customer.lastVisitDate)}
          </Text>
          {customer.lastVisitDate && (
            <Text
              style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              {daysSince === 0
                ? "Today"
                : daysSince === 1
                  ? "Yesterday"
                  : `${daysSince} days ago`}
            </Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.tableCellStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <View
              style={[styles.statusDotSmall, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <EmployeePermissionGate
      requiredPermission={EmployeePermission.MANAGE_CUSTOMERS}
      salonId={currentSalonId}
      employeeId={currentEmployeeId}
      showUnauthorizedMessage={true}
    >
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>
              Customer Management
            </Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
              {filteredCustomers.length} customer
              {filteredCustomers.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddCustomer", { salonId })}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <Loader fullscreen message="Loading customers..." />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Analytics Stats */}
            {analytics && (
              <View style={styles.statsGrid}>
                {renderStatCard(
                  "Total",
                  analytics.totalCustomers,
                  "people",
                  theme.colors.primary
                )}
                {renderStatCard(
                  "Active",
                  analytics.activeCustomers,
                  "check-circle",
                  theme.colors.success
                )}
                {renderStatCard(
                  "New",
                  analytics.newCustomers,
                  "person-add",
                  theme.colors.warning
                )}
                {renderStatCard(
                  "At Risk",
                  analytics.churnedCustomers,
                  "warning",
                  theme.colors.error
                )}
              </View>
            )}

            {/* Search Box */}
            <View style={[styles.searchBox, dynamicStyles.searchBox]}>
              <MaterialIcons
                name="search"
                size={20}
                color={dynamicStyles.textSecondary.color}
              />
              <TextInput
                style={[styles.searchInput, dynamicStyles.text]}
                placeholder="Search by name, phone, email..."
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filtersContainer}
            >
              {renderFilterChip("all", "All")}
              {renderFilterChip("active", "Active")}
              {renderFilterChip("new", "New")}
              {renderFilterChip("inactive", "Inactive")}
            </ScrollView>

            {/* Customer Table */}
            {filteredCustomers.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="people-outline"
                  size={64}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyTitle, dynamicStyles.text]}>
                  No Customers Found
                </Text>
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  {searchQuery || activeFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Customers will appear here as they make purchases or appointments"}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.tableScrollContainer}
                contentContainerStyle={styles.tableContainer}
              >
                <View style={styles.tableContent}>
                  {/* Table Header */}
                  <View
                    style={[styles.tableHeaderRow, dynamicStyles.tableHeader]}
                  >
                    <View style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Customer
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Visits
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Total Spent
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Last Visit
                      </Text>
                    </View>
                    <View style={styles.tableCellStatus}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Status
                      </Text>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {filteredCustomers.map((customer) => (
                    <React.Fragment key={customer.id}>
                      {renderTableRow(customer)}
                    </React.Fragment>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </EmployeePermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },

  // Search Box
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },

  // Filters
  filtersScroll: {
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // Result Header
  resultHeader: {
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },

  // Table Styles
  tableScrollContainer: {
    marginHorizontal: theme.spacing.md,
  },
  tableContainer: {
    paddingVertical: theme.spacing.xs,
  },
  tableContent: {
    minWidth: 900, // Minimum width to enable horizontal scrolling
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
    minWidth: 900,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    gap: theme.spacing.xs,
    minWidth: 900,
  },
  tableCell: {
    flex: 1,
    minWidth: 150,
  },
  tableCellStatus: {
    width: 120,
    alignItems: "center",
  },
  tableCellText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  tableCellSubtext: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  customerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  customerNameContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 40,
  },
});
