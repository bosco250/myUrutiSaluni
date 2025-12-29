import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
import { chatService, ConversationWithLastMessage } from "../../services/chat";
import { useAuth } from "../../context/AuthContext";

interface ChatListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function ChatListScreen({ navigation }: ChatListScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

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
    borderLight: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    avatarBg: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.gray200,
    },
    onlineBorder: {
      borderColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
  };

  useEffect(() => {
    // Connect to WebSocket
    chatService.connect().catch((err) => {
      console.error("Failed to connect to chat:", err);
    });

    // Set up WebSocket listeners
    const socket = chatService.getSocket();
    if (socket) {
      socket.on("user:online", (data: { userId: string }) => {
        setOnlineUsers((prev) => new Set(prev).add(data.userId));
      });

      socket.on("user:offline", (data: { userId: string }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      });

      socket.on("message:new", () => {
        // Refresh conversations when new message arrives
        loadConversations();
      });
    }

    loadConversations();

    return () => {
      // Cleanup: disconnect on unmount
      chatService.disconnect();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load conversations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
  };

  const handleChatPress = (conversation: ConversationWithLastMessage) => {
    navigation.navigate("Chat", { conversationId: conversation.id });
  };

  const filteredConversations = conversations.filter(
    (conv) => {
      const searchLower = searchQuery.toLowerCase();
      const name = conv.otherParty?.name || "";
      const lastMessage = conv.lastMessage?.content || "";
      return (
        name.toLowerCase().includes(searchLower) ||
        lastMessage.toLowerCase().includes(searchLower)
      );
    }
  );

  const getUnreadCount = (conv: ConversationWithLastMessage): number => {
    // Determine if current user is customer or employee
    const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";
    return isCustomer ? conv.customerUnreadCount : conv.employeeUnreadCount;
  };

  const getAvatar = (conv: ConversationWithLastMessage) => {
    // Use default logo for now
    return require("../../../assets/Logo.png");
  };

  const getRole = (conv: ConversationWithLastMessage): string => {
    if (conv.employee) {
      return "Employee";
    }
    if (conv.salon) {
      return "Salon";
    }
    return "Contact";
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <Loader fullscreen message="Loading conversations..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("ChatUserSearch")}
        >
          <MaterialIcons
            name="edit"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
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
            placeholder="Search messages"
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {filteredConversations.map((conversation) => {
          const unreadCount = getUnreadCount(conversation);
          const isOnline = conversation.otherParty
            ? onlineUsers.has(conversation.employeeId || conversation.salonId || "")
            : false;
          const lastMessage = conversation.lastMessage;
          const timestamp = lastMessage
            ? chatService.formatTimestamp(lastMessage.createdAt)
            : chatService.formatTimestamp(conversation.createdAt);

          return (
            <TouchableOpacity
              key={conversation.id}
              style={[styles.conversationItem, dynamicStyles.borderLight]}
              onPress={() => handleChatPress(conversation)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <Image
                  source={getAvatar(conversation)}
                  style={[styles.avatar, dynamicStyles.avatarBg]}
                  resizeMode="cover"
                />
                {isOnline && <View style={[styles.onlineIndicator, dynamicStyles.onlineBorder]} />}
              </View>

              {/* Conversation Info */}
              <View style={styles.conversationInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.conversationName, dynamicStyles.text]}
                    numberOfLines={1}
                  >
                    {conversation.otherParty?.name || "Unknown"}
                  </Text>
                  <Text
                    style={[styles.timestamp, dynamicStyles.textSecondary]}
                  >
                    {timestamp}
                  </Text>
                </View>
                <Text style={[styles.role, dynamicStyles.textSecondary]}>
                  {getRole(conversation)}
                </Text>
                <View style={styles.messageRow}>
                  <Text
                    style={[
                      styles.lastMessage,
                      dynamicStyles.textSecondary,
                      unreadCount > 0 && styles.unreadMessage,
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessage?.content || "No messages yet"}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredConversations.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={64}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>
              {error ? "Error loading messages" : "No messages yet"}
            </Text>
            <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
              {error
                ? "Please try again later"
                : "Start a conversation with your stylist"}
            </Text>
            {!error && (
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => navigation.navigate("ChatUserSearch")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={20}
                  color="#FFFFFF"
                  style={styles.startChatIcon}
                />
                <Text style={styles.startChatButtonText}>
                  Search for Someone
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + "20",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
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
  newChatButton: {
    padding: theme.spacing.xs,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  conversationItem: {
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.gray200,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  conversationInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.sm,
  },
  role: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: theme.spacing.sm,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
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
    marginBottom: theme.spacing.lg,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  startChatIcon: {
    marginRight: theme.spacing.sm,
  },
  startChatButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
