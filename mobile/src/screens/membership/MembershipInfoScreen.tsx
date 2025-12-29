import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
import {api} from "../../services/api";

interface MembershipInfoScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function MembershipInfoScreen({ navigation }: MembershipInfoScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [hasApplication, setHasApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
  };

  useEffect(() => {
    checkMembershipStatus();
  }, []);

  const checkMembershipStatus = async () => {
    try {
      const response = await api.get("/memberships/applications/my");
      
      // Response IS the data directly, not response.data
      if (response && (response as any).id) {
        setHasApplication(true);
        setApplicationStatus((response as any).status);
      } else {
        setHasApplication(false);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasApplication(false);
      } else {
        console.error("Error checking membership:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    // If user already has an application, show their status instead
    if (hasApplication) {
      navigation.navigate("ApplicationSuccess", { status: applicationStatus });
    } else {
      navigation.navigate("MembershipApplication");
    }
  };

  const handleViewApplication = () => {
    navigation.navigate("ApplicationSuccess", { status: applicationStatus });
  };

  const benefits = [
    {
      icon: "store",
      title: "Create Your Salon",
      description: "Establish your salon business on our platform",
    },
    {
      icon: "people",
      title: "Manage Employees",
      description: "Add and manage your salon staff members",
    },
    {
      icon: "event",
      title: "Handle Bookings",
      description: "Manage customer appointments and schedules",
    },
    {
      icon: "attach-money",
      title: "Track Revenue",
      description: "Monitor your salon's financial performance",
    },
    {
      icon: "analytics",
      title: "Business Analytics",
      description: "Access insights and analytics for your salon",
    },
    {
      icon: "verified",
      title: "Verified Salon Owner",
      description: "Get verified salon owner badge and credibility",
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Become a Salon Owner
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[theme.colors.primary + "15", theme.colors.primaryLight + "10"]}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              style={styles.heroIcon}
            >
              <MaterialIcons name="business" size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={[styles.heroTitle, dynamicStyles.text]}>
            Start Your Salon Business
          </Text>
          <Text style={[styles.heroSubtitle, dynamicStyles.textSecondary]}>
            Join our platform as a verified salon owner and grow your beauty business
          </Text>
        </LinearGradient>

        {/* Application Status (if exists) */}
        {hasApplication && (
          <View style={[styles.statusCard, dynamicStyles.card]}>
            <View style={styles.statusHeader}>
              <MaterialIcons
                name={
                  applicationStatus === "approved"
                    ? "check-circle"
                    : applicationStatus === "rejected"
                    ? "cancel"
                    : "pending"
                }
                size={20}
                color={
                  applicationStatus === "approved"
                    ? theme.colors.success
                    : applicationStatus === "rejected"
                    ? theme.colors.error
                    : theme.colors.warning
                }
              />
              <Text style={[styles.statusTitle, dynamicStyles.text]}>
                Application {applicationStatus === "pending" ? "Pending" : applicationStatus === "approved" ? "Approved" : "Rejected"}
              </Text>
            </View>
            <Text style={[styles.statusText, dynamicStyles.textSecondary]}>
              {applicationStatus === "pending" &&
                "Your application is being reviewed. We'll notify you once it's processed."}
              {applicationStatus === "approved" &&
                "Congratulations! Your application has been approved. You can now create your salon."}
              {applicationStatus === "rejected" &&
                "Your application was not approved. Please contact support for more information."}
            </Text>
            <TouchableOpacity
              style={styles.viewApplicationButton}
              onPress={handleViewApplication}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewApplicationText, { color: theme.colors.primary }]}>
                View Application Details
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            What You'll Get
          </Text>
          <View style={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={[styles.benefitCard, dynamicStyles.card]}>
                <View style={[styles.benefitIconBg, { backgroundColor: theme.colors.primary + "15" }]}>
                  <MaterialIcons
                    name={benefit.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, dynamicStyles.text]}>
                    {benefit.title}
                  </Text>
                  <Text style={[styles.benefitDesc, dynamicStyles.textSecondary]}>
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Requirements Section */}
        <View style={styles.requirementsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Application Requirements
          </Text>
          <View style={[styles.requirementsCard, dynamicStyles.card]}>
            <View style={styles.requirementItem}>
              <MaterialIcons name="check" size={20} color={theme.colors.success} />
              <Text style={[styles.requirementText, dynamicStyles.text]}>
                Valid business information
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons name="check" size={20} color={theme.colors.success} />
              <Text style={[styles.requirementText, dynamicStyles.text]}>
                Business registration number (optional)
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons name="check" size={20} color={theme.colors.success} />
              <Text style={[styles.requirementText, dynamicStyles.text]}>
                Tax ID (optional)
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons name="check" size={20} color={theme.colors.success} />
              <Text style={[styles.requirementText, dynamicStyles.text]}>
                Valid contact information
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {(!hasApplication || applicationStatus === "rejected") && (
        <View style={[styles.bottomBar, dynamicStyles.card]}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyButtonGradient}
            >
              <MaterialIcons name="business-center" size={18} color={theme.colors.white} />
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs / 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  heroSection: {
    padding: theme.spacing.md,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroIconContainer: {
    marginBottom: theme.spacing.sm,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: theme.spacing.sm,
  },
  statusCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  viewApplicationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs / 2,
    paddingVertical: theme.spacing.xs / 2,
  },
  viewApplicationText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  benefitsSection: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: theme.spacing.sm,
  },
  benefitsList: {
    gap: theme.spacing.sm,
  },
  benefitCard: {
    flexDirection: "row",
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  benefitIconBg: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    lineHeight: 16,
  },
  requirementsSection: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  requirementsCard: {
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: theme.spacing.xs,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  applyButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  applyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  applyButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
