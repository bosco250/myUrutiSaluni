import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  adminName: string;
  adminId: string;
  targetType: 'member' | 'application' | 'system';
  targetId?: string;
  targetName?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

export default function ActivityLogsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background,
    text: isDark ? theme.colors.white : theme.colors.text,
    cardBg: isDark ? theme.colors.gray800 : theme.colors.white,
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
  };

  useEffect(() => {
    // Mock data - replace with API call
    const mockLogs: ActivityLog[] = [
      {
        id: '1',
        action: 'APPLICATION_APPROVED',
        description: 'Approved membership application for Beauty Palace Salon',
        adminName: 'John Admin',
        adminId: 'admin1',
        targetType: 'application',
        targetId: 'app1',
        targetName: 'Beauty Palace Salon',
        timestamp: '2024-01-20T10:30:00Z',
        severity: 'success',
        metadata: { reason: 'All documents verified' },
      },
      {
        id: '2',
        action: 'MEMBER_SUSPENDED',
        description: 'Suspended member Elite Hair Studio due to policy violation',
        adminName: 'Jane Admin',
        adminId: 'admin2',
        targetType: 'member',
        targetId: 'member2',
        targetName: 'Elite Hair Studio',
        timestamp: '2024-01-20T09:15:00Z',
        severity: 'warning',
        metadata: { reason: 'Multiple customer complaints' },
      },
      {
        id: '3',
        action: 'SYSTEM_BACKUP',
        description: 'Daily system backup completed successfully',
        adminName: 'System',
        adminId: 'system',
        targetType: 'system',
        timestamp: '2024-01-20T02:00:00Z',
        severity: 'info',
      },
      {
        id: '4',
        action: 'APPLICATION_REJECTED',
        description: 'Rejected membership application for Quick Cuts',
        adminName: 'John Admin',
        adminId: 'admin1',
        targetType: 'application',
        targetId: 'app3',
        targetName: 'Quick Cuts',
        timestamp: '2024-01-19T16:45:00Z',
        severity: 'error',
        metadata: { reason: 'Incomplete documentation' },
      },
    ];
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.targetType === typeFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.targetName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, severityFilter, typeFilter, searchQuery]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.info;
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'member': return 'person';
      case 'application': return 'assignment';
      case 'system': return 'settings';
      default: return 'info';
    }
  };

  const LogItem = ({ item }: { item: ActivityLog }) => (
    <TouchableOpacity
      style={[styles.logItem, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}
      onPress={() => {
        // Navigate to relevant detail screen based on target type
        if (item.targetType === 'member' && item.targetId) {
          navigation.navigate('MemberDetail', { memberId: item.targetId });
        } else if (item.targetType === 'application' && item.targetId) {
          navigation.navigate('ApplicationDetail', { applicationId: item.targetId });
        }
      }}
    >
      <View style={styles.logHeader}>
        <View style={styles.logIcons}>
          <MaterialIcons 
            name={getSeverityIcon(item.severity)} 
            size={20} 
            color={getSeverityColor(item.severity)} 
          />
          <MaterialIcons 
            name={getTargetIcon(item.targetType)} 
            size={16} 
            color={theme.colors.textSecondary} 
          />
        </View>
        <Text style={[styles.logTime, { color: theme.colors.textSecondary }]}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      
      <Text style={[styles.logDescription, { color: dynamic.text }]}>
        {item.description}
      </Text>
      
      <View style={styles.logFooter}>
        <Text style={[styles.logAdmin, { color: theme.colors.textSecondary }]}>
          by {item.adminName}
        </Text>
        {item.targetName && (
          <Text style={[styles.logTarget, { color: theme.colors.primary }]}>
            {item.targetName}
          </Text>
        )}
      </View>
      
      {item.metadata?.reason && (
        <View style={[styles.logMetadata, { backgroundColor: getSeverityColor(item.severity) + '10' }]}>
          <Text style={[styles.logReason, { color: getSeverityColor(item.severity) }]}>
            Reason: {item.metadata.reason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: dynamic.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={dynamic.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dynamic.text }]}>Activity Logs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LogFilters')}>
          <MaterialIcons name="filter-list" size={24} color={dynamic.text} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]}>
          <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: dynamic.text }]}
            placeholder="Search activity logs..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: dynamic.text }]}>Severity:</Text>
          <View style={styles.filterTabs}>
            {['all', 'info', 'success', 'warning', 'error'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  { backgroundColor: dynamic.cardBg, borderColor: dynamic.border },
                  severityFilter === filter && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setSeverityFilter(filter)}
                accessibilityLabel={`Filter by ${filter} severity`}
                accessibilityRole="button"
              >
                <Text style={[
                  styles.filterTabText,
                  { color: severityFilter === filter ? theme.colors.white : dynamic.text }
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: dynamic.text }]}>Type:</Text>
          <View style={styles.filterTabs}>
            {['all', 'member', 'application', 'system'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  { backgroundColor: dynamic.cardBg, borderColor: dynamic.border },
                  typeFilter === filter && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setTypeFilter(filter)}
                accessibilityLabel={`Filter by ${filter} type`}
                accessibilityRole="button"
              >
                <Text style={[
                  styles.filterTabText,
                  { color: typeFilter === filter ? theme.colors.white : dynamic.text }
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <LogItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: theme.fonts.bold },
  searchSection: { padding: 20, gap: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: theme.fonts.regular },
  filterSection: { gap: 8 },
  filterLabel: { fontSize: 14, fontWeight: '500', fontFamily: theme.fonts.medium },
  filterTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterTabText: { fontSize: 12, fontWeight: '500', fontFamily: theme.fonts.medium },
  listContent: { padding: 20, gap: 12 },
  logItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTime: { fontSize: 12, fontFamily: theme.fonts.regular },
  logDescription: { fontSize: 14, lineHeight: 20, fontFamily: theme.fonts.regular },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logAdmin: { fontSize: 12, fontFamily: theme.fonts.regular },
  logTarget: { fontSize: 12, fontWeight: '500', fontFamily: theme.fonts.medium },
  logMetadata: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  logReason: { fontSize: 12, fontStyle: 'italic', fontFamily: theme.fonts.regular },
});