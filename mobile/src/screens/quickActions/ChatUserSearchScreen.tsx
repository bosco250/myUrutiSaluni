import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
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
    searchContainer: {
      backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5",
      borderColor: isDark ? "#3A3A3C" : "transparent",
    },
    filterButton: {
      backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5",
      borderColor: isDark ? "#3A3A3C" : "transparent",
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterButtonText: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    separator: {
      backgroundColor: isDark ? "#2C2C2E" : "#F0F0F0",
    },
    avatarBg: {
      backgroundColor: isDark ? "#3A3A3C" : "#E1E1E1",
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
        return "Stylist";
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
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>

        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={28}
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
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textTertiary}
            />
            <TextInput
              style={[styles.searchInput, dynamicStyles.text]}
              placeholder="Search by name, email..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Role Filter Chips */}
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
                    selectedRole === role && dynamicStyles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedRole(role)}
                  activeOpacity={0.8}
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
                      ? "Stylists"
                      : "Owners"}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Loader message="Searching users..." />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
          >
            {users.map((user, index) => (
              <React.Fragment key={`${user.userId}-${user.role}`}>
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => handleUserPress(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    <Image
                      source={getAvatar()}
                      style={[styles.avatar, dynamicStyles.avatarBg]}
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
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
                {/* Separator */}
                {index < users.length - 1 && (
                  <View style={[styles.separator, dynamicStyles.separator]} />
                )}
              </React.Fragment>
            ))}

            {users.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, dynamicStyles.searchContainer]}>
                   <Ionicons
                    name="search-outline"
                    size={48}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, dynamicStyles.text]}>
                  {searchQuery && searchQuery.trim().length >= 2
                    ? "No users found"
                    : "Search to Message"}
                </Text>
                <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
                  {searchQuery && searchQuery.trim().length >= 2
                    ? "Try checking your spelling or search for a different name."
                    : "Find Stylists or Salon Owners to chat with."}
                </Text>
              </View>
            )}
            
            {/* Bottom Padding */}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 32,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? "System" : "Roboto",
  },
  filterContainer: {
    paddingBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // List Items
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  separator: {
    height: 1,
    marginLeft: 86,
    marginRight: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    borderColor: "#FFFFFF", 
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
});
