import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Alert,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { Loader } from "../../components/common";
import { api } from "../../services/api";
import { uploadService } from "../../services/upload";
import { useRefreshControl } from "../../hooks/useRefreshControl";
import { config } from "../../config";
import PersonalInformationScreen from "./PersonalInformationScreen";
import NotificationPreferencesScreen from "./NotificationPreferencesScreen";
import SecurityLoginScreen from "./SecurityLoginScreen";
import EmployeeContractScreen from "./EmployeeContractScreen";
import { LinearGradient } from "expo-linear-gradient";

// Placeholder profile image
const profileImage = require("../../../assets/Logo.png");

// Helper to format image URL
const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  
  // Get the server base URL (without /api)
  const baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
  
  // If URL starts with http/https, check if it uses localhost and fix it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Replace localhost or 127.0.0.1 with actual server IP
    const fixedUrl = url
      .replace(/^https?:\/\/localhost(:\d+)?/, baseUrl)
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, baseUrl);
    return fixedUrl;
  }
  
  // Handle file:// URLs as-is
  if (url.startsWith('file:')) return url;
  
  // Prepend server base URL for relative paths
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

interface ProfileScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack?: () => void;
  };
}

type ProfileSubScreen = "main" | "personal" | "notifications" | "security" | "contract";

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user, updateUser } = useAuth();
  const [currentSubScreen, setCurrentSubScreen] =
    useState<ProfileSubScreen>("main");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Profile Completion Logic
  const profileCompletion = useMemo(() => {
    if (!user) return null;
    const fields = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'district', label: 'District' },
      { key: 'avatarUrl', label: 'Profile Photo' }
    ];
    
    // Check fields
    const filledCount = fields.filter(f => {
       const val = (user as any)[f.key];
       return val && val !== '';
    }).length;
    
    const percentage = Math.round((filledCount / fields.length) * 100);
    const missing = fields.filter(f => {
       const val = (user as any)[f.key];
       return !val || val === '';
    });

    return { percentage, missing };
  }, [user]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status === 'denied') {
         Alert.alert('Permission Required', 'You need to grant permission to access your photos.');
         return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      if (pickerResult.assets && pickerResult.assets.length > 0) {
        uploadIcon(pickerResult.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadIcon = async (uri: string) => {
    setUploading(true);
    try {
        const response = await uploadService.uploadAvatar(uri);
        if (response.url) {
            await updateUser({ avatarUrl: response.url });
            Alert.alert("Success", "Profile photo updated!");
        }
    } catch {
        Alert.alert("Error", "Failed to upload photo");
    } finally {
        setUploading(false);
    }
  };

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

  // Refresh control for pull-to-refresh
  const { refreshControl } = useRefreshControl({
    onRefresh: checkMembershipStatus,
    isDark,
  });

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
    container: { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background },
    text: { color: isDark ? theme.colors.white : theme.colors.text },
    textSecondary: { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
    menuItem: { backgroundColor: 'transparent' },
    modalBackground: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white },
  };

  // Render sub-screens
  if (currentSubScreen !== "main") {
    const screens = {
      personal: <PersonalInformationScreen navigation={{ goBack: handleGoBackToMain }} />,
      notifications: <NotificationPreferencesScreen navigation={{ goBack: handleGoBackToMain }} />,
      security: <SecurityLoginScreen navigation={{ goBack: handleGoBackToMain }} />,
      contract: <EmployeeContractScreen navigation={{ goBack: handleGoBackToMain }} />
    };
    return screens[currentSubScreen] || null;
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
        refreshControl={refreshControl}
      >
        {/* Profile Header */}
        <View style={styles.header}>
            <View style={styles.profileSection}>
                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
                        <Image 
                            source={user?.avatarUrl ? { uri: getImageUrl(user.avatarUrl) || '' } : profileImage} 
                            style={styles.profileImage}
                            onError={(e) => console.log('Profile avatar load error:', e.nativeEvent.error)}
                        />
                        <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                            <MaterialIcons name="camera-alt" size={12} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.infoSection}>
                    <Text style={[styles.name, dynamicStyles.text]}>{userName}</Text>
                    <Text style={[styles.email, dynamicStyles.textSecondary]}>{userEmail}</Text>
                    {displayRole ? (
                        <Text style={[styles.roleText, { color: theme.colors.primary }]}>{displayRole}</Text>
                    ) : null}
                </View>
            </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
            {/* Personal Info */}
            <TouchableOpacity 
                style={[styles.menuItem, dynamicStyles.menuItem]} 
                onPress={() => handleNavigateToSubScreen("personal")}
            >
                <View style={styles.menuIconContainer}>
                    <MaterialIcons name="person-outline" size={22} color={dynamicStyles.text.color} />
                    <Text style={[styles.menuTitle, dynamicStyles.text]}>Personal Information</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

            {/* Notifications */}
            <TouchableOpacity 
                style={[styles.menuItem, dynamicStyles.menuItem]} 
                onPress={() => handleNavigateToSubScreen("notifications")}
            >
                <View style={styles.menuIconContainer}>
                    <MaterialIcons name="notifications-none" size={22} color={dynamicStyles.text.color} />
                    <Text style={[styles.menuTitle, dynamicStyles.text]}>Notification Preferences</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

            {/* Security */}
            <TouchableOpacity 
                style={[styles.menuItem, dynamicStyles.menuItem]} 
                onPress={() => handleNavigateToSubScreen("security")}
            >
                <View style={styles.menuIconContainer}>
                    <MaterialIcons name="lock-outline" size={22} color={dynamicStyles.text.color} />
                    <Text style={[styles.menuTitle, dynamicStyles.text]}>Security & Login</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>

            {/* Employee Contract */}
            {isEmployee && (
                <>
                <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />
                <TouchableOpacity 
                    style={[styles.menuItem, dynamicStyles.menuItem]} 
                    onPress={() => handleNavigateToSubScreen("contract")}
                >
                    <View style={styles.menuIconContainer}>
                        <MaterialIcons name="description" size={22} color={dynamicStyles.text.color} />
                        <Text style={[styles.menuTitle, dynamicStyles.text]}>Employment Contract</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={dynamicStyles.textSecondary.color} />
                </TouchableOpacity>
                </>
            )}
             
            {/* Customer Favorites */}
            {isCustomer && (
                <>
                <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />
                <TouchableOpacity 
                    style={[styles.menuItem, dynamicStyles.menuItem]} 
                    onPress={() => navigation?.navigate("Favorites")}
                >
                    <View style={styles.menuIconContainer}>
                        <MaterialIcons name="favorite-border" size={22} color={dynamicStyles.text.color} />
                        <Text style={[styles.menuTitle, dynamicStyles.text]}>Favorites</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={dynamicStyles.textSecondary.color} />
                </TouchableOpacity>
                </>
            )}
        </View>

        <View style={styles.sectionSpacer} />

        <View style={styles.section}>
            {/* Theme Toggle */}
             <View style={[styles.menuItem, dynamicStyles.menuItem]}>
                <View style={styles.menuIconContainer}>
                    <MaterialIcons name={isDark ? "dark-mode" : "light-mode"} size={22} color={dynamicStyles.text.color} />
                    <Text style={[styles.menuTitle, dynamicStyles.text]}>Dark Mode</Text>
                </View>
                <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFF"
                />
            </View>
        </View>

        {/* Become Owner CTA - Simple Button */}
        {showBecomeOwnerSection && (
             <TouchableOpacity 
                style={styles.simpleCta}
                onPress={() => navigation?.navigate("MembershipApplication")}
             >
                 <Text style={styles.simpleCtaText}>Become a Salon Owner</Text>
                 <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
             </TouchableOpacity>
        )}

        <View style={styles.sectionSpacer} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
             <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={cancelLogout}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Log Out</Text>
            <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={cancelLogout}>
                <Text style={[styles.cancelButtonText, dynamicStyles.text]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmLogout}>
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { position: 'relative' },
  profileImage: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F0F0F0' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  infoSection: { marginLeft: 16, flex: 1, justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  email: { fontSize: 13, marginBottom: 4 },
  roleText: { fontSize: 13, fontWeight: '600' },
  
  section: { paddingHorizontal: 20 },
  sectionSpacer: { height: 24 },
  
  menuItem: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16,
  },
  menuIconContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuTitle: { fontSize: 16, fontWeight: '500' },
  divider: { height: 1, width: '100%' },
  
  simpleCta: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginHorizontal: 20, marginTop: 20,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
  },
  simpleCtaText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },

  logoutRow: { alignItems: 'center', paddingVertical: 16 },
  logoutText: { color: theme.colors.error, fontWeight: '600', fontSize: 16 },
  versionText: { textAlign: 'center', marginTop: 8, opacity: 0.3, fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 12, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: '#ddd' },
  confirmButton: { backgroundColor: theme.colors.error },
  cancelButtonText: { fontWeight: '600' },
  confirmButtonText: { color: '#FFF', fontWeight: '600' },
});
