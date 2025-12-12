import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";

interface FilterButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export default function FilterButton({
  label,
  isSelected,
  onPress,
}: FilterButtonProps) {
  const { isDark } = useTheme();

  const dynamicStyles = {
    button: {
      backgroundColor: isSelected
        ? theme.colors.primary
        : isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
    text: {
      color: isSelected
        ? theme.colors.white
        : isDark
        ? theme.colors.gray300
        : theme.colors.text,
    },
  };

  return (
    <TouchableOpacity
      style={[styles.button, dynamicStyles.button]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, dynamicStyles.text]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});

