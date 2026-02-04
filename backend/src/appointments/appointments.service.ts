import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { SalonCustomerService } from '../customers/salon-customer.service';
import { ServicesService } from '../services/services.service';
import { CommissionsService } from '../commissions/commissions.service';
import { LoyaltyPointsService } from '../customers/loyalty-points.service';
import { LoyaltyPointSourceType } from '../customers/entities/loyalty-point-transaction.entity';
import { RewardsConfigService } from '../customers/rewards-config.service';
import { NotificationOrchestratorService } from '../notifications/services/notification-orchestrator.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { SalesService } from '../sales/sales.service';
import { PaymentMethod } from '../sales/entities/sale.entity';
import { format } from 'date-fns';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @Inject(forwardRef(() => SalonCustomerService))
    private salonCustomerService: SalonCustomerService,
    private servicesService: ServicesService,
    private commissionsService: CommissionsService,
    @Inject(forwardRef(() => LoyaltyPointsService))
    private loyaltyPointsService: LoyaltyPointsService,
    @Inject(forwardRef(() => RewardsConfigService))
    private rewardsConfigService: RewardsConfigService,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
    @Inject(forwardRef(() => SalesService))
    private salesService: SalesService,
  ) {}

  /**
   * Check if we're using PostgreSQL database
   */
  private get isPostgres(): boolean {
    const driver = this.appointmentsRepository.manager.connection.driver;
    return driver.options.type === 'postgres';
  }

  /**
   * Get the metadata JSON field accessor based on database type
   * For PostgreSQL: Cast to JSONB before using ->>
   * For SQLite: Use JSON functions
   */
  private getMetadataFieldAccessor(field: string): string {
    if (this.isPostgres) {
      return `(appointment.metadata::jsonb)->>'${field}'`;
    } else {
      // SQLite: Use json_extract function
      return `json_extract(appointment.metadata, '$.${field}')`;
    }
  }

  async create(appointmentData: any): Promise<Appointment> {
    const appointment = this.appointmentsRepository.create({
      ...appointmentData,
      scheduledStart: appointmentData.scheduledStart
        ? new Date(appointmentData.scheduledStart)
        : new Date(),
      scheduledEnd: appointmentData.scheduledEnd
        ? new Date(appointmentData.scheduledEnd)
        : new Date(),
    });

    // Handle preferred employee from metadata
    if (
      !(appointment as any).salonEmployeeId &&
      appointmentData.metadata?.preferredEmployeeId
    ) {
      (appointment as any).salonEmployeeId =
        appointmentData.metadata.preferredEmployeeId;
    }

    // Set serviceAmount from service basePrice if not already provided
    if (!appointmentData.serviceAmount && appointmentData.serviceId) {
      try {
        const service = await this.servicesService.findOne(
          appointmentData.serviceId,
        );
        if (service && service.basePrice) {
          (appointment as any).serviceAmount = Number(service.basePrice) || 0;
          this.logger.log(
            `Set serviceAmount ${service.basePrice} from service ${service.name} for new appointment`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch service price during appointment creation: ${error.message}`,
        );
      }
    }

    const saved = await this.appointmentsRepository.save(appointment);
    const result = Array.isArray(saved) ? saved[0] : saved;

    // Ensure salon-customer relationship exists (even if visit not recorded yet)
    if (result.customerId && result.salonId) {
      try {
        await this.salonCustomerService.getOrCreate(
          result.salonId,
          result.customerId,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to create salon-customer relationship: ${error.message}`,
        );
      }
    }

    // Send notifications asynchronously
    if (result.customerId) {
      this.sendBookingNotifications(result.id, result.customerId).catch((err) =>
        this.logger.error(
          `Failed to trigger async notifications: ${err.message}`,
          err.stack,
        ),
      );
    }

    return result;
  }

  private async sendBookingNotifications(
    appointmentId: string,
    customerId: string,
  ) {
    try {
      this.logger.log(
        `📧 Starting notification process for appointment ${appointmentId}`,
      );

      const appointment = await this.findOne(appointmentId);

      // Debug log the appointment details
      this.logger.log(
        `📋 Appointment loaded - ID: ${appointment?.id}, Salon: ${appointment?.salon?.name}, SalonID: ${appointment?.salon?.id}, OwnerID: ${appointment?.salon?.ownerId}`,
      );

      if (!appointment) {
        this.logger.error(
          `❌ Failed to load appointment ${appointmentId} for notification`,
        );
        return;
      }

      // Notify customer
      this.logger.log(`📬 Sending notification to customer ${customerId}`);
      await this.notificationOrchestrator.notify(
        NotificationType.APPOINTMENT_BOOKED,
        {
          customerId: customerId,
          appointmentId: appointment.id,
          recipientEmail: appointment.customer?.email,
          customerName: appointment.customer?.fullName,
          salonName: appointment.salon?.name,
          serviceName: appointment.service?.name,
          appointmentDate: format(new Date(appointment.scheduledStart), 'PPP'),
          appointmentTime: format(new Date(appointment.scheduledStart), 'p'),
          employeeName: appointment.salonEmployee?.user?.fullName,
        },
      );
      this.logger.log(`✅ Customer notification sent successfully`);

      // Notify salon owner
      if (appointment.salon?.ownerId) {
        this.logger.log(
          `📬 Sending appointment booked notification to salon owner ${appointment.salon.ownerId} for salon "${appointment.salon.name}"`,
        );

        try {
          await this.notificationOrchestrator.notify(
            NotificationType.APPOINTMENT_BOOKED,
            {
              userId: appointment.salon.ownerId,
              recipientEmail: appointment.salon?.owner?.email,
              appointmentId: appointment.id,
              customerName: appointment.customer?.fullName,
              salonName: appointment.salon?.name,
              serviceName: appointment.service?.name,
              appointmentDate: format(
                new Date(appointment.scheduledStart),
                'PPP',
              ),
              appointmentTime: format(
                new Date(appointment.scheduledStart),
                'p',
              ),
              employeeName: appointment.salonEmployee?.user?.fullName,
            },
          );
          this.logger.log(`✅ Salon owner notification sent successfully`);
        } catch (ownerError) {
          this.logger.error(
            `❌ Failed to send notification to salon owner: ${ownerError.message}`,
            ownerError.stack,
          );
        }
      } else {
        this.logger.warn(
          `⚠️ No salon owner ID found - Salon: ${appointment.salon?.name || 'N/A'}, SalonID: ${appointment.salonId}`,
        );
      }

      // Notify assigned employee
      if (appointment.salonEmployee?.userId) {
        this.logger.log(
          `📬 Sending appointment booked notification to employee ${appointment.salonEmployee.userId}`,
        );

        try {
          await this.notificationOrchestrator.notify(
            NotificationType.APPOINTMENT_BOOKED,
            {
              userId: appointment.salonEmployee.userId,
              appointmentId: appointment.id,
              isEmployee: true,
              recipientEmail: appointment.salonEmployee?.user?.email,
              customerName: appointment.customer?.fullName,
              salonName: appointment.salon?.name,
              serviceName: appointment.service?.name,
              appointmentDate: format(
                new Date(appointment.scheduledStart),
                'PPP',
              ),
              appointmentTime: format(
                new Date(appointment.scheduledStart),
                'p',
              ),
              employeeName: appointment.salonEmployee?.user?.fullName,
            },
          );
          this.logger.log(`✅ Employee notification sent successfully`);
        } catch (empError) {
          this.logger.error(
            `❌ Failed to send notification to employee: ${empError.message}`,
            empError.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to send appointment booked notification: ${error.message}`,
        error.stack,
      );
    }
  }

  async findAll(salonId?: string): Promise<Appointment[]> {
    if (salonId) {
      return this.appointmentsRepository.find({
        where: { salonId },
        relations: [
          'customer',
          'service',
          'salon',
          'salonEmployee',
          'salonEmployee.user',
        ],
      });
    }
    return this.appointmentsRepository.find({
      relations: [
        'customer',
        'service',
        'salon',
        'salonEmployee',
        'salonEmployee.user',
      ],
    });
  }

  async findBySalonIds(salonIds: string[]): Promise<Appointment[]> {
    // If no salon IDs provided, return empty array
    if (!salonIds || salonIds.length === 0) {
      this.logger.warn('findBySalonIds called with empty salonIds array');
      return [];
    }

    this.logger.log(
      `Finding appointments for ${salonIds.length} salon(s): ${salonIds.join(', ')}`,
    );

    const appointments = await this.appointmentsRepository.find({
      where: salonIds.map((id) => ({ salonId: id })),
      relations: [
        'customer',
        'customer.user',
        'service',
        'salon',
        'salon.owner',
        'salonEmployee',
        'salonEmployee.user',
      ],
      order: { scheduledStart: 'DESC' },
    });

    this.logger.log(
      `Found ${appointments.length} appointment(s) for salon(s): ${salonIds.join(', ')}`,
    );

    return appointments;
  }

  async findByEmployeeUserId(userId: string): Promise<Appointment[]> {
    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoin('appointment.salonEmployee', 'salonEmployee')
      .where('salonEmployee.user_id = :userId', { userId })
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.salon', 'salon')
      .orderBy('appointment.scheduledStart', 'DESC')
      .getMany();
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { customerId },
      relations: [
        'customer',
        'service',
        'salon',
        'createdBy',
        'salonEmployee',
        'salonEmployee.user',
      ],
      order: { scheduledStart: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Appointment> {
    return this.appointmentsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'service',
        'salon',
        'salon.owner',
        'createdBy',
        'salonEmployee',
        'salonEmployee.user',
      ],
    });
  }

  async update(id: string, updateData: any): Promise<Appointment> {
    const existingAppointment = await this.findOne(id);

    // Extract special flags that shouldn't be saved to DB
    const { skipSaleCreation, ...payload } = updateData;

    const updatePayload: any = { ...payload };
    if (payload.scheduledStart) {
      updatePayload.scheduledStart = new Date(payload.scheduledStart);
    }
    if (payload.scheduledEnd) {
      updatePayload.scheduledEnd = new Date(payload.scheduledEnd);
    }
    await this.appointmentsRepository.update(id, updatePayload);
    // Reload appointment with all relations including metadata
    const updatedAppointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'service',
        'salon',
        'createdBy',
        'salonEmployee',
        'salonEmployee.user',
      ],
    });

    // Handle status change side effects asynchronously
    // This includes notifications, sale creation, visit recording, and loyalty points
    this.processStatusChangeSideEffects(
      existingAppointment,
      updatedAppointment,
      updateData,
    ).catch((error) => {
      this.logger.error(
        `❌ Error processing appointment status change side effects: ${error.message}`,
        error.stack,
      );
    });

    return updatedAppointment;
  }

  /**
   * Process side effects of an appointment update asynchronously
   * This prevents slow operations (notifications, sale creation) from blocking the API response
   */
  private async processStatusChangeSideEffects(
    existingAppointment: Appointment,
    updatedAppointment: Appointment,
    updateData: any,
  ): Promise<void> {
    const { status } = updateData;
    const { skipSaleCreation } = updateData;

    // 1. Handle status change notifications
    if (existingAppointment.status !== status && status) {
      try {
        await this.handleAppointmentStatusChange(
          existingAppointment,
          updatedAppointment,
          status,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to handle appointment status change notification: ${error.message}`,
        );
      }
    }

    // 2. Handle completion logic (Sale, Visit, Commission, Loyalty Points)
    if (
      !skipSaleCreation &&
      existingAppointment.status !== 'completed' &&
      status === 'completed' &&
      updatedAppointment.customerId &&
      updatedAppointment.salonId
    ) {
      const id = updatedAppointment.id;
      try {
        // Use scheduled_start as visit date, or current time if not available
        const visitDate = updatedAppointment.scheduledStart || new Date();

        // Get service price if appointment has a service
        let serviceAmount = 0;
        if (updatedAppointment.serviceId) {
          try {
            // Try to use the already loaded service relation first
            let service = updatedAppointment.service;

            // If service relation is not loaded, fetch it
            if (!service) {
              service = await this.servicesService.findOne(
                updatedAppointment.serviceId,
              );
            }

            if (service && service.basePrice) {
              serviceAmount = Number(service.basePrice) || 0;
              this.logger.debug(
                `Found service price ${serviceAmount} for appointment ${updatedAppointment.id}, service: ${service.name}`,
              );
            }
          } catch (serviceError) {
            this.logger.error(
              `Could not fetch service price for appointment ${updatedAppointment.id}: ${serviceError.message}`,
            );
          }
        }

        // Update appointment with service amount if available
        if (serviceAmount > 0 && !updatedAppointment.serviceAmount) {
          await this.appointmentsRepository.update(id, { serviceAmount });
        }

        // Get employee ID
        let employeeId =
          updatedAppointment.salonEmployeeId || updateData.salonEmployeeId;

        // Check metadata for preferredEmployeeId if not found
        if (!employeeId && updatedAppointment.metadata) {
          try {
            let metadata = updatedAppointment.metadata;
            if (typeof metadata === 'string') {
              metadata = JSON.parse(metadata);
            }
            employeeId = metadata?.preferredEmployeeId;

            if (employeeId && !updatedAppointment.salonEmployeeId) {
              await this.appointmentsRepository.update(id, {
                salonEmployeeId: employeeId,
              });
              // Update local object for consistency
              updatedAppointment.salonEmployeeId = employeeId;
            }
          } catch (e) {
            this.logger.warn(
              `Failed to process metadata for employee lookup: ${e.message}`,
            );
          }
        }

        // Create Sale Record
        if (serviceAmount > 0) {
          try {
            this.logger.log(
              `📦 Creating sale record for completed appointment ${updatedAppointment.id}`,
            );

            const saleData = {
              salonId: updatedAppointment.salonId,
              customerId: updatedAppointment.customerId,
              totalAmount: serviceAmount,
              paymentMethod: PaymentMethod.CASH,
              status: 'completed',
              metadata: {
                appointmentId: updatedAppointment.id,
                source: 'appointment_completion',
                notes: `Sale from completed appointment ${updatedAppointment.id.slice(0, 8)}`,
              },
            };

            const saleItems = [
              {
                serviceId: updatedAppointment.serviceId,
                salonEmployeeId: employeeId || null,
                unitPrice: serviceAmount,
                quantity: 1,
                discountAmount: 0,
                lineTotal: serviceAmount,
              },
            ];

            const sale = await this.salesService.create(saleData, saleItems);
            this.logger.log(
              `✅ Created sale ${sale.id} for appointment ${updatedAppointment.id}`,
            );
          } catch (saleError) {
            this.logger.error(
              `❌ Failed to create sale for appointment ${updatedAppointment.id}: ${saleError.message}`,
            );

            // Fallback commission
            if (employeeId) {
              try {
                await this.commissionsService.createCommission(
                  employeeId,
                  null,
                  serviceAmount,
                  {
                    appointmentId: updatedAppointment.id,
                    source: 'appointment_fallback',
                    serviceId: updatedAppointment.serviceId,
                  },
                );
              } catch (e) {
                this.logger.error(
                  `Fallback commission also failed: ${e.message}`,
                );
              }
            }
          }
        }

        // Record Visit
        await this.salonCustomerService.recordAppointmentVisit(
          updatedAppointment.salonId,
          updatedAppointment.customerId,
          visitDate,
          serviceAmount,
        );

        // Award Loyalty Points
        if (updatedAppointment.customerId && serviceAmount > 0) {
          try {
            const rewardsConfig = await this.rewardsConfigService.getOrCreate(
              updatedAppointment.salonId,
            );
            const pointsEarned =
              this.loyaltyPointsService.calculatePointsEarned(
                serviceAmount,
                Number(rewardsConfig.pointsPerCurrencyUnit),
              );
            if (pointsEarned > 0) {
              await this.loyaltyPointsService.addPoints(
                updatedAppointment.customerId,
                pointsEarned,
                {
                  sourceType: LoyaltyPointSourceType.APPOINTMENT,
                  sourceId: updatedAppointment.id,
                  description: `Points earned from appointment ${updatedAppointment.id.slice(0, 8)}`,
                },
              );
            }
          } catch (error) {
            this.logger.warn(
              `Failed to award loyalty points: ${error.message}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to record appointment visit side effects: ${error.message}`,
        );
      }
    }
  }

  private async handleAppointmentStatusChange(
    existingAppointment: Appointment,
    updatedAppointment: Appointment,
    newStatus: string,
  ): Promise<void> {
    const customerId = updatedAppointment.customerId;
    const salonId = updatedAppointment.salonId;
    const appointmentId = updatedAppointment.id;

    this.logger.log(
      `🔄 Handling appointment status change - ID: ${appointmentId}, Old: ${existingAppointment.status}, New: ${newStatus}, Customer: ${customerId}`,
    );

    if (!customerId) {
      this.logger.warn(
        `⚠️ No customer ID for appointment ${appointmentId} - skipping notifications`,
      );
      return;
    }

    const context = {
      customerId,
      appointmentId,
      recipientEmail: updatedAppointment.customer?.email,
      customerName: updatedAppointment.customer?.fullName,
      salonName: updatedAppointment.salon?.name,
      serviceName: updatedAppointment.service?.name,
      appointmentDate: format(
        new Date(updatedAppointment.scheduledStart),
        'PPP',
      ),
      appointmentTime: format(new Date(updatedAppointment.scheduledStart), 'p'),
      employeeName: updatedAppointment.salonEmployee?.user?.fullName,
    };

    this.logger.log(
      `📋 Context prepared - Customer: ${context.customerName}, Salon: ${context.salonName}, Service: ${context.serviceName}`,
    );

    // Notify salon owner
    if (salonId && updatedAppointment.salon?.ownerId) {
      this.logger.log(
        `📬 Sending status change notification to salon owner ${updatedAppointment.salon.ownerId}`,
      );
      try {
        await this.notificationOrchestrator.notify(
          this.getNotificationTypeForStatus(newStatus),
          {
            userId: updatedAppointment.salon.ownerId,
            ...context,
          },
        );
        this.logger.log(`✅ Salon owner notification sent successfully`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to send notification to salon owner: ${error.message}`,
          error.stack,
        );
      }
    } else {
      this.logger.warn(
        `⚠️ No salon owner to notify - SalonID: ${salonId}, OwnerID: ${updatedAppointment.salon?.ownerId || 'N/A'}`,
      );
    }

    // Notify employee
    if (
      updatedAppointment.salonEmployeeId &&
      updatedAppointment.salonEmployee?.userId
    ) {
      this.logger.log(
        `📬 Sending status change notification to employee ${updatedAppointment.salonEmployee.userId}`,
      );
      try {
        await this.notificationOrchestrator.notify(
          this.getNotificationTypeForStatus(newStatus),
          {
            userId: updatedAppointment.salonEmployee.userId,
            ...context,
          },
        );
        this.logger.log(`✅ Employee notification sent successfully`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to send notification to employee: ${error.message}`,
          error.stack,
        );
      }
    }

    // Notify customer
    this.logger.log(
      `📬 Sending status change notification to customer ${customerId}`,
    );
    try {
      await this.notificationOrchestrator.notify(
        this.getNotificationTypeForStatus(newStatus),
        context,
      );
      this.logger.log(`✅ Customer notification sent successfully`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send notification to customer: ${error.message}`,
        error.stack,
      );
    }
  }

  private getNotificationTypeForStatus(status: string): NotificationType {
    const statusMap: Record<string, NotificationType> = {
      booked: NotificationType.APPOINTMENT_BOOKED,
      confirmed: NotificationType.APPOINTMENT_CONFIRMED,
      cancelled: NotificationType.APPOINTMENT_CANCELLED,
      completed: NotificationType.APPOINTMENT_COMPLETED,
      no_show: NotificationType.APPOINTMENT_NO_SHOW,
    };

    return statusMap[status] || NotificationType.APPOINTMENT_BOOKED;
  }

  async remove(id: string): Promise<void> {
    await this.appointmentsRepository.delete(id);
  }

  async findByPreferredEmployee(
    salonEmployeeId: string,
  ): Promise<Appointment[]> {
    // For the metadata comparison, we need to cast UUID to text since JSONB ->> returns text
    const metadataAccessor = this.getMetadataFieldAccessor(
      'preferredEmployeeId',
    );

    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.salon', 'salon')
      .leftJoinAndSelect('appointment.createdBy', 'createdBy')
      .leftJoinAndSelect('appointment.salonEmployee', 'salonEmployee')
      .leftJoinAndSelect('salonEmployee.user', 'employeeUser')
      .where(
        // Check EITHER the direct salonEmployeeId column OR the metadata preferredEmployeeId
        // Cast UUID to text for metadata comparison since JSONB ->> returns text
        this.isPostgres
          ? `(appointment.salon_employee_id = :salonEmployeeId OR ${metadataAccessor} = :salonEmployeeIdText)`
          : `(appointment.salon_employee_id = :salonEmployeeId OR ${metadataAccessor} = :salonEmployeeIdText)`,
        {
          salonEmployeeId,
          salonEmployeeIdText: salonEmployeeId, // Text version for metadata comparison
        },
      )
      .orderBy('appointment.scheduledStart', 'DESC')
      .getMany();
  }

  /**
   * Check if an employee is available at a specific time
   * Returns true if available, false if booked
   */
  async checkEmployeeAvailability(
    salonEmployeeId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where(
        `${this.getMetadataFieldAccessor('preferredEmployeeId')} = :salonEmployeeId`,
        {
          salonEmployeeId,
        },
      )
      .andWhere('appointment.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('appointment.status != :noShow', { noShow: 'no_show' })
      .andWhere(
        // Check for time overlap: new appointment overlaps with existing if:
        // (newStart < existingEnd) AND (newEnd > existingStart)
        '(appointment.scheduledStart < :scheduledEnd AND appointment.scheduledEnd > :scheduledStart)',
        {
          scheduledStart,
          scheduledEnd,
        },
      );

    if (excludeAppointmentId) {
      query.andWhere('appointment.id != :excludeAppointmentId', {
        excludeAppointmentId,
      });
    }

    const conflictingAppointments = await query.getMany();
    return conflictingAppointments.length === 0;
  }

  /**
   * Get all appointments for an employee on a specific date
   */
  async getEmployeeAppointmentsForDate(
    salonEmployeeId: string,
    date: Date,
  ): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where(
        `${this.getMetadataFieldAccessor('preferredEmployeeId')} = :salonEmployeeId`,
        {
          salonEmployeeId,
        },
      )
      .andWhere('appointment.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('appointment.status != :noShow', { noShow: 'no_show' })
      .andWhere('appointment.scheduledStart >= :startOfDay', { startOfDay })
      .andWhere('appointment.scheduledStart <= :endOfDay', { endOfDay })
      .orderBy('appointment.scheduledStart', 'ASC')
      .getMany();
  }

  /**
   * Send appointment reminder notification to customer
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<void> {
    if (!appointment.customerId) {
      this.logger.warn(
        `Cannot send reminder for appointment ${appointment.id} - no customer`,
      );
      return;
    }

    this.logger.log(
      `Sending appointment reminder for ${appointment.id} to customer ${appointment.customerId}`,
    );

    try {
      await this.notificationOrchestrator.notify(
        NotificationType.APPOINTMENT_REMINDER,
        {
          customerId: appointment.customerId,
          appointmentId: appointment.id,
          recipientEmail: appointment.customer?.email,
          customerName: appointment.customer?.fullName,
          salonName: appointment.salon?.name,
          serviceName: appointment.service?.name,
          appointmentDate: format(new Date(appointment.scheduledStart), 'PPP'),
          appointmentTime: format(new Date(appointment.scheduledStart), 'p'),
          employeeName: appointment.salonEmployee?.user?.fullName,
        },
      );

      this.logger.log(
        `✅ Reminder sent successfully for appointment ${appointment.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send reminder for appointment ${appointment.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
