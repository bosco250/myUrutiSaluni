import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ onRetry: () => void; isDark?: boolean }>;
  isDark?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MapView Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultMapFallback;
      return <FallbackComponent onRetry={this.handleRetry} isDark={this.props.isDark} />;
    }

    return this.props.children;
  }
}

const DefaultMapFallback: React.FC<{ onRetry: () => void; isDark?: boolean }> = ({ 
  onRetry, 
  isDark = false 
}) => (
  <View style={[
    styles.fallbackContainer, 
    { backgroundColor: isDark ? '#2C2C2E' : '#FFF5F5' }
  ]}>
    <MaterialIcons name="map" size={48} color={theme.colors.error} />
    <Text style={[styles.fallbackTitle, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
      Map Error
    </Text>
    <Text style={[styles.fallbackText, { color: isDark ? '#8E8E93' : theme.colors.textSecondary }]}>
      The map encountered an error. You can retry or continue without the map.
    </Text>
    
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <MaterialIcons name="refresh" size={20} color={theme.colors.primary} />
      <Text style={styles.retryText}>Retry Map</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    minHeight: 200,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  retryText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});