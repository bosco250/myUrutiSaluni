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
    container: { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#8E8E93' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
      borderColor: isDark ? '#3A3A3C' : '#E8E8E8',
    },
    headerBorder: { borderBottomColor: isDark ? '#3A3A3C' : '#E8E8E8' },
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
              Alert.alert('Error', err.message || 'Failed to update status');
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
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salonService.removeEmployee(salonId, employeeId);
              Alert.alert('Success', 'Employee removed');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove');
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
        <Loader fullscreen message="Loading..." />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.errorText, dynamicStyles.textSecondary]}>Employee not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Employee Profile</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, dynamicStyles.card]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {employee.user?.fullName?.charAt(0) || 'E'}
            </Text>
          </View>
          
          <Text style={[styles.name, dynamicStyles.text]}>
            {employee.user?.fullName || 'Employee'}
          </Text>
          
          <Text style={[styles.position, dynamicStyles.textSecondary]}>
            {employee.position || 'Staff Member'}
          </Text>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: employee.isActive ? theme.colors.success + '15' : theme.colors.error + '15' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: employee.isActive ? theme.colors.success : theme.colors.error }
            ]} />
            <Text style={{ 
              color: employee.isActive ? theme.colors.success : theme.colors.error,
              fontSize: 12,
              fontWeight: '600',
            }}>
              {employee.isActive ? 'Active' : 'Suspended'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, dynamicStyles.card]}>
            <MaterialIcons name="percent" size={18} color={theme.colors.primary} />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {employee.commissionRate || 0}%
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Commission</Text>
          </View>
          <View style={[styles.statBox, dynamicStyles.card]}>
            <MaterialIcons name="event" size={18} color={theme.colors.secondary} />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {employee.hireDate ? formatDate(employee.hireDate) : 'N/A'}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Hire Date</Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={[styles.section, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Contact</Text>
          
          {employee.user?.email && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialIcons name="email" size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>Email</Text>
                <Text style={[styles.infoValue, dynamicStyles.text]}>{employee.user.email}</Text>
              </View>
            </View>
          )}
          
          {employee.user?.phone && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.success + '15' }]}>
                <MaterialIcons name="phone" size={16} color={theme.colors.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>Phone</Text>
                <Text style={[styles.infoValue, dynamicStyles.text]}>{employee.user.phone}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionRow, dynamicStyles.card]}
            onPress={() => navigation.navigate('GrantPermissions', {
              employeeId: employee.id,
              salonId: salonId,
              employee: employee,
            })}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
              <MaterialIcons name="admin-panel-settings" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, dynamicStyles.text]}>Manage Permissions</Text>
              <Text style={[styles.actionSubtitle, dynamicStyles.textSecondary]}>Control access levels</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionRow, dynamicStyles.card]}
            onPress={() => handleStatusChange(!employee.isActive)}
            disabled={actionLoading}
          >
            <View style={[styles.actionIcon, { backgroundColor: (employee.isActive ? theme.colors.warning : theme.colors.success) + '15' }]}>
              <MaterialIcons 
                name={employee.isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
                size={20} 
                color={employee.isActive ? theme.colors.warning : theme.colors.success} 
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, dynamicStyles.text]}>
                {employee.isActive ? 'Suspend Employee' : 'Activate Employee'}
              </Text>
              <Text style={[styles.actionSubtitle, dynamicStyles.textSecondary]}>
                {employee.isActive ? 'Temporarily disable access' : 'Restore access'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleRemoveEmployee}
            disabled={actionLoading}
          >
            <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
            <Text style={styles.dangerText}>Remove Employee</Text>
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
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 12 },
  
  content: { padding: 14, paddingBottom: 40 },
  
  // Profile Card
  profileCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  position: {
    fontSize: 14,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  
  // Section
  section: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Actions
  actionsSection: {
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  
  // Danger Zone
  dangerSection: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dangerText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
  },
});

export default EmployeeDetailScreen;
