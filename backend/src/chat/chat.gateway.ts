import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CustomersService } from '../customers/customers.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  customerId?: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly customersService: CustomersService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.id || payload.userId;
      client.role = payload.role;

      // Get customer ID if user is a customer
      if (client.role === 'customer' || client.role === 'CUSTOMER') {
        const customer = await this.customersService.findByUserId(
          client.userId,
        );
        if (customer) {
          client.customerId = customer.id;
        }
      }

      // Store connection
      const userKey = client.customerId || client.userId;
      this.connectedUsers.set(userKey, client);

      // Join user-specific room
      client.join(`user:${userKey}`);

      this.logger.log(
        `User connected: ${userKey} (${client.role}) - Socket: ${client.id}`,
      );

      // Notify user is online
      this.server.emit('user:online', { userId: userKey });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userKey = client.customerId || client.userId;
    if (userKey) {
      this.connectedUsers.delete(userKey);
      this.logger.log(`User disconnected: ${userKey}`);
      this.server.emit('user:offline', { userId: userKey });
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() createDto: CreateMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const currentUser = {
        id: client.userId,
        userId: client.userId,
        role: client.role,
      };

      // Create message
      const message = await this.chatService.createMessage(
        createDto,
        currentUser,
      );

      // Get conversation to determine recipients
      const conversation = await this.chatService.getConversation(
        createDto.conversationId,
        currentUser,
      );

      // Determine recipient
      let recipientKey: string | undefined;
      if (client.customerId) {
        // Message from customer, send to employee
        recipientKey = conversation.employeeId;
      } else {
        // Message from employee, send to customer
        recipientKey = conversation.customerId;
      }

      // Emit to sender
      client.emit('message:sent', message);

      // Emit to recipient if online
      if (recipientKey) {
        this.server
          .to(`user:${recipientKey}`)
          .emit('message:received', message);
      }

      // Emit to conversation room
      this.server
        .to(`conversation:${createDto.conversationId}`)
        .emit('message:new', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('message:error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const currentUser = {
        id: client.userId,
        userId: client.userId,
        role: client.role,
      };

      // Verify access
      await this.chatService.getConversation(data.conversationId, currentUser);

      // Join conversation room
      client.join(`conversation:${data.conversationId}`);

      // Mark as read
      await this.chatService.markAsRead(data.conversationId, currentUser);

      client.emit('conversation:joined', {
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      client.emit('conversation:error', { error: error.message });
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`conversation:${data.conversationId}`);
    client.emit('conversation:left', { conversationId: data.conversationId });
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userKey = client.customerId || client.userId;
    this.server
      .to(`conversation:${data.conversationId}`)
      .except(client.id)
      .emit('typing:started', {
        conversationId: data.conversationId,
        userId: userKey,
      });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userKey = client.customerId || client.userId;
    this.server
      .to(`conversation:${data.conversationId}`)
      .except(client.id)
      .emit('typing:stopped', {
        conversationId: data.conversationId,
        userId: userKey,
      });
  }

  /**
   * Broadcast message to conversation (called from service)
   */
  broadcastMessage(conversationId: string, message: any) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
