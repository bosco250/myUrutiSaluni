import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api as apiService } from '../../services/api';
import { showToast } from '../../utils';

interface MembershipApplication {
  id: string;
  applicantId: string;
  applicant: { id: string; fullName: string; email: string; phone: string };
  businessName: string;
  businessAddress: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  businessDescription: string;
  registrationNumber?: string;
  taxId?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: { id: string; fullName: string };
  reviewedAt?: string;
  createdAt: string;
}



export default function MembershipApplicationsScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(route?.params?.filter || 'all');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Derived state for stats and filtering
  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }), [applications]);

  const filteredApps = useMemo(() => {
    let result = applications;
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.businessName?.toLowerCase().includes(q) || 
        a.applicant?.fullName?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [applications, statusFilter, searchQuery]);

  const colors = useMemo(() => ({
    bg: isDark ? '#111827' : '#F3F4F6', // optimized background
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: theme.colors.primary,
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    accent: isDark ? '#374151' : '#E5E7EB',
  }), [isDark]);

  const fetchApplications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await apiService.get<MembershipApplication[]>('/memberships/applications') || [];
      setApplications(data); // Filtering handled client-side for better UX/speed on moderate datasets
    } catch (error: any) {
      console.error('Fetch error:', error);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchApplications(false); }, [fetchApplications]);

  const handleBulkDetail = (action: 'approve' | 'reject', reason?: string) => {
    const process = async () => {
      setProcessingBulk(true);
      let success = 0;
      for (const id of selectedApps) {
        try {
          await apiService.patch(`/memberships/applications/${id}/review`, {
            status: action === 'approve' ? 'approved' : 'rejected',
            rejectionReason: reason
          });
          success++;
        } catch (e) { console.error(`Failed ${id}`, e); }
      }
      if (success > 0) {
        showToast(`Processed ${success} applications`, 'success');
        fetchApplications(false);
        setSelectedApps([]);
      } else { showToast('Operation failed', 'error'); }
      setProcessingBulk(false);
    };
    process();
  };

  const confirmBulkAction = (action: 'approve' | 'reject') => {
    if (!selectedApps.length) return Alert.alert('Select items first');
    if (action === 'reject') {
      Alert.prompt('Reject Selected', 'Reason for rejection:', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: (r?: string) => handleBulkDetail(action, r) }
      ], 'plain-text');
    } else {
      Alert.alert('Approve Selected', `Approve ${selectedApps.length} applications?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => handleBulkDetail('approve') }
      ]);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedApps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderStatCard = (label: string, value: number, color: string, icon: any) => (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[s.statLabel, { color: colors.subtext }]}>{label}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: MembershipApplication }) => {
    const isSelected = selectedApps.includes(item.id);
    const date = new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const statusColor = item.status === 'approved' ? colors.success : item.status === 'rejected' ? colors.error : colors.warning;
    
    return (
      <TouchableOpacity 
        style={[
          s.card, 
          { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border },
          isSelected && { backgroundColor: isDark ? '#374151' : '#F0F9FF' }
        ]}
        onPress={() => navigation.navigate('ApplicationDetail', { applicationId: item.id })}
        onLongPress={() => item.status === 'pending' && toggleSelection(item.id)}
        activeOpacity={0.9}
      >
        <View style={s.cardRow}>
           {/* Selection Checkbox */}
           {item.status === 'pending' && (
             <TouchableOpacity onPress={() => toggleSelection(item.id)} style={s.checkboxHit}>
               <MaterialIcons 
                 name={isSelected ? "check-box" : "check-box-outline-blank"} 
                 size={24} 
                 color={isSelected ? colors.primary : colors.subtext} 
               />
             </TouchableOpacity>
           )}
           
           <View style={{ flex: 1, gap: 4 }}>
             <View style={s.rowBetween}>
               <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>{item.businessName}</Text>
               <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
                 <Text style={[s.badgeText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
               </View>
             </View>
             
             <Text style={[s.ownerText, { color: colors.subtext }]}>{item.applicant?.fullName} • {item.city}</Text>
             
             <View style={[s.rowBetween, { marginTop: 8 }]}>
                <View style={[s.row, { gap: 12 }]}>
                   <View style={s.row}><MaterialIcons name="phone" size={14} color={colors.subtext} /><Text style={[s.metaText, { color: colors.subtext }]}> {item.phone}</Text></View>
                   <View style={s.row}><MaterialIcons name="calendar-today" size={14} color={colors.subtext} /><Text style={[s.metaText, { color: colors.subtext }]}> {date}</Text></View>
                </View>
                {item.status === 'pending' && !isSelected && (
                  <View style={s.row}>
                     <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.bg }]} onPress={() => Alert.alert('Approve?', '', [{text:'Cancel'}, {text:'Yes', onPress:()=>handleBulkDetail('approve')}])}>
                       <MaterialIcons name="check" size={18} color={colors.success} />
                     </TouchableOpacity>
                  </View>
                )}
             </View>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View>
           <Text style={[s.headerTitle, { color: colors.text }]}>Memberships</Text>
           <Text style={[s.headerSubtitle, { color: colors.subtext }]}>Manage applications</Text>
        </View>
        {selectedApps.length > 0 ? (
           <View style={s.row}>
             <Text style={[s.selectedText, { color: colors.primary }]}>{selectedApps.length}</Text>
             <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.success+'20' }]} onPress={() => confirmBulkAction('approve')}>
                <MaterialIcons name="check" size={20} color={colors.success} />
             </TouchableOpacity>
             <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.error+'20' }]} onPress={() => confirmBulkAction('reject')}>
                <MaterialIcons name="close" size={20} color={colors.error} />
             </TouchableOpacity>
             <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.border }]} onPress={() => setSelectedApps([])}>
                <MaterialIcons name="clear" size={20} color={colors.text} />
             </TouchableOpacity>
           </View>
        ) : (
           <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => fetchApplications()}>
             <MaterialIcons name="refresh" size={20} color={colors.text} />
           </TouchableOpacity>
        )}
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
         {renderStatCard('Pending', stats.pending, colors.warning, 'hourglass-empty')}
         {renderStatCard('Approved', stats.approved, colors.success, 'check-circle')}
         {renderStatCard('Rejected', stats.rejected, colors.error, 'cancel')}
      </View>

      {/* Filters & Search - Compact Bar */}
      <View style={[s.controlBar, { borderBottomColor: colors.border }]}>
         <View style={[s.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="search" size={18} color={colors.subtext} />
            <TextInput 
              placeholder="Search..." 
              style={[s.input, { color: colors.text }]} 
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery} 
            />
         </View>
         <View style={s.tabs}>
            {(['all', 'pending', 'approved'] as const).map(f => (
               <TouchableOpacity 
                 key={f} 
                 style={[s.tab, statusFilter === f && { backgroundColor: colors.primary }]} 
                 onPress={() => setStatusFilter(f)}
               >
                 <Text style={[s.tabText, { color: statusFilter === f ? '#FFF' : colors.text }]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1)}</Text>
               </TouchableOpacity>
            ))}
         </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredApps}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading ? <View style={s.empty}><Text style={{color:colors.subtext}}>No applications found.</Text></View> : <ActivityIndicator style={{marginTop: 50}} color={colors.primary} />
        }
      />
      {processingBulk && (
        <View style={s.loaderOverlay}><ActivityIndicator size="large" color="#FFF" /><Text style={{color:'#FFF', marginTop:10}}>Processing...</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: -2 },
  statsGrid: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  controlBar: { paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBox: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  input: { flex: 1, fontSize: 14, height: '100%' },
  tabs: { flexDirection: 'row', backgroundColor: 'transparent', gap: 6 },
  tab: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 0 }, // Pill style tabs
  tabText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, marginHorizontal: 2 },
  cardRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkboxHit: { padding: 4, marginLeft: -4, marginTop: -4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  bizName: { fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  ownerText: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  metaText: { fontSize: 12, fontWeight: '400' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  selectedText: { fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  empty: { padding: 40, alignItems: 'center' },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }
});