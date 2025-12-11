import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';

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
  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.segment,
            index === selectedIndex && styles.segmentActive,
            index === 0 && styles.segmentFirst,
            index === options.length - 1 && styles.segmentLast,
          ]}
          onPress={() => onSelect(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
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
    borderRadius: 8,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: theme.fonts.bold,
  },
});

