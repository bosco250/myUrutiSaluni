import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { Loader } from "../../components/common";
import { salesService, Commission } from "../../services/sales";
import { UserRole } from "../../constants/roles";
import CommissionPaymentModal from "../../components/CommissionPaymentModal";
import BulkCommissionPaymentModal from "../../components/BulkCommissionPaymentModal";

interface CommissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type ViewMode = "card" | "table";
type GroupBy = "none" | "date" | "employee" | "status";

interface GroupedCommissions {
  [key: string]: Commission[];
}

export default function CommissionsScreen({
  navigation,
}: CommissionsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isEmployee =
    user?.role === UserRole.SALON_EMPLOYEE || user?.role === "salon_employee";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all"
  );
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCommission, setSelectedCommission] =
    useState<Commission | null>(null);

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPaymentModalVisible, setBulkPaymentModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

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
  };

  const loadData = useCallback(async () => {
    try {
      const options: { paid?: boolean } = {};
      if (statusFilter === "paid") options.paid = true;
      if (statusFilter === "unpaid") options.paid = false;

      const data = await salesService.getCommissions(options);
      // Sort by date (newest first)
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCommissions(sorted);
    } catch (error) {
      console.error("Error loading commissions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMarkPaid = (commission: Commission) => {
    setSelectedCommission(commission);
    setPaymentModalVisible(true);
  };

  const handlePaymentSuccess = () => {
    loadData();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = commissions.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    const paid = commissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const unpaid = total - paid;
    const unpaidCount = commissions.filter((c) => !c.paid).length;
    const paidCount = commissions.filter((c) => c.paid).length;

    return { total, paid, unpaid, unpaidCount, paidCount };
  }, [commissions]);

  // Get unpaid commissions for bulk selection
  const unpaidCommissions = useMemo(
    () => commissions.filter((c) => !c.paid),
    [commissions]
  );

  // Get selected commissions for bulk payment
  const selectedCommissions = useMemo(
    () => commissions.filter((c) => selectedIds.has(c.id) && !c.paid),
    [commissions, selectedIds]
  );

  // Group commissions
  const groupedCommissions = useMemo(() => {
    if (groupBy === "none") {
      return { "All Commissions": commissions };
    }

    const grouped: GroupedCommissions = {};

    commissions.forEach((commission) => {
      let key = "";

      if (groupBy === "date") {
        const date = new Date(commission.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          key = "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
          key = "Yesterday";
        } else {
          key = date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      } else if (groupBy === "employee") {
        key = commission.salonEmployee?.user?.fullName || "Unknown Employee";
      } else if (groupBy === "status") {
        key = commission.paid ? "Paid" : "Unpaid";
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(commission);
    });

    return grouped;
  }, [commissions, groupBy]);

  // Get sorted group keys
  const groupKeys = useMemo(() => {
    return Object.keys(groupedCommissions).sort((a, b) => {
      if (groupBy === "date") {
        // Sort dates: Today, Yesterday, then by date
        if (a === "Today") return -1;
        if (b === "Today") return 1;
        if (a === "Yesterday") return -1;
        if (b === "Yesterday") return 1;
        return new Date(b).getTime() - new Date(a).getTime();
      }
      if (groupBy === "status") {
        return a === "Unpaid" ? -1 : 1;
      }
      return a.localeCompare(b);
    });
  }, [groupedCommissions, groupBy]);

  // Calculate days pending for aging indicator
  const getDaysPending = (dateString: string): number => {
    const created = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Get aging badge color
  const getAgingColor = (days: number): string => {
    if (days >= 30) return theme.colors.error;
    if (days >= 7) return theme.colors.warning;
    return theme.colors.textSecondary;
  };

  // Toggle selection for a commission
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all unpaid commissions
  const selectAllUnpaid = () => {
    const allUnpaidIds = unpaidCommissions.map((c) => c.id);
    setSelectedIds(new Set(allUnpaidIds));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  // Handle bulk payment
  const handleBulkPayment = () => {
    if (selectedCommissions.length === 0) {
      Alert.alert("No Selection", "Please select commissions to pay.");
      return;
    }
    setBulkPaymentModalVisible(true);
  };

  // Handle pay all unpaid
  const handlePayAllUnpaid = () => {
    if (unpaidCommissions.length === 0) {
      Alert.alert("No Unpaid", "There are no unpaid commissions.");
      return;
    }
    selectAllUnpaid();
    setBulkPaymentModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render table row
  const renderTableRow = (commission: Commission) => {
    const daysPending = getDaysPending(commission.createdAt);
    const agingColor = getAgingColor(daysPending);
    const isSelected = selectedIds.has(commission.id);

    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          dynamicStyles.tableRow,
          isSelected && { backgroundColor: theme.colors.primary + "15" },
        ]}
        onPress={() => {
          if (selectionMode && !commission.paid) {
            toggleSelection(commission.id);
          } else {
            navigation.navigate("CommissionDetail", {
              commissionId: commission.id,
              commission,
            });
          }
        }}
        onLongPress={() => {
          if (!commission.paid && !isEmployee) {
            setSelectionMode(true);
            toggleSelection(commission.id);
          }
        }}
        activeOpacity={0.7}
      >
        {/* Checkbox */}
        {selectionMode && !commission.paid && !isEmployee && (
          <View style={styles.tableCellCheckbox}>
            <TouchableOpacity onPress={() => toggleSelection(commission.id)}>
              <MaterialIcons
                name={isSelected ? "check-box" : "check-box-outline-blank"}
                size={20}
                color={
                  isSelected
                    ? theme.colors.primary
                    : dynamicStyles.textSecondary.color
                }
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Employee Name */}
        <View style={styles.tableCell}>
          {!isEmployee && (
            <Text
              style={[styles.tableCellText, dynamicStyles.text]}
              numberOfLines={1}
            >
              {commission.salonEmployee?.user?.fullName || "Employee"}
            </Text>
          )}
          <Text
            style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {commission.saleItem?.service?.name ||
              commission.saleItem?.product?.name ||
              "N/A"}
          </Text>
        </View>

        {/* Date */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {formatDate(commission.createdAt)}
          </Text>
          {commission.paid && commission.paidAt && (
            <Text
              style={[styles.tableCellSubtext, { color: theme.colors.success }]}
              numberOfLines={1}
            >
              Paid: {formatDate(commission.paidAt)}
            </Text>
          )}
          {!commission.paid && daysPending >= 7 && (
            <View
              style={[
                styles.agingBadgeInline,
                { backgroundColor: agingColor + "20" },
              ]}
            >
              <Text style={[styles.agingTextInline, { color: agingColor }]}>
                {daysPending}d
              </Text>
            </View>
          )}
        </View>

        {/* Sale Amount */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            RWF {Number(commission.saleAmount || 0).toLocaleString()}
          </Text>
          <Text
            style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {Number(commission.commissionRate || 0)}%
          </Text>
        </View>

        {/* Commission Amount */}
        <View style={styles.tableCellAmount}>
          <Text
            style={[
              styles.tableCellAmountText,
              { color: theme.colors.primary },
            ]}
            numberOfLines={1}
          >
            RWF {Number(commission.amount).toLocaleString()}
          </Text>
        </View>

        {/* Status */}
        <View style={styles.tableCellStatus}>
          <View
            style={[
              styles.statusBadgeSmall,
              {
                backgroundColor: commission.paid
                  ? theme.colors.success + "20"
                  : theme.colors.warning + "20",
              },
            ]}
          >
            <MaterialIcons
              name={commission.paid ? "check-circle" : "pending"}
              size={14}
              color={
                commission.paid ? theme.colors.success : theme.colors.warning
              }
            />
            <Text
              style={[
                styles.statusTextSmall,
                {
                  color: commission.paid
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            >
              {commission.paid ? "Paid" : "Unpaid"}
            </Text>
          </View>
        </View>

        {/* Action */}
        {!commission.paid && !isEmployee && (
          <View style={styles.tableCellAction}>
            <TouchableOpacity
              style={[
                styles.payButtonSmall,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => handleMarkPaid(commission)}
            >
              <MaterialIcons
                name="payment"
                size={14}
                color={theme.colors.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render card view
  const renderCard = (commission: Commission) => {
    const daysPending = getDaysPending(commission.createdAt);
    const agingColor = getAgingColor(daysPending);
    const isSelected = selectedIds.has(commission.id);

    return (
      <TouchableOpacity
        key={commission.id}
        style={[
          styles.commissionCard,
          dynamicStyles.card,
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => {
          if (selectionMode && !commission.paid) {
            toggleSelection(commission.id);
          } else {
            navigation.navigate("CommissionDetail", {
              commissionId: commission.id,
              commission,
            });
          }
        }}
        onLongPress={() => {
          if (!commission.paid && !isEmployee) {
            setSelectionMode(true);
            toggleSelection(commission.id);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.commissionHeader}>
          {selectionMode && !commission.paid && !isEmployee && (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleSelection(commission.id)}
            >
              <MaterialIcons
                name={isSelected ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={
                  isSelected
                    ? theme.colors.primary
                    : dynamicStyles.textSecondary.color
                }
              />
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: commission.paid
                  ? theme.colors.success + "15"
                  : theme.colors.warning + "15",
              },
            ]}
          >
            <MaterialIcons
              name={commission.paid ? "check-circle" : "pending"}
              size={18}
              color={
                commission.paid ? theme.colors.success : theme.colors.warning
              }
            />
          </View>
          <View style={styles.commissionInfo}>
            {!isEmployee && (
              <Text style={[styles.employeeName, dynamicStyles.text]}>
                {commission.salonEmployee?.user?.fullName || "Employee"}
              </Text>
            )}
            <Text style={[styles.commissionDate, dynamicStyles.textSecondary]}>
              {formatDateTime(commission.createdAt)}
            </Text>
            {commission.metadata?.source && (
              <View
                style={[
                  styles.sourceBadge,
                  {
                    backgroundColor:
                      commission.metadata.source === "sale"
                        ? isDark
                          ? `${theme.colors.info}20`
                          : "#E3F2FD"
                        : isDark
                          ? `${theme.colors.success}20`
                          : "#E8F5E9",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sourceBadgeText,
                    {
                      color:
                        commission.metadata.source === "sale"
                          ? isDark
                            ? theme.colors.info
                            : "#2196F3"
                          : isDark
                            ? theme.colors.success
                            : "#4CAF50",
                    },
                  ]}
                >
                  {commission.metadata.source === "sale"
                    ? "Sale"
                    : "Appointment"}
                </Text>
              </View>
            )}
            {!commission.paid && daysPending >= 7 && (
              <View
                style={[
                  styles.agingBadge,
                  { backgroundColor: agingColor + "20" },
                ]}
              >
                <MaterialIcons name="schedule" size={10} color={agingColor} />
                <Text style={[styles.agingText, { color: agingColor }]}>
                  {daysPending}d pending
                </Text>
              </View>
            )}
          </View>
          <View style={styles.amountContainer}>
            <Text
              style={[styles.commissionAmount, { color: theme.colors.primary }]}
            >
              RWF {Number(commission.amount).toLocaleString()}
            </Text>
            <Text style={[styles.commissionRate, dynamicStyles.textSecondary]}>
              {Number(commission.commissionRate || 0)}% of RWF{" "}
              {Number(commission.saleAmount || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {commission.saleItem && (
          <View style={styles.serviceRow}>
            <MaterialIcons
              name={
                commission.saleItem.service ? "content-cut" : "shopping-bag"
              }
              size={14}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.serviceName, dynamicStyles.textSecondary]}>
              {commission.saleItem.service?.name ||
                commission.saleItem.product?.name ||
                "Item"}
            </Text>
          </View>
        )}

        {!commission.paid && !isEmployee && (
          <TouchableOpacity
            style={[
              styles.markPaidButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleMarkPaid(commission)}
          >
            <MaterialIcons
              name="payment"
              size={16}
              color={theme.colors.white}
            />
            <Text style={styles.markPaidText}>Pay Commission</Text>
          </TouchableOpacity>
        )}

        {commission.paid && commission.paidAt && (
          <Text style={[styles.paidDate, dynamicStyles.textSecondary]}>
            Paid on {formatDateTime(commission.paidAt)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render grouped commissions
  const renderGroupedCommissions = () => {
    if (groupKeys.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="payments"
            size={64}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyTitle, dynamicStyles.text]}>
            No commissions found
          </Text>
          <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
            Commissions will appear when sales are made
          </Text>
        </View>
      );
    }

    return (
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
        {groupKeys.map((groupKey) => {
          const groupCommissions = groupedCommissions[groupKey];
          const groupTotal = groupCommissions.reduce(
            (sum, c) => sum + Number(c.amount || 0),
            0
          );
          const groupPaid = groupCommissions.filter((c) => c.paid).length;
          const groupUnpaid = groupCommissions.filter((c) => !c.paid).length;

          return (
            <View key={groupKey} style={styles.groupContainer}>
              {/* Group Header */}
              <View style={[styles.groupHeader, dynamicStyles.tableHeader]}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={[styles.groupTitle, dynamicStyles.text]}>
                    {groupKey}
                  </Text>
                  <Text
                    style={[styles.groupSubtitle, dynamicStyles.textSecondary]}
                  >
                    {groupCommissions.length} commission
                    {groupCommissions.length !== 1 ? "s" : ""} • RWF{" "}
                    {Math.round(groupTotal).toLocaleString()}
                    {groupBy === "status" && (
                      <Text style={dynamicStyles.textSecondary}>
                        {" • "}
                        {groupPaid > 0 && (
                          <Text style={{ color: theme.colors.success }}>
                            {groupPaid} paid
                          </Text>
                        )}
                        {groupPaid > 0 && groupUnpaid > 0 && <Text>, </Text>}
                        {groupUnpaid > 0 && (
                          <Text style={{ color: theme.colors.warning }}>
                            {groupUnpaid} unpaid
                          </Text>
                        )}
                      </Text>
                    )}
                  </Text>
                </View>
              </View>

              {/* Group Content */}
              {viewMode === "table" ? (
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
                      {!isEmployee && (
                        <Text
                          style={[
                            styles.tableHeaderText,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          Employee
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Date
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Sale
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Commission
                      </Text>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Status
                      </Text>
                      {!isEmployee && (
                        <Text
                          style={[
                            styles.tableHeaderText,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          Action
                        </Text>
                      )}
                    </View>

                    {/* Table Rows */}
                    {groupCommissions.map((commission) => (
                      <React.Fragment key={commission.id}>
                        {renderTableRow(commission)}
                      </React.Fragment>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.cardsContainer}>
                  {groupCommissions.map((commission) => (
                    <React.Fragment key={commission.id}>
                      {renderCard(commission)}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading commissions..." />
      </SafeAreaView>
    );
  }

  return (
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
            Commissions
          </Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            {isEmployee ? "Your earnings" : "Track employee earnings"}
          </Text>
        </View>
        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "table" && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setViewMode("table")}
          >
            <MaterialIcons
              name="table-view"
              size={18}
              color={
                viewMode === "table"
                  ? theme.colors.white
                  : dynamicStyles.text.color
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "card" && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setViewMode("card")}
          >
            <MaterialIcons
              name="view-agenda"
              size={18}
              color={
                viewMode === "card"
                  ? theme.colors.white
                  : dynamicStyles.text.color
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons
            name="account-balance-wallet"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            RWF {Math.round(stats.total).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Total
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons
            name="check-circle"
            size={20}
            color={theme.colors.success}
          />
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            RWF {Math.round(stats.paid).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Paid ({stats.paidCount})
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons
            name="pending"
            size={20}
            color={theme.colors.warning}
          />
          <Text style={[styles.statValue, { color: theme.colors.warning }]}>
            RWF {Math.round(stats.unpaid).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Unpaid ({stats.unpaidCount})
          </Text>
        </View>
      </View>

      {/* Filter and Group By Controls */}
      <View style={styles.controlsContainer}>
        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {[
            { id: "all", label: "All", icon: "list" },
            { id: "unpaid", label: "Unpaid", icon: "pending" },
            { id: "paid", label: "Paid", icon: "check-circle" },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                statusFilter === filter.id
                  ? { backgroundColor: theme.colors.primary }
                  : {
                      backgroundColor: isDark
                        ? theme.colors.gray800
                        : theme.colors.gray100,
                    },
              ]}
              onPress={() => setStatusFilter(filter.id as any)}
            >
              <MaterialIcons
                name={filter.icon as any}
                size={16}
                color={
                  statusFilter === filter.id
                    ? theme.colors.white
                    : dynamicStyles.text.color
                }
              />
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      statusFilter === filter.id
                        ? theme.colors.white
                        : dynamicStyles.text.color,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Group By */}
        {!isEmployee && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.groupByScroll}
            contentContainerStyle={styles.groupByContainer}
          >
            <Text style={[styles.groupByLabel, dynamicStyles.textSecondary]}>
              Group by:
            </Text>
            {[
              { id: "date", label: "Date", icon: "calendar-today" },
              { id: "employee", label: "Employee", icon: "person" },
              { id: "status", label: "Status", icon: "label" },
              { id: "none", label: "None", icon: "clear-all" },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.groupByButton,
                  groupBy === option.id
                    ? {
                        backgroundColor: theme.colors.primary + "20",
                        borderColor: theme.colors.primary,
                      }
                    : {
                        backgroundColor: "transparent",
                        borderColor: dynamicStyles.card.borderColor,
                      },
                ]}
                onPress={() => setGroupBy(option.id as GroupBy)}
              >
                <MaterialIcons
                  name={option.icon as any}
                  size={14}
                  color={
                    groupBy === option.id
                      ? theme.colors.primary
                      : dynamicStyles.textSecondary.color
                  }
                />
                <Text
                  style={[
                    styles.groupByText,
                    {
                      color:
                        groupBy === option.id
                          ? theme.colors.primary
                          : dynamicStyles.textSecondary.color,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Bulk Action Bar (for salon owners only) */}
      {!isEmployee && unpaidCommissions.length > 0 && (
        <View style={[styles.bulkActionBar, dynamicStyles.card]}>
          {selectionMode ? (
            <>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={
                  selectedIds.size === unpaidCommissions.length
                    ? clearSelection
                    : selectAllUnpaid
                }
              >
                <MaterialIcons
                  name={
                    selectedIds.size === unpaidCommissions.length
                      ? "check-box"
                      : "check-box-outline-blank"
                  }
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.selectAllText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {selectedIds.size === unpaidCommissions.length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>
              <View style={styles.bulkActionButtons}>
                <TouchableOpacity
                  style={styles.clearSelectionButton}
                  onPress={clearSelection}
                >
                  <Text
                    style={[
                      styles.clearSelectionText,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                {selectedCommissions.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.paySelectedButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleBulkPayment}
                  >
                    <MaterialIcons
                      name="payment"
                      size={16}
                      color={theme.colors.white}
                    />
                    <Text style={styles.paySelectedText}>
                      Pay ({selectedCommissions.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectModeButton}
                onPress={() => setSelectionMode(true)}
              >
                <MaterialIcons
                  name="checklist"
                  size={18}
                  color={dynamicStyles.text.color}
                />
                <Text style={[styles.selectModeText, dynamicStyles.text]}>
                  Select
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payAllButton,
                  { backgroundColor: theme.colors.success },
                ]}
                onPress={handlePayAllUnpaid}
              >
                <MaterialIcons
                  name="payments"
                  size={16}
                  color={theme.colors.white}
                />
                <Text style={styles.payAllText}>
                  Pay All ({unpaidCommissions.length})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Commissions List/Table */}
      {renderGroupedCommissions()}

      {/* Commission Payment Modal */}
      {selectedCommission && (
        <CommissionPaymentModal
          visible={paymentModalVisible}
          onClose={() => {
            setPaymentModalVisible(false);
            setSelectedCommission(null);
          }}
          commission={selectedCommission}
          onSuccess={handlePaymentSuccess}
          navigation={navigation}
        />
      )}

      {/* Bulk Commission Payment Modal */}
      <BulkCommissionPaymentModal
        visible={bulkPaymentModalVisible}
        onClose={() => {
          setBulkPaymentModalVisible(false);
          clearSelection();
        }}
        commissions={selectedCommissions}
        onSuccess={() => {
          loadData();
          clearSelection();
        }}
        navigation={navigation}
      />
    </SafeAreaView>
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
  },
  viewModeToggle: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.gray100,
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  controlsContainer: {
    marginBottom: theme.spacing.sm,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  groupByScroll: {
    maxHeight: 40,
  },
  groupByContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  groupByLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    marginRight: theme.spacing.xs,
  },
  groupByButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  groupByText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  groupContainer: {
    marginBottom: theme.spacing.lg,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  groupSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  tableScrollContainer: {
    marginHorizontal: theme.spacing.md,
  },
  tableContainer: {
    paddingVertical: theme.spacing.xs,
  },
  tableContent: {
    minWidth: 800, // Minimum width to enable horizontal scrolling on smaller screens
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
    minWidth: 800, // Match table content width
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
    minWidth: 800, // Match table content width for consistent scrolling
  },
  tableCellCheckbox: {
    width: 30,
    alignItems: "center",
  },
  tableCell: {
    flex: 1,
    minWidth: 80,
  },
  tableCellAmount: {
    width: 100,
    alignItems: "flex-end",
  },
  tableCellAmountText: {
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  tableCellStatus: {
    width: 70,
    alignItems: "center",
  },
  tableCellAction: {
    width: 40,
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
  statusBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  payButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  agingBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  agingTextInline: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  cardsContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  emptyText: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
  commissionCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  commissionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  commissionDate: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  commissionRate: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 6,
  },
  serviceName: {
    fontSize: 12,
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    marginTop: theme.spacing.md,
    gap: 6,
  },
  markPaidText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  paidDate: {
    fontSize: 11,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    fontFamily: theme.fonts.regular,
  },
  sourceBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  agingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
    gap: 2,
  },
  agingText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  bulkActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  bulkActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  clearSelectionButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  clearSelectionText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  paySelectedButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    gap: 4,
  },
  paySelectedText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  selectModeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  selectModeText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  payAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    gap: 4,
  },
  payAllText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  checkbox: {
    marginRight: theme.spacing.sm,
  },
});
