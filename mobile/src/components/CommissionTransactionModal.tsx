import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import { api } from "../services/api";

interface WalletTransaction {
  id: string;
  walletId: string;
  transactionType: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  referenceType?: string;
  referenceId?: string;
  transactionReference?: string;
  status?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, any>;
}

interface CommissionTransactionModalProps {
  transaction: WalletTransaction | null;
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export default function CommissionTransactionModal({
  transaction,
  visible,
  onClose,
  isDark,
}: CommissionTransactionModalProps) {
  const [salonInfo, setSalonInfo] = useState<{
    salonName: string;
    ownerName: string;
  }>({ salonName: "", ownerName: "" });

  const dynamicStyles = {
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#3A3A3C" : "#F5F5F7",
      borderColor: isDark ? "#48484A" : theme.colors.borderLight,
    },
  };

  // Fetch salon info from metadata or API
  useEffect(() => {
    const fetchSalonInfo = async () => {
      if (!transaction) return;

      // Parse metadata
      let metadata: Record<string, any> = {};
      try {
        if (typeof transaction.metadata === "string") {
          metadata = JSON.parse(transaction.metadata);
        } else if (
          typeof transaction.metadata === "object" &&
          transaction.metadata !== null
        ) {
          metadata = transaction.metadata;
        }
      } catch {
        metadata = {};
      }

      // Check metadata first
      const salonNameFromMeta =
        metadata.salonName ||
        metadata.salon_name ||
        metadata.salon?.name ||
        "";
      const ownerNameFromMeta =
        metadata.ownerName ||
        metadata.owner_name ||
        metadata.ownerFullName ||
        metadata.owner?.fullName ||
        metadata.owner?.name ||
        metadata.salon?.owner?.fullName ||
        metadata.salon?.owner?.name ||
        "";

      if (salonNameFromMeta && ownerNameFromMeta) {
        setSalonInfo({
          salonName: salonNameFromMeta,
          ownerName: ownerNameFromMeta,
        });
        return;
      }

      // Try to fetch from commission API if referenceId exists
      if (transaction.referenceId && transaction.referenceType === "commission") {
        try {
          const commissionResponse: any = await api.get(`/commissions`);
          const commissions = Array.isArray(commissionResponse)
            ? commissionResponse
            : commissionResponse?.data || [];

          const commission = commissions.find(
            (c: any) => c.id === transaction.referenceId
          );

          if (commission?.salonEmployee?.salon) {
            const salon = commission.salonEmployee.salon;
            const owner = commission.salonEmployee.salon?.owner || {};
            setSalonInfo({
              salonName: salon.name || "Your Salon",
              ownerName: owner.fullName || owner.name || "Owner",
            });
            return;
          }

          // Fallback: fetch salon by ID
          if (commission?.salonEmployee?.salonId) {
            try {
              const salonResponse: any = await api.get(
                `/salons/${commission.salonEmployee.salonId}`
              );
              const salon = salonResponse?.data || salonResponse;

              if (salon?.ownerId) {
                try {
                  const ownerResponse: any = await api.get(
                    `/users/${salon.ownerId}`
                  );
                  const owner = ownerResponse?.data || ownerResponse;
                  setSalonInfo({
                    salonName: salon.name || "Your Salon",
                    ownerName: owner.fullName || owner.name || "Owner",
                  });
                  return;
                } catch {
                  setSalonInfo({
                    salonName: salon.name || "Your Salon",
                    ownerName: "Owner",
                  });
                  return;
                }
              }
            } catch {
              // Silently fail
            }
          }
        } catch {
          // Silently fail
        }
      }

      // Final fallback
      setSalonInfo({
        salonName: salonNameFromMeta || "Your Salon",
        ownerName: ownerNameFromMeta || "Owner",
      });
    };

    if (visible && transaction) {
      fetchSalonInfo();
    }
  }, [transaction, visible]);

  if (!transaction) return null;

  const amount = Number(transaction.amount) || 0;
  const balanceBefore = transaction.balanceBefore
    ? Number(transaction.balanceBefore)
    : null;
  const balanceAfter = transaction.balanceAfter
    ? Number(transaction.balanceAfter)
    : null;

  // Get transaction reason
  const getTransactionReason = (): string => {
    const type = (transaction.transactionType || "").toLowerCase();
    if (type.includes("commission")) return "Commission Payment";
    if (type.includes("salary") || type.includes("payroll")) return "Salary Payment";
    if (type.includes("bonus")) return "Bonus Payment";
    return "Commission Payment";
  };

  // Get status info
  const getStatusInfo = () => {
    const status = (transaction.status || "completed").toLowerCase();
    switch (status) {
      case "completed":
        return { label: "Completed", color: theme.colors.success, icon: "check-circle" };
      case "pending":
        return { label: "Pending", color: "#FF9500", icon: "schedule" };
      case "failed":
        return { label: "Failed", color: theme.colors.error, icon: "error" };
      default:
        return { label: "Completed", color: theme.colors.success, icon: "check-circle" };
    }
  };

  const statusInfo = getStatusInfo();

  // Format date
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid";
      return date.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid";
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    try {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Format Transaction ID for display (show first 8 chars)
  const formatTransactionId = (id: string) => {
    if (!id) return "N/A";
    if (id.length > 16) {
      return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
    }
    return id;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
                borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: dynamicStyles.card.borderColor }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIconContainer, { backgroundColor: theme.colors.success + "20" }]}>
                  <MaterialIcons name="trending-up" size={24} color={theme.colors.success} />
                </View>
                <View>
                  <Text style={[styles.headerTitle, dynamicStyles.text]}>
                    Commission Received
                  </Text>
                  <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                    {getTransactionReason()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Amount Section */}
              <View style={[styles.amountSection, { backgroundColor: theme.colors.success + "10" }]}>
                <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
                  Amount Received
                </Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.amountCurrency, { color: theme.colors.success }]}>+</Text>
                  <Text style={[styles.amountValue, { color: theme.colors.success }]}>
                    {amount.toLocaleString()}
                  </Text>
                  <Text style={[styles.amountCurrencyLabel, { color: theme.colors.success }]}>
                    RWF
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
                  <MaterialIcons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>

              {/* Sender Card */}
              <View style={[styles.infoCard, dynamicStyles.card]}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="store" size={20} color={theme.colors.primary} />
                  <Text style={[styles.cardTitle, dynamicStyles.text]}>From</Text>
                </View>
                <View style={styles.senderInfo}>
                  <View style={[styles.senderAvatar, { backgroundColor: theme.colors.primary + "20" }]}>
                    <Text style={[styles.senderAvatarText, { color: theme.colors.primary }]}>
                      {salonInfo.salonName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.senderDetails}>
                    <Text style={[styles.senderName, dynamicStyles.text]} numberOfLines={1}>
                      {salonInfo.salonName || "Salon"}
                    </Text>
                    <Text style={[styles.senderSubtext, dynamicStyles.textSecondary]} numberOfLines={1}>
                      Owner: {salonInfo.ownerName || "Unknown"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Transaction Details Card */}
              <View style={[styles.infoCard, dynamicStyles.card]}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="receipt-long" size={20} color={theme.colors.primary} />
                  <Text style={[styles.cardTitle, dynamicStyles.text]}>Transaction Details</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Transaction ID</Text>
                  <Text style={[styles.detailValue, dynamicStyles.text]} numberOfLines={1}>
                    {formatTransactionId(transaction.id)}
                  </Text>
                </View>
                
                <View style={[styles.detailDivider, { backgroundColor: dynamicStyles.card.borderColor }]} />
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Date</Text>
                  <Text style={[styles.detailValue, dynamicStyles.text]}>
                    {formatDate(transaction.createdAt)}
                  </Text>
                </View>
                
                <View style={[styles.detailDivider, { backgroundColor: dynamicStyles.card.borderColor }]} />
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Time</Text>
                  <Text style={[styles.detailValue, dynamicStyles.text]}>
                    {formatTime(transaction.createdAt)}
                  </Text>
                </View>

                {transaction.transactionReference && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: dynamicStyles.card.borderColor }]} />
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Reference</Text>
                      <Text style={[styles.detailValue, dynamicStyles.text]} numberOfLines={1}>
                        {transaction.transactionReference}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Balance Summary Card */}
              {(balanceBefore !== null || balanceAfter !== null) && (
                <View style={[styles.infoCard, dynamicStyles.card]}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="account-balance-wallet" size={20} color={theme.colors.primary} />
                    <Text style={[styles.cardTitle, dynamicStyles.text]}>Balance Summary</Text>
                  </View>
                  
                  {balanceBefore !== null && (
                    <>
                      <View style={styles.balanceRow}>
                        <View style={styles.balanceLeft}>
                          <MaterialIcons name="remove-circle-outline" size={18} color={dynamicStyles.textSecondary.color} />
                          <Text style={[styles.balanceLabel, dynamicStyles.textSecondary]}>
                            Balance Before
                          </Text>
                        </View>
                        <Text style={[styles.balanceValue, dynamicStyles.text]}>
                          {balanceBefore.toLocaleString()} RWF
                        </Text>
                      </View>
                      <View style={[styles.detailDivider, { backgroundColor: dynamicStyles.card.borderColor }]} />
                    </>
                  )}
                  
                  <View style={styles.balanceRow}>
                    <View style={styles.balanceLeft}>
                      <MaterialIcons name="add-circle" size={18} color={theme.colors.success} />
                      <Text style={[styles.balanceLabel, { color: theme.colors.success }]}>
                        Commission
                      </Text>
                    </View>
                    <Text style={[styles.balanceValue, { color: theme.colors.success, fontWeight: "700" }]}>
                      +{amount.toLocaleString()} RWF
                    </Text>
                  </View>
                  
                  {balanceAfter !== null && (
                    <>
                      <View style={[styles.newBalanceDivider, { backgroundColor: theme.colors.success + "30" }]} />
                      <View style={styles.balanceRow}>
                        <View style={styles.balanceLeft}>
                          <MaterialIcons name="account-balance-wallet" size={18} color={theme.colors.success} />
                          <Text style={[styles.balanceLabel, { color: theme.colors.success, fontWeight: "600" }]}>
                            New Balance
                          </Text>
                        </View>
                        <Text style={[styles.newBalanceValue, { color: theme.colors.success }]}>
                          {balanceAfter.toLocaleString()} RWF
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={[styles.footer, { borderTopColor: dynamicStyles.card.borderColor }]}>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    maxHeight: "92%",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: 450,
    maxHeight: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 20,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  amountCurrency: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
  },
  amountCurrencyLabel: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    marginTop: theme.spacing.md,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  infoCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  senderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  senderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  senderSubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    textAlign: "right",
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  detailDivider: {
    height: 1,
    marginVertical: 2,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  balanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  newBalanceDivider: {
    height: 2,
    marginVertical: theme.spacing.sm,
    borderRadius: 1,
  },
  newBalanceValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});

