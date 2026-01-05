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
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
import { api } from "../../services/api";

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

  useEffect(() => {
    checkMembershipStatus();
  }, []);

  const checkMembershipStatus = async () => {
    try {
      const response = await api.get("/memberships/applications/my");
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
    if (hasApplication) {
      navigation.navigate("ApplicationSuccess", { status: applicationStatus });
    } else {
      navigation.navigate("MembershipApplication");
    }
  };

  const handleViewApplication = () => {
    navigation.navigate("ApplicationSuccess", { status: applicationStatus });
  };

  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background,
    text: isDark ? "#FFFFFF" : theme.colors.text,
    subtext: isDark ? "#8E8E93" : theme.colors.textSecondary,
    cardBg: isDark ? theme.colors.gray800 : "#FFFFFF",
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    primaryLight: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.primary + '10',
  };

  const benefits = [
    { icon: "store", title: "Create Your Salon", description: "Establish your salon business on our platform" },
    { icon: "people", title: "Manage Employees", description: "Add and manage your salon staff members" },
    { icon: "event", title: "Handle Bookings", description: "Manage customer appointments and schedules" },
    { icon: "attach-money", title: "Track Revenue", description: "Monitor your salon's financial performance" },
    { icon: "analytics", title: "Business Analytics", description: "Access insights and analytics for your salon" },
    { icon: "verified", title: "Verified Badge", description: "Get verified salon owner badge and credibility" },
  ];

  const requirements = [
    "Valid business information",
    "Business registration number (optional)",
    "Tax ID (optional)",
    "Valid contact information",
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading..." />
      </SafeAreaView>
    );
  }

  const statusColor = applicationStatus === "approved" ? theme.colors.success : applicationStatus === "rejected" ? theme.colors.error : theme.colors.warning;
  const statusIcon = applicationStatus === "approved" ? "check-circle" : applicationStatus === "rejected" ? "cancel" : "hourglass-top";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { borderBottomColor: dynamic.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={dynamic.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dynamic.text }]}>Become a Salon Owner</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: dynamic.primaryLight }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="business" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { color: dynamic.text }]}>Start Your Salon Business</Text>
          <Text style={[styles.heroSubtitle, { color: dynamic.subtext }]}>Join our platform as a verified salon owner and grow your beauty business</Text>
        </View>

        {/* Application Status Card */}
        {hasApplication && (
          <View style={[styles.statusCard, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
            <View style={styles.statusHeader}>
              <MaterialIcons name={statusIcon as any} size={20} color={statusColor} />
              <Text style={[styles.statusTitle, { color: dynamic.text }]}>
                Application {applicationStatus === "pending" ? "Under Review" : applicationStatus === "approved" ? "Approved" : "Rejected"}
              </Text>
            </View>
            <Text style={[styles.statusText, { color: dynamic.subtext }]}>
              {applicationStatus === "pending" && "Your application is being reviewed. We'll notify you once it's processed."}
              {applicationStatus === "approved" && "Congratulations! You can now create your salon."}
              {applicationStatus === "rejected" && "Your application was not approved. Please contact support."}
            </Text>
            <TouchableOpacity style={styles.viewApplicationButton} onPress={handleViewApplication} activeOpacity={0.7}>
              <Text style={[styles.viewApplicationText, { color: theme.colors.primary }]}>View Details</Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: dynamic.text }]}>What You'll Get</Text>
          <View style={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={[styles.benefitCard, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
                <View style={[styles.benefitIconBg, { backgroundColor: theme.colors.primary + "15" }]}>
                  <MaterialIcons name={benefit.icon as any} size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, { color: dynamic.text }]}>{benefit.title}</Text>
                  <Text style={[styles.benefitDesc, { color: dynamic.subtext }]}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Requirements Section */}
        <View style={styles.requirementsSection}>
          <Text style={[styles.sectionTitle, { color: dynamic.text }]}>Requirements</Text>
          <View style={[styles.requirementsCard, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
            {requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.success} />
                <Text style={[styles.requirementText, { color: dynamic.text }]}>{req}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {(!hasApplication || applicationStatus === "rejected") && (
        <View style={[styles.bottomBar, { backgroundColor: dynamic.cardBg, borderTopColor: dynamic.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleApply}
            activeOpacity={0.85}
          >
            <MaterialIcons name="business-center" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Compacted Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  heroSection: { padding: 32, alignItems: "center", borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  heroTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: '90%' },
  statusCard: { margin: 20, padding: 16, borderRadius: 16, borderWidth: 1 },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statusTitle: { fontSize: 15, fontWeight: "700" },
  statusText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  viewApplicationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 4 },
  viewApplicationText: { fontSize: 13, fontWeight: "600" },
  benefitsSection: { paddingHorizontal: 20, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, letterSpacing: -0.3 },
  benefitsList: { gap: 12 },
  benefitCard: { flexDirection: "row", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  benefitIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  benefitContent: { flex: 1, justifyContent: 'center' },
  benefitTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  benefitDesc: { fontSize: 13, lineHeight: 18 },
  requirementsSection: { paddingHorizontal: 20, marginTop: 24 },
  requirementsCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  requirementItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  requirementText: { fontSize: 14, flex: 1 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 24 },
  applyButton: { borderRadius: 50, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  applyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
