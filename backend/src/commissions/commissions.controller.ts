import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  private readonly logger = new Logger(CommissionsController.name);

  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly salonsService: SalonsService,
  ) {}

  /**
   * Parse YYYY-MM-DD date string to UTC Date object
   * @param dateString - Date string in YYYY-MM-DD format
   * @param isEndDate - If true, sets time to end of day (23:59:59.999), otherwise midnight (00:00:00)
   */
  private parseDateFilter(
    dateString: string | undefined,
    isEndDate = false,
  ): Date | undefined {
    if (!dateString) return undefined;

    const [year, month, day] = dateString.split('-').map(Number);
    if (isEndDate) {
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all commissions' })
  @ApiOperation({ summary: 'Get all commissions' })
  async findAll(
    @Query('salonEmployeeId') salonEmployeeId: string | undefined,
    @Query('salonId') salonId: string | undefined,
    @Query('paid') paid: string | undefined,
    @Query('paymentMethod') paymentMethod: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page') page: number | undefined,
    @Query('limit') limit: number | undefined,
    @CurrentUser() user: any,
  ) {
    // Pagination options
    const pagination =
      page || limit
        ? {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
          }
        : undefined;

    // Filters object
    const filters = {
      paid: paid === 'true' ? true : paid === 'false' ? false : undefined,
      paymentMethod,
      startDate: this.parseDateFilter(startDate, false),
      endDate: this.parseDateFilter(endDate, true),
    };

    // If salon employee, automatically filter to their own commissions only
    if (user.role === UserRole.SALON_EMPLOYEE) {
      // Find ALL employee records for this user (they may work at multiple salons)
      const employees = await this.salonsService.findAllEmployeesByUserId(
        user.id,
      );

      if (!employees || employees.length === 0) {
        this.logger.warn(
          `No employee records found for user ${user.id} (${user.email || 'unknown email'}). User may need to be added as an employee to a salon.`,
        );
        return [];
      }

      const employeeIds = employees.map((emp) => emp.id);

      if (pagination) {
        return this.commissionsService.findAllPaginated(
          { ...filters, salonEmployeeIds: employeeIds },
          pagination,
        );
      }

      return this.commissionsService.findAll({
        ...filters,
        salonEmployeeIds: employeeIds,
      });
    } else if (user.role === UserRole.SALON_OWNER) {
      // Salon owners can see commissions for their salons
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);

      if (salonIds.length === 0) {
        // Owner has no salons, return empty array
        return [];
      }

      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access commissions for your own salon',
        );
      }

      // For salon owners, verify the employee belongs to their salon if filtering by employee
      if (salonEmployeeId) {
        const employee =
          await this.salonsService.findEmployeeById(salonEmployeeId);
        if (employee && !salonIds.includes(employee.salonId)) {
          throw new ForbiddenException(
            'You can only access commissions for employees in your salon',
          );
        }
      }

      const ownerFilters = {
        ...filters,
        salonEmployeeId,
        salonId: salonId || undefined,
        salonIds: salonId ? undefined : salonIds, // Use salonIds if no specific salonId
      };

      if (pagination) {
        return this.commissionsService.findAllPaginated(
          ownerFilters,
          pagination,
        );
      }

      return this.commissionsService.findAll(ownerFilters);
    }

    // Admin access
    const adminFilters = {
      ...filters,
      salonEmployeeId,
      salonId,
    };

    if (pagination) {
      return this.commissionsService.findAllPaginated(adminFilters, pagination);
    }

    return this.commissionsService.findAll(adminFilters);
  }

  @Get('employee/:employeeId/summary')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get commission summary for an employee' })
  async getEmployeeSummary(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Access control
    if (user.role === UserRole.SALON_EMPLOYEE) {
      // Employees can only see their own summary
      const employee = await this.salonsService.findEmployeeById(employeeId);
      if (!employee || employee.userId !== user.id) {
        throw new ForbiddenException(
          'You can only access your own commission summary',
        );
      }
    }

    return this.commissionsService.getEmployeeCommissionSummary(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Mark a commission as paid' })
  async markAsPaid(
    @Param('id') id: string,
    @Body()
    body: {
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.markAsPaid(id, {
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      paidById: user.id,
    });
  }

  @Post('mark-paid-batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Mark multiple commissions as paid' })
  async markMultipleAsPaid(
    @Body()
    body: {
      commissionIds: string[];
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.commissionsService.markMultipleAsPaid(body.commissionIds, {
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      paidById: user.id,
    });
  }

  @Post(':id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Verify an external payment' })
  async verifyPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commissionsService.verifyPayment(id, user.id);
  }
}
