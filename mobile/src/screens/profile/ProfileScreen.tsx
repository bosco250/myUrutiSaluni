import React, { useState } from "react";
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
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import PersonalInformationScreen from "./PersonalInformationScreen";
import NotificationPreferencesScreen from "./NotificationPreferencesScreen";
import SecurityLoginScreen from "./SecurityLoginScreen";

// Placeholder profile image - in production, use actual user image
const profileImage = require("../../../assets/Logo.png");

interface ProfileScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack?: () => void;
  };
}

type ProfileSubScreen = "main" | "personal" | "notifications" | "security";

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const [currentSubScreen, setCurrentSubScreen] =
    useState<ProfileSubScreen>("main");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    sectionCard: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
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

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header with Artistic Elements */}
        <View style={styles.profileHeader}>
          {/* Decorative Background Circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />

          <View style={styles.profileImageContainer}>
            {/* Profile Image Glow Effect */}
            <View style={styles.profileImageGlow} />
            <View style={styles.profileImageShadow} />
            <Image source={profileImage} style={styles.profileImage} />
          </View>

          <Text
            style={[styles.profileName, { color: dynamicStyles.text.color }]}
          >
            {userName}
          </Text>
          {displayRole ? (
            <Text
              style={[
                styles.profileTitle,
                { color: dynamicStyles.textSecondary.color },
              ]}
            >
              {displayRole}
            </Text>
          ) : null}
          {userEmail ? (
            <Text
              style={[
                styles.profileEmail,
                { color: dynamicStyles.textSecondary.color },
              ]}
            >
              {userEmail}
            </Text>
          ) : null}
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
                size={24}
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

        {/* Log Out Button with Artistic Styling */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.logoutButtonGlow} />
          <View style={styles.logoutButtonContent}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
            <View style={styles.logoutIconContainer}>
              <MaterialIcons
                name="exit-to-app"
                size={20}
                color={theme.colors.error}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: theme.spacing.xl }} />
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
              <MaterialIcons name="exit-to-app" size={40} color={theme.colors.error} />
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
    </View>
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
    paddingBottom: theme.spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: StatusBar.currentHeight
      ? StatusBar.currentHeight + theme.spacing.md
      : theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  decorativeCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.15,
    top: 20,
    right: -40,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
    top: 60,
    left: -20,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.2,
    bottom: 40,
    right: 20,
  },
  profileImageContainer: {
    marginBottom: theme.spacing.sm,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
  },
  profileImageShadow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.backgroundSecondary,
    zIndex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  profileTitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs / 2,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs / 2,
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 16,
    padding: theme.spacing.md,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    width: 4,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.xs,
  },
  logoutButton: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  logoutButtonGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.error,
    fontFamily: theme.fonts.medium,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 340,
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
});
