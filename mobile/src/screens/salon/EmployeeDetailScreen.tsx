import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService, SalonEmployee } from '../../services/salon';
import { Loader } from '../../components/common';

interface EmployeeDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      employeeId: string;
      salonId: string;
      employeeName?: string;
    };
  };
}

const EmployeeDetailScreen = ({ navigation, route }: EmployeeDetailScreenProps) => {
  const { employeeId, salonId } = route.params;
  const { isDark } = useTheme();
  
  const [employee, setEmployee] = useState<SalonEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
  };

  const loadEmployee = useCallback(async () => {
    try {
      const employees = await salonService.getEmployees(salonId);
      const found = employees.find(e => e.id === employeeId);
      setEmployee(found || null);
    } catch (err: any) {
      console.error('Error loading employee:', err);
      Alert.alert('Error', 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [employeeId, salonId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const handleStatusChange = async (newStatus: boolean) => {
    const action = newStatus ? 'activate' : 'suspend';
    Alert.alert(
      `${newStatus ? 'Activate' : 'Suspend'} Employee`,
      `Are you sure you want to ${action} this employee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salonService.updateEmployee(salonId, employeeId, { isActive: newStatus });
              setEmployee(prev => prev ? { ...prev, isActive: newStatus } : null);
              Alert.alert('Success', `Employee has been ${newStatus ? 'activated' : 'suspended'}`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update employee status');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveEmployee = () => {
    Alert.alert(
      'Remove Employee',
      'Are you sure you want to remove this employee? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salonService.removeEmployee(salonId, employeeId);
              Alert.alert('Success', 'Employee has been removed');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove employee');
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading employee details..." />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, dynamicStyles.textSecondary]}>Employee not found</Text>
          <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={isDark ? theme.colors.white : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Employee Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={styles.avatarLarge}
          >
            <Text style={styles.avatarLargeText}>
              {employee.user?.fullName?.charAt(0) || 'E'}
            </Text>
          </LinearGradient>
          <Text style={[styles.employeeName, dynamicStyles.text]}>
            {employee.user?.fullName || 'Employee'}
          </Text>
          <Text style={[styles.employeePosition, dynamicStyles.textSecondary]}>
            {employee.position || 'Staff Member'}
          </Text>
          <View style={[
            styles.statusBadgeLarge,
            { backgroundColor: employee.isActive ? theme.colors.success + '20' : theme.colors.error + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: employee.isActive ? theme.colors.success : theme.colors.error }
            ]} />
            <Text style={{ 
              color: employee.isActive ? theme.colors.success : theme.colors.error,
              fontFamily: theme.fonts.medium,
            }}>
              {employee.isActive ? 'Active' : 'Suspended'}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Contact Information</Text>
          
          {employee.user?.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, dynamicStyles.text]}>{employee.user.email}</Text>
            </View>
          )}
          
          {employee.user?.phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, dynamicStyles.text]}>{employee.user.phone}</Text>
            </View>
          )}
        </View>

        {/* Employment Info */}
        <View style={[styles.infoCard, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Employment Details</Text>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="work" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              {employee.position || 'Staff Member'}
            </Text>
          </View>
          
          {employee.commissionRate !== undefined && (
            <View style={styles.infoRow}>
              <MaterialIcons name="percent" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, dynamicStyles.text]}>
                {employee.commissionRate}% Commission
              </Text>
            </View>
          )}
          
          {employee.hireDate && (
            <View style={styles.infoRow}>
              <MaterialIcons name="event" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, dynamicStyles.text]}>
                Hired: {new Date(employee.hireDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => navigation.navigate('GrantPermissions', {
              employeeId: employee.id,
              salonId: salonId,
              employee: employee,
            })}
          >
            <MaterialIcons name="admin-panel-settings" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
              Manage Permissions
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: employee.isActive ? theme.colors.warning + '20' : theme.colors.success + '20' }]}
            onPress={() => handleStatusChange(!employee.isActive)}
            disabled={actionLoading}
          >
            <MaterialIcons 
              name={employee.isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
              size={24} 
              color={employee.isActive ? theme.colors.warning : theme.colors.success} 
            />
            <Text style={[styles.actionButtonText, { color: employee.isActive ? theme.colors.warning : theme.colors.success }]}>
              {employee.isActive ? 'Suspend Employee' : 'Activate Employee'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
            onPress={handleRemoveEmployee}
            disabled={actionLoading}
          >
            <MaterialIcons name="person-remove" size={24} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
              Remove Employee
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarLargeText: {
    color: theme.colors.white,
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  infoCard: {
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  actionsContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginLeft: theme.spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backButtonAlt: {
    padding: theme.spacing.md,
  },
});

export default EmployeeDetailScreen;
