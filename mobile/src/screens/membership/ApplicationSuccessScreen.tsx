import React, { useEffect, useState, useMemo } from "react";
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
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

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
  const scaleAnim = useMemo(() => new Animated.Value(0), []);
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState<any>(null);

  useEffect(() => {
    fetchApplicationData();
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const fetchApplicationData = async () => {
    try {
      const response = await api.get("/memberships/applications/my");
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
      icon: "hourglass-top",
      color: theme.colors.warning,
      title: "Under Review",
      message: "We've received your application. Our team is currently reviewing your details.",
    },
    approved: {
      icon: "check-circle",
      color: theme.colors.success,
      title: "Application Approved!",
      message: "Congratulations! You can now create your salon business profile.",
    },
    rejected: {
      icon: "cancel",
      color: theme.colors.error,
      title: "Application Rejected",
      message: "Unfortunately, your application was not approved. Please see the reason below.",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  
  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background,
    text: isDark ? "#FFFFFF" : theme.colors.text,
    subtext: isDark ? "#8E8E93" : theme.colors.textSecondary,
    cardBg: isDark ? theme.colors.gray800 : "#FFFFFF",
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    primaryLight: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.primary + '10',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.iconBg, { backgroundColor: config.color + "15" }]}>
              <MaterialIcons name={config.icon as any} size={64} color={config.color} />
            </View>
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: dynamic.text }]}>{config.title}</Text>
            <Text style={[styles.subtitle, { color: dynamic.subtext }]}>{config.message}</Text>

            {/* Application Data Card */}
            {applicationData && (
              <View style={[styles.detailsCard, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: dynamic.subtext }]}>Business Name</Text>
                  <Text style={[styles.detailValue, { color: applicationData.businessName ? dynamic.text : theme.colors.warning }]}>
                    {applicationData.businessName || "Not provided"}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: dynamic.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: dynamic.subtext }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: (applicationData.city || applicationData.district) ? dynamic.text : theme.colors.warning }]}>
                    {applicationData.city || applicationData.district ? `${applicationData.city || "N/A"}, ${applicationData.district || "N/A"}` : "Not provided"}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: dynamic.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: dynamic.subtext }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: config.color + "15" }]}>
                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.statusText, { color: config.color }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.divider, { backgroundColor: dynamic.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: dynamic.subtext }]}>Submitted On</Text>
                  <Text style={[styles.detailValue, { color: dynamic.text }]}>
                    {new Date(applicationData.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            {/* Timeline */}
            <View style={[styles.nextStepsCard, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
              <View style={styles.nextStepsHeader}>
                <MaterialIcons name="timeline" size={24} color={theme.colors.primary} />
                <Text style={[styles.nextStepsTitle, { color: dynamic.text }]}>Next Steps</Text>
              </View>

              <View style={styles.stepsList}>
                {status === "pending" && (
                  <>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary + "15" }]}>
                        <Text style={[styles.stepNumberText, { color: theme.colors.primary }]}>1</Text>
                      </View>
                      <Text style={[styles.stepText, { color: dynamic.text }]}>Application Review (2-3 Days)</Text>
                    </View>
                    <View style={[styles.stepLine, { backgroundColor: dynamic.border }]} />
                    <View style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: dynamic.border }]}>
                        <Text style={[styles.stepNumberText, { color: dynamic.subtext }]}>2</Text>
                      </View>
                      <Text style={[styles.stepText, { color: dynamic.subtext }]}>Wait for Approval Notification</Text>
                    </View>
                    <View style={[styles.stepLine, { backgroundColor: dynamic.border }]} />
                    <View style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: dynamic.border }]}>
                        <Text style={[styles.stepNumberText, { color: dynamic.subtext }]}>3</Text>
                      </View>
                      <Text style={[styles.stepText, { color: dynamic.subtext }]}>Create Salon Profile</Text>
                    </View>
                  </>
                )}

                {status === "approved" && (
                   <View style={[styles.rejectionCard, { backgroundColor: theme.colors.success + "10" }]}>
                      <Text style={[styles.rejectionText, { color: theme.colors.success }]}>Your account is fully approved! You can now access the full owner dashboard.</Text>
                   </View>
                )}

                {status === "rejected" && applicationData?.rejectionReason && (
                  <View style={[styles.rejectionCard, { backgroundColor: theme.colors.error + "10" }]}>
                    <MaterialIcons name="error" size={20} color={theme.colors.error} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.rejectionTitle, { color: theme.colors.error }]}>Reason for Rejection</Text>
                        <Text style={[styles.rejectionText, { color: dynamic.text }]}>{applicationData.rejectionReason}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity style={styles.supportButton} activeOpacity={0.7}>
               <Text style={[styles.supportText, { color: theme.colors.primary }]}>Contact Support</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: dynamic.cardBg, borderTopColor: dynamic.border }]}>
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleGoHome}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>Return to Home</Text>
          <MaterialIcons name="home" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {loading && (
        <View style={styles.loadingOverlay}>
             <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

// Compacted Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  iconContainer: { alignItems: "center", marginBottom: 32 },
  iconBg: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  textContainer: { width: "100%", alignItems: 'center' },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, lineHeight: 22, maxWidth: '90%' },
  detailsCard: { width: "100%", borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 24 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, width: '100%', marginVertical: 8 },
  nextStepsCard: { width: "100%", borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 24 },
  nextStepsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  nextStepsTitle: { fontSize: 16, fontWeight: "700" },
  stepsList: { gap: 0 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontSize: 12, fontWeight: "700" },
  stepText: { fontSize: 14, flex: 1 },
  stepLine: { width: 2, height: 16, marginLeft: 13, marginVertical: 4 },
  rejectionCard: { flexDirection: "row", padding: 16, borderRadius: 12, gap: 12 },
  rejectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  rejectionText: { fontSize: 13, lineHeight: 18 },
  supportButton: { padding: 12 },
  supportText: { fontSize: 14, fontWeight: "600" },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1 },
  homeButton: { borderRadius: 50, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  homeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
