import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeviceToken,
  DevicePlatform,
  TokenStatus,
} from '../entities/device-token.entity';

export interface RegisterDeviceDto {
  userId: string;
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
}

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  /**
   * Register or update a device token for push notifications
   */
  async registerToken(dto: RegisterDeviceDto): Promise<DeviceToken> {
    // Check if token already exists for this user/device combination
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: {
        userId: dto.userId,
        deviceId: dto.deviceId || dto.token,
      },
    });

    if (deviceToken) {
      // Update existing token
      deviceToken.token = dto.token;
      deviceToken.platform = dto.platform;
      deviceToken.status = TokenStatus.ACTIVE;
      deviceToken.appVersion = dto.appVersion || deviceToken.appVersion;
      deviceToken.deviceName = dto.deviceName || deviceToken.deviceName;
      deviceToken.lastUsedAt = new Date();

      this.logger.log(
        `Updated device token for user ${dto.userId} on ${dto.platform}`,
      );
    } else {
      // Create new token
      deviceToken = this.deviceTokenRepository.create({
        ...dto,
        status: TokenStatus.ACTIVE,
        lastUsedAt: new Date(),
      });

      this.logger.log(
        `Registered new device token for user ${dto.userId} on ${dto.platform}`,
      );
    }

    return this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Get all active tokens for a user
   */
  async getUserTokens(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.find({
      where: {
        userId,
        status: TokenStatus.ACTIVE,
      },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Get active tokens by platform for a user
   */
  async getUserTokensByPlatform(
    userId: string,
    platform: DevicePlatform,
  ): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.find({
      where: {
        userId,
        platform,
        status: TokenStatus.ACTIVE,
      },
    });
  }

  /**
   * Get all active tokens for multiple users
   */
  async getTokensForUsers(userIds: string[]): Promise<DeviceToken[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    return this.deviceTokenRepository
      .createQueryBuilder('token')
      .where('token.userId IN (:...userIds)', { userIds })
      .andWhere('token.status = :status', { status: TokenStatus.ACTIVE })
      .getMany();
  }

  /**
   * Mark a token as inactive (when user logs out)
   */
  async deactivateToken(token: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token },
      { status: TokenStatus.INACTIVE },
    );

    this.logger.log(`Deactivated device token ${token.substring(0, 20)}...`);
  }

  /**
   * Mark all tokens for a user as inactive
   */
  async deactivateUserTokens(userId: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { userId },
      { status: TokenStatus.INACTIVE },
    );

    this.logger.log(`Deactivated all tokens for user ${userId}`);
  }

  /**
   * Mark token as expired
   */
  async markTokenAsExpired(tokenId: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { id: tokenId },
      { status: TokenStatus.EXPIRED },
    );
  }

  /**
   * Clean up old/unused tokens (should be run periodically)
   */
  async cleanupOldTokens(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.deviceTokenRepository
      .createQueryBuilder()
      .delete()
      .where('lastUsedAt < :cutoffDate', { cutoffDate })
      .orWhere('status = :expiredStatus', {
        expiredStatus: TokenStatus.EXPIRED,
      })
      .execute();

    this.logger.log(`Cleaned up ${result.affected || 0} old device tokens`);
    return result.affected || 0;
  }
}
