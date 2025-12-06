import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { SalonCustomerService } from '../customers/salon-customer.service';
import { ServicesService } from '../services/services.service';
import { CommissionsService } from '../commissions/commissions.service';

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

    return result;
  }

  async findAll(salonId?: string): Promise<Appointment[]> {
    if (salonId) {
      return this.appointmentsRepository.find({
        where: { salonId },
        relations: ['customer', 'service', 'salon', 'salonEmployee', 'salonEmployee.user'],
      });
    }
    return this.appointmentsRepository.find({
      relations: ['customer', 'service', 'salon', 'salonEmployee', 'salonEmployee.user'],
    });
  }

  async findBySalonIds(salonIds: string[]): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: salonIds.map((id) => ({ salonId: id })),
      relations: ['customer', 'service', 'salon', 'salonEmployee', 'salonEmployee.user'],
    });
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { customerId },
      relations: ['customer', 'service', 'salon', 'createdBy', 'salonEmployee', 'salonEmployee.user'],
      order: { scheduledStart: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Appointment> {
    return this.appointmentsRepository.findOne({
      where: { id },
      relations: ['customer', 'service', 'salon', 'createdBy', 'salonEmployee', 'salonEmployee.user'],
    });
  }

  async update(id: string, updateData: any): Promise<Appointment> {
    const existingAppointment = await this.findOne(id);
    const updatePayload: any = { ...updateData };
    if (updateData.scheduledStart) {
      updatePayload.scheduledStart = new Date(updateData.scheduledStart);
    }
    if (updateData.scheduledEnd) {
      updatePayload.scheduledEnd = new Date(updateData.scheduledEnd);
    }
    await this.appointmentsRepository.update(id, updatePayload);
    // Reload appointment with all relations including metadata
    const updatedAppointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['customer', 'service', 'salon', 'createdBy', 'salonEmployee', 'salonEmployee.user'],
    });

    // Record visit and create commission when appointment status changes to completed
    if (
      existingAppointment.status !== 'completed' &&
      updateData.status === 'completed' &&
      updatedAppointment.customerId &&
      updatedAppointment.salonId
    ) {
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
            } else {
              this.logger.warn(
                `Service ${updatedAppointment.serviceId} not found or has no basePrice for appointment ${updatedAppointment.id}`,
              );
            }
          } catch (serviceError) {
            this.logger.error(
              `Could not fetch service price for appointment ${updatedAppointment.id}: ${serviceError.message}`,
              serviceError.stack,
            );
          }
        } else {
          this.logger.debug(
            `Appointment ${updatedAppointment.id} has no serviceId, skipping service price`,
          );
        }

        // Update appointment with service amount if available
        if (serviceAmount > 0 && !updatedAppointment.serviceAmount) {
          await this.appointmentsRepository.update(id, { serviceAmount });
        }

        // Get employee ID from multiple sources
        let employeeId = updatedAppointment.salonEmployeeId || updateData.salonEmployeeId;
        
        // If no direct employee ID, check metadata for preferredEmployeeId
        if (!employeeId && updatedAppointment.metadata) {
          try {
            // Handle metadata as string (JSON) or object
            // TypeORM's simple-json should already parse it, but handle both cases
            let metadata = updatedAppointment.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (parseError) {
                this.logger.warn(
                  `Failed to parse metadata string for appointment ${updatedAppointment.id}: ${parseError.message}`,
                );
                metadata = {};
              }
            }
            
            // Check for preferredEmployeeId in metadata
            employeeId = metadata?.preferredEmployeeId;
            
            this.logger.debug(
              `Checking metadata for appointment ${updatedAppointment.id}: metadata=${JSON.stringify(metadata)}, preferredEmployeeId=${employeeId}`,
            );
            
            // If we found preferredEmployeeId in metadata, update the salonEmployeeId field
            // This ensures proper linking for future queries
            if (employeeId && !updatedAppointment.salonEmployeeId) {
              await this.appointmentsRepository.update(id, { salonEmployeeId: employeeId });
              // Reload to get updated appointment
              const reloadedAppointment = await this.findOne(id);
              if (reloadedAppointment) {
                updatedAppointment.salonEmployeeId = employeeId;
                updatedAppointment.salonEmployee = reloadedAppointment.salonEmployee;
              }
              this.logger.log(
                `✅ Updated appointment ${updatedAppointment.id} with salonEmployeeId from metadata: ${employeeId}`,
              );
            }
          } catch (metadataError) {
            this.logger.error(
              `Failed to process metadata for appointment ${updatedAppointment.id}: ${metadataError.message}`,
              metadataError.stack,
            );
          }
        }
        
        // Log current state for debugging
        this.logger.debug(
          `Appointment ${updatedAppointment.id} commission check: employeeId=${employeeId}, serviceAmount=${serviceAmount}, serviceId=${updatedAppointment.serviceId}`,
        );

        // Create commission immediately if employee is assigned
        if (employeeId && serviceAmount > 0) {
          try {
            this.logger.debug(
              `Creating commission for appointment ${updatedAppointment.id}: employeeId=${employeeId}, serviceAmount=${serviceAmount}`,
            );
            
            const commission = await this.commissionsService.createCommission(
              employeeId,
              null, // No sale item ID for appointment-based commissions
              serviceAmount,
              {
                appointmentId: updatedAppointment.id,
                source: 'appointment',
                serviceId: updatedAppointment.serviceId,
              },
            );
            
            if (commission.amount > 0) {
              this.logger.log(
                `✅ Created commission for employee ${employeeId} from completed appointment ${updatedAppointment.id} - Service Amount: RWF ${serviceAmount}, Commission: RWF ${commission.amount} (${commission.commissionRate}%)`,
              );
            } else {
              this.logger.warn(
                `⚠️ Commission created but amount is 0 for appointment ${updatedAppointment.id} - Employee ${employeeId} has ${commission.commissionRate}% commission rate`,
              );
            }
          } catch (commissionError) {
            // Log but don't fail appointment update if commission creation fails
            this.logger.error(
              `❌ Failed to create commission for appointment ${updatedAppointment.id}, employeeId=${employeeId}, serviceAmount=${serviceAmount}: ${commissionError.message}`,
              commissionError.stack,
            );
          }
        } else {
          // Detailed logging for why commission wasn't created
          const reasons: string[] = [];
          if (!employeeId) {
            reasons.push('no employee assigned (checked salonEmployeeId and metadata.preferredEmployeeId)');
          }
          if (serviceAmount === 0) {
            reasons.push(`no service amount (serviceId: ${updatedAppointment.serviceId}, service: ${updatedAppointment.service?.name || 'N/A'})`);
          }
          
          this.logger.warn(
            `⚠️ Skipping commission creation for appointment ${updatedAppointment.id}: ${reasons.join(', ')}`,
          );
        }

        await this.salonCustomerService.recordAppointmentVisit(
          updatedAppointment.salonId,
          updatedAppointment.customerId,
          visitDate,
          serviceAmount,
        );
        this.logger.log(
          `✅ Recorded appointment visit for customer ${updatedAppointment.customerId} at salon ${updatedAppointment.salonId} - Visit count incremented, Amount added: RWF ${serviceAmount}`,
        );
      } catch (error) {
        // Log but don't fail appointment update if visit tracking fails
        this.logger.warn(
          `Failed to record appointment visit: ${error.message}`,
          error.stack,
        );
      }
    }

    return updatedAppointment;
  }

  async remove(id: string): Promise<void> {
    await this.appointmentsRepository.delete(id);
  }

  async findByPreferredEmployee(
    salonEmployeeId: string,
  ): Promise<Appointment[]> {
    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.salon', 'salon')
      .leftJoinAndSelect('appointment.createdBy', 'createdBy')
      .where(
        `${this.getMetadataFieldAccessor('preferredEmployeeId')} = :salonEmployeeId`,
        {
          salonEmployeeId,
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
}
