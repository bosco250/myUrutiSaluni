import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface SalesSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder: string;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
}

export const SalesSearchBar: React.FC<SalesSearchBarProps> = React.memo(({
  searchQuery,
  onSearchChange,
  placeholder,
  isDark,
  dynamicStyles,
}) => {
  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchInput, dynamicStyles.input]}>
        <MaterialIcons
          name="search"
          size={20}
          color={dynamicStyles.textSecondary.color}
        />
        <TextInput
          style={[styles.searchText, { color: dynamicStyles.text.color }]}
          placeholder={placeholder}
          placeholderTextColor={dynamicStyles.textSecondary.color}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <MaterialIcons
              name="close"
              size={18}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

SalesSearchBar.displayName = 'SalesSearchBar';

// Senior Dev: Styles copied EXACTLY from SalesScreen.tsx (no changes)
// Senior Dev: Compact Search Bar Styling
const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8, // Reduced padding
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20, // More rounded for pill shape
    paddingHorizontal: 12,
    paddingVertical: 6, // Reduced height (approx 36-40px total)
    borderWidth: 1,
    height: 40,
  },
  searchText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14, // Smaller font
    fontFamily: theme.fonts.regular,
    paddingVertical: 0, // Fix alignment on Android
  },
});
