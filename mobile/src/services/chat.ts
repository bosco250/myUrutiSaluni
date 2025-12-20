import { api } from './api';
import { tokenStorage } from './tokenStorage';
import { config } from '../config';
import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isFromCustomer: boolean;
  senderId?: string;
  customerSenderId?: string;
  sender?: {
    id: string;
    fullName: string;
    email: string;
  };
  customerSender?: {
    id: string;
    fullName: string;
  };
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  employeeId?: string;
  salonId?: string;
  appointmentId?: string;
  type: 'customer_employee' | 'customer_salon';
  lastMessageId?: string;
  lastMessageAt?: string;
  customerUnreadCount: number;
  employeeUnreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    fullName: string;
    email: string;
  };
  salon?: {
    id: string;
    name: string;
  };
  appointment?: {
    id: string;
    scheduledStart: string;
  };
}

export interface ConversationWithLastMessage extends Conversation {
  lastMessage?: Message;
  otherParty?: {
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
}

class ChatService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    try {
      this.isConnecting = true;
      const token = await tokenStorage.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Get WebSocket URL from config (default to same host as API)
      const wsUrl = config.apiUrl.replace(/^https?:\/\//, '').split('/')[0];
      const protocol = config.apiUrl.startsWith('https') ? 'wss' : 'ws';

      this.socket = io(`${protocol}://${wsUrl}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      this.socket.on('disconnect', () => {
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.disconnect();
        }
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(
    employeeId?: string,
    salonId?: string,
    appointmentId?: string,
  ): Promise<Conversation> {
    const response = await api.post<Conversation>(
      '/chat/conversations',
      {
        employeeId,
        salonId,
        appointmentId,
        type: employeeId ? 'customer_employee' : 'customer_salon',
      },
    );
    return response;
  }

  /**
   * Get all conversations for current user
   */
  async getConversations(): Promise<ConversationWithLastMessage[]> {
    const conversations = await api.get<Conversation[]>('/chat/conversations');
    
    // Fetch last message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        let lastMessage: Message | undefined;
        if (conv.lastMessageId) {
          try {
            const messages = await this.getMessages(conv.id, 1, 1);
            lastMessage = messages.messages[0];
          } catch {
            // Ignore error, just don't include last message
          }
        }

        // Determine other party info
        let otherParty: ConversationWithLastMessage['otherParty'] | undefined;
        if (conv.employee) {
          otherParty = {
            name: conv.employee.fullName || 'Employee',
            isOnline: false, // Will be updated via WebSocket
          };
        } else if (conv.salon) {
          otherParty = {
            name: conv.salon.name || 'Salon',
            isOnline: false,
          };
        }

        return {
          ...conv,
          lastMessage,
          otherParty,
        };
      }),
    );

    return conversationsWithMessages;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    return api.get<Conversation>(`/chat/conversations/${conversationId}`);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return api.get<{ messages: Message[]; total: number }>(
      `/chat/conversations/${conversationId}/messages?${queryParams}`,
    );
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    metadata?: Record<string, any>,
  ): Promise<Message> {
    // Send via REST API first (for reliability)
    const message = await api.post<Message>('/chat/messages', {
      conversationId,
      content,
      type,
      metadata,
    });

    // Also send via WebSocket for real-time delivery
    if (this.socket?.connected) {
      this.socket.emit('message:send', {
        conversationId,
        content,
        type,
        metadata,
      });
    }

    return message;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/read`, {});
    
    // Also notify via WebSocket
    if (this.socket?.connected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/chat/unread-count');
    return response.count;
  }

  /**
   * Join a conversation room (for real-time updates)
   */
  joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      if (isTyping) {
        this.socket.emit('typing:start', { conversationId });
      } else {
        this.socket.emit('typing:stop', { conversationId });
      }
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Format time for message bubble
   */
  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Search users to start a conversation with
   */
  async searchUsersForChat(
    query?: string,
    role?: string,
  ): Promise<{
    id: string;
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    salonId?: string;
    salonName?: string;
    isActive?: boolean;
  }[]> {
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('query', query);
    if (role) queryParams.append('role', role);
    
    const endpoint = `/chat/search-users${queryParams.toString() ? `?${queryParams}` : ''}`;
    return api.get<{
      id: string;
      userId: string;
      name: string;
      email?: string;
      phone?: string;
      role: string;
      salonId?: string;
      salonName?: string;
      isActive?: boolean;
    }[]>(endpoint);
  }
}

export const chatService = new ChatService();

