import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { api } from "../../services/api";

interface SecurityLoginScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export default function SecurityLoginScreen({
  navigation,
}: SecurityLoginScreenProps) {
  const { isDark } = useTheme();
  const { logout } = useAuth();
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Dynamic Styles
  const dynamicStyles = {
    container: { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background },
    text: { color: isDark ? theme.colors.white : theme.colors.text },
    textSecondary: { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
    input: { 
      backgroundColor: 'transparent',
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight 
    },
    modalBackground: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white },
    headerBorder: { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
    divider: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword
      });
      Alert.alert("Success", "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Failed to update password:', error);
      Alert.alert("Error", error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
        setLoading(true);
        // await api.delete('/auth/delete-account'); 
        setShowDeleteModal(false);
        Alert.alert("Account Deleted", "Your account has been deleted.");
        await logout(); 
    } catch (error) {
        Alert.alert("Error", "Failed to delete account");
    } finally {
        setLoading(false);
    }
  };

  const InputField = ({ label, value, onChange, placeholder, secure, showPass, togglePass }: any) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, dynamicStyles.textSecondary]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={dynamicStyles.textSecondary.color + '80'}
          secureTextEntry={secure && !showPass}
          autoCapitalize="none"
        />
        {secure && (
          <TouchableOpacity onPress={togglePass} style={styles.eyeIcon} activeOpacity={0.7}>
            <MaterialIcons
              name={showPass ? "visibility" : "visibility-off"}
              size={20}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Security & Login</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Helper Text */}
        <View style={styles.helperContainer}>
            <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
            Update your password and manage account security settings.
            </Text>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Change Password</Text>
            
            <InputField 
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
                secure={true}
                showPass={showCurrentPassword}
                togglePass={() => setShowCurrentPassword(!showCurrentPassword)}
            />
            
            <InputField 
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min 8 characters"
                secure={true}
                showPass={showNewPassword}
                togglePass={() => setShowNewPassword(!showNewPassword)}
            />
            
            <InputField 
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat new password"
                secure={true}
                showPass={showConfirmPassword}
                togglePass={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <TouchableOpacity 
                style={[styles.saveButton, loading && { opacity: 0.7 }]} 
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                )}
            </TouchableOpacity>
        </View>

        <View style={styles.sectionSpacer} />

        {/* 2FA Placeholder (Future) */}
        <View style={styles.section}>
            <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={[styles.featureTitle, dynamicStyles.text]}>Two-Factor Authentication</Text>
                    <Text style={[styles.subText, dynamicStyles.textSecondary]}>Add an extra layer of security to your account.</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.gray500 }]}>SOON</Text>
                </View>
            </View>
        </View>

        <View style={styles.sectionSpacer} />

        {/* Danger Zone */}
        <View style={styles.section}>
             <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
             <Text style={[styles.subText, dynamicStyles.textSecondary, { marginBottom: 16 }]}>
                Once you delete your account, there is no going back. Please be certain.
             </Text>
             <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
             >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
             </TouchableOpacity>
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
                <View style={styles.modalIconContainer}>
                    <MaterialIcons name="warning" size={32} color={theme.colors.error} />
                </View>
                <Text style={[styles.modalTitle, dynamicStyles.text]}>Delete Account</Text>
                <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
                    Are you sure you want to delete your account? This action cannot be undone.
                </Text>
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { borderColor: dynamicStyles.textSecondary.color + '40' }]} onPress={() => setShowDeleteModal(false)}>
                        <Text style={[styles.cancelButtonText, dynamicStyles.text]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmDelete}>
                        <Text style={styles.confirmButtonText}>Delete</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semibold },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingTop: 16 },
  
  helperContainer: { paddingHorizontal: 16, marginBottom: 20 },
  helperText: { fontSize: 13, fontFamily: theme.fonts.regular, opacity: 0.8, lineHeight: 18 },
  
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontFamily: theme.fonts.semibold, marginBottom: 12, marginLeft: 2 },
  sectionSpacer: { height: 32 },
  
  featureTitle: { fontSize: 14, fontFamily: theme.fonts.medium, marginBottom: 4 },
  subText: { fontSize: 12, fontFamily: theme.fonts.regular, lineHeight: 18 },
  
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: theme.fonts.medium, marginBottom: 6, opacity: 0.8 },
  inputWrapper: { position: 'relative' },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingRight: 44,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  saveButton: {
    backgroundColor: theme.colors.primary,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#FFF', fontFamily: theme.fonts.semibold, fontSize: 14 },
  
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: theme.fonts.bold },
  
  deleteButton: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: { color: theme.colors.error, fontFamily: theme.fonts.semibold, fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 16, padding: 24, alignItems: 'center' },
  modalIconContainer: { 
      width: 56, height: 56, borderRadius: 28, 
      backgroundColor: theme.colors.error + '10', 
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 16
  },
  modalTitle: { fontSize: 18, fontFamily: theme.fonts.bold, marginBottom: 8 },
  modalMessage: { textAlign: 'center', marginBottom: 24, paddingHorizontal: 8, lineHeight: 20, fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', height: 44 },
  cancelButton: { borderWidth: 1 },
  confirmButton: { backgroundColor: theme.colors.error },
  cancelButtonText: { fontFamily: theme.fonts.medium, fontSize: 14 },
  confirmButtonText: { color: '#FFF', fontFamily: theme.fonts.medium, fontSize: 14 },
});
