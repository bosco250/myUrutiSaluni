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
import { JwtService } from '@nestjs/jwt';
import { Logger, Injectable } from '@nestjs/common';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';

/**
 * Permission change event payload
 */
export interface PermissionChangeEvent {
  type: 'granted' | 'revoked';
  permissions: EmployeePermission[];
  salonId: string;
  salonName?: string;
  timestamp: string;
  grantedBy?: string;
}

/**
 * PermissionGateway
 *
 * WebSocket gateway for real-time permission updates.
 * When an owner grants/revokes permissions, affected employees
 * receive instant updates to their permission state.
 */
@WebSocketGateway({
  namespace: '/permissions',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class PermissionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PermissionGateway.name);
  private userSockets = new Map<string, Set<string>>();
  private socketToUser = new Map<string, string>();

  constructor(private jwtService: JwtService) {}

  /**
   * Handle new WebSocket connections
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`Client ${client.id} has invalid token payload`);
        client.disconnect();
        return;
      }

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.socketToUser.set(client.id, userId);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`🔌 Client ${client.id} connected for user ${userId}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to permission updates',
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnections
   */
  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketToUser.delete(client.id);
    }

    this.logger.log(`🔌 Client ${client.id} disconnected`);
  }

  /**
   * Handle client requesting to join a salon room
   */
  @SubscribeMessage('joinSalon')
  handleJoinSalon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { salonId: string },
  ) {
    if (data.salonId) {
      client.join(`salon:${data.salonId}`);
      this.logger.debug(`Client ${client.id} joined salon:${data.salonId}`);
    }
  }

  /**
   * Handle client requesting permission refresh
   */
  @SubscribeMessage('requestRefresh')
  handleRequestRefresh(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.logger.debug(`User ${userId} requested permission refresh`);
      // Emit a refresh event back to trigger client-side refresh
      client.emit('refreshRequested', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Notify a specific user of permission changes
   * Called by EmployeePermissionsService when permissions change
   */
  notifyPermissionChange(userId: string, event: PermissionChangeEvent): void {
    const roomName = `user:${userId}`;
    const userHasSockets = this.userSockets.has(userId);

    if (userHasSockets) {
      this.server.to(roomName).emit('permissionChange', event);
      this.logger.log(
        `📢 Sent permission ${event.type} notification to user ${userId}: ${event.permissions.join(', ')}`,
      );
    } else {
      this.logger.debug(
        `User ${userId} not connected, skipping real-time notification`,
      );
    }
  }

  /**
   * Notify all employees in a salon of permission-related changes
   */
  notifySalonPermissionUpdate(salonId: string, message: string): void {
    this.server.to(`salon:${salonId}`).emit('salonPermissionUpdate', {
      message,
      salonId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get count of connected users
   */
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }
}
