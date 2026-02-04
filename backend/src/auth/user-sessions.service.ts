import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from './entities/user-session.entity';

@Injectable()
export class UserSessionsService {
  constructor(
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
  ) {}

  async createSession(
    userId: string,
    deviceInfo: {
      deviceType?: string;
      browser?: string;
      os?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<UserSession> {
    // Set expiry to 7 days from now (matching JWT default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionsRepository.create({
      userId,
      deviceType: deviceInfo.deviceType || 'Unknown Device',
      browser: deviceInfo.browser || 'Unknown Browser',
      os: deviceInfo.os || 'Unknown OS',
      ipAddress: deviceInfo.ipAddress,
      expiresAt,
      lastActive: new Date(),
    });

    return this.sessionsRepository.save(session);
  }

  async findAllForUser(userId: string): Promise<UserSession[]> {
    return this.sessionsRepository.find({
      where: { userId, isRevoked: false },
      order: { lastActive: 'DESC' },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isRevoked = true;
    await this.sessionsRepository.save(session);
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.sessionsRepository.update(sessionId, {
      lastActive: new Date(),
    });
  }
}
