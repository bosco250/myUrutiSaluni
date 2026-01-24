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
  PaymentMethod,
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
import { InitiateMembershipPaymentDto } from './dto/initiate-membership-payment.dto';
import { AirtelMoneyService } from '../payments/services/airtel-money.service';
import { v4 as uuidv4 } from 'uuid';
import {
  MEMBERSHIP_ANNUAL_FEE,
  MEMBERSHIP_INSTALLMENT_AMOUNT,
  MEMBERSHIP_MIN_ACTIVATION_AMOUNT,
  MEMBERSHIP_DURATION,
} from './membership.config';
import { PaymentMethod as GenericPaymentMethod } from '../payments/entities/payment.entity';

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
    private airtelMoneyService: AirtelMoneyService,
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

    // Try to load the reviewer user to set the relation properly
    const reviewer = await this.usersRepository.findOne({
      where: { id: reviewerId },
    });

    // If reviewer not found, log warning but continue (may happen with data integrity issues)
    if (!reviewer) {
      console.warn(
        `[Membership Review] Reviewer with ID ${reviewerId} not found in database. Proceeding without reviewer relation.`,
      );
    }

    application.status = reviewDto.status;
    if (reviewer) {
      application.reviewedBy = reviewer; // Set the relation if reviewer exists
    }
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

  async findAllMembershipsForOwner(ownerId: string): Promise<Membership[]> {
    return this.membershipsRepository.find({
      where: {
        salon: {
          ownerId: ownerId,
        },
      },
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

    const requiredAmount = MEMBERSHIP_ANNUAL_FEE;
    const partialAmount = MEMBERSHIP_MIN_ACTIVATION_AMOUNT;

    if (totalPaid < partialAmount) {
      throw new BadRequestException(
        `Cannot activate membership. Payment incomplete. Minimum required: ${partialAmount} RWF (6 months) or ${requiredAmount} RWF (1 year). Paid: ${totalPaid} RWF.`,
      );
    }

    membership.status = MembershipStatus.ACTIVE;
    if (!membership.startDate) {
      membership.startDate = new Date();
    }

    // Set expiration based on payment amount
    const startDate = new Date(membership.startDate);
    const endDate = new Date(startDate);

    if (totalPaid >= requiredAmount) {
      // Full year
      endDate.setMonth(
        endDate.getMonth() + MEMBERSHIP_DURATION.FULL_YEAR_MONTHS,
      );
    } else {
      // 6 months (Partial)
      endDate.setMonth(
        endDate.getMonth() + MEMBERSHIP_DURATION.HALF_YEAR_MONTHS,
      );
    }
    membership.endDate = endDate;

    return this.membershipsRepository.save(membership);
  }

  async renewMembership(id: string, endDate: Date): Promise<Membership> {
    const membership = await this.findOneMembership(id);

    // Reactivate expired or suspended memberships
    if (
      membership.status === MembershipStatus.EXPIRED ||
      membership.status === MembershipStatus.SUSPENDED ||
      membership.status === MembershipStatus.PENDING_RENEWAL
    ) {
      membership.status = MembershipStatus.ACTIVE;
    }
    // ACTIVE memberships stay ACTIVE - we just extend the endDate

    membership.endDate = endDate;

    return this.membershipsRepository.save(membership);
  }

  async suspendMembership(id: string): Promise<Membership> {
    const membership = await this.findOneMembership(id);
    membership.status = MembershipStatus.SUSPENDED;
    return this.membershipsRepository.save(membership);
  }

  async expireMembership(
    id: string,
    force: boolean = false,
  ): Promise<Membership> {
    const membership = await this.findOneMembership(id);

    // Warn but allow admin override with force flag
    if (
      !force &&
      membership.endDate &&
      new Date(membership.endDate) > new Date()
    ) {
      throw new BadRequestException(
        'This membership is still valid. Use force=true to expire it anyway.',
      );
    }

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
      totalAmount: MEMBERSHIP_ANNUAL_FEE,
      installmentAmount: MEMBERSHIP_INSTALLMENT_AMOUNT,
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

    // Verify if recording user exists to avoid FK violations
    const recorder = await this.usersRepository.findOne({
      where: { id: recordedById },
    });
    if (recorder) {
      payment.paidById = recordedById;
    } else {
      console.warn(
        `[Payment Record] Recorder with ID ${recordedById} not found. Proceeding without linking to admin user.`,
      );
    }

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

  async findAllPayments(filters?: {
    status?: string;
    search?: string;
  }): Promise<MembershipPayment[]> {
    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.member', 'member')
      .leftJoinAndSelect('payment.membership', 'membership')
      .leftJoinAndSelect('payment.paidBy', 'paidBy');

    if (filters?.status && filters.status !== 'all') {
      queryBuilder.andWhere('payment.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(member.fullName) LIKE :search OR LOWER(member.membershipNumber) LIKE :search OR LOWER(member.email) LIKE :search OR LOWER(membership.membershipNumber) LIKE :search)',
        { search },
      );
    }

    queryBuilder
      .orderBy('payment.paymentYear', 'DESC')
      .addOrderBy('payment.memberId', 'ASC')
      .addOrderBy('payment.installmentNumber', 'ASC');

    return queryBuilder.getMany();
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
    let payments = await this.findPaymentsByMember(memberId, year);

    // Auto-initialize payments if none exist for this year
    if (payments.length === 0) {
      try {
        payments = await this.initializeYearlyPayments(memberId, year);
      } catch (error) {
        console.warn(
          `Could not initialize payments for member ${memberId}:`,
          error,
        );
      }
    }

    const totalRequired = MEMBERSHIP_ANNUAL_FEE;
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

    // Find the member's active membership (for linking)
    let membershipId: string | undefined;
    const salons = await this.salonsRepository.find({
      where: { ownerId: memberId },
    });
    if (salons.length > 0) {
      const salonIds = salons.map((s) => s.id);
      const membership = await this.membershipsRepository
        .createQueryBuilder('membership')
        .where('membership.salonId IN (:...salonIds)', { salonIds })
        .orderBy('membership.createdAt', 'DESC')
        .getOne();
      if (membership) {
        membershipId = membership.id;
      }
    }

    // Create two installments
    const payments: MembershipPayment[] = [];

    for (let installment = 1; installment <= 2; installment++) {
      const dueDate = new Date(year, installment === 1 ? 0 : 6, 1); // Jan 1 or Jul 1

      const newPayment = new MembershipPayment();
      newPayment.memberId = memberId;
      newPayment.paymentYear = year;
      newPayment.installmentNumber = installment;
      newPayment.totalAmount = MEMBERSHIP_ANNUAL_FEE;
      newPayment.installmentAmount = MEMBERSHIP_INSTALLMENT_AMOUNT;
      newPayment.dueDate = dueDate;
      newPayment.status = PaymentStatus.PENDING;

      // Link to membership if found
      if (membershipId) {
        newPayment.membershipId = membershipId;
      }

      const savedPayment = await this.paymentsRepository.save(newPayment);
      payments.push(savedPayment);
    }

    return payments;
  }

  async initializePaymentsForAllMembers(): Promise<{
    initialized: number;
    skipped: number;
    errors: number;
  }> {
    const currentYear = new Date().getFullYear();

    // Find all salon owners
    const salonOwners = await this.usersRepository.find({
      where: { role: UserRole.SALON_OWNER },
    });

    let initialized = 0;
    let skipped = 0;
    let errors = 0;

    for (const owner of salonOwners) {
      try {
        const payments = await this.initializeYearlyPayments(
          owner.id,
          currentYear,
        );
        // If we got existing payments back, they were skipped (already exist)
        const existingCheck = await this.paymentsRepository.count({
          where: { memberId: owner.id, paymentYear: currentYear },
        });
        if (existingCheck <= 2 && payments.length > 0) {
          initialized++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Failed to initialize payments for ${owner.id}:`, error);
        errors++;
      }
    }

    return { initialized, skipped, errors };
  }

  // ========== Self-Service Payment ==========

  async initiateSelfServicePayment(
    userId: string,
    dto: InitiateMembershipPaymentDto,
  ): Promise<{ message: string; paymentId: string; status: string }> {
    // 1. Validate User (Owner)
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const amount = dto.amount;
    const year = new Date().getFullYear();

    // 2. Create Pending Payment Record
    const payment = this.paymentsRepository.create({
      member: user,
      memberId: user.id,
      paymentYear: year,
      installmentNumber: amount >= 3000 ? 1 : 1, // Default to 1st installment logic roughly
      totalAmount: 3000,
      installmentAmount: amount,
      paidAmount: 0, // Not paid yet
      dueDate: new Date(),
      status: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      transactionReference: uuidv4(), // Internal Ref
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    // 3. Request Payment via Airtel Money (Mock)
    try {
      const result = await this.airtelMoneyService.requestPayment({
        phoneNumber: dto.phoneNumber,
        amount: dto.amount,
        externalId: savedPayment.transactionReference,
        payerMessage: 'Membership Fee',
      });

      // Update with external ref
      savedPayment.paymentReference = result.referenceId; // Provider Ref
      await this.paymentsRepository.save(savedPayment);

      // 4. Start Polling (Fire and forget)
      this.pollSelfServicePayment(savedPayment.id, result.referenceId);

      return {
        message: 'Payment initiated. Please check your phone to approve.',
        paymentId: savedPayment.id,
        status: 'PENDING',
      };
    } catch (error) {
      savedPayment.status = PaymentStatus.CANCELLED;
      savedPayment.notes = `Failed to initiate: ${error.message}`;
      await this.paymentsRepository.save(savedPayment);
      throw new BadRequestException('Failed to initiate Mobile Money payment');
    }
  }

  // Poll status specifically for Membership Payments
  private async pollSelfServicePayment(
    paymentId: string,
    providerRef: string,
  ): Promise<void> {
    const maxAttempts = 20; // 60 seconds
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const payment = await this.paymentsRepository.findOne({
          where: { id: paymentId },
        });
        if (!payment || payment.status === PaymentStatus.PAID) return;

        // Check status
        const result =
          await this.airtelMoneyService.checkPaymentStatus(providerRef);

        if (result.status === 'SUCCESSFUL') {
          // Update Payment
          payment.status = PaymentStatus.PAID;
          payment.paidAmount = payment.installmentAmount;
          payment.paidDate = new Date();
          payment.notes = `Auto-confirmed via Mobile Money (Ref: ${result.financialTransactionId})`;
          await this.paymentsRepository.save(payment);

          // Auto-Activate Memberships
          await this.autoActivateMember(payment.memberId);
          return;
        } else if (result.status === 'FAILED') {
          payment.status = PaymentStatus.CANCELLED;
          payment.notes = `Payment failed: ${result.reason}`;
          await this.paymentsRepository.save(payment);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    };

    setTimeout(poll, 3000);
  }

  private async autoActivateMember(userId: string) {
    // Find all memberships for this user's salons
    const salons = await this.salonsRepository.find({
      where: { ownerId: userId },
    });
    const salonIds = salons.map((s) => s.id);

    if (salonIds.length === 0) return;

    const memberships = await this.membershipsRepository.find({
      where: salonIds.map((id) => ({ salonId: id })),
    });

    // Try to activate each
    for (const membership of memberships) {
      try {
        await this.activateMembership(membership.id);
        console.log(
          `Auto-activated membership ${membership.id} for user ${userId}`,
        );
      } catch (e) {
        // Might fail if already active or payment still insufficient (though we just paid)
        console.log(
          `Could not auto-activate membership ${membership.id}: ${e.message}`,
        );
      }
    }
  }

  async findUserByMembershipNumber(
    membershipNumber: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { membershipNumber },
    });
  }

  async findActiveMembershipByOwner(
    ownerId: string,
  ): Promise<Membership | null> {
    // Find active membership for any of the owner's salons
    const salons = await this.salonsRepository.find({
      where: { ownerId },
    });

    if (salons.length === 0) return null;

    return this.membershipsRepository.findOne({
      where: [
        // Check for active memberships for these salons
        ...salons.map((s) => ({
          salonId: s.id,
          status: MembershipStatus.ACTIVE,
        })),
        // Also check pending renewal as valid
        ...salons.map((s) => ({
          salonId: s.id,
          status: MembershipStatus.PENDING_RENEWAL,
        })),
      ],
      relations: ['salon'],
      order: { endDate: 'DESC' },
    });
  }
}
