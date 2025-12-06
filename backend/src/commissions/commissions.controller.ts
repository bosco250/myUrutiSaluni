import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
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
  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly salonsService: SalonsService,
  ) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all commissions' })
  async findAll(
    @Query('salonEmployeeId') salonEmployeeId: string | undefined,
    @Query('salonId') salonId: string | undefined,
    @Query('paid') paid: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    // If salon employee, automatically filter to their own commissions only
    if (user.role === UserRole.SALON_EMPLOYEE) {
      // Find the employee record for this user
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee) {
        // Return empty array instead of throwing error - employee might not have record yet
        return [];
      }

      // Override salonEmployeeId to only show this employee's commissions
      salonEmployeeId = employee.id;

      // Set salonId to employee's salon to ensure proper filtering
      if (!salonId) {
        salonId = employee.salonId;
      } else if (salonId !== employee.salonId) {
        throw new ForbiddenException(
          'You can only access commissions for your own salon',
        );
      }
    } else if (user.role === UserRole.SALON_OWNER) {
      // Salon owners can see commissions for their salons
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);

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
    }

    return this.commissionsService.findAll({
      salonEmployeeId,
      salonId,
      paid: paid === 'true' ? true : paid === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
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
}
