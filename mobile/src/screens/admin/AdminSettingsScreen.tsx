import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { showToast } from '../../utils';

export default function AdminSettingsScreen({ navigation }: any) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    autoApprove: false,
    maintenance: false,
    biometric: false
  });

  const colors = useMemo(() => ({
    bg: isDark ? '#111827' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    danger: '#EF4444',
    primary: theme.colors.primary,
  }), [isDark]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          try { await logout(); } catch { showToast('Logout failed', 'error'); }
      }}
    ]);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={s.section}>
      <Text style={[s.secTitle, { color: colors.subtext }]}>{title}</Text>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const Item = ({ icon, label, type = 'arrow', value, onPress, color = colors.text, danger = false }: any) => (
    <TouchableOpacity 
      style={[s.item, { borderBottomColor: colors.border }]} 
      onPress={type === 'switch' ? () => toggleSetting(onPress) : onPress}
      disabled={type === 'switch'}
      activeOpacity={0.7}
    >
      <View style={[s.iconBox, { backgroundColor: danger ? colors.danger + '15' : colors.bg }]}>
        <MaterialIcons name={icon} size={20} color={danger ? colors.danger : color} />
      </View>
      <Text style={[s.itemLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {type === 'switch' ? (
        <Switch 
          value={value} 
          onValueChange={() => toggleSetting(onPress)} 
          trackColor={{ false: colors.border, true: theme.colors.primary }}
          thumbColor="#FFF" 
        />
      ) : (
        <MaterialIcons name="chevron-right" size={20} color={colors.subtext} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Profile Card */}
        <View style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <View style={[s.avatar, { backgroundColor: theme.colors.primary }]}>
             <Text style={s.avatarText}>{user?.fullName?.substring(0,2).toUpperCase() || 'AD'}</Text>
           </View>
           <View style={{ flex: 1 }}>
             <Text style={[s.name, { color: colors.text }]}>{user?.fullName || 'Admin User'}</Text>
             <Text style={[s.role, { color: colors.subtext }]}>{user?.role?.replace('_', ' ').toUpperCase() || 'SUPER ADMIN'}</Text>
           </View>
           <TouchableOpacity onPress={() => navigation.navigate('ProfileEdit')}>
             <MaterialIcons name="edit" size={20} color={colors.primary} />
           </TouchableOpacity>
        </View>

        <Section title="Preferences">
           <Item icon="dark-mode" label="Dark Mode" type="switch" value={isDark} onPress={toggleTheme} />
           <Item icon="notifications" label="Notifications" type="switch" value={settings.notifications} onPress="notifications" />
           <Item icon="language" label="Language" value="English" onPress={() => {}} />
        </Section>

        <Section title="System Controls">
           <Item icon="verified-user" label="Auto-Approve Salons" type="switch" value={settings.autoApprove} onPress="autoApprove" />
           <Item icon="build" label="Maintenance Mode" type="switch" value={settings.maintenance} onPress="maintenance" />
           <Item icon="fingerprint" label="Biometric Login" type="switch" value={settings.biometric} onPress="biometric" />
        </Section>

        <Section title="Support">
           <Item icon="help" label="Help Center" onPress={() => {}} />
           <Item icon="policy" label="Privacy Policy" onPress={() => {}} />
           <Item icon="info" label="About App" onPress={() => {}} />
        </Section>

        <TouchableOpacity 
          style={[s.logoutBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]} 
          onPress={handleLogout}
        >
           <MaterialIcons name="logout" size={20} color={colors.danger} />
           <Text style={[s.logoutText, { color: colors.danger }]}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[s.version, { color: colors.subtext }]}>Version 1.0.0 (Build 102)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4, marginLeft: -4 },
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '700' },
  role: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  section: { gap: 8 },
  secTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: -12 }
});