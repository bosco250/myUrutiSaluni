import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
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
import { ApplicationStatus } from './entities/membership-application.entity';

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    @InjectRepository(Salon)
    private salonsRepository: Repository<Salon>,
  ) {}

  @Post('apply')
  @Roles(UserRole.CUSTOMER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Apply for membership' })
  async apply(
    @Body() createDto: CreateMembershipApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.createApplication(user.id, createDto);
  }

  @Get('applications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Get all membership applications (Admin only)' })
  async findAllApplications(@Query('status') status?: ApplicationStatus) {
    return this.membershipsService.findAll(status);
  }

  @Get('applications/my')
  @Roles(UserRole.CUSTOMER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get my membership application' })
  async getMyApplication(@CurrentUser() user: any) {
    return this.membershipsService.findByApplicantId(user.id);
  }

  @Get('status')
  @Roles(UserRole.CUSTOMER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Check membership status' })
  async checkStatus(@CurrentUser() user: any) {
    return this.membershipsService.checkMembershipStatus(user.id);
  }

  @Get('applications/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get a membership application by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const application = await this.membershipsService.findOne(id);

    // Salon owners can only view their own application
    if (
      user.role === UserRole.SALON_OWNER &&
      application.applicantId !== user.id
    ) {
      throw new ForbiddenException('You can only view your own application');
    }

    return application;
  }

  @Patch('applications/:id/review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Review a membership application (Approve/Reject)' })
  async reviewApplication(
    @Param('id') id: string,
    @Body() reviewDto: ReviewApplicationDto,
    @CurrentUser() user: any,
  ) {
    console.log(
      `[Membership Controller] Reviewing application ${id} with status: ${reviewDto.status}`,
    );
    console.log(`[Membership Controller] Reviewer: ${user.id} (${user.email})`);

    const result = await this.membershipsService.reviewApplication(
      id,
      user.id,
      reviewDto,
    );

    console.log(
      `[Membership Controller] Review completed. Application status: ${result.status}`,
    );

    // If approved, return message about re-authentication
    if (reviewDto.status === ApplicationStatus.APPROVED) {
      // Verify the applicant's role was updated
      const applicantRole = result.applicant?.role;
      console.log(
        `[Membership Controller] Applicant role after approval: ${applicantRole}`,
      );

      return {
        ...result,
        message:
          'Application approved successfully. The user role has been updated to SALON_OWNER. The user must log out and log back in to access new features.',
        requiresReauth: true,
        roleUpdated: applicantRole === UserRole.SALON_OWNER,
      };
    }

    return result;
  }

  @Delete('applications/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete a membership application' })
  async remove(@Param('id') id: string) {
    await this.membershipsService.delete(id);
    return { message: 'Application deleted successfully' };
  }

  // ========== Membership Management (Salon Memberships) ==========

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Create a membership for a salon' })
  async createMembership(
    @Body() createDto: CreateMembershipDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners can only create memberships for their own salons
    if (user.role === UserRole.SALON_OWNER) {
      // Verify salon ownership - check if salon exists and belongs to user
      const salon = await this.salonsRepository.findOne({
        where: { id: createDto.salonId },
      });
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create memberships for your own salons',
        );
      }
    }
    return this.membershipsService.createMembership(createDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  )
  @ApiOperation({ summary: 'Get all memberships' })
  async findAllMemberships(
    @Query('salonId') salonId?: string,
    @CurrentUser() user?: any,
  ) {
    // Salon owners can only see memberships for their own salons
    if (user?.role === UserRole.SALON_OWNER) {
      return this.membershipsService.findAllMembershipsForOwner(user.id);
    }
    return this.membershipsService.findAllMemberships(salonId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  )
  @ApiOperation({ summary: 'Get a membership by ID' })
  async findOneMembership(@Param('id') id: string, @CurrentUser() user: any) {
    const membership = await this.membershipsService.findOneMembership(id);

    // Salon owners can only view memberships for their own salons
    if (
      user.role === UserRole.SALON_OWNER &&
      membership.salon.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'You can only view memberships for your own salons',
      );
    }

    return membership;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Update a membership' })
  async updateMembership(
    @Param('id') id: string,
    @Body() updateDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.updateMembership(id, updateDto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Activate a membership' })
  async activateMembership(@Param('id') id: string) {
    return this.membershipsService.activateMembership(id);
  }

  @Patch(':id/renew')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Renew a membership' })
  async renewMembership(
    @Param('id') id: string,
    @Body() body: { endDate: string },
  ) {
    return this.membershipsService.renewMembership(id, new Date(body.endDate));
  }

  @Patch(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Suspend a membership' })
  async suspendMembership(@Param('id') id: string) {
    return this.membershipsService.suspendMembership(id);
  }

  @Patch(':id/expire')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Expire a membership' })
  async expireMembership(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    return this.membershipsService.expireMembership(id, force === 'true');
  }

  @Post(':id/reminder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Send a reminder to the membership owner' })
  async sendReminder(@Param('id') id: string) {
    await this.membershipsService.sendReminder(id);
    return { message: 'Reminder sent successfully' };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete a membership' })
  async deleteMembership(@Param('id') id: string) {
    await this.membershipsService.deleteMembership(id);
    return { message: 'Membership deleted successfully' };
  }

  // ========== Membership Payment Endpoints ==========

  @Post('payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Create a membership payment record' })
  async createPayment(@Body() createDto: CreateMembershipPaymentDto) {
    return this.membershipsService.createPayment(createDto);
  }

  @Post('payments/record')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Record a payment for a membership contribution' })
  async recordPayment(
    @Body() recordDto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.recordPayment(recordDto, user.id);
  }

  @Delete('payments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete a payment record (Only if Pending)' })
  async deletePayment(@Param('id') id: string) {
    await this.membershipsService.deletePayment(id);
    return { message: 'Payment record deleted successfully' };
  }

  @Get('payments/member/:memberId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get payments for a member' })
  async getMemberPayments(
    @Param('memberId') memberId: string,
    @Query('year') year: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners can only see their own payments
    if (user.role === UserRole.SALON_OWNER && memberId !== user.id) {
      throw new ForbiddenException('You can only view your own payments');
    }
    return this.membershipsService.findPaymentsByMember(
      memberId,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('payments/all')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Get all payments across all years' })
  async getAllPayments(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.membershipsService.findAllPayments({ status, search });
  }

  @Get('payments/year/:year')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Get all payments for a specific year' })
  async getYearPayments(@Param('year') year: string) {
    return this.membershipsService.findPaymentsByYear(parseInt(year));
  }

  @Get('payments/status/:memberId/:year')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({
    summary: 'Get payment status for a member for a specific year',
  })
  async getPaymentStatus(
    @Param('memberId') memberId: string,
    @Param('year') year: string,
    @CurrentUser() user: any,
  ) {
    // Salon owners can only see their own payment status
    if (user.role === UserRole.SALON_OWNER && memberId !== user.id) {
      throw new ForbiddenException('You can only view your own payment status');
    }
    return this.membershipsService.getPaymentStatus(memberId, parseInt(year));
  }

  @Post('payments/initialize/:memberId/:year')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({
    summary: 'Initialize yearly payment installments for a member',
  })
  async initializePayments(
    @Param('memberId') memberId: string,
    @Param('year') year: string,
  ) {
    return this.membershipsService.initializeYearlyPayments(
      memberId,
      parseInt(year),
    );
  }

  @Post('payments/initialize-all-members')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({
    summary: 'Initialize yearly payment installments for all active members',
  })
  async initializeAllMembersPayments() {
    return this.membershipsService.initializePaymentsForAllMembers();
  }

  @Post('payments/initiate')
  @Roles(UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Initiate self-service membership payment' })
  async initiateSelfServicePayment(
    @Body() dto: InitiateMembershipPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.initiateSelfServicePayment(user.id, dto);
  }
  @Get('verify/:membershipNumber')
  @Public()
  @ApiOperation({ summary: 'Verify membership by number (Public)' })
  async verifyMembership(@Param('membershipNumber') membershipNumber: string) {
    const user =
      await this.membershipsService.findUserByMembershipNumber(
        membershipNumber,
      );

    if (!user) {
      throw new NotFoundException('Membership not found');
    }

    // Get active membership to check expiry
    const membership =
      await this.membershipsService.findActiveMembershipByOwner(user.id);

    return {
      isValid: true,
      member: {
        fullName: user.fullName,
        membershipNumber: user.membershipNumber,
        email: user.email, // Maybe mask this for public view?
        memberSince: user.createdAt,
      },
      membership: membership
        ? {
            status: membership.status,
            startDate: membership.startDate,
            endDate: membership.endDate,
            salonName: membership.salon.name,
          }
        : null,
      verificationDate: new Date(),
    };
  }
}
