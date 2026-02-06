import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Force update
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api } from '../../services/api';
import { salonService } from '../../services/salon';
import { showToast } from '../../utils';

export default function AdminDashboardScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    pendingApps: 0,
    activeSalons: 0,
    totalMembers: 0,
    newThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  const colors = useMemo(() => ({
    bg: isDark ? '#111827' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: theme.colors.primary,
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  }), [isDark]);

  const formatRelTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const loadStats = useCallback(async () => {
    try {
      const [apps, salons, users] = await Promise.all([
        api.get<any[]>('/memberships/applications'),
        salonService.getAllSalons({ status: 'active' }),
        api.get<any[]>('/users') // Get all users, we'll filter/sort locally
      ]);

      const pending = Array.isArray(apps) ? apps.filter(a => a.status === 'pending').length : 0;
      const active = Array.isArray(salons) ? salons.length : 0;
      const total = Array.isArray(users) ? users.length : 0;
      
      // Calculate new this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = Array.isArray(users) 
        ? users.filter(u => new Date(u.createdAt) >= startOfMonth).length 
        : 0;

      setStats({ pendingApps: pending, activeSalons: active, totalMembers: total, newThisMonth });

      // Process Recent Activity
      const recentApps = Array.isArray(apps) ? apps.map(a => ({
        type: 'application',
        date: new Date(a.createdAt),
        text: `Application: ${a.businessName} (${a.status})`,
        icon: 'description',
        color: a.status === 'pending' ? colors.warning : (a.status === 'approved' ? colors.success : colors.error),
        id: a.id
      })) : [];

      const recentUsers = Array.isArray(users) ? users
        .filter(u => u.createdAt) // Ensure createdAt exists
        .map(u => ({
          type: 'user',
          date: new Date(u.createdAt),
          text: `New User: ${u.fullName || u.username || 'User'}`,
          icon: 'person-add',
          color: colors.info,
          id: u.id
      })) : [];

      // Combine, sort by date desc, take top 5
      const combined = [...recentApps, ...recentUsers]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      setActivities(combined);

    } catch (e) {
      console.error(e);
      if (loading) showToast('Failed to load dashboard stats', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // ✅ Empty dependencies - only run once on mount

  useEffect(() => { loadStats(); }, [loadStats]);

  const StatCard = ({ label, value, icon, color, onPress }: any) => (
    <TouchableOpacity 
      style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.statIconBox, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={[s.statVal, { color: colors.text }]}>{value}</Text>
        <Text style={[s.statLbl, { color: colors.subtext }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ label, icon, color, route, params }: any) => (
    <TouchableOpacity 
      style={[s.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate(route, params)}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={28} color={color} />
      <Text style={[s.actionLbl, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
          <Text style={[s.headerSub, { color: colors.subtext }]}>Overview & Controls</Text>
        </View>
        <TouchableOpacity 
          style={[s.iconBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AdminSettings')}
        >
          <MaterialIcons name="settings" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor={colors.primary} />}
      >
        {/* Stats Grid */}
        <View style={s.section}>
          <Text style={[s.secTitle, { color: colors.text }]}>Key Metrics</Text>
          <View style={s.grid}>
             <StatCard label="Pending Apps" value={stats.pendingApps} icon="hourglass-empty" color={colors.warning} onPress={() => navigation.navigate('MembershipApplications', { filter: 'pending' })} />
             <StatCard label="Active Salons" value={stats.activeSalons} icon="store" color={colors.success} onPress={() => navigation.navigate('SalonManagement', { filter: 'active' })} />
             <StatCard label="Total Members" value={stats.totalMembers} icon="people" color={colors.primary} onPress={() => navigation.navigate('MemberList')} />
             <StatCard label="New (Month)" value={stats.newThisMonth} icon="trending-up" color={colors.info} onPress={() => navigation.navigate('MemberList')} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={[s.secTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={s.actionGrid}>
             <QuickAction label="Reviews" icon="rate-review" color={colors.warning} route="MembershipApplications" />
             <QuickAction label="Members" icon="people-outline" color={colors.primary} route="MemberList" />
             <QuickAction label="Salons" icon="storefront" color={colors.success} route="SalonManagement" />
             <QuickAction label="Reports" icon="bar-chart" color={colors.info} route="SystemReports" /> 
          </View>
        </View>

        {/* Recent Activity */}
        <View style={s.section}>
           <Text style={[s.secTitle, { color: colors.text }]}>Recent Activity</Text>
           <View style={[s.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {activities.length > 0 ? (
                activities.map((item, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[s.actItem, i < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => {
                        if (item.type === 'application') navigation.navigate('ApplicationDetail', { applicationId: item.id });
                        // if (item.type === 'user') navigation.navigate('MemberDetail', { memberId: item.id }); // Assuming MemberDetail exists or fallback
                    }}
                    activeOpacity={0.7}
                  >
                     <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                     <View style={{ flex: 1 }}>
                       <Text style={[s.actText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
                       <Text style={[s.actTime, { color: colors.subtext }]}>{formatRelTime(item.date)}</Text>
                     </View>
                     <MaterialIcons name="chevron-right" size={16} color={colors.subtext} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.subtext }}>No recent activity</Text>
                </View>
              )}
              <TouchableOpacity style={[s.viewAllBtn, { borderTopColor: colors.border }]} onPress={() => navigation.navigate('ActivityLogs')}>
                 <Text style={[s.viewAllText, { color: colors.primary }]}>View All Activity</Text>
                 <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  section: { gap: 12 },
  secTitle: { fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLbl: { fontSize: 11, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  actionLbl: { fontSize: 12, fontWeight: '600' },
  activityCard: { borderRadius: 12, borderWidth: 1 },
  actItem: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' },
  actText: { fontSize: 13, fontWeight: '500' },
  actTime: { fontSize: 11, marginTop: 2 },
  viewAllBtn: { flexDirection: 'row', padding: 12, justifyContent: 'center', alignItems: 'center', gap: 6, borderTopWidth: 1 },
  viewAllText: { fontSize: 13, fontWeight: '700' }
});