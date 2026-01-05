import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  WaitlistEntry,
  WaitlistStatus,
} from './entities/waitlist-entry.entity';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { addDays, isBefore } from 'date-fns';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
    private appointmentsService: AppointmentsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateWaitlistEntryDto): Promise<WaitlistEntry> {
    // Set expiration date if not provided (default: 30 days)
    const expiresAt = createDto.expiresAt || addDays(new Date(), 30);

    const entry = this.waitlistRepository.create({
      ...createDto,
      preferredDate: createDto.preferredDate
        ? new Date(createDto.preferredDate)
        : undefined,
      expiresAt,
      status: WaitlistStatus.PENDING,
      priority: createDto.priority || 0,
      flexible: createDto.flexible ?? true,
    });

    return this.waitlistRepository.save(entry);
  }

  async findAll(
    salonId?: string,
    status?: WaitlistStatus,
  ): Promise<WaitlistEntry[]> {
    const where: any = {};
    if (salonId) where.salonId = salonId;
    if (status) where.status = status;

    return this.waitlistRepository.find({
      where,
      relations: ['customer', 'salon', 'service', 'appointment'],
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WaitlistEntry> {
    const entry = await this.waitlistRepository.findOne({
      where: { id },
      relations: ['customer', 'salon', 'service', 'appointment'],
    });

    if (!entry) {
      throw new NotFoundException(`Waitlist entry with ID ${id} not found`);
    }

    return entry;
  }

  async update(
    id: string,
    updateDto: UpdateWaitlistEntryDto,
  ): Promise<WaitlistEntry> {
    const entry = await this.findOne(id);

    if (updateDto.preferredDate) {
      updateDto.preferredDate = new Date(updateDto.preferredDate) as any;
    }

    Object.assign(entry, updateDto);
    return this.waitlistRepository.save(entry);
  }

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.waitlistRepository.remove(entry);
  }

  async convertToAppointment(
    waitlistId: string,
    appointmentData: {
      scheduledStart: Date;
      scheduledEnd: Date;
      salonEmployeeId?: string;
      notes?: string;
    },
  ): Promise<{ waitlistEntry: WaitlistEntry; appointment: any }> {
    const waitlistEntry = await this.findOne(waitlistId);

    if (waitlistEntry.status === WaitlistStatus.BOOKED) {
      throw new BadRequestException(
        'This waitlist entry has already been converted to an appointment',
      );
    }

    // Create appointment
    const appointment = await this.appointmentsService.create({
      customerId: waitlistEntry.customerId,
      salonId: waitlistEntry.salonId,
      serviceId: waitlistEntry.serviceId,
      scheduledStart: appointmentData.scheduledStart.toISOString(),
      scheduledEnd: appointmentData.scheduledEnd.toISOString(),
      salonEmployeeId: appointmentData.salonEmployeeId,
      notes: appointmentData.notes || waitlistEntry.notes,
      status: 'booked',
    });

    // Update waitlist entry
    waitlistEntry.status = WaitlistStatus.BOOKED;
    waitlistEntry.appointmentId = appointment.id;
    await this.waitlistRepository.save(waitlistEntry);

    // Send notification to customer
    if (waitlistEntry.customer) {
      await this.notificationsService.sendNotification(
        undefined,
        waitlistEntry.customerId,
        appointment.id,
        NotificationChannel.EMAIL,
        NotificationType.APPOINTMENT_CONFIRMED,
        `Appointment Available - ${waitlistEntry.salon.name}`,
        `Great news! We have an appointment available for you. Your appointment is scheduled for ${appointmentData.scheduledStart.toLocaleString()}.`,
      );
    }

    return { waitlistEntry, appointment };
  }

  async contactCustomer(
    waitlistId: string,
    notes?: string,
  ): Promise<WaitlistEntry> {
    const entry = await this.findOne(waitlistId);

    entry.status = WaitlistStatus.CONTACTED;
    entry.contactedAt = new Date();
    if (notes) {
      entry.notes = entry.notes ? `${entry.notes}\n\n${notes}` : notes;
    }

    // Send notification
    if (entry.customer) {
      await this.notificationsService.sendNotification(
        undefined,
        entry.customerId,
        undefined,
        NotificationChannel.EMAIL,
        NotificationType.APPOINTMENT_CONFIRMED,
        `Appointment Opportunity - ${entry.salon.name}`,
        `We have an appointment opportunity for you. Please contact us to confirm your availability.`,
      );
    }

    return this.waitlistRepository.save(entry);
  }

  async getNextAvailable(
    salonId: string,
    serviceId?: string,
  ): Promise<WaitlistEntry | null> {
    const where: any = {
      salonId,
      status: WaitlistStatus.PENDING,
    };

    if (serviceId) {
      where.serviceId = serviceId;
    }

    // Get entries that haven't expired
    const entries = await this.waitlistRepository.find({
      where,
      relations: ['customer', 'service'],
      order: { priority: 'DESC', createdAt: 'ASC' },
    });

    // Filter out expired entries
    const validEntries = entries.filter((entry) => {
      if (!entry.expiresAt) return true;
      return !isBefore(new Date(entry.expiresAt), new Date());
    });

    return validEntries.length > 0 ? validEntries[0] : null;
  }

  async expireOldEntries(): Promise<number> {
    const now = new Date();
    const expiredEntries = await this.waitlistRepository.find({
      where: {
        status: WaitlistStatus.PENDING,
        expiresAt: LessThanOrEqual(now),
      },
    });

    for (const entry of expiredEntries) {
      entry.status = WaitlistStatus.EXPIRED;
      await this.waitlistRepository.save(entry);
    }

    return expiredEntries.length;
  }
}
