import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {api} from "../../services/api";

interface ApplicationSuccessScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
  route?: {
    params?: {
      status?: string;
    };
  };
}

export default function ApplicationSuccessScreen({
  navigation,
  route,
}: ApplicationSuccessScreenProps) {
  const { isDark } = useTheme();
  const scaleAnim = new Animated.Value(0);
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState<any>(null);

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
    fetchApplicationData();
    // Only animate the icon scale, not the text opacity
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchApplicationData = async () => {
    try {
      const response = await api.get("/memberships/applications/my");
      // Response IS the data directly, not response.data
      setApplicationData(response);
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigation.navigate("Home");
  };

  const status = applicationData?.status || route?.params?.status || "pending";

  const statusConfig = {
    pending: {
      icon: "pending",
      color: theme.colors.warning,
      title: "Application Submitted!",
      message: "Your application has been received and is under review",
    },
    approved: {
      icon: "check-circle",
      color: theme.colors.success,
      title: "Application Approved!",
      message: "Congratulations! You can now create your salon business",
    },
    rejected: {
      icon: "cancel",
      color: theme.colors.error,
      title: "Application Rejected",
      message: "Your application was not approved at this time",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  // Always show content - don't block on loading
  // This prevents black screen issues
  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Loading Overlay - shows while fetching but doesn't block content */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
          
          {/* Status Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View
              style={[styles.iconBg, { backgroundColor: config.color + "20" }]}
            >
              <MaterialIcons name={config.icon as any} size={80} color={config.color} />
            </View>
          </Animated.View>

          {/* Text Container - No opacity animation, immediately visible */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, dynamicStyles.text]}>
              {config.title}
            </Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
              {config.message}
            </Text>

            {/* Application Details */}
            {applicationData && (
              <View style={[styles.detailsCard, dynamicStyles.card]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>
                    Business Name
                  </Text>
                  <Text style={[
                    styles.detailValue,
                    applicationData.businessName ? dynamicStyles.text : styles.notProvidedText
                  ]}>
                    {applicationData.businessName || "Not provided"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>
                    Location
                  </Text>
                  <Text style={[
                    styles.detailValue,
                    (applicationData.city || applicationData.district) ? dynamicStyles.text : styles.notProvidedText
                  ]}>
                    {applicationData.city || applicationData.district 
                      ? `${applicationData.city || "N/A"}, ${applicationData.district || "N/A"}`
                      : "Not provided"}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>
                    Status
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: config.color + "20" },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.statusText, { color: config.color }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>
                    Submitted
                  </Text>
                  <Text style={[styles.detailValue, dynamicStyles.text]}>
                    {new Date(applicationData.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                {/* Show warning if data is incomplete */}
                {(!applicationData.businessName || !applicationData.city || !applicationData.district) && (
                  <View>
                    <View style={styles.divider} />
                    <View style={[styles.warningCard, { backgroundColor: theme.colors.warning + "10" }]}>
                      <MaterialIcons name="warning" size={18} color={theme.colors.warning} />
                      <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                        Some application details are missing. This may delay processing.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Next Steps */}
            <View style={[styles.nextStepsCard, dynamicStyles.card]}>
              <View style={styles.nextStepsHeader}>
                <MaterialIcons
                  name="list"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={[styles.nextStepsTitle, dynamicStyles.text]}>
                  What Happens Next?
                </Text>
              </View>

              <View style={styles.stepsList}>
                {status === "pending" && (
                  <>
                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        Our team will review your application within 2-3 business days
                      </Text>
                    </View>

                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        You'll receive a notification once your application is reviewed
                      </Text>
                    </View>

                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        Once approved, you can start creating your salon profile
                      </Text>
                    </View>
                  </>
                )}

                {status === "approved" && (
                  <>
                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        Create your salon business profile
                      </Text>
                    </View>

                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        Add your services and staff members
                      </Text>
                    </View>

                    <View style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <Text style={[styles.stepText, dynamicStyles.text]}>
                        Start accepting bookings from customers
                      </Text>
                    </View>
                  </>
                )}

                {status === "rejected" && applicationData?.rejectionReason && (
                  <View style={[styles.rejectionCard, { backgroundColor: theme.colors.error + "10" }]}>
                    <MaterialIcons name="info" size={20} color={theme.colors.error} />
                    <View style={styles.rejectionContent}>
                      <Text style={[styles.rejectionTitle, { color: theme.colors.error }]}>
                        Reason for Rejection
                      </Text>
                      <Text style={[styles.rejectionText, dynamicStyles.text]}>
                        {applicationData.rejectionReason}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Contact Support */}
            <TouchableOpacity
              style={styles.supportButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="help-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.supportText, { color: theme.colors.primary }]}>
                Have questions? Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomBar, dynamicStyles.card]}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeButtonGradient}
          >
            <MaterialIcons name="home" size={20} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    padding: theme.spacing.xl,
  },
  loadingOverlay: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  iconBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  detailsCard: {
    width: "100%",
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
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
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: "right",
  },
  notProvidedText: {
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: theme.fonts.regular,
    color: theme.colors.warning,
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    gap: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.xs,
  },
  nextStepsCard: {
    width: "100%",
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  nextStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  stepsList: {
    gap: theme.spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  rejectionCard: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  supportText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  homeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  homeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderRadius: 8,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  warningText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flex: 1,
    lineHeight: 16,
  },
});
