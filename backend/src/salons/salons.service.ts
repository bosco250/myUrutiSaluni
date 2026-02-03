import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonDocument } from './entities/salon-document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Salon } from './entities/salon.entity';
import { SalonEmployee } from './entities/salon-employee.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipStatus } from '../memberships/entities/membership.entity';
import { NotificationOrchestratorService } from '../notifications/services/notification-orchestrator.service';
import { NotificationType, NotificationChannel } from '../notifications/entities/notification.entity';

@Injectable()
export class SalonsService {
  constructor(
    @InjectRepository(Salon)
    private salonsRepository: Repository<Salon>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @InjectRepository(SalonDocument)
    private salonDocumentsRepository: Repository<SalonDocument>,
    @Inject(forwardRef(() => MembershipsService))
    private membershipsService: MembershipsService,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  // ... existing methods ...

  async createDocument(
    salonId: string,
    dto: CreateDocumentDto,
  ): Promise<SalonDocument> {
    const doc = this.salonDocumentsRepository.create({
      ...dto,
      salonId,
    });
    return this.salonDocumentsRepository.save(doc);
  }

  async getDocuments(salonId: string): Promise<SalonDocument[]> {
    return this.salonDocumentsRepository.find({
      where: { salonId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(salonData: Partial<Salon>): Promise<Salon> {
    const salon = this.salonsRepository.create(salonData);
    const savedSalon = await this.salonsRepository.save(salon);

    // Auto-create membership for the salon
    try {
      await this.membershipsService.createMembership({
        salonId: savedSalon.id,
        status: MembershipStatus.NEW,
        category: 'Standard',
        startDate: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail salon creation if membership creation fails
      // Error is silently handled to allow salon creation to proceed
    }

    return savedSalon;
  }

  async findAll(): Promise<Salon[]> {
    const salons = await this.salonsRepository.find({ relations: ['owner'] });
    // Add employee count to each salon
    for (const salon of salons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }
    return salons;
  }

  /** Public browse — only active salons */
  async findAllActive(): Promise<Salon[]> {
    const salons = await this.salonsRepository.find({
      where: { status: 'active' },
      relations: ['owner'],
    });
    for (const salon of salons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }
    return salons;
  }

  async findByOwnerId(ownerId: string): Promise<Salon[]> {
    const salons = await this.salonsRepository.find({
      where: { ownerId },
      relations: ['owner'],
    });
    // Add employee count to each salon
    for (const salon of salons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }
    return salons;
  }

  async findSalonsForUser(userId: string): Promise<Salon[]> {
    // Get salons owned by user
    const ownedSalons = await this.salonsRepository.find({
      where: { ownerId: userId },
      relations: ['owner'],
    });

    // Get salons where user is an employee
    const employeeRecords = await this.salonEmployeesRepository.find({
      where: { userId },
      relations: ['salon', 'salon.owner'],
    });

    const employmentSalons = employeeRecords
      .map((emp) => emp.salon)
      .filter((salon) => !!salon);

    // Merge and deduplicate
    const allSalonsMap = new Map<string, Salon>();
    ownedSalons.forEach((s) => allSalonsMap.set(s.id, s));
    employmentSalons.forEach((s) => allSalonsMap.set(s.id, s));

    const allSalons = Array.from(allSalonsMap.values());

    // Add employee count to each salon
    for (const salon of allSalons) {
      const employeeCount = await this.salonEmployeesRepository.count({
        where: { salonId: salon.id },
      });
      (salon as any).employeeCount = employeeCount;
    }

    return allSalons;
  }

  async findOne(id: string): Promise<Salon> {
    const salon = await this.salonsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${id} not found`);
    }
    // Add employee count
    const employeeCount = await this.salonEmployeesRepository.count({
      where: { salonId: salon.id },
    });
    (salon as any).employeeCount = employeeCount;
    return salon;
  }

  async update(id: string, updateData: Partial<Salon>): Promise<Salon> {
    await this.salonsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.salonsRepository.delete(id);
  }

  // Employee management
  async addEmployee(
    employeeData: Partial<SalonEmployee>,
  ): Promise<SalonEmployee> {
    // Check if employee already exists for this salon
    const existing = await this.salonEmployeesRepository.findOne({
      where: {
        salonId: employeeData.salonId,
        userId: employeeData.userId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This user is already an employee of this salon',
      );
    }

    const employee = this.salonEmployeesRepository.create(employeeData);
    const savedEmployee = await this.salonEmployeesRepository.save(employee);

    // Send notification to the new employee
    try {
      // Fetch salon details for the notification
      const salon = await this.salonsRepository.findOne({
        where: { id: savedEmployee.salonId },
      });

      await this.notificationOrchestrator.notify(
        NotificationType.EMPLOYEE_ASSIGNED,
        {
          userId: savedEmployee.userId,
          salonName: salon?.name,
          employeeName: savedEmployee.user?.fullName, // Note: user might not be loaded here, might need to fetch if critical
        },
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to send employee assignment notification:', error);
    }

    return savedEmployee;
  }

  async getSalonEmployees(salonId: string): Promise<SalonEmployee[]> {
    return this.salonEmployeesRepository.find({
      where: { salonId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async isUserEmployeeOfSalon(
    userId: string,
    salonId: string,
  ): Promise<boolean> {
    const employee = await this.salonEmployeesRepository.findOne({
      where: {
        salonId,
        userId,
      },
    });
    return !!employee;
  }

  async updateEmployee(
    employeeId: string,
    updateData: Partial<SalonEmployee>,
  ): Promise<SalonEmployee> {
    await this.salonEmployeesRepository.update(employeeId, updateData);
    const employee = await this.salonEmployeesRepository.findOne({
      where: { id: employeeId },
      relations: ['user'],
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }
    return employee;
  }

  async removeEmployee(employeeId: string): Promise<void> {
    const result = await this.salonEmployeesRepository.delete(employeeId);
    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }
  }

  async findEmployeeById(employeeId: string): Promise<SalonEmployee | null> {
    return this.salonEmployeesRepository.findOne({
      where: { id: employeeId },
      relations: ['user', 'salon'],
    });
  }

  async findEmployeeByUserId(
    userId: string,
    salonId?: string,
  ): Promise<SalonEmployee | null> {
    const where: any = { userId };
    if (salonId) {
      where.salonId = salonId;
    }
    return this.salonEmployeesRepository.findOne({
      where,
      relations: ['user', 'salon'],
    });
  }

  async findAllEmployeesByUserId(userId: string): Promise<SalonEmployee[]> {
    return this.salonEmployeesRepository.find({
      where: { userId },
      relations: ['user', 'salon'],
    });
  }

  async search(query: string): Promise<Salon[]> {
    const isPostgres = this.salonsRepository.manager.connection.driver.options.type === 'postgres';
    const operator = isPostgres ? 'ILIKE' : 'LIKE';

    return this.salonsRepository
      .createQueryBuilder('salon')
      .leftJoinAndSelect('salon.owner', 'owner')
      .where(`salon.name ${operator} :query`, { query: `%${query}%` })
      .orWhere(`salon.address ${operator} :query`, { query: `%${query}%` })
      .orWhere(`salon.city ${operator} :query`, { query: `%${query}%` })
      .getMany();
  }

  /**
   * Find salons in a specific district (for district leaders)
   */
  async findByDistrict(district: string): Promise<Salon[]> {
    return this.salonsRepository.find({
      where: { district },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get salons for verification (optionally filtered by status), paginated
   */
  async getSalonsForVerification(
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Salon[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const whereClause = status ? { status } : {};
    const [data, total] = await this.salonsRepository.findAndCount({
      where: whereClause,
      relations: ['owner', 'documents'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Review a document (approve/reject)
   */
  async reviewDocument(
    documentId: string,
    status: string,
    notes?: string,
    reviewedBy?: string,
  ): Promise<SalonDocument> {
    const document = await this.salonDocumentsRepository.findOne({
      where: { id: documentId },
      relations: ['salon'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.status = status as any;
    if (notes) {
      document.notes = notes;
    }
    if (reviewedBy) {
      document.reviewedBy = reviewedBy;
      document.reviewedAt = new Date();
    }

    return this.salonDocumentsRepository.save(document);
  }

  /**
   * Verify a salon (change status to active and activate membership)
   */
  async verifySalon(
    salonId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<Salon> {
    const salon = await this.salonsRepository.findOne({
      where: { id: salonId },
      relations: ['documents'],
    });
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    if (approved) {
      // Guard: all documents must be approved before the salon can be verified
      const docs = salon.documents || [];
      if (docs.length === 0) {
        throw new BadRequestException('Salon has no documents to verify');
      }
      const allApproved = docs.every(
        (d) => d.status === 'approved',
      );
      if (!allApproved) {
        throw new BadRequestException(
          'All documents must be approved before the salon can be verified',
        );
      }

      salon.status = 'active';
      const savedSalon = await this.salonsRepository.save(salon);

      // Activate the membership — failure here rolls back salon activation
      const membership =
        await this.membershipsService.findBySalonId(salonId);
      if (membership && membership.status !== 'active') {
        await this.membershipsService.activateMembership(membership.id);
      }

      // Notification is best-effort; salon is already active
      try {
        await this.notificationOrchestrator.notify(
          NotificationType.SALON_UPDATE,
          {
            userId: salon.ownerId,
            salonId: salon.id,
            salonName: salon.name,
            name: 'Salon Verified',
          },
        );
      } catch (error) {
        console.log('Could not send notification:', error.message);
      }

      return savedSalon;
    } else {
      // Rejected — set to rejected status, store reason in dedicated settings key
      salon.status = 'rejected';
      salon.settings = {
        ...salon.settings,
        verificationRejectionReason: rejectionReason || null,
        verificationRejectedAt: new Date().toISOString(),
      };
      const savedSalon = await this.salonsRepository.save(salon);

      // Send rejection notification
      try {
        await this.notificationOrchestrator.notify(
          NotificationType.SALON_UPDATE,
          {
            userId: salon.ownerId,
            salonId: salon.id,
            salonName: salon.name,
            name: 'Verification Update Required',
          },
        );
      } catch (error) {
        console.log('Could not send notification:', error.message);
      }

      return savedSalon;
    }
  }

  /**
   * Update salon status directly (admin action)
   */
  async updateSalonStatus(
    salonId: string,
    status: string,
    reason?: string,
  ): Promise<Salon> {
    const salon = await this.salonsRepository.findOne({
      where: { id: salonId },
    });
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    salon.status = status;
    if (reason) {
      salon.settings = {
        ...salon.settings,
        statusChangeReason: reason,
        statusChangedAt: new Date().toISOString(),
      };
    }

    const savedSalon = await this.salonsRepository.save(salon);

    // Notify the salon owner — always IN_APP + EMAIL so the owner knows what changed
    try {
      const statusLabels: Record<string, string> = {
        active: 'Active',
        pending: 'Pending',
        verification_pending: 'Verification Pending',
        rejected: 'Rejected',
        inactive: 'Inactive',
      };

      const statusExplanations: Record<string, { meaning: string; action: string }> = {
        active: {
          meaning: 'Your salon is now live and visible to customers on the platform. Customers can discover your salon and book appointments.',
          action: 'No action is needed. Your salon is ready to accept bookings.',
        },
        pending: {
          meaning: 'Your salon is in the initial registration stage and is not yet visible to customers.',
          action: 'Submit all required documents — business license, owner ID, and proof of address — to begin the verification process.',
        },
        verification_pending: {
          meaning: 'Your documents have been submitted and are currently under review by our team.',
          action: 'No action is needed at this time. You will be notified once the review is complete.',
        },
        rejected: {
          meaning: 'Your salon verification has been rejected. Your salon is not visible to customers until this is resolved.',
          action: 'Review the reason provided, correct any issues with your documents, and resubmit them through your salon dashboard.',
        },
        inactive: {
          meaning: 'Your salon has been deactivated and is not visible to customers at this time.',
          action: 'Contact your association administrator to discuss reactivation and the steps needed to restore your salon.',
        },
      };

      await this.notificationOrchestrator.notify(
        NotificationType.SALON_UPDATE,
        {
          userId: salon.ownerId,
          salonId: salon.id,
          salonName: salon.name,
          name: `Salon Status Changed to ${statusLabels[status] || status}`,
          status: statusLabels[status] || status,
          message: reason || undefined,
          meaning: statusExplanations[status]?.meaning || '',
          action: statusExplanations[status]?.action || '',
        },
        {
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          priority: 'medium',
        },
      );
    } catch (error) {
      console.log('Could not send status change notification:', error.message);
    }

    return savedSalon;
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<SalonDocument> {
    const document = await this.salonDocumentsRepository.findOne({
      where: { id: documentId },
      relations: ['salon'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }
}
