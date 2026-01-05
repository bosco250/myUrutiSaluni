import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { theme } from '../../theme';

// Import Google icon from assets
const googleIcon = require('../../../assets/googleIcon.png');

interface SocialButtonProps {
  provider: 'google' | 'facebook';
  onPress: () => void;
  style?: any;
}

export default function SocialButton({
  provider,
  onPress,
  style,
}: SocialButtonProps) {
  const isGoogle = provider === 'google';

  // Google icon - using image from assets
  const GoogleIcon = () => (
    <Image
      source={googleIcon}
      style={styles.googleIconImage}
      resizeMode="contain"
    />
  );

  // Facebook icon with brand color - colored f letter
  const FacebookIcon = () => (
    <Text style={[styles.facebookIconText, { color: theme.colors.facebookBlue }]}>f</Text>
  );

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {isGoogle ? <GoogleIcon /> : <FacebookIcon />}
      </View>
      <Text style={styles.text}>{isGoogle ? 'Google' : 'Facebook'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  // Google Icon Styles - image
  googleIconImage: {
    width: 24,
    height: 24,
  },
  // Facebook Icon Styles - colored text
  facebookIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
});

