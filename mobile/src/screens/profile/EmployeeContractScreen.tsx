import React, { useState, useEffect, useCallback } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { salonService } from "../../services/salon";
import { api } from "../../services/api";
import { Loader } from "../../components/common";

interface EmployeeContractScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

interface EmployeeContractData {
  id: string;
  userId: string;
  salonId: string;
  salon?: {
    id: string;
    name: string;
    address?: string;
    ownerId?: string;
    owner?: {
      id: string;
      fullName: string;
      email?: string;
      phone?: string;
    };
  };
  roleTitle?: string;
  skills?: string[];
  hireDate?: string;
  isActive: boolean;
  commissionRate?: number;
  baseSalary?: number;
  salaryType?: "COMMISSION_ONLY" | "SALARY_ONLY" | "SALARY_PLUS_COMMISSION";
  payFrequency?: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  hourlyRate?: number;
  overtimeRate?: number;
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  terminationDate?: string;
  terminationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, any>;
  };
}

export default function EmployeeContractScreen({
  navigation,
}: EmployeeContractScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState<EmployeeContractData[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

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
  };

  const loadContractData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const salons = await salonService.getMySalons();
      const employeeContracts: EmployeeContractData[] = [];

      if (salons.length > 0) {
        for (const salon of salons) {
          try {
            const employee = await salonService.getCurrentEmployee(salon.id);
            if (employee) {
              // Fetch salon details with owner info
              let salonWithOwner = salon;
              try {
                const salonDetails = await salonService.getSalonDetails(
                  salon.id
                );
                if (salonDetails.ownerId) {
                  try {
                    const ownerResponse = await api.get(
                      `/users/${salonDetails.ownerId}`
                    );
                    salonWithOwner = {
                      ...salonDetails,
                    } as any;
                    (salonWithOwner as any).owner =
                      (ownerResponse as any)?.data || ownerResponse;
                  } catch {
                    // Owner fetch failed, continue without owner details
                  }
                }
              } catch {
                // Salon details fetch failed, use basic salon info
              }

              const ownerData = (salonWithOwner as any).owner;
              employeeContracts.push({
                ...employee,
                user: {
                  id: String(user.id),
                  fullName: user.fullName || "",
                  email: user.email,
                  phone: user.phone,
                  metadata: (user as any).metadata || {},
                },
                salon: {
                  id: salonWithOwner.id,
                  name: salonWithOwner.name,
                  address: salonWithOwner.address,
                  ownerId: salonWithOwner.ownerId,
                  owner: ownerData,
                },
              } as EmployeeContractData);
            }
          } catch (error: any) {
            if (error?.response?.status !== 404) {
              console.log(
                `Could not fetch employee data for salon ${salon.id}:`,
                error?.message
              );
            }
          }
        }
      } else {
        try {
          const allSalonsResponse: any = await api.get("/salons");
          const allSalons =
            allSalonsResponse?.data?.data || allSalonsResponse?.data || [];

          for (const salon of allSalons) {
            try {
              const employeeResponse: any = await api.get(
                `/salons/${salon.id}/employees/me`
              );
              const employeeData = employeeResponse?.data || employeeResponse;
              if (employeeData) {
                // Fetch salon owner details
                let ownerData: any = null;
                if (salon.ownerId) {
                  try {
                    const ownerResponse: any = await api.get(
                      `/users/${salon.ownerId}`
                    );
                    ownerData = ownerResponse?.data || ownerResponse;
                  } catch {
                    // Continue without owner details
                  }
                }

                employeeContracts.push({
                  ...employeeData,
                  user: {
                    id: String(user.id),
                    fullName: user.fullName || "",
                    email: user.email,
                    phone: user.phone,
                    metadata: (user as any).metadata || {},
                  },
                  salon: {
                    id: salon.id,
                    name: salon.name,
                    address: salon.address,
                    ownerId: salon.ownerId,
                    owner: ownerData,
                  },
                } as EmployeeContractData);
              }
            } catch (error: any) {
              if (error.response?.status !== 404) {
                console.log(
                  `Error fetching employee data for salon ${salon.id}:`,
                  error.message
                );
              }
            }
          }
        } catch (error) {
          console.error("Error fetching salons:", error);
        }
      }

      setContracts(employeeContracts);

      if (employeeContracts.length > 0 && !selectedSalonId) {
        setSelectedSalonId(employeeContracts[0].salonId);
      }
    } catch (error: any) {
      console.error("Error loading contract data:", error);
      Alert.alert("Error", "Failed to load contract information");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedSalonId]);

  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContractData();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatSalaryType = (type?: string): string => {
    if (!type) return "Not specified";
    const types: Record<string, string> = {
      COMMISSION_ONLY: "Commission Only",
      SALARY_ONLY: "Fixed Salary",
      SALARY_PLUS_COMMISSION: "Mixed (Salary + Commission)",
    };
    return types[type] || type;
  };

  const formatPayFrequency = (frequency?: string): string => {
    if (!frequency) return "Not specified";
    return frequency.charAt(0) + frequency.slice(1).toLowerCase();
  };

  const formatEmploymentType = (type?: string): string => {
    if (!type) return "Not specified";
    const types: Record<string, string> = {
      FULL_TIME: "Permanent",
      PART_TIME: "Fixed-term (Part-time)",
      CONTRACT: "Fixed-term (Contract)",
    };
    return types[type] || type;
  };

  const getNationalId = (): string => {
    if (!user) return "Not provided";
    const metadata = (user as any).metadata;
    if (!metadata) return "Not provided";
    return (
      metadata.nationalId ||
      metadata.national_id ||
      metadata.idNumber ||
      "Not provided"
    );
  };

  const selectedContract = contracts.find((c) => c.salonId === selectedSalonId);

  if (loading && contracts.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading contract information..." />
      </SafeAreaView>
    );
  }

  if (contracts.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>
            Employment Contract
          </Text>
          <View style={{ width: theme.touchTargets.minimum }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyContainer}>
            {/* Decorative Background Elements */}
            <View
              style={[
                styles.emptyDecorativeCircle1,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            />
            <View
              style={[
                styles.emptyDecorativeCircle2,
                {
                  backgroundColor:
                    theme.colors.secondaryLight || theme.colors.primaryLight,
                },
              ]}
            />

            {/* Main Icon Container with Gradient */}
            <LinearGradient
              colors={[
                theme.colors.primaryLight,
                theme.colors.secondaryLight || theme.colors.primaryLight,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconContainer}
            >
              <View
                style={[
                  styles.emptyIconInner,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <MaterialIcons
                  name="description"
                  size={72}
                  color={theme.colors.primary}
                />
              </View>
            </LinearGradient>

            {/* Main Message */}
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>
              No Contract Available
            </Text>

            {/* Subtitle */}
            <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
              You don't have any active employment contracts at the moment.
            </Text>

            {/* Information Card */}
            <View style={[styles.emptyInfoCard, dynamicStyles.card]}>
              <View style={styles.emptyInfoHeader}>
                <MaterialIcons
                  name="info"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={[styles.emptyInfoTitle, dynamicStyles.text]}>
                  What does this mean?
                </Text>
              </View>
              <Text style={[styles.emptyInfoText, dynamicStyles.textSecondary]}>
                This means you haven't been assigned to any salon yet, or your
                employment contract hasn't been created by a salon owner.
              </Text>
            </View>

            {/* Action Items */}
            <View style={[styles.emptyActionsCard, dynamicStyles.card]}>
              <Text style={[styles.emptyActionsTitle, dynamicStyles.text]}>
                What you can do:
              </Text>

              <View style={styles.emptyActionItem}>
                <View
                  style={[
                    styles.emptyActionIcon,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <MaterialIcons
                    name="store"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.emptyActionContent}>
                  <Text style={[styles.emptyActionTitle, dynamicStyles.text]}>
                    Contact a Salon
                  </Text>
                  <Text
                    style={[
                      styles.emptyActionText,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    Reach out to salon owners to discuss employment
                    opportunities
                  </Text>
                </View>
              </View>

              <View style={styles.emptyActionItem}>
                <View
                  style={[
                    styles.emptyActionIcon,
                    {
                      backgroundColor:
                        theme.colors.secondaryLight ||
                        theme.colors.primaryLight,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="refresh"
                    size={20}
                    color={theme.colors.secondary || theme.colors.primary}
                  />
                </View>
                <View style={styles.emptyActionContent}>
                  <Text style={[styles.emptyActionTitle, dynamicStyles.text]}>
                    Refresh
                  </Text>
                  <Text
                    style={[
                      styles.emptyActionText,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    Pull down to refresh and check for new contracts
                  </Text>
                </View>
              </View>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              style={[
                styles.emptyRefreshButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={theme.colors.white}
              />
              <Text style={styles.emptyRefreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Employment Contract
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Salon Selector - Only show when employee works at multiple salons */}
        {contracts.length > 1 && (
          <View style={[styles.salonSelector, dynamicStyles.card]}>
            <Text
              style={[styles.salonSelectorLabel, dynamicStyles.textSecondary]}
            >
              Select Salon
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.salonChips}
            >
              {contracts.map((contract) => (
                <TouchableOpacity
                  key={contract.salonId}
                  style={[
                    styles.salonChip,
                    selectedSalonId === contract.salonId &&
                      styles.salonChipActive,
                    {
                      borderColor:
                        selectedSalonId === contract.salonId
                          ? theme.colors.primary
                          : dynamicStyles.card.borderColor,
                      backgroundColor:
                        selectedSalonId === contract.salonId
                          ? theme.colors.primaryLight
                          : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedSalonId(contract.salonId)}
                >
                  <Text
                    style={[
                      styles.salonChipText,
                      {
                        color:
                          selectedSalonId === contract.salonId
                            ? theme.colors.primary
                            : dynamicStyles.text.color,
                      },
                    ]}
                  >
                    {contract.salon?.name || "Unknown Salon"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedContract && (
          <>
            {/* Contract Header with Gradient */}
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contractHeader}
            >
              <View style={styles.contractHeaderContent}>
                <View style={styles.contractHeaderIcon}>
                  <MaterialIcons
                    name="description"
                    size={32}
                    color={theme.colors.white}
                  />
                </View>
                <View style={styles.contractHeaderText}>
                  <Text style={styles.contractTitle}>Employment Contract</Text>
                  <Text style={styles.contractSalon}>
                    {selectedContract.salon?.name || "Unknown Salon"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: selectedContract.isActive
                      ? theme.colors.overlay
                      : theme.colors.overlay,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: selectedContract.isActive
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {selectedContract.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </LinearGradient>

            {/* Employee & Salon Information */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Employee & Salon Information
                </Text>
              </View>

              <ContractInfoRow
                label="Employee Full Name"
                value={selectedContract.user?.fullName || "Not specified"}
                dynamicStyles={dynamicStyles}
              />

              <ContractInfoRow
                label="National ID"
                value={getNationalId()}
                dynamicStyles={dynamicStyles}
              />

              <ContractInfoRow
                label="Salon Name"
                value={selectedContract.salon?.name || "Not specified"}
                dynamicStyles={dynamicStyles}
              />

              {selectedContract.salon?.address && (
                <ContractInfoRow
                  label="Salon Address"
                  value={selectedContract.salon.address}
                  dynamicStyles={dynamicStyles}
                />
              )}

              {selectedContract.salon?.owner && (
                <>
                  <ContractInfoRow
                    label="Salon Owner Name"
                    value={
                      selectedContract.salon.owner.fullName || "Not specified"
                    }
                    dynamicStyles={dynamicStyles}
                  />
                  {selectedContract.salon.owner.email && (
                    <ContractInfoRow
                      label="Owner Email"
                      value={selectedContract.salon.owner.email}
                      dynamicStyles={dynamicStyles}
                    />
                  )}
                  {selectedContract.salon.owner.phone && (
                    <ContractInfoRow
                      label="Owner Phone"
                      value={selectedContract.salon.owner.phone}
                      dynamicStyles={dynamicStyles}
                    />
                  )}
                </>
              )}
            </View>

            {/* Employment Terms */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="work"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Employment Terms
                </Text>
              </View>

              <ContractInfoRow
                label="Job Title / Role"
                value={selectedContract.roleTitle || "Not specified"}
                dynamicStyles={dynamicStyles}
              />

              <ContractInfoRow
                label="Contract Type"
                value={formatEmploymentType(selectedContract.employmentType)}
                dynamicStyles={dynamicStyles}
              />

              <ContractInfoRow
                label="Start Date"
                value={formatDate(selectedContract.hireDate)}
                dynamicStyles={dynamicStyles}
              />

              <ContractInfoRow
                label="Probation Period"
                value="Not specified"
                dynamicStyles={dynamicStyles}
                note="Standard probation period applies"
              />

              <ContractInfoRow
                label="Working Hours"
                value="Not specified"
                dynamicStyles={dynamicStyles}
                note="As per salon operating hours"
              />

              <ContractInfoRow
                label="Rest Day"
                value="Not specified"
                dynamicStyles={dynamicStyles}
                note="As per salon schedule"
              />
            </View>

            {/* Compensation & Benefits */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Compensation & Benefits
                </Text>
              </View>

              <ContractInfoRow
                label="Salary Type"
                value={formatSalaryType(selectedContract.salaryType)}
                dynamicStyles={dynamicStyles}
              />

              {selectedContract.baseSalary !== undefined &&
                selectedContract.baseSalary !== null && (
                  <ContractInfoRow
                    label="Base Salary"
                    value={formatCurrency(selectedContract.baseSalary)}
                    dynamicStyles={dynamicStyles}
                  />
                )}

              {selectedContract.hourlyRate !== undefined &&
                selectedContract.hourlyRate !== null && (
                  <ContractInfoRow
                    label="Hourly Rate"
                    value={formatCurrency(selectedContract.hourlyRate)}
                    dynamicStyles={dynamicStyles}
                  />
                )}

              {selectedContract.commissionRate !== undefined &&
                selectedContract.commissionRate !== null && (
                  <ContractInfoRow
                    label="Commission Rate"
                    value={`${selectedContract.commissionRate}%`}
                    dynamicStyles={dynamicStyles}
                  />
                )}

              <ContractInfoRow
                label="Payment Frequency"
                value={formatPayFrequency(selectedContract.payFrequency)}
                dynamicStyles={dynamicStyles}
              />

              {selectedContract.overtimeRate !== undefined &&
                selectedContract.overtimeRate !== null && (
                  <ContractInfoRow
                    label="Overtime Rate"
                    value={`${selectedContract.overtimeRate}x base rate`}
                    dynamicStyles={dynamicStyles}
                  />
                )}

              <ContractInfoRow
                label="Leave Entitlements"
                value="Not specified"
                dynamicStyles={dynamicStyles}
                note="Annual, sick, and maternity/paternity leave as per labor law"
              />
            </View>

            {/* Duties & Responsibilities */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="assignment"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Duties & Responsibilities
                </Text>
              </View>

              {selectedContract.roleTitle && (
                <View style={styles.dutiesList}>
                  <DutyItem
                    text={`Perform ${selectedContract.roleTitle.toLowerCase()} duties as assigned`}
                    dynamicStyles={dynamicStyles}
                  />
                  <DutyItem
                    text="Maintain professional conduct and customer service standards"
                    dynamicStyles={dynamicStyles}
                  />
                  <DutyItem
                    text="Follow salon policies and procedures"
                    dynamicStyles={dynamicStyles}
                  />
                  <DutyItem
                    text="Maintain cleanliness and hygiene standards"
                    dynamicStyles={dynamicStyles}
                  />
                  {selectedContract.skills &&
                    selectedContract.skills.length > 0 && (
                      <DutyItem
                        text={`Specialize in: ${selectedContract.skills.join(", ")}`}
                        dynamicStyles={dynamicStyles}
                      />
                    )}
                </View>
              )}
            </View>

            {/* Code of Conduct */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="gavel"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Code of Conduct
                </Text>
              </View>

              <View style={styles.dutiesList}>
                <DutyItem
                  text="Maintain professional appearance and behavior at all times"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Respect customers, colleagues, and salon property"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Follow health and safety regulations"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Adhere to salon operating hours and attendance policies"
                  dynamicStyles={dynamicStyles}
                />
              </View>
            </View>

            {/* Health & Hygiene */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="health-and-safety"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Health & Hygiene Rules
                </Text>
              </View>

              <View style={styles.dutiesList}>
                <DutyItem
                  text="Maintain personal hygiene and cleanliness standards"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Sanitize tools and equipment before and after each use"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Follow health and safety protocols for customer services"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Report any health or safety concerns immediately"
                  dynamicStyles={dynamicStyles}
                />
              </View>
            </View>

            {/* Confidentiality & Data Protection */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Confidentiality & Data Protection
                </Text>
              </View>

              <View style={styles.dutiesList}>
                <DutyItem
                  text="Maintain strict confidentiality of customer information and data"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Do not disclose customer details to unauthorized parties"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Protect salon business information and trade secrets"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Comply with data protection regulations"
                  dynamicStyles={dynamicStyles}
                />
              </View>
            </View>

            {/* Tools & Equipment */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="build"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Tools & Equipment Responsibility
                </Text>
              </View>

              <View style={styles.dutiesList}>
                <DutyItem
                  text="Use salon-provided tools and equipment responsibly"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Report any damaged or missing equipment immediately"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Maintain tools in good working condition"
                  dynamicStyles={dynamicStyles}
                />
                <DutyItem
                  text="Return all equipment in proper condition upon termination"
                  dynamicStyles={dynamicStyles}
                />
              </View>
            </View>

            {/* Termination & Notice */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="event-busy"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Termination & Notice Period
                </Text>
              </View>

              <ContractInfoRow
                label="Notice Period"
                value="Not specified"
                dynamicStyles={dynamicStyles}
                note="As per employment contract and labor law"
              />

              {selectedContract.terminationDate && (
                <ContractInfoRow
                  label="Termination Date"
                  value={formatDate(selectedContract.terminationDate)}
                  dynamicStyles={dynamicStyles}
                />
              )}

              {selectedContract.terminationReason && (
                <ContractInfoRow
                  label="Termination Reason"
                  value={selectedContract.terminationReason}
                  dynamicStyles={dynamicStyles}
                />
              )}

              <View style={styles.terminationNote}>
                <Text
                  style={[
                    styles.terminationNoteText,
                    dynamicStyles.textSecondary,
                  ]}
                >
                  Termination conditions are subject to employment contract
                  terms and applicable labor laws.
                </Text>
              </View>
            </View>

            {/* Dispute Resolution */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="balance"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Dispute Resolution
                </Text>
              </View>

              <View style={styles.disputeResolution}>
                <Text
                  style={[
                    styles.disputeResolutionText,
                    dynamicStyles.textSecondary,
                  ]}
                >
                  Any disputes arising from this employment contract shall be
                  resolved through:
                </Text>
                <View style={styles.dutiesList}>
                  <DutyItem
                    text="Direct discussion with salon management"
                    dynamicStyles={dynamicStyles}
                  />
                  <DutyItem
                    text="Mediation through the salon association"
                    dynamicStyles={dynamicStyles}
                  />
                  <DutyItem
                    text="Legal recourse as per applicable labor laws"
                    dynamicStyles={dynamicStyles}
                  />
                </View>
              </View>
            </View>

            {/* Contract Dates */}
            <View style={[styles.section, dynamicStyles.card]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Contract Information
                </Text>
              </View>

              {selectedContract.createdAt && (
                <ContractInfoRow
                  label="Contract Created"
                  value={formatDate(selectedContract.createdAt)}
                  dynamicStyles={dynamicStyles}
                />
              )}

              {selectedContract.updatedAt && (
                <ContractInfoRow
                  label="Last Updated"
                  value={formatDate(selectedContract.updatedAt)}
                  dynamicStyles={dynamicStyles}
                />
              )}
            </View>

            <View style={{ height: theme.spacing.xxl }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ContractInfoRowProps {
  label: string;
  value: string;
  dynamicStyles: any;
  note?: string;
}

const ContractInfoRow = ({
  label,
  value,
  dynamicStyles,
  note,
}: ContractInfoRowProps) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>{label}</Text>
    <Text style={[styles.infoValue, dynamicStyles.text]}>{value}</Text>
    {note && (
      <Text style={[styles.infoNote, dynamicStyles.textSecondary]}>{note}</Text>
    )}
  </View>
);

interface DutyItemProps {
  text: string;
  dynamicStyles: any;
}

const DutyItem = ({ text, dynamicStyles }: DutyItemProps) => (
  <View style={styles.dutyItem}>
    <View
      style={[styles.dutyBullet, { backgroundColor: theme.colors.primary }]}
    />
    <Text style={[styles.dutyText, dynamicStyles.text]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    position: "relative",
    minHeight: 500,
  },
  emptyDecorativeCircle1: {
    position: "absolute",
    width: theme.spacing.xxl * 5,
    height: theme.spacing.xxl * 5,
    borderRadius: theme.spacing.xxl * 2.5,
    top: -theme.spacing.xxl * 1.25,
    right: -theme.spacing.xxl * 1.25,
    opacity: 0.3,
  },
  emptyDecorativeCircle2: {
    position: "absolute",
    width: theme.spacing.xxl * 3.75,
    height: theme.spacing.xxl * 3.75,
    borderRadius: theme.spacing.xxl * 1.875,
    bottom: -theme.spacing.lg,
    left: -theme.spacing.lg,
    opacity: 0.3,
  },
  emptyIconContainer: {
    width: theme.spacing.xxl * 3.5,
    height: theme.spacing.xxl * 3.5,
    borderRadius: theme.spacing.xxl * 1.75,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: theme.spacing.sm,
    elevation: 4,
  },
  emptyIconInner: {
    width: theme.spacing.xxl * 3,
    height: theme.spacing.xxl * 3,
    borderRadius: theme.spacing.xxl * 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 24,
  },
  emptyInfoCard: {
    width: "100%",
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs / 2 },
    shadowOpacity: 0.05,
    shadowRadius: theme.spacing.xs,
    elevation: 2,
  },
  emptyInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  emptyInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginLeft: theme.spacing.sm,
  },
  emptyInfoText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  emptyActionsCard: {
    width: "100%",
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs / 2 },
    shadowOpacity: 0.05,
    shadowRadius: theme.spacing.xs,
    elevation: 2,
  },
  emptyActionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  emptyActionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  emptyActionIcon: {
    width: theme.touchTargets.minimum,
    height: theme.touchTargets.minimum,
    borderRadius: theme.touchTargets.minimum / 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  emptyActionContent: {
    flex: 1,
  },
  emptyActionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  emptyActionText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
  },
  emptyRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.spacing.md - theme.spacing.xs,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs / 2 },
    shadowOpacity: 0.15,
    shadowRadius: theme.spacing.xs,
    elevation: 4,
  },
  emptyRefreshButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  salonSelector: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  salonSelectorLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  salonChips: {
    flexDirection: "row",
  },
  salonChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.md + theme.spacing.xs,
    borderWidth: 1.5,
    marginRight: theme.spacing.sm,
  },
  salonChipActive: {
    borderWidth: 2,
  },
  salonChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  contractHeader: {
    borderRadius: theme.spacing.md + theme.spacing.xs,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs },
    shadowOpacity: 0.15,
    shadowRadius: theme.spacing.sm,
    elevation: 6,
  },
  contractHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  contractHeaderIcon: {
    width: theme.touchTargets.large,
    height: theme.touchTargets.large,
    borderRadius: theme.touchTargets.large / 2,
    backgroundColor: theme.colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
    opacity: 0.3,
  },
  contractHeaderText: {
    flex: 1,
  },
  contractTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
    marginBottom: 4,
  },
  contractSalon: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.white,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.md + theme.spacing.xs,
  },
  statusDot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  statusText: {
    color: theme.colors.white,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: theme.spacing.xs / 2 },
    shadowOpacity: 0.05,
    shadowRadius: theme.spacing.xs,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primaryLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginLeft: theme.spacing.sm,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    lineHeight: 22,
  },
  infoNote: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
    fontStyle: "italic",
  },
  dutiesList: {
    marginTop: theme.spacing.sm,
  },
  dutyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  dutyBullet: {
    width: theme.spacing.xs + 2,
    height: theme.spacing.xs + 2,
    borderRadius: (theme.spacing.xs + 2) / 2,
    marginTop: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  dutyText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  terminationNote: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    backgroundColor: theme.colors.warningLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  terminationNoteText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
  },
  disputeResolution: {
    marginTop: theme.spacing.sm,
  },
  disputeResolutionText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
});
