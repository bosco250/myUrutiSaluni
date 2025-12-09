import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Communication,
  CommunicationType,
  CommunicationStatus,
  CommunicationDirection,
} from './entities/communication.entity';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { isBefore } from 'date-fns';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(Communication)
    private communicationsRepository: Repository<Communication>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateCommunicationDto): Promise<Communication> {
    const communication = this.communicationsRepository.create({
      ...createDto,
      scheduledFor: createDto.scheduledFor
        ? new Date(createDto.scheduledFor)
        : undefined,
      followUpDate: createDto.followUpDate
        ? new Date(createDto.followUpDate)
        : undefined,
      status:
        createDto.status ||
        (createDto.scheduledFor
          ? CommunicationStatus.SCHEDULED
          : CommunicationStatus.COMPLETED),
      completedAt:
        createDto.status === CommunicationStatus.COMPLETED
          ? new Date()
          : undefined,
    });

    return this.communicationsRepository.save(communication);
  }

  async findAll(
    customerId?: string,
    limit: number = 100,
  ): Promise<Communication[]> {
    const where: any = {};
    if (customerId) where.customerId = customerId;

    return this.communicationsRepository.find({
      where,
      relations: ['customer', 'user', 'appointment', 'sale'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string): Promise<Communication> {
    const communication = await this.communicationsRepository.findOne({
      where: { id },
      relations: ['customer', 'user', 'appointment', 'sale'],
    });

    if (!communication) {
      throw new NotFoundException(`Communication with ID ${id} not found`);
    }

    return communication;
  }

  async update(
    id: string,
    updateDto: UpdateCommunicationDto,
  ): Promise<Communication> {
    const communication = await this.findOne(id);

    if (updateDto.scheduledFor) {
      updateDto.scheduledFor = new Date(updateDto.scheduledFor) as any;
    }
    if (updateDto.followUpDate) {
      updateDto.followUpDate = new Date(updateDto.followUpDate) as any;
    }

    Object.assign(communication, updateDto);
    return this.communicationsRepository.save(communication);
  }

  async remove(id: string): Promise<void> {
    const communication = await this.findOne(id);
    await this.communicationsRepository.remove(communication);
  }

  async getCustomerTimeline(customerId: string): Promise<Communication[]> {
    return this.communicationsRepository.find({
      where: { customerId },
      relations: ['user', 'appointment', 'sale'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingFollowUps(customerId?: string): Promise<Communication[]> {
    const where: any = {
      followUpRequired: true,
      followUpCompleted: false,
      followUpDate: LessThanOrEqual(new Date()),
    };

    if (customerId) {
      where.customerId = customerId;
    }

    return this.communicationsRepository.find({
      where,
      relations: ['customer', 'user'],
      order: { followUpDate: 'ASC' },
    });
  }

  async markFollowUpComplete(id: string): Promise<Communication> {
    const communication = await this.findOne(id);
    communication.followUpCompleted = true;
    return this.communicationsRepository.save(communication);
  }

  async getStatistics(customerId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byDirection: Record<string, number>;
    pendingFollowUps: number;
    lastContactDate?: Date;
  }> {
    const where: any = {};
    if (customerId) where.customerId = customerId;

    const communications = await this.communicationsRepository.find({ where });

    const byType: Record<string, number> = {};
    const byDirection: Record<string, number> = {};

    let lastContactDate: Date | undefined;

    communications.forEach((comm) => {
      byType[comm.type] = (byType[comm.type] || 0) + 1;
      byDirection[comm.direction] = (byDirection[comm.direction] || 0) + 1;

      if (
        comm.completedAt &&
        (!lastContactDate || comm.completedAt > lastContactDate)
      ) {
        lastContactDate = comm.completedAt;
      }
    });

    const pendingFollowUps = communications.filter(
      (comm) =>
        comm.followUpRequired &&
        !comm.followUpCompleted &&
        comm.followUpDate &&
        isBefore(comm.followUpDate, new Date()),
    ).length;

    return {
      total: communications.length,
      byType,
      byDirection,
      pendingFollowUps,
      lastContactDate,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processFollowUps() {
    const pendingFollowUps = await this.getPendingFollowUps();

    for (const communication of pendingFollowUps) {
      // Send reminder notification
      if (communication.customer) {
        await this.notificationsService.sendNotification(
          undefined,
          communication.customerId,
          communication.appointmentId,
          NotificationChannel.EMAIL,
          NotificationType.SYSTEM_ALERT,
          'Follow-up Reminder',
          `You have a pending follow-up for: ${communication.subject}`,
        );
      }
    }
  }

  async createFollowUp(
    originalCommunicationId: string,
    followUpData: {
      scheduledFor?: Date;
      subject: string;
      content?: string;
    },
  ): Promise<Communication> {
    const original = await this.findOne(originalCommunicationId);

    const followUp = this.communicationsRepository.create({
      customerId: original.customerId,
      userId: original.userId,
      appointmentId: original.appointmentId,
      saleId: original.saleId,
      type: CommunicationType.FOLLOW_UP,
      direction: CommunicationDirection.OUTBOUND,
      status: followUpData.scheduledFor
        ? CommunicationStatus.SCHEDULED
        : CommunicationStatus.PENDING,
      subject: followUpData.subject,
      content: followUpData.content,
      scheduledFor: followUpData.scheduledFor,
      followUpRequired: false,
      metadata: {
        originalCommunicationId: original.id,
      },
    });

    return this.communicationsRepository.save(followUp);
  }
}
