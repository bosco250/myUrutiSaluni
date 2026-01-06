import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api as apiService } from '../../services/api';
import { showToast } from '../../utils';

interface Document { id: string; name: string; type: string; url: string; }
interface ApplicationDetail {
  id: string;
  businessName: string;
  applicant: { id: string; fullName: string; email: string; phone: string };
  city: string;
  district: string;
  businessAddress: string;
  businessDescription: string;
  registrationNumber?: string;
  taxId?: string;
  documents?: Document[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: { fullName: string };
}

export default function ApplicationDetailScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ visible: boolean; action: 'approve' | 'reject' }>({ visible: false, action: 'approve' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const id = route.params?.applicationId;
        if (!id) throw new Error('No ID');
        const data = await apiService.get<ApplicationDetail>(`/memberships/applications/${id}`);
        setApp(data);
      } catch {
        showToast('Failed to load application details', 'error');
        navigation.goBack();
      } finally { setLoading(false); }
    };
    fetchDetail();
  }, [route.params?.applicationId, navigation]);

  const handleReview = async () => {
    if (reviewModal.action === 'reject' && !notes.trim()) return Alert.alert('Reason required');
    setSubmitting(true);
    try {
      await apiService.patch(`/memberships/applications/${app?.id}/review`, {
        status: reviewModal.action === 'approve' ? 'approved' : 'rejected',
        rejectionReason: notes
      });
      showToast(`Application ${reviewModal.action}ed`, 'success');
      navigation.goBack();
    } catch {
      showToast('Action failed', 'error');
    } finally { setSubmitting(false); setReviewModal(p => ({ ...p, visible: false })); }
  };

  const Section = ({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.secHeader, { borderBottomColor: colors.border }]}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
        <Text style={[s.secTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={s.secBody}>{children}</View>
    </View>
  );

  const Field = ({ label, value, full = false }: { label: string; value?: string; full?: boolean }) => (
    <View style={[s.field, full && { width: '100%' }]}>
      <Text style={[s.label, { color: colors.subtext }]}>{label}</Text>
      <Text style={[s.value, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );

  if (loading || !app) return <View style={[s.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={theme.colors.primary} /></View>;

  const statusColor = app.status === 'approved' ? colors.success : app.status === 'rejected' ? colors.error : colors.warning;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Application Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Status Card */}
        <View style={[s.statusCard, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
          <MaterialIcons name={app.status === 'approved' ? 'check-circle' : app.status === 'rejected' ? 'cancel' : 'hourglass-empty'} size={32} color={statusColor} />
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, { color: statusColor }]}>{app.status.toUpperCase()}</Text>
            <Text style={[s.statusSub, { color: colors.text }]}>Submitted on {new Date(app.createdAt).toLocaleDateString()}</Text>
            {app.rejectionReason && <Text style={[s.reason, { color: colors.error }]}>Reason: {app.rejectionReason}</Text>}
          </View>
        </View>

        <Section title="Business Profile" icon="store">
          <View style={s.grid}>
            <Field label="Business Name" value={app.businessName} full />
            <Field label="City" value={app.city} />
            <Field label="District" value={app.district} />
            <Field label="Address" value={app.businessAddress} full />
            <Field label="Registration No" value={app.registrationNumber} />
            <Field label="Tax ID" value={app.taxId} />
            <Field label="Description" value={app.businessDescription} full />
          </View>
        </Section>

        <Section title="Applicant" icon="person">
           <View style={s.grid}>
             <Field label="Full Name" value={app.applicant?.fullName} full />
             <Field label="Email" value={app.applicant?.email} full />
             <Field label="Phone" value={app.applicant?.phone} />
           </View>
        </Section>

        {app.documents && app.documents.length > 0 && (
          <Section title="Documents" icon="folder">
            {app.documents.map((doc, i) => (
              <TouchableOpacity key={i} style={[s.docItem, { borderColor: colors.border }]} onPress={() => Linking.openURL(doc.url).catch(() => showToast('Cannot open URL', 'error'))}>
                 <MaterialIcons name={doc.type.includes('pdf') ? 'picture-as-pdf' : 'image'} size={24} color={colors.primary} />
                 <Text style={[s.docName, { color: colors.text }]}>{doc.name}</Text>
                 <MaterialIcons name="open-in-new" size={18} color={colors.subtext} />
              </TouchableOpacity>
            ))}
          </Section>
        )}
      </ScrollView>

      {/* Action Footer */}
      {app.status === 'pending' && (
        <View style={[s.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[s.btn, { backgroundColor: colors.error + '15' }]} 
            onPress={() => { setNotes(''); setReviewModal({ visible: true, action: 'reject' }); }}
          >
            <Text style={[s.btnText, { color: colors.error }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.btn, { backgroundColor: colors.primary }]} 
            onPress={() => { setNotes(''); setReviewModal({ visible: true, action: 'approve' }); }}
          >
            <Text style={[s.btnText, { color: '#FFF' }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Review Modal */}
      <Modal visible={reviewModal.visible} transparent animationType="fade" onRequestClose={() => setReviewModal(p => ({ ...p, visible: false }))}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
               {reviewModal.action === 'approve' ? 'Confirm Approval' : 'Reject Application'}
            </Text>
            {reviewModal.action === 'reject' && (
              <Text style={{color:colors.subtext, fontSize:12, marginBottom:8}}>Please provide a reason for the applicant.</Text>
            )}
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              placeholder={reviewModal.action === 'approve' ? "Optional notes..." : "Reason required..."}
              placeholderTextColor={colors.subtext}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setReviewModal(p => ({ ...p, visible: false }))} style={s.flatBtn}>
                 <Text style={{ color: colors.subtext }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleReview} 
                style={[s.modalBtn, { backgroundColor: reviewModal.action === 'approve' ? colors.success : colors.error }]}
                disabled={submitting}
              >
                 {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, elevation: 2 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16 },
  statusCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 16 },
  statusTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  statusSub: { fontSize: 13, marginTop: 4 },
  reason: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  secHeader: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center', borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  secTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  secBody: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  field: { width: '50%', paddingRight: 8 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '500' },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 8, gap: 12, marginBottom: 8 },
  docName: { flex: 1, fontSize: 14, fontWeight: '500' },
  footer: { padding: 16, flexDirection: 'row', gap: 12, borderTopWidth: 1, elevation: 8 },
  btn: { flex: 1, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { padding: 20, borderRadius: 16, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { height: 100, borderWidth: 1, borderRadius: 8, padding: 12, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  flatBtn: { padding: 8 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});