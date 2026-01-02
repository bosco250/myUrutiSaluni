import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function SegmentedControl({
  options,
  selectedIndex,
  onSelect,
}: SegmentedControlProps) {
  const { isDark } = useTheme();

  // Dynamic styles for dark/light mode support
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    segmentActive: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    segmentText: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.segment,
            index === selectedIndex && [styles.segmentActive, dynamicStyles.segmentActive],
            index === 0 && styles.segmentFirst,
            index === options.length - 1 && styles.segmentLast,
          ]}
          onPress={() => onSelect(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              dynamicStyles.segmentText,
              index === selectedIndex && styles.segmentTextActive,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    padding: 6,
    marginBottom: theme.spacing.lg,
    height: 60,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentFirst: {
  },
  segmentLast: {
  },
  segmentText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
});

