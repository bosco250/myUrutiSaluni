import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
import { chatService, Message, Conversation } from "../../services/chat";
import { useAuth } from "../../context/AuthContext";

interface ChatScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      conversationId: string;
      employeeId?: string;
      salonId?: string;
      appointmentId?: string;
    };
  };
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const conversationId = route?.params?.conversationId;

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
    inputContainer: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    myBubble: {
      backgroundColor: theme.colors.primary,
    },
    theirBubble: {
      backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
    },
    headerBorder: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    inputAreaBorder: {
      borderTopColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    sendButton: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.gray300,
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    errorText: {
      color: isDark ? "#FF6B6B" : theme.colors.error,
    },
  };

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const result = await chatService.getMessages(convId, 1, 100);
      setMessages(result.messages);
    } catch (err: any) {
      setError(err.message || "Failed to load messages");
    }
  }, []);

  const handleMessageReceived = useCallback((message: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id ? { ...m, status: "delivered" as const } : m
      )
    );
  }, []);

  const handleMessageSent = useCallback((message: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id ? { ...m, status: "sent" as const } : m
      )
    );
  }, []);

  const handleTypingStarted = useCallback(() => {
    setIsTyping(true);
  }, []);

  const handleTypingStopped = useCallback(() => {
    setIsTyping(false);
  }, []);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });

    // Mark as read if it's not from current user
    const isCurrentUser = user?.role === "customer" || user?.role === "CUSTOMER"
      ? message.isFromCustomer
      : !message.isFromCustomer;

    if (!isCurrentUser && conversationId) {
      chatService.markAsRead(conversationId);
    }
  }, [conversationId, user?.role]);

  const initializeConversation = useCallback(async () => {
    try {
      setLoading(true);
      const { employeeId, salonId, appointmentId } = route?.params || {};
      const conv = await chatService.getOrCreateConversation(
        employeeId,
        salonId,
        appointmentId,
      );
      setConversation(conv);
      await loadMessages(conv.id);
      chatService.joinConversation(conv.id);
      await chatService.markAsRead(conv.id);
    } catch (err: any) {
      setError(err.message || "Failed to initialize conversation");
    } finally {
      setLoading(false);
    }
  }, [route?.params, loadMessages]);

  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      const conv = await chatService.getConversation(conversationId!);
      setConversation(conv);
      await loadMessages(conversationId!);
      chatService.joinConversation(conversationId!);
      await chatService.markAsRead(conversationId!);
    } catch (err: any) {
      setError(err.message || "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!conversationId) {
      // Create or get conversation
      initializeConversation();
    } else {
      loadConversation();
    }

    // Set up WebSocket listeners
    const socket = chatService.getSocket();
    if (socket) {
      socket.on("message:new", handleNewMessage);
      socket.on("message:received", handleMessageReceived);
      socket.on("message:sent", handleMessageSent);
      socket.on("typing:started", handleTypingStarted);
      socket.on("typing:stopped", handleTypingStopped);
    }

    return () => {
      if (conversationId) {
        chatService.leaveConversation(conversationId);
      }
      if (socket) {
        socket.off("message:new", handleNewMessage);
        socket.off("message:received", handleMessageReceived);
        socket.off("message:sent", handleMessageSent);
        socket.off("typing:started", handleTypingStarted);
        socket.off("typing:stopped", handleTypingStopped);
      }
    };
  }, [conversationId, initializeConversation, loadConversation, handleNewMessage, handleMessageReceived, handleMessageSent, handleTypingStarted, handleTypingStopped]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handle keyboard show - scroll to bottom
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !conversation?.id || sending) return;

    const content = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistically add message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      content,
      type: "text",
      status: "sending",
      isFromCustomer: user?.role === "customer" || user?.role === "CUSTOMER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const message = await chatService.sendMessage(
        conversation.id,
        content,
        "text",
      );

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? message : m))
      );
    } catch (err: any) {
      // Update temp message to failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id ? { ...m, status: "failed" as const } : m
        )
      );
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Send typing indicator
    if (conversation?.id) {
      chatService.sendTyping(conversation.id, true);

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing
      const timeout = setTimeout(() => {
        chatService.sendTyping(conversation.id!, false);
        setIsTyping(false);
      }, 2000);

      setTypingTimeout(timeout);
    }
  };

  const getOtherPartyName = (): string => {
    // Try employee first
    if (conversation?.employee) {
      return (
        conversation.employee.fullName ||
        conversation.employee.email?.split("@")[0] ||
        "Employee"
      );
    }
    // Try salon
    if (conversation?.salon) {
      return conversation.salon.name || "Salon";
    }
    // Fallback: Check if IDs exist but relations weren't loaded
    if (conversation?.employeeId) {
      return "Loading...";
    }
    if (conversation?.salonId) {
      return "Loading...";
    }
    return "Chat";
  };

  const getOtherPartyAvatar = () => {
    return require("../../../assets/Logo.png");
  };

  const isMessageFromMe = (message: Message): boolean => {
    const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";
    return isCustomer ? message.isFromCustomer : !message.isFromCustomer;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <Loader fullscreen message="Loading conversation..." />
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, dynamicStyles.errorText]}>
            {error || "Conversation not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
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

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={getOtherPartyAvatar()}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, dynamicStyles.text]}>
              {getOtherPartyName()}
            </Text>
            <Text style={[styles.status, dynamicStyles.textSecondary]}>
              {isTyping ? "Typing..." : "Online"}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 25}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((message) => {
            const isMe = isMessageFromMe(message);
            return (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  isMe ? styles.myMessageWrapper : styles.theirMessageWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe
                      ? [styles.myBubble, dynamicStyles.myBubble]
                      : [styles.theirBubble, dynamicStyles.theirBubble],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMe
                        ? styles.myMessageText
                        : [styles.theirMessageText, dynamicStyles.text],
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
                <View
                  style={[
                    styles.messageFooter,
                    isMe ? styles.myFooter : styles.theirFooter,
                  ]}
                >
                  <Text style={[styles.timestamp, dynamicStyles.textSecondary]}>
                    {chatService.formatMessageTime(message.createdAt)}
                  </Text>
                  {isMe && message.status && (
                    <MaterialIcons
                      name={
                        message.status === "read"
                          ? "done-all"
                          : message.status === "delivered"
                          ? "done-all"
                          : message.status === "sending" || message.status === "failed"
                          ? "schedule"
                          : "done"
                      }
                      size={14}
                      color={
                        message.status === "read" || message.status === "delivered"
                          ? theme.colors.primary
                          : message.status === "failed"
                          ? isDark
                            ? "#FF6B6B"
                            : theme.colors.error
                          : dynamicStyles.textSecondary.color
                      }
                      style={styles.statusIcon}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, dynamicStyles.inputAreaBorder]}>
          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <TextInput
              style={[styles.input, dynamicStyles.text]}
              placeholder="Type a message..."
              placeholderTextColor={isDark ? "#8E8E93" : theme.colors.textTertiary}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              editable={!sending}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() && !sending
                ? [styles.sendButtonActive, dynamicStyles.sendButtonActive]
                : dynamicStyles.sendButton,
            ]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons
                name="send"
                size={22}
                color={
                  inputText.trim()
                    ? "#FFFFFF"
                    : isDark
                    ? "#8E8E93"
                    : theme.colors.textTertiary
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  profileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: theme.spacing.sm,
  },
  avatarContainer: {
    position: "relative",
    marginRight: theme.spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gray200,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  status: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  messageWrapper: {
    marginBottom: theme.spacing.sm,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  theirMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#F2F2F7",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  theirMessageText: {
    color: theme.colors.text,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  myFooter: {
    justifyContent: "flex-end",
  },
  theirFooter: {
    justifyContent: "flex-start",
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    fontSize: 15,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {},
});
