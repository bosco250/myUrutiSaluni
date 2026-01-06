import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, StatusBar, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api } from '../../services/api';
import { showToast } from '../../utils';

interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function MemberListScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // CRUD State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', role: 'customer', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const colors = useMemo(() => ({
    bg: isDark ? '#111827' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    subtext: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    primary: theme.colors.primary,
    success: '#10B981',
    error: '#EF4444',
  }), [isDark]);

  useEffect(() => { fetchMembers(); }, []);

  useEffect(() => {
    let result = members;
    if (filter !== 'all') {
      result = result.filter(m => filter === 'active' ? m.isActive : !m.isActive);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.fullName.toLowerCase().includes(q) || 
        m.email.toLowerCase().includes(q) || 
        m.phone?.includes(q)
      );
    }
    setFiltered(result);
  }, [members, filter, search]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await api.get<Member[]>('/users') || []; 
      setMembers(data.filter(u => u.role !== 'super_admin'));
    } catch { showToast('Failed to load members', 'error'); } 
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ fullName: '', email: '', phone: '', role: 'customer', password: '' });
    setModalVisible(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode('edit');
    setSelectedMember(member);
    setFormData({ 
      fullName: member.fullName, 
      email: member.email, 
      phone: member.phone || '', 
      role: member.role, 
      password: '' // Don't show password
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email) {
      showToast('Name and Email are required', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      if (modalMode === 'create') {
        if (!formData.password) {
           showToast('Password is required for new users', 'error');
           setSubmitting(false);
           return;
        }
        await api.post('/auth/register', { ...formData, role: formData.role }); // Assuming auth/register or users/create
        showToast('Member created successfully', 'success');
      } else {
        if (!selectedMember) return;
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.patch(`/users/${selectedMember.id}`, updateData);
        showToast('Member updated successfully', 'success');
      }
      setModalVisible(false);
      fetchMembers();
    } catch (e: any) {
      showToast(e.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = (member: Member, action: 'suspend' | 'activate' | 'delete') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} ${member.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: async () => {
            try {
              if (action === 'delete') await api.delete(`/users/${member.id}`);
              else await api.patch(`/users/${member.id}`, { isActive: action === 'activate' });
              
              showToast('Action successful', 'success');
              fetchMembers();
            } catch { showToast('Action failed', 'error'); }
        }}
      ]
    );
  };

  const renderItem = ({ item }: { item: Member }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => openEditModal(item)}
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
       <View style={[s.avatar, { backgroundColor: item.isActive ? colors.primary : colors.subtext }]}>
         <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.fullName.charAt(0).toUpperCase()}</Text>
       </View>
       <View style={{ flex: 1 }}>
         <View style={s.rowBetween}>
            <Text style={[s.name, { color: colors.text }]}>{item.fullName}</Text>
            <View style={[s.badge, { backgroundColor: item.isActive ? colors.success + '20' : colors.error + '20' }]}>
               <Text style={[s.badgeText, { color: item.isActive ? colors.success : colors.error }]}>
                 {item.isActive ? 'ACTIVE' : 'INACTIVE'}
               </Text>
            </View>
         </View>
         <Text style={[s.email, { color: colors.subtext }]}>{item.email}</Text>
         <Text style={[s.meta, { color: colors.subtext }]}>{item.role.replace('_', ' ').toUpperCase()}</Text>
       </View>
       <TouchableOpacity onPress={() => handleAction(item, item.isActive ? 'suspend' : 'activate')} style={{ padding: 8 }}>
          <MaterialIcons name={item.isActive ? 'block' : 'check-circle'} size={20} color={colors.subtext} />
       </TouchableOpacity>
       <TouchableOpacity onPress={() => handleAction(item, 'delete')} style={{ padding: 8 }}>
          <MaterialIcons name="delete-outline" size={20} color={colors.error} />
       </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
         <TouchableOpacity onPress={() => navigation.goBack()}>
           <MaterialIcons name="arrow-back" size={24} color={colors.text} />
         </TouchableOpacity>
         <Text style={[s.title, { color: colors.text }]}>Members</Text>
         <View style={{ width: 24 }} />
      </View>

      {/* Controls */}
      <View style={[s.controls, { borderBottomColor: colors.border }]}>
         <View style={[s.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="search" size={20} color={colors.subtext} />
            <TextInput 
              style={[s.input, { color: colors.text }]} 
              placeholder="Search..." 
              placeholderTextColor={colors.subtext}
              value={search}
              onChangeText={setSearch}
            />
         </View>
         <View style={s.tabs}>
            {(['all', 'active', 'inactive'] as const).map(f => (
               <TouchableOpacity 
                 key={f} 
                 style={[s.tab, filter === f && { backgroundColor: colors.primary }]}
                 onPress={() => setFilter(f)}
               >
                 <Text style={[s.tabText, { color: filter === f ? '#FFF' : colors.text }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                 </Text>
               </TouchableOpacity>
            ))}
         </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={!loading ? <View style={{ padding: 20, alignItems: 'center' }}><Text style={{ color: colors.subtext }}>No members found</Text></View> : null}
      />
      
      {/* FAB */}
      <TouchableOpacity 
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={openCreateModal}
      >
        <MaterialIcons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      {loading && <View style={s.loader}><ActivityIndicator color={colors.primary} /></View>}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { backgroundColor: colors.card }]}>
              <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.modalTitle, { color: colors.text }]}>{modalMode === 'create' ? 'Add Member' : 'Edit Member'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={s.form}>
                <View style={s.formGroup}>
                  <Text style={[s.label, { color: colors.text }]}>Full Name</Text>
                  <TextInput 
                    style={[s.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    value={formData.fullName}
                    onChangeText={t => setFormData(p => ({ ...p, fullName: t }))}
                    placeholder="John Doe"
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                <View style={s.formGroup}>
                  <Text style={[s.label, { color: colors.text }]}>Email</Text>
                  <TextInput 
                    style={[s.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    value={formData.email}
                    onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="john@example.com"
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                <View style={s.formGroup}>
                  <Text style={[s.label, { color: colors.text }]}>Phone</Text>
                  <TextInput 
                    style={[s.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    value={formData.phone}
                    onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
                    keyboardType="phone-pad"
                    placeholder="+250..."
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                <View style={s.formGroup}>
                  <Text style={[s.label, { color: colors.text }]}>Role</Text>
                  <View style={s.roleContainer}>
                    {['customer', 'staff', 'admin'].map(r => (
                      <TouchableOpacity 
                        key={r}
                        style={[s.roleChip, formData.role === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setFormData(p => ({ ...p, role: r }))}
                      >
                         <Text style={[s.roleText, { color: formData.role === r ? '#FFF' : colors.text }]}>{r.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {(modalMode === 'create' || formData.password) && (
                   <View style={s.formGroup}>
                      <Text style={[s.label, { color: colors.text }]}>{modalMode === 'edit' ? 'New Password (Optional)' : 'Password'}</Text>
                      <TextInput 
                        style={[s.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                        value={formData.password}
                        onChangeText={t => setFormData(p => ({ ...p, password: t }))}
                        secureTextEntry
                        placeholder="******"
                        placeholderTextColor={colors.subtext}
                      />
                   </View>
                )}
              </ScrollView>

              <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
                 <TouchableOpacity style={[s.btn, { backgroundColor: colors.border }]} onPress={() => setModalVisible(false)}>
                    <Text style={[s.btnText, { color: colors.text }]}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={[s.btnText, { color: '#FFF' }]}>Save</Text>}
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  controls: { padding: 12, gap: 12, borderBottomWidth: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, gap: 8 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  email: { fontSize: 13 },
  meta: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, maxHeight: '80%', width: '100%', elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.25, shadowRadius:3.84 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  form: { padding: 16, gap: 12 },
  formGroup: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  formInput: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 14, height: 40 },
  roleContainer: { flexDirection: 'row', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  roleText: { fontSize: 12, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1 },
  btn: { flex: 1, padding: 10, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' }
});