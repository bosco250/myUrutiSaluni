import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { chatService } from "../../services/chat";

interface ChatUser {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  salonId?: string;
  salonName?: string;
  isActive?: boolean;
}

interface ChatUserSearchScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type FilterRole = "all" | "SALON_EMPLOYEE" | "SALON_OWNER";

export default function ChatUserSearchScreen({
  navigation,
}: ChatUserSearchScreenProps) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FilterRole>("all");

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    searchContainer: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    filterButton: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    filterButtonText: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
  };

  const loadUsers = useCallback(async () => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const role = selectedRole === "all" ? undefined : selectedRole;
      const results = await chatService.searchUsersForChat(
        searchQuery.trim(),
        role,
      );
      setUsers(results);
    } catch (error: any) {
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRole]);

  useEffect(() => {
    // Only search when there's a query (at least 2 characters)
    if (searchQuery && searchQuery.trim().length >= 2) {
      loadUsers();
    } else {
      // Clear results if query is too short or empty
      setUsers([]);
      setLoading(false);
    }
  }, [searchQuery, selectedRole, loadUsers]);

  const handleUserPress = async (user: ChatUser) => {
    try {
      // Create or get conversation
      // For employees, use user.id (the salon employee ID), not user.userId (the User ID)
      // The backend's chat service expects employeeId to be the salon employee record ID
      const conversation = await chatService.getOrCreateConversation(
        user.role === "SALON_EMPLOYEE" ? user.id : undefined,
        user.salonId,  // Always pass salonId for multi-tenant context
      );

      // Navigate to chat
      navigation.navigate("Chat", {
        conversationId: conversation.id,
      });
    } catch (error: any) {
      console.error("Error starting conversation:", error);
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case "SALON_EMPLOYEE":
        return "Employee";
      case "SALON_OWNER":
        return "Salon Owner";
      default:
        return role;
    }
  };

  const getAvatar = () => {
    return require("../../../assets/Logo.png");
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          New Message
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, dynamicStyles.text]}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="clear"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {(["all", "SALON_EMPLOYEE", "SALON_OWNER"] as FilterRole[]).map(
            (role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.filterButton,
                  dynamicStyles.filterButton,
                  selectedRole === role && styles.filterButtonActive,
                  selectedRole === role && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedRole(role)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dynamicStyles.filterButtonText,
                    selectedRole === role && styles.filterButtonTextActive,
                  ]}
                >
                  {role === "all"
                    ? "All"
                    : role === "SALON_EMPLOYEE"
                    ? "Employees"
                    : "Salon Owners"}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {users.map((user) => (
            <TouchableOpacity
              key={`${user.userId}-${user.role}`}
              style={[styles.userItem, dynamicStyles.card]}
              onPress={() => handleUserPress(user)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={getAvatar()}
                  style={styles.avatar}
                  resizeMode="cover"
                />
                {user.isActive && <View style={styles.onlineIndicator} />}
              </View>

              <View style={styles.userInfo}>
                <Text
                  style={[styles.userName, dynamicStyles.text]}
                  numberOfLines={1}
                >
                  {user.name}
                </Text>
                <Text
                  style={[styles.userRole, dynamicStyles.textSecondary]}
                  numberOfLines={1}
                >
                  {getRoleLabel(user.role)}
                  {user.salonName && ` • ${user.salonName}`}
                </Text>
                {user.email && (
                  <Text
                    style={[styles.userEmail, dynamicStyles.textSecondary]}
                    numberOfLines={1}
                  >
                    {user.email}
                  </Text>
                )}
              </View>

              <MaterialIcons
                name="chevron-right"
                size={24}
                color={dynamicStyles.textSecondary.color}
              />
            </TouchableOpacity>
          ))}

          {users.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="person-search"
                size={64}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyTitle, dynamicStyles.text]}>
                {searchQuery && searchQuery.trim().length >= 2
                  ? "No users found"
                  : "Search for someone to message"}
              </Text>
              <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
                {searchQuery && searchQuery.trim().length >= 2
                  ? "Try a different search term or check your spelling"
                  : "Enter at least 2 characters to search by name, email, or phone number"}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  searchWrapper: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  filterContainer: {
    paddingBottom: theme.spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonActive: {
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  avatarContainer: {
    position: "relative",
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.gray200,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
});

