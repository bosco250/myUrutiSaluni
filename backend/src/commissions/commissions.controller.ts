import { Controller, Get, Post, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get all commissions' })
  async findAll(
    @Query('salonEmployeeId') salonEmployeeId: string | undefined,
    @Query('salonId') salonId: string | undefined,
    @Query('paid') paid: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see commissions for their salon
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map(s => s.id);
      
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException('You can only access commissions for your own salon');
      }
      
      // If salon employee, only show their own commissions
      if (user.role === UserRole.SALON_EMPLOYEE && salonEmployeeId) {
        // Verify the employee belongs to user's salon
        const employee = await this.salonsService.findEmployeeById(salonEmployeeId);
        if (employee && !salonIds.includes(employee.salonId)) {
          throw new ForbiddenException('You can only access your own commissions');
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
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
        throw new ForbiddenException('You can only access your own commission summary');
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
  async markAsPaid(@Param('id') id: string) {
    return this.commissionsService.markAsPaid(id);
  }

  @Post('mark-paid-batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Mark multiple commissions as paid' })
  async markMultipleAsPaid(@Body() body: { commissionIds: string[] }) {
    return this.commissionsService.markMultipleAsPaid(body.commissionIds);
  }
}

