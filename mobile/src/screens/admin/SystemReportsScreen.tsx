import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api } from '../../services/api';
import { salonService } from '../../services/salon';

const { width } = Dimensions.get('window');

interface ReportStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
}

export default function SystemReportsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReportStat[]>([
    { label: 'Total Salons', value: '-', icon: 'store', color: theme.colors.primary, trend: 'Loading...', trendType: 'neutral' },
    { label: 'Active Members', value: '-', icon: 'people', color: theme.colors.secondary, trend: 'Loading...', trendType: 'neutral' },
    { label: 'Total Revenue', value: '-', icon: 'payments', color: theme.colors.success, trend: 'Loading...', trendType: 'neutral' },
    { label: 'Pending Approvals', value: '-', icon: 'pending-actions', color: theme.colors.warning, trend: 'Loading...', trendType: 'neutral' },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [apps, salons, users] = await Promise.all([
            api.get<any[]>('/memberships/applications'),
            salonService.getAllSalons({ status: 'active' }),
            api.get<any[]>('/users')
        ]);

        const pending = Array.isArray(apps) ? apps.filter(a => a.status === 'pending').length : 0;
        const activeSalonCount = Array.isArray(salons) ? salons.length : 0;
        const memberCount = Array.isArray(users) ? users.length : 0;
        
        // Count new members this month for trend
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newMembersThisMonth = Array.isArray(users) 
            ? users.filter(u => new Date(u.createdAt) >= startOfMonth).length 
            : 0;

        setStats([
            { label: 'Total Salons', value: activeSalonCount.toString(), icon: 'store', color: theme.colors.primary, trend: 'Active', trendType: 'up' },
            { label: 'Active Members', value: memberCount.toString(), icon: 'people', color: theme.colors.secondary, trend: `+${newMembersThisMonth} this month`, trendType: 'up' },
            { label: 'Total Revenue', value: 'RWF 0', icon: 'payments', color: theme.colors.success, trend: 'Coming soon', trendType: 'neutral' },
            { label: 'Pending Approvals', value: pending.toString(), icon: 'pending-actions', color: theme.colors.warning, trend: pending > 0 ? `${pending} requiring review` : 'All caught up', trendType: pending > 0 ? 'down' : 'up' },
        ]);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background,
    text: isDark ? "#FFFFFF" : theme.colors.text,
    subtext: isDark ? "#9CA3AF" : theme.colors.textSecondary,
    card: isDark ? theme.colors.gray800 : "#FFFFFF",
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
  };

  const renderStatCard = (stat: ReportStat, index: number) => (
    <View key={index} style={[styles.statCard, { backgroundColor: dynamic.card, borderColor: dynamic.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: stat.color + '15' }]}>
        <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statLabel, { color: dynamic.subtext }]}>{stat.label}</Text>
        <Text style={[styles.statValue, { color: dynamic.text }]}>{stat.value}</Text>
        {stat.trend && (
          <View style={styles.trendContainer}>
            <MaterialIcons 
                name={stat.trendType === 'up' ? 'trending-up' : stat.trendType === 'down' ? 'trending-down' : 'remove'} 
                size={16} 
                color={stat.trendType === 'up' ? theme.colors.success : stat.trendType === 'down' ? theme.colors.error : dynamic.subtext} 
            />
            <Text style={[
                styles.trendText, 
                { color: stat.trendType === 'up' ? theme.colors.success : stat.trendType === 'down' ? theme.colors.error : dynamic.subtext }
            ]}>
              {stat.trend}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { borderBottomColor: dynamic.border }]}>
        <Text style={[styles.headerTitle, { color: dynamic.text }]}>System Reports</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[theme.colors.primary]} />}
      >
        <Text style={[styles.sectionTitle, { color: dynamic.text }]}>Overview</Text>
        <View style={styles.statsGrid}>
            {stats.map(renderStatCard)}
        </View>

        <Text style={[styles.sectionTitle, { color: dynamic.text, marginTop: 24 }]}>Recent Activities</Text>
        <View style={[styles.emptyStateCard, { backgroundColor: dynamic.card, borderColor: dynamic.border }]}>
            <MaterialIcons name="analytics" size={48} color={dynamic.subtext} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyStateText, { color: dynamic.text }]}>Detailed analytics coming soon</Text>
            <Text style={[styles.emptyStateSubtext, { color: dynamic.subtext }]}>Review daily transactions and salon performance here.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    width: (width - 56) / 2, // 2 columns with padding
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
