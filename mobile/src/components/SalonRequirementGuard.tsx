import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth, useTheme } from "../context";
import { theme } from "../theme";
import { salonService } from "../services/salon";
import { api } from "../services/api";
import { UserRole } from "../constants/roles";
import { Loader } from "./common";

interface SalonRequirementGuardProps {
  children: React.ReactNode;
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export const SalonRequirementGuard: React.FC<SalonRequirementGuardProps> = ({ children, navigation }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [hasSalon, setHasSalon] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'none' | 'pending' | 'rejected' | 'approved'>('none');

  const checkRequirements = useCallback(async () => {
    if (user?.role !== UserRole.SALON_OWNER) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Check Membership
      if (user?.membershipNumber) {
        setHasMembership(true);
        setMembershipStatus('approved');
      } else {
        try {
            const memResponse: any = await api.get("/memberships/applications/my");
            if (memResponse && memResponse.status === 'approved') {
                setHasMembership(true);
                setMembershipStatus('approved');
            } else if (memResponse && (memResponse.status === 'pending' || memResponse.status === 'rejected')) {
                setHasMembership(false);
                setMembershipStatus(memResponse.status);
            } else {
                setHasMembership(false);
                setMembershipStatus('none');
            }
        } catch {
            setHasMembership(false);
            setMembershipStatus('none');
        }
      }

      // 2. Check Salons
      const salons = await salonService.getSalonByOwnerId(user.id);
      if (salons && (Array.isArray(salons) ? salons.length > 0 : !!salons)) {
        setHasSalon(true);
      } else {
        setHasSalon(false);
      }

    } catch (error) {
      console.error("Error checking salon requirements:", error);
      setHasSalon(false); 
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkRequirements();
  }, [checkRequirements]);

  if (user?.role !== UserRole.SALON_OWNER) return <>{children}</>;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background }]}>
        <Loader message="Verifying status..." />
      </View>
    );
  }

  if (hasMembership && hasSalon) return <>{children}</>;

  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background, // Standard background
    cardBg: isDark ? theme.colors.gray800 : theme.colors.white,
    text: isDark ? theme.colors.white : theme.colors.text,
    subtext: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    accentBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
  };

  const benefits = [
    { icon: "analytics", title: "Advanced Analytics", desc: "Track performance" },
    { icon: "verified", title: "Verified Badge", desc: "Build trust" },
    { icon: "campaign", title: "Marketing Tools", desc: "Reach more clients" },
  ];

  const getStatusContent = () => {
    if (!hasMembership) {
      if (membershipStatus === 'pending') {
        return {
          icon: "hourglass-top",
          title: "Verification in Progress",
          desc: "We are reviewing your application. You will be notified once approved.",
          btnText: "Check Status",
          btnAction: checkRequirements,
          iconColor: theme.colors.warning,
          showBenefits: false
        };
      }
      if (membershipStatus === 'rejected') {
        return {
          icon: "error-outline",
          title: "Application Rejected",
          desc: "Please review the feedback sent to your email and try again.",
          btnText: "Contact Support",
          btnAction: () => Alert.alert("Support", "Please email support@urutisaluni.com"),
          iconColor: theme.colors.error,
          showBenefits: false
        };
      }
      return {
        icon: "workspace-premium",
        title: "Unlock Premium Features",
        desc: "Join Uruti Saluni as a verified partner to manage your business effectively.",
        btnText: "Apply now",
        btnAction: () => navigation.navigate("MembershipInfo"),
        iconColor: theme.colors.primary,
        showBenefits: true
      };
    }
    return {
      icon: "storefront",
      title: "Register Your Salon",
      desc: "You are a verified member! Now, let's set up your salon profile.",
      btnText: "Create Salon Profile",
      btnAction: () => navigation.navigate("CreateSalon"),
      iconColor: theme.colors.success,
      showBenefits: false
    };
  };

  const content = getStatusContent();

  return (
    <View style={[styles.container, { backgroundColor: dynamic.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSpacer} />
        
        {/* Premium Card */}
        <View style={[styles.card, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
          
          <View style={[styles.iconBox, { backgroundColor: content.iconColor + '10' }]}>
             <MaterialIcons name={content.icon as any} size={40} color={content.iconColor} />
          </View>

          <Text style={[styles.title, { color: dynamic.text }]}>{content.title}</Text>
          <Text style={[styles.description, { color: dynamic.subtext }]}>{content.desc}</Text>

          {/* Value Props Section */}
          {content.showBenefits && (
              <View style={[styles.benefitsContainer, { backgroundColor: dynamic.accentBg }]}>
                  {benefits.map((b, i) => (
                      <View key={i} style={styles.benefitItem}>
                          <MaterialIcons name={b.icon as any} size={20} color={theme.colors.primary} />
                          <View style={styles.benefitTextCol}>
                              <Text style={[styles.benefitTitle, { color: dynamic.text }]}>{b.title}</Text>
                              <Text style={[styles.benefitDesc, { color: dynamic.subtext }]}>{b.desc}</Text>
                          </View>
                      </View>
                  ))}
              </View>
          )}

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={content.btnAction}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{content.btnText}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          {!hasSalon && hasMembership && (
             <TouchableOpacity onPress={checkRequirements} style={styles.linkBtn}>
               <Text style={[styles.linkBtnText, { color: theme.colors.primary }]}>I've already registered</Text>
             </TouchableOpacity>
          )}

        </View>

        {/* Footer Link */}
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.footerLink}>
           <Text style={[styles.footerText, { color: dynamic.subtext }]}>Back to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

// Compacted Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerSpacer: { height: 20 },
  card: {
    width: '100%', maxWidth: 400, borderRadius: 24, padding: 32,
    alignItems: 'center', borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2
  },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24
  },
  title: {
    fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5
  },
  description: {
    fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10
  },
  benefitsContainer: {
    width: '100%', borderRadius: 16, padding: 20, marginBottom: 32, gap: 16
  },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitTextCol: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  benefitDesc: { fontSize: 12 },
  primaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: 16, padding: 8 },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
  footerLink: { marginTop: 32, padding: 12 },
  footerText: { fontSize: 13, fontWeight: '500' }
});
