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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

  // Dynamic Theme Styles
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
    separator: {
      backgroundColor: isDark ? "#2C2C2E" : "#F0F0F0",
    },
    avatarBg: {
      backgroundColor: isDark ? "#3A3A3C" : "#E1E1E1",
    },
    onlineBorder: {
      borderColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
  };

  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      try {
        await chatService.connect();
      } catch (err) {
        console.error("Failed to connect to chat:", err);
      }
    };

    initChat();

    const socket = chatService.getSocket();
    if (socket) {
      const handleUserOnline = (data: { userId: string }) => {
        if (isMounted) setOnlineUsers((prev) => new Set(prev).add(data.userId));
      };

      const handleUserOffline = (data: { userId: string }) => {
        if (isMounted) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
        }
      };

      const handleNewMessage = () => {
        if (isMounted) loadConversations();
      };

      socket.on("user:online", handleUserOnline);
      socket.on("user:offline", handleUserOffline);
      socket.on("message:new", handleNewMessage);

      return () => {
        isMounted = false;
        socket.off("user:online", handleUserOnline);
        socket.off("user:offline", handleUserOffline);
        socket.off("message:new", handleNewMessage);
        chatService.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    loadConversations();
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

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    const name = conv.otherParty?.name || "";
    const lastMessage = conv.lastMessage?.content || "";
    return (
      name.toLowerCase().includes(searchLower) ||
      lastMessage.toLowerCase().includes(searchLower)
    );
  });

  const getUnreadCount = (conv: ConversationWithLastMessage): number => {
    const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";
    return isCustomer ? conv.customerUnreadCount : conv.employeeUnreadCount;
  };

  const getAvatar = (conv: ConversationWithLastMessage) => {
    // Ideally use conv.otherParty.photoUrl
    return require("../../../assets/Logo.png");
  };



  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading messages..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        
        {/* Modern Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Messages</Text>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => navigation.navigate("ChatUserSearch")}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
            <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.text]}
              placeholder="Search conversations"
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Conversation List */}
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
          {filteredConversations.map((conversation, index) => {
            const unreadCount = getUnreadCount(conversation);
            const isOnline = conversation.otherParty
              ? onlineUsers.has(conversation.employeeId || conversation.salonId || "")
              : false;
            const lastMessage = conversation.lastMessage;
            
            // Format time: "10:30 AM" or "Yesterday"
            const timestamp = lastMessage
              ? chatService.formatTimestamp(lastMessage.createdAt)
              : "";

            return (
              <React.Fragment key={conversation.id}>
                <TouchableOpacity
                  style={styles.conversationItem}
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

                  {/* Content */}
                  <View style={styles.conversationInfo}>
                    <View style={styles.topRow}>
                      <Text style={[styles.conversationName, dynamicStyles.text]} numberOfLines={1}>
                        {conversation.otherParty?.name || "Unknown"}
                      </Text>
                      <Text style={[styles.timestamp, dynamicStyles.textSecondary]}>
                        {timestamp}
                      </Text>
                    </View>

                    <View style={styles.bottomRow}>
                      <Text
                        style={[
                          styles.lastMessage,
                          dynamicStyles.textSecondary,
                          unreadCount > 0 && styles.unreadMessageText,
                        ]}
                        numberOfLines={1}
                      >
                         {/* Show "Stylist: " prefix if needed, or just content */}
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
                {/* Separator between items, but not after the last one */}
                {index < filteredConversations.length - 1 && (
                  <View style={[styles.separator, dynamicStyles.separator]} />
                )}
              </React.Fragment>
            );
          })}

          {filteredConversations.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, dynamicStyles.searchContainer]}>
                 <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, dynamicStyles.text]}>
                {error ? "Oops!" : "No messages yet"}
              </Text>
              <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
                {error
                  ? "We couldn't load your messages."
                  : "Connect with your favorite stylists and salons to start chatting."}
              </Text>
              {!error && (
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={() => navigation.navigate("ChatUserSearch")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.startChatButtonText}>Start New Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 20 }} />
        </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  newChatButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)", // Subtle touch target
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "transparent", // dynamic
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? "System" : "Roboto",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
  },
  // Item Styles
  conversationItem: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  separator: {
    height: 1,
    marginLeft: 90, // Indent separator to match text start
    marginRight: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#34C759", // iOS Green
    borderWidth: 2,
  },
  conversationInfo: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  unreadMessageText: {
    fontWeight: "600",
    color: theme.colors.text, 
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
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
    marginBottom: 24,
    lineHeight: 22,
  },
  startChatButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startChatButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
