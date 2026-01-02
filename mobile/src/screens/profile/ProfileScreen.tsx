import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Switch,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { Loader } from "../../components/common";
import { api } from "../../services/api";
import PersonalInformationScreen from "./PersonalInformationScreen";
import NotificationPreferencesScreen from "./NotificationPreferencesScreen";
import SecurityLoginScreen from "./SecurityLoginScreen";
import EmployeeContractScreen from "./EmployeeContractScreen";

// Placeholder profile image - in production, use actual user image
const profileImage = require("../../../assets/Logo.png");

interface ProfileScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack?: () => void;
  };
}

type ProfileSubScreen = "main" | "personal" | "notifications" | "security" | "contract";

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const [currentSubScreen, setCurrentSubScreen] =
    useState<ProfileSubScreen>("main");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);

  // Check if user is an employee
  const isEmployee = user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE";
  
  // Check if user is a customer (favorites should only show for customers)
  const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";

  // Check if employee already has a membership application
  const checkMembershipStatus = useCallback(async () => {
    if (!isEmployee) {
      setCheckingMembership(false);
      return;
    }
    
    try {
      setCheckingMembership(true);
      const response = await api.get("/memberships/applications/my");
      // If we get a response with an id, user has an existing application
      if (response && (response as any).id) {
        setHasExistingApplication(true);
      }
    } catch (error: any) {
      // 404 means no application exists, which is fine
      if (error.response?.status !== 404) {
        console.log("Error checking membership:", error.message);
      }
      setHasExistingApplication(false);
    } finally {
      setCheckingMembership(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    checkMembershipStatus();
  }, [checkMembershipStatus]);

  // Show "Become an Owner" only for employees without existing application
  const showBecomeOwnerSection = isEmployee && !hasExistingApplication;


  // Get user data from auth context
  const userName = user?.fullName || "User";
  const userEmail = user?.email || "";
  const userRole = user?.role || "";

  // Format role for display (e.g., "salon_employee" -> "Salon Employee")
  const formatRole = (role: string): string => {
    if (!role) return "";
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const displayRole = formatRole(userRole);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      // Navigation will automatically update based on auth state
      navigation?.navigate("Login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate to login even if logout fails
      navigation?.navigate("Login");
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleNavigateToSubScreen = (screen: ProfileSubScreen) => {
    setCurrentSubScreen(screen);
  };

  const handleGoBackToMain = () => {
    setCurrentSubScreen("main");
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    sectionCard: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  // Render sub-screens
  if (currentSubScreen === "personal") {
    return (
      <PersonalInformationScreen navigation={{ goBack: handleGoBackToMain }} />
    );
  }

  if (currentSubScreen === "notifications") {
    return (
      <NotificationPreferencesScreen
        navigation={{ goBack: handleGoBackToMain }}
      />
    );
  }

  if (currentSubScreen === "security") {
    return <SecurityLoginScreen navigation={{ goBack: handleGoBackToMain }} />;
  }

  if (currentSubScreen === "contract") {
    return <EmployeeContractScreen navigation={{ goBack: handleGoBackToMain }} />;
  }

  if (checkingMembership && isEmployee) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <Loader fullscreen message="Loading profile..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderContent}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageGlow} />
              <Image source={profileImage} style={styles.profileImage} />
            </View>

            <View style={styles.profileInfoContainer}>
              <Text style={[styles.profileName, dynamicStyles.text]}>
                {userName}
              </Text>
              {displayRole ? (
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + "15" }]}>
                  <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
                    {displayRole}
                  </Text>
                </View>
              ) : null}
              {userEmail ? (
                <Text style={[styles.profileEmail, dynamicStyles.textSecondary]}>
                  {userEmail}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Preferences Section Card */}
        <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: dynamicStyles.text.color },
                ]}
              >
                Preferences
              </Text>
            </View>
          </View>

          {/* Theme Toggle */}
          <View style={styles.settingRow}>
            <Text
              style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
            >
              {isDark ? "Light Theme" : "Dark Theme"}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.border}
            />
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
              },
            ]}
          />

          {/* Language Option */}
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <Text
              style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
            >
              Language
            </Text>
            <View style={styles.settingValueContainer}>
              <Text
                style={[
                  styles.settingValue,
                  { color: dynamicStyles.textSecondary.color },
                ]}
              >
                English
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={dynamicStyles.textSecondary.color}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Section Card */}
        <View style={[styles.sectionCard, dynamicStyles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: dynamicStyles.text.color },
                ]}
              >
                Settings
              </Text>
            </View>
          </View>

          {/* Favorites - Only show for customers */}
          {isCustomer && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => navigation?.navigate("Favorites")}
              >
                <Text
                  style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
                >
                  Favorites
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
                  },
                ]}
              />
            </>
          )}

          {/* Personal Information */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => handleNavigateToSubScreen("personal")}
          >
            <Text
              style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
            >
              Personal Information
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
              },
            ]}
          />

          {/* Employment Contract - Only show for employees */}
          {isEmployee && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => handleNavigateToSubScreen("contract")}
              >
                <Text
                  style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
                >
                  Employment Contract
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
                  },
                ]}
              />
            </>
          )}

          {/* Notification Preferences */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => handleNavigateToSubScreen("notifications")}
          >
            <Text
              style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
            >
              Notification Preferences
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
              },
            ]}
          />

          {/* Security & Login */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => handleNavigateToSubScreen("security")}
          >
            <Text
              style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
            >
              Security & Login
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>
        </View>

        {/* Become an Owner Section - Only for Employees without existing application */}
        {showBecomeOwnerSection && (
          <View style={[styles.sectionCard, styles.ownerCard]}>
            <View style={styles.ownerCardHeader}>
              <View style={styles.ownerIconContainer}>
                <MaterialIcons name="business" size={28} color={theme.colors.primary} />
              </View>
              <View style={styles.ownerTextContainer}>
                <Text style={[styles.ownerTitle, dynamicStyles.text]}>
                  Become a Salon Owner
                </Text>
                <Text style={[styles.ownerDescription, dynamicStyles.textSecondary]}>
                  Ready to start your own salon business? Apply for membership and unlock owner benefits.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.ownerApplyButton}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate("MembershipApplication")}
            >
              <Text style={styles.ownerApplyButtonText}>Apply Now</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.logoutButtonContent}>
            <MaterialIcons
              name="exit-to-app"
              size={22}
              color={theme.colors.error}
            />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom spacing for bottom navigation */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.sectionCard]}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="exit-to-app" size={36} color={theme.colors.error} />
            </View>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Log Out</Text>
            <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: theme.spacing.xs,
  },
  profileHeader: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  profileImageContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  profileInfoContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    opacity: 0.8,
  },
  sectionCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 20,
    padding: theme.spacing.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    marginBottom: theme.spacing.xs,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    width: 3,
    height: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 1.5,
    marginRight: theme.spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.xs + 2,
    minHeight: 40,
  },
  settingLabel: {
    fontSize: 15,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.xs / 2,
  },
  logoutButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: theme.colors.error + "20",
    backgroundColor: theme.colors.error + "05",
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.error,
    fontFamily: theme.fonts.bold,
  },
  ownerCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary + "30",
    backgroundColor: theme.colors.primary + "05",
  },
  ownerCardHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  ownerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + "15",
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerTextContainer: {
    flex: 1,
  },
  ownerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  ownerDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
  },
  ownerApplyButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ownerApplyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: theme.spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
});
