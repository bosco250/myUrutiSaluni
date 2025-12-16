import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface IconProps {
  size?: number;
  color?: string;
}

export function MailIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="email" size={size} color={color} />
  );
}

export function LockIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="lock" size={size} color={color} />
  );
}

export function PersonIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="person" size={size} color={color} />
  );
}

export function EyeIcon({ size = 18, color = theme.colors.textSecondary }: IconProps) {
  return (
    <MaterialIcons name="visibility" size={size} color={color} />
  );
}

export function EyeOffIcon({ size = 18, color = theme.colors.textSecondary }: IconProps) {
  return (
    <MaterialIcons name="visibility-off" size={size} color={color} />
  );
}

export function VerifiedIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="verified" size={size} color={color} />
  );
}

export function SecurityIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="security" size={size} color={color} />
  );
}

export function PhoneIcon({ size = 20, color = theme.colors.primary }: IconProps) {
  return (
    <MaterialIcons name="phone" size={size} color={color} />
  );
}

