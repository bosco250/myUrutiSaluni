import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, Image, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { salonService, SalonDetails } from '../../services/salon';
import { useTheme } from '../../context';

export default function SalonManagementScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending_approval' | 'inactive'>('all');

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
  }), [isDark]);

  const fetchSalons = useCallback(async () => {
    try {
      const data = await salonService.getAllSalons({ 
        status: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchQuery || undefined 
      });
      setSalons(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => { fetchSalons(); }, [fetchSalons]);

  const stats = useMemo(() => ({
    total: salons.length,
    active: salons.filter(s => s.status === 'active').length,
    pending: salons.filter(s => s.status === 'pending_approval').length,
    inactive: salons.filter(s => s.status === 'inactive').length
  }), [salons]);

  const StatCard = ({ label, value, color, icon }: any) => (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
       <View style={[s.statIcon, { backgroundColor: color + '15' }]}>
         <MaterialIcons name={icon} size={18} color={color} />
       </View>
       <View>
         <Text style={[s.statVal, { color: colors.text }]}>{value}</Text>
         <Text style={[s.statLbl, { color: colors.subtext }]}>{label}</Text>
       </View>
    </View>
  );

  const renderItem = ({ item }: { item: SalonDetails }) => {
    const statusColor = item.status === 'active' ? colors.success : item.status === 'pending_approval' ? colors.warning : colors.error;
    const statusLabel = item.status === 'pending_approval' ? 'Pending' : item.status.charAt(0).toUpperCase() + item.status.slice(1);

    return (
      <TouchableOpacity 
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('OwnerSalonDetail', { salonId: item.id })}
        activeOpacity={0.7}
      >
        <View style={s.cardRow}>
           <Image 
             source={item.photos?.[0] ? { uri: item.photos[0] } : require('../../../assets/icon.png')} 
             style={[s.thumb, { backgroundColor: colors.border }]} 
           />
           <View style={{ flex: 1, gap: 4 }}>
             <View style={s.rowBetween}>
               <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
               <View style={[s.badge, { backgroundColor: statusColor + '15' }]}>
                 <Text style={[s.badgeText, { color: statusColor }]}>{statusLabel}</Text>
               </View>
             </View>
             <Text style={[s.meta, { color: colors.subtext }]}>{item.city}, {item.district}</Text>
             <View style={[s.row, { marginTop: 6, gap: 12 }]}>
                {item.phone && (
                  <View style={s.row}><MaterialIcons name="phone" size={14} color={colors.subtext} /><Text style={[s.metaSmall, { color: colors.subtext }]}> {item.phone}</Text></View>
                )}
                <View style={s.row}><MaterialIcons name="star" size={14} color="#FBBF24" /><Text style={[s.metaSmall, { color: colors.subtext }]}> {item.rating || 'N/A'}</Text></View>
             </View>
           </View>
           <MaterialIcons name="chevron-right" size={24} color={colors.subtext} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[s.header, { borderBottomColor: colors.border }]}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
           <MaterialIcons name="arrow-back" size={24} color={colors.text} />
         </TouchableOpacity>
         <Text style={[s.title, { color: colors.text }]}>Salons</Text>
         <TouchableOpacity onPress={() => fetchSalons()} style={{ padding: 4 }}>
           <MaterialIcons name="refresh" size={24} color={colors.text} />
         </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
         <StatCard label="Total" value={stats.total} color={colors.primary} icon="store" />
         <StatCard label="Active" value={stats.active} color={colors.success} icon="check-circle" />
         <StatCard label="Pending" value={stats.pending} color={colors.warning} icon="hourglass-empty" />
      </View>

      <View style={[s.controls, { borderBottomColor: colors.border }]}>
         <View style={[s.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="search" size={20} color={colors.subtext} />
            <TextInput 
              style={[s.input, { color: colors.text }]} 
              placeholder="Search salons..." 
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
         </View>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(['all', 'active', 'pending_approval', 'inactive'] as const).map(f => (
               <TouchableOpacity 
                 key={f} 
                 style={[s.tab, activeFilter === f && { backgroundColor: colors.primary }]}
                 onPress={() => setActiveFilter(f)}
               >
                 <Text style={[s.tabText, { color: activeFilter === f ? '#FFF' : colors.text }]}>
                   {f === 'pending_approval' ? 'Pending' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                 </Text>
               </TouchableOpacity>
            ))}
         </ScrollView>
      </View>

      <FlatList
        data={salons}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSalons(); }} tintColor={colors.primary} />}
        ListEmptyComponent={!loading ? <View style={s.center}><Text style={{ color: colors.subtext }}>No salons found</Text></View> : null}
      />
      {loading && !refreshing && <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 10 },
  statIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: 'bold' },
  statLbl: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  controls: { paddingHorizontal: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  tab: { paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, // Pill tabs
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12, gap: 12 },
  card: { padding: 12, borderRadius: 16, borderWidth: 1, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 13, fontWeight: '500' },
  metaSmall: { fontSize: 12, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { padding: 40, alignItems: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }
});
