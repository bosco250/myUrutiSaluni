import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function QuickActionButton({ icon, label, onPress }: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={icon as any}
          size={28}
          color={theme.colors.primary}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
});

