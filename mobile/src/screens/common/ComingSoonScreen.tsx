import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface ComingSoonScreenProps {
  navigation: {
    goBack: () => void;
  };
  route?: {
    params?: {
      featureName?: string;
    };
  };
}

export default function ComingSoonScreen({ navigation, route }: ComingSoonScreenProps) {
  const { isDark } = useTheme();
  const featureName = route?.params?.featureName || 'This Feature';

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#8E8E93' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
      borderColor: isDark ? '#3A3A3C' : '#E8E8E8',
    },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>{featureName}</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Illustration */}
        <View style={[styles.illustrationContainer, dynamicStyles.card]}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="engineering" size={48} color={theme.colors.primary} />
          </View>
          <View style={styles.gearIcon1}>
            <MaterialIcons name="settings" size={24} color={theme.colors.secondary} />
          </View>
          <View style={styles.gearIcon2}>
            <MaterialIcons name="code" size={20} color={theme.colors.primary} />
          </View>
        </View>

        {/* Text Content */}
        <Text style={[styles.title, dynamicStyles.text]}>Coming Soon!</Text>
        
        <Text style={[styles.description, dynamicStyles.textSecondary]}>
          We're working hard to bring you {featureName.toLowerCase()}. This feature is currently under development and will be available very soon.
        </Text>

        <View style={[styles.infoCard, dynamicStyles.card]}>
          <MaterialIcons name="info-outline" size={20} color={theme.colors.info} />
          <Text style={[styles.infoText, dynamicStyles.textSecondary]}>
            Stay tuned for updates! We'll notify you when this feature is ready.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={18} color="#FFF" />
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 12 },
  
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  
  illustrationContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    position: 'relative',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearIcon1: {
    position: 'absolute',
    top: 10,
    right: 15,
  },
  gearIcon2: {
    position: 'absolute',
    bottom: 15,
    left: 10,
  },
  
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
