import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Accordion from '../components/Accordion';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import {useTheme} from '../context/ThemeContext';

interface DocumentFile {
  id: string;
  name: string;
  status: 'uploaded' | 'uploading' | 'pending' | 'error';
  progress?: number;
  errorMessage?: string;
}

export default function DocumentUploadScreen({navigation}: any) {
  const {theme} = useTheme();
  const [documents, setDocuments] = useState<DocumentFile[]>([
    {
      id: '1',
      name: 'business-license-2023.pdf',
      status: 'uploaded',
    },
    {
      id: '2',
      name: 'drivers-license-front.jpg',
      status: 'uploading',
      progress: 68,
    },
    {
      id: '3',
      name: '',
      status: 'pending',
    },
    {
      id: '4',
      name: '',
      status: 'error',
      errorMessage:
        'The image provided was blurry. Please upload a clear photo of a recent utility bill.',
    },
  ]);

  const handleDelete = (id: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  };

  const handleUpload = (id: string, type: 'camera' | 'library') => {
    // Simulate file upload
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setDocuments(docs =>
        docs.map(d =>
          d.id === id
            ? {...d, status: 'uploading', progress: 0, name: 'uploading-file.pdf'}
            : d,
        ),
      );

      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setDocuments(docs =>
          docs.map(d => (d.id === id ? {...d, progress} : d)),
        );

        if (progress >= 100) {
          clearInterval(interval);
          setDocuments(docs =>
            docs.map(d =>
              d.id === id ? {...d, status: 'uploaded', progress: 100} : d,
            ),
          );
        }
      }, 200);
    }
  };

  const canSubmit = !documents.some(
    doc => doc.status === 'pending' || doc.status === 'uploading',
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
          Document Verification
        </Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="help-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text
          style={[
            styles.title,
            {color: theme.colors.text},
          ]}>
          Verify Your Salon
        </Text>
        <Text
          style={[
            styles.description,
            {color: theme.colors.textMuted},
          ]}>
          To comply with association standards and ensure security, please upload
          the following documents.
        </Text>

        <View style={styles.documentsContainer}>
          {/* Business License */}
          <Accordion
            title="Business License"
            defaultOpen={true}
            status="success">
            <Text
              style={[
                styles.instruction,
                {color: theme.colors.textMuted},
              ]}>
              Please provide a clear, color photo of the entire document.
              Accepted formats: JPG, PNG, PDF. Max size: 5MB.
            </Text>
            <View
              style={[
                styles.filePreview,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}>
              <View style={styles.fileInfo}>
                <Icon name="description" size={24} color={theme.colors.primary} />
                <Text
                  style={[styles.fileName, {color: theme.colors.text}]}
                  numberOfLines={1}>
                  {documents[0].name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(documents[0].id)}>
                <Icon name="delete" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </Accordion>

          {/* Owner's ID */}
          <Accordion
            title="Owner's Government-Issued ID"
            defaultOpen={true}
            status="warning">
            <Text
              style={[
                styles.instruction,
                {color: theme.colors.textMuted},
              ]}>
              Please provide a clear, color photo of your driver's license,
              passport, or national ID card.
            </Text>
            <View style={styles.uploadingContainer}>
              <View
                style={[
                  styles.filePreview,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}>
                <Icon
                  name="sync"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.fileInfo}>
                  <Text
                    style={[styles.fileName, {color: theme.colors.text}]}
                    numberOfLines={1}>
                    {documents[1].name}
                  </Text>
                  <Text
                    style={[
                      styles.progressText,
                      {color: theme.colors.textMuted},
                    ]}>
                    Uploading... {documents[1].progress}%
                  </Text>
                </View>
              </View>
              <ProgressBar progress={documents[1].progress || 0} />
            </View>
          </Accordion>

          {/* Tax Information */}
          <Accordion title="Tax Information" status="pending">
            <Text
              style={[
                styles.instruction,
                {color: theme.colors.textMuted},
              ]}>
              Provide a document with your Tax Identification Number (TIN).
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Take Photo"
                onPress={() => handleUpload(documents[2].id, 'camera')}
                variant="outline"
                icon="photo-camera"
                style={styles.flexButton}
              />
              <Button
                title="Choose from Library"
                onPress={() => handleUpload(documents[2].id, 'library')}
                variant="outline"
                icon="photo-library"
                style={styles.flexButton}
              />
            </View>
          </Accordion>

          {/* Proof of Address */}
          <Accordion title="Proof of Address" status="error">
            <Text
              style={[styles.errorText, {color: theme.colors.danger}]}>
              {documents[3].errorMessage}
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Retake Photo"
                onPress={() => handleUpload(documents[3].id, 'camera')}
                variant="outline"
                icon="photo-camera"
                style={styles.flexButton}
              />
              <Button
                title="Re-upload"
                onPress={() => handleUpload(documents[3].id, 'library')}
                variant="outline"
                icon="photo-library"
                style={styles.flexButton}
              />
            </View>
          </Accordion>
        </View>

        <View style={styles.securityNotice}>
          <Icon name="lock" size={18} color={theme.colors.textMuted} />
          <Text
            style={[styles.securityText, {color: theme.colors.textMuted}]}>
            Your documents are encrypted and securely stored.{' '}
            <Text style={{color: theme.colors.primary, fontWeight: '500'}}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}>
        <Button
          title="Submit Documents"
          onPress={() => {}}
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          style={styles.submitButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  documentsContainer: {
    gap: 16,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  uploadingContainer: {
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  securityText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    width: '100%',
  },
});

