import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import HomeScreen from './HomeScreen';
import { useAuth } from '../context';
import { theme } from '../theme';

/**
 * Wrapper component that routes users to role-appropriate home screens
 * Customers see HomeScreen, others are redirected to their dashboards
 */
export default function RoleBasedHome({ navigation }: any) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role) {
      const role = user.role.toLowerCase();
      
      // Only customers should see the regular HomeScreen
      // All other roles get redirected to their dashboards
      if (role !== 'customer') {
        // Redirect to appropriate dashboard
        if (role === 'salon_employee') {
          navigation?.navigate?.('StaffDashboard');
        } else if (role === 'salon_owner') {
          navigation?.navigate?.('OwnerDashboard');
        } else if (role === 'super_admin' || role === 'association_admin' || role === 'district_leader') {
          navigation?.navigate?.('AdminDashboard');
        }
      }
    }
  }, [user?.role, navigation]);

  // If customer or role not yet loaded, show HomeScreen
  if (!user?.role || user.role.toLowerCase() === 'customer') {
    return <HomeScreen navigation={navigation} />;
  }

  // While redirecting, show loading
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
