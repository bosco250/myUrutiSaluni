import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../context/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0-100
}

export default function ProgressBar({progress}: ProgressBarProps) {
  const {theme} = useTheme();
  const width = Math.min(100, Math.max(0, progress));

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: '#334155'},
      ]}>
      <View
        style={[
          styles.progress,
          {
            width: `${width}%`,
            backgroundColor: theme.colors.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 9999,
  },
});

