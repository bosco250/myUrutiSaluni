import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context';
import { getRoleName } from '../../constants/roles';

interface AdminDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.greeting}>Admin Portal</Text>
          <Text style={styles.roleText}>{getRoleName(user?.role)}</Text>
        </LinearGradient>

        {/* Platform Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#2196F3' }]}>
              <MaterialIcons name="store" size={32} color="#FFFFFF" />
              <Text style={styles.metricValue}>-</Text>
              <Text style={styles.metricLabel}>Active Salons</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#4CAF50' }]}>
              <MaterialIcons name="people" size={32} color="#FFFFFF" />
              <Text style={styles.metricValue}>-</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FF9800' }]}>
              <MaterialIcons name="card-membership" size={32} color="#FFFFFF" />
              <Text style={styles.metricValue}>-</Text>
              <Text style={styles.metricLabel}>Memberships</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#9C27B0' }]}>
              <MaterialIcons name="assignment" size={32} color="#FFFFFF" />
              <Text style={styles.metricValue}>-</Text>
              <Text style={styles.metricLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('SalonManagement')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="store" size={28} color="#2196F3" />
              </View>
              <Text style={styles.actionText}>Salon Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MembershipApprovals')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="card-membership" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>Memberships</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('UserManagement')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <MaterialIcons name="people" size={28} color="#9C27B0" />
              </View>
              <Text style={styles.actionText}>User Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('SystemReports')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="assessment" size={28} color="#FF9800" />
              </View>
              <Text style={styles.actionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Notice */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Full admin features are under development. This dashboard will show comprehensive platform statistics and management tools.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
  },
  roleText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '48%',
    borderRadius: 16,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
  },
  metricLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: theme.spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}10`,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
});
