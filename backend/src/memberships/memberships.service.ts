import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MembershipApplication,
  ApplicationStatus,
} from './entities/membership-application.entity';
import { Membership, MembershipStatus } from './entities/membership.entity';
import {
  MembershipPayment,
  PaymentStatus,
} from './entities/membership-payment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Salon } from '../salons/entities/salon.entity';
import {
  CreateMembershipApplicationDto,
  ReviewApplicationDto,
} from './dto/create-membership-application.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import {
  CreateMembershipPaymentDto,
  RecordPaymentDto,
} from './dto/create-membership-payment.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(MembershipApplication)
    private applicationsRepository: Repository<MembershipApplication>,
    @InjectRepository(Membership)
    private membershipsRepository: Repository<Membership>,
    @InjectRepository(MembershipPayment)
    private paymentsRepository: Repository<MembershipPayment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Salon)
    private salonsRepository: Repository<Salon>,
  ) {}

  async createApplication(
    applicantId: string,
    createDto: CreateMembershipApplicationDto,
  ): Promise<MembershipApplication> {
    // Check if user already has a pending or approved application
    const existingApplication = await this.applicationsRepository.findOne({
      where: { applicantId },
      order: { createdAt: 'DESC' },
    });

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.PENDING) {
        throw new BadRequestException(
          'You already have a pending membership application',
        );
      }
      if (existingApplication.status === ApplicationStatus.APPROVED) {
        throw new BadRequestException('You are already an approved member');
      }
    }

    const application = this.applicationsRepository.create({
      applicantId,
      ...createDto,
      status: ApplicationStatus.PENDING,
    });

    return this.applicationsRepository.save(application);
  }

  async findAll(status?: ApplicationStatus): Promise<MembershipApplication[]> {
    const where = status ? { status } : {};
    return this.applicationsRepository.find({
      where,
      relations: ['applicant', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MembershipApplication> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: ['applicant', 'reviewedBy'],
    });

    if (!application) {
      throw new NotFoundException(
        `Membership application with ID ${id} not found`,
      );
    }

    return application;
  }

  async findByApplicantId(
    applicantId: string,
  ): Promise<MembershipApplication | null> {
    return this.applicationsRepository.findOne({
      where: { applicantId },
      relations: ['applicant', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async reviewApplication(
    id: string,
    reviewerId: string,
    reviewDto: ReviewApplicationDto,
  ): Promise<MembershipApplication> {
    const application = await this.findOne(id);

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application has already been reviewed');
    }

    application.status = reviewDto.status;
    application.reviewedById = reviewerId;
    application.reviewedAt = new Date();

    if (
      reviewDto.status === ApplicationStatus.REJECTED &&
      reviewDto.rejectionReason
    ) {
      application.rejectionReason = reviewDto.rejectionReason;
    }

    // If approved, update user role to SALON_OWNER and assign membership number
    let updatedApplicant: User | null = null;
    if (reviewDto.status === ApplicationStatus.APPROVED) {
      const applicant = await this.usersRepository.findOne({
        where: { id: application.applicantId },
      });
      if (!applicant) {
        throw new NotFoundException(
          `User with ID ${application.applicantId} not found`,
        );
      }

      console.log(
        `[Membership Approval] Updating user ${applicant.id} (${applicant.email}) role from ${applicant.role} to ${UserRole.SALON_OWNER}`,
      );

      // Generate unique membership number if user doesn't have one
      let membershipNumber = applicant.membershipNumber;
      if (!membershipNumber) {
        membershipNumber = await this.generateMemberMembershipNumber();
      }

      // Update role and membership number in database
      await this.usersRepository.update(
        { id: application.applicantId },
        {
          role: UserRole.SALON_OWNER,
          membershipNumber: membershipNumber,
        },
      );

      // Reload the user to verify the update
      updatedApplicant = await this.usersRepository.findOne({
        where: { id: application.applicantId },
      });

      if (!updatedApplicant) {
        throw new NotFoundException(
          `User with ID ${application.applicantId} not found after update`,
        );
      }

      // Verify the role was updated
      if (updatedApplicant.role !== UserRole.SALON_OWNER) {
        console.error(
          `[Membership Approval] Failed to update role for user ${application.applicantId}. Expected: ${UserRole.SALON_OWNER}, Got: ${updatedApplicant.role}`,
        );
        throw new Error('Failed to update user role to SALON_OWNER');
      }

      console.log(
        `[Membership Approval] Successfully updated user ${updatedApplicant.id} role to ${updatedApplicant.role} with membership number ${membershipNumber}`,
      );

      // Initialize yearly payments for the current year
      try {
        const currentYear = new Date().getFullYear();
        await this.initializeYearlyPayments(
          application.applicantId,
          currentYear,
        );
        console.log(
          `[Membership Approval] Initialized yearly payments for ${currentYear}`,
        );
      } catch (error) {
        console.error(
          '[Membership Approval] Failed to initialize payments:',
          error,
        );
        // Don't fail the approval if payment initialization fails
      }
    }

    const savedApplication =
      await this.applicationsRepository.save(application);

    // Return application with updated user info
    if (reviewDto.status === ApplicationStatus.APPROVED && updatedApplicant) {
      // Manually set the applicant relation to ensure we return the updated user
      savedApplication.applicant = updatedApplicant;

      // Also reload with relations to get reviewedBy
      const applicationWithRelations =
        await this.applicationsRepository.findOne({
          where: { id: savedApplication.id },
          relations: ['reviewedBy'],
        });

      if (applicationWithRelations) {
        applicationWithRelations.applicant = updatedApplicant;
        return applicationWithRelations;
      }

      return savedApplication;
    }

    // Reload with relations for consistency
    const applicationWithRelations = await this.applicationsRepository.findOne({
      where: { id: savedApplication.id },
      relations: ['applicant', 'reviewedBy'],
    });

    return applicationWithRelations || savedApplication;
  }

  async checkMembershipStatus(
    userId: string,
  ): Promise<{ isMember: boolean; application: MembershipApplication | null }> {
    // Optimized query - only fetch what we need for status check
    const application = await this.applicationsRepository.findOne({
      where: { applicantId: userId },
      select: [
        'id',
        'status',
        'applicantId',
        'businessName',
        'createdAt',
        'reviewedAt',
      ],
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      return { isMember: false, application: null };
    }

    const isMember = application.status === ApplicationStatus.APPROVED;
    return { isMember, application };
  }

  async delete(id: string): Promise<void> {
    const application = await this.findOne(id);
    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Cannot delete an approved application');
    }
    await this.applicationsRepository.remove(application);
  }

  // ========== Membership Management (Salon Memberships) ==========

  async createMembership(createDto: CreateMembershipDto): Promise<Membership> {
    // Check if salon exists
    const salon = await this.salonsRepository.findOne({
      where: { id: createDto.salonId },
    });
    if (!salon) {
      throw new NotFoundException(
        `Salon with ID ${createDto.salonId} not found`,
      );
    }

    // Check if salon already has an active membership
    const existingMembership = await this.membershipsRepository.findOne({
      where: { salonId: createDto.salonId },
      order: { createdAt: 'DESC' },
    });

    if (
      existingMembership &&
      existingMembership.status === MembershipStatus.ACTIVE
    ) {
      throw new BadRequestException('Salon already has an active membership');
    }

    // Generate membership number if not provided
    const membershipNumber =
      createDto.membershipNumber || this.generateMembershipNumber();

    const membership = this.membershipsRepository.create({
      ...createDto,
      membershipNumber,
      status: createDto.status || MembershipStatus.NEW,
    });

    return this.membershipsRepository.save(membership);
  }

  async findAllMemberships(salonId?: string): Promise<Membership[]> {
    const where = salonId ? { salonId } : {};
    return this.membershipsRepository.find({
      where,
      relations: ['salon', 'salon.owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneMembership(id: string): Promise<Membership> {
    const membership = await this.membershipsRepository.findOne({
      where: { id },
      relations: ['salon', 'salon.owner'],
    });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }

    return membership;
  }

  async findBySalonId(salonId: string): Promise<Membership | null> {
    return this.membershipsRepository.findOne({
      where: { salonId },
      relations: ['salon'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateMembership(
    id: string,
    updateDto: UpdateMembershipDto,
  ): Promise<Membership> {
    const membership = await this.findOneMembership(id);

    Object.assign(membership, updateDto);

    return this.membershipsRepository.save(membership);
  }

  async activateMembership(id: string): Promise<Membership> {
    const membership = await this.findOneMembership(id);

    // Check if payment is complete for the current year
    const currentYear = new Date().getFullYear();
    const payments = await this.paymentsRepository.find({
      where: {
        memberId: membership.salon.ownerId,
        paymentYear: currentYear,
      },
    });

    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.paidAmount), 0);

    const requiredAmount = 3000; // 3000 RWF per year
    if (totalPaid < requiredAmount) {
      throw new BadRequestException(
        `Cannot activate membership. Payment incomplete. Required: ${requiredAmount} RWF, Paid: ${totalPaid} RWF. Please complete payment first.`,
      );
    }

    membership.status = MembershipStatus.ACTIVE;
    if (!membership.startDate) {
      membership.startDate = new Date();
    }

    return this.membershipsRepository.save(membership);
  }

  async renewMembership(id: string, endDate: Date): Promise<Membership> {
    const membership = await this.findOneMembership(id);

    if (membership.status === MembershipStatus.EXPIRED) {
      membership.status = MembershipStatus.ACTIVE;
    } else if (membership.status === MembershipStatus.ACTIVE) {
      membership.status = MembershipStatus.PENDING_RENEWAL;
    }

    membership.endDate = endDate;

    return this.membershipsRepository.save(membership);
  }

  async suspendMembership(id: string): Promise<Membership> {
    const membership = await this.findOneMembership(id);
    membership.status = MembershipStatus.SUSPENDED;
    return this.membershipsRepository.save(membership);
  }

  async expireMembership(id: string): Promise<Membership> {
    const membership = await this.findOneMembership(id);
    membership.status = MembershipStatus.EXPIRED;
    return this.membershipsRepository.save(membership);
  }

  async deleteMembership(id: string): Promise<void> {
    const membership = await this.findOneMembership(id);
    await this.membershipsRepository.remove(membership);
  }

  private generateMembershipNumber(): string {
    // Generate a unique membership number for salon: MEM-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `MEM-${year}-${random}`;
  }

  private async generateMemberMembershipNumber(): Promise<string> {
    // Generate a unique membership number for individual member: MEMBER-YYYY-XXXXXX
    // Ensure uniqueness by checking database
    let membershipNumber: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');
      membershipNumber = `MEMBER-${year}-${random}`;

      // Check if this membership number already exists
      const existing = await this.usersRepository.findOne({
        where: { membershipNumber },
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      // Fallback: use timestamp-based number
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      membershipNumber = `MEMBER-${year}-${timestamp}`;
    }

    return membershipNumber!;
  }

  // ========== Membership Payment Management ==========

  async createPayment(
    createDto: CreateMembershipPaymentDto,
  ): Promise<MembershipPayment> {
    const member = await this.usersRepository.findOne({
      where: { id: createDto.memberId },
    });
    if (!member) {
      throw new NotFoundException(
        `Member with ID ${createDto.memberId} not found`,
      );
    }

    // Check if payment already exists for this year and installment
    const existing = await this.paymentsRepository.findOne({
      where: {
        memberId: createDto.memberId,
        paymentYear: createDto.paymentYear,
        installmentNumber: createDto.installmentNumber,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Payment for installment ${createDto.installmentNumber} of year ${createDto.paymentYear} already exists`,
      );
    }

    // Calculate due date (first installment: start of year, second: mid-year)
    let dueDate: Date;
    if (createDto.dueDate) {
      dueDate = new Date(createDto.dueDate);
    } else {
      dueDate = new Date(
        createDto.paymentYear,
        createDto.installmentNumber === 1 ? 0 : 6,
        1,
      );
    }

    const payment = this.paymentsRepository.create({
      ...createDto,
      totalAmount: 3000, // Annual amount
      installmentAmount: 1500, // Per installment
      dueDate,
      status: PaymentStatus.PENDING,
    });

    return this.paymentsRepository.save(payment);
  }

  async recordPayment(
    recordDto: RecordPaymentDto,
    recordedById: string,
  ): Promise<MembershipPayment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: recordDto.paymentId },
      relations: ['member'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with ID ${recordDto.paymentId} not found`,
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been recorded');
    }

    const paidAmount = recordDto.paidAmount || payment.installmentAmount;

    payment.status = PaymentStatus.PAID;
    payment.paidAmount = paidAmount;
    payment.paidDate = new Date();
    payment.paymentMethod = recordDto.paymentMethod;
    payment.paymentReference = recordDto.paymentReference;
    payment.transactionReference = recordDto.transactionReference;
    payment.paidById = recordedById;
    if (recordDto.notes) {
      payment.notes = recordDto.notes;
    }

    return this.paymentsRepository.save(payment);
  }

  async findPaymentsByMember(
    memberId: string,
    year?: number,
  ): Promise<MembershipPayment[]> {
    const where: any = { memberId };
    if (year) {
      where.paymentYear = year;
    }
    return this.paymentsRepository.find({
      where,
      relations: ['member', 'membership', 'paidBy'],
      order: { paymentYear: 'DESC', installmentNumber: 'ASC' },
    });
  }

  async findPaymentsByYear(year: number): Promise<MembershipPayment[]> {
    return this.paymentsRepository.find({
      where: { paymentYear: year },
      relations: ['member', 'membership', 'paidBy'],
      order: { memberId: 'ASC', installmentNumber: 'ASC' },
    });
  }

  async getPaymentStatus(
    memberId: string,
    year: number,
  ): Promise<{
    totalRequired: number;
    totalPaid: number;
    remaining: number;
    isComplete: boolean;
    payments: MembershipPayment[];
  }> {
    const payments = await this.findPaymentsByMember(memberId, year);
    const totalRequired = 3000;
    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const remaining = totalRequired - totalPaid;
    const isComplete = totalPaid >= totalRequired;

    return {
      totalRequired,
      totalPaid,
      remaining,
      isComplete,
      payments,
    };
  }

  async initializeYearlyPayments(
    memberId: string,
    year: number,
  ): Promise<MembershipPayment[]> {
    // Check if payments already exist
    const existing = await this.paymentsRepository.find({
      where: {
        memberId,
        paymentYear: year,
      },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Create two installments
    const payments: MembershipPayment[] = [];

    for (let installment = 1; installment <= 2; installment++) {
      const dueDate = new Date(year, installment === 1 ? 0 : 6, 1); // Jan 1 or Jul 1
      const payment = this.paymentsRepository.create({
        memberId,
        paymentYear: year,
        installmentNumber: installment,
        totalAmount: 3000,
        installmentAmount: 1500,
        dueDate,
        status: PaymentStatus.PENDING,
      });
      payments.push(await this.paymentsRepository.save(payment));
    }

    return payments;
  }
}
