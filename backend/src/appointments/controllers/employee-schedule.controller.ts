import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  EmployeeScheduleService,
  CreateWorkingHoursDto,
  UpdateAvailabilityRulesDto,
} from '../services/employee-schedule.service';
import { SalonsService } from '../../salons/salons.service';

@ApiTags('Employee Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments/employees')
export class EmployeeScheduleController {
  constructor(
    private readonly employeeScheduleService: EmployeeScheduleService,
    private readonly salonsService: SalonsService,
  ) {}

  @Get(':employeeId/schedule')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get complete schedule for an employee' })
  async getEmployeeSchedule(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to view this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const schedule =
      await this.employeeScheduleService.getCompleteSchedule(employeeId);
    return { data: schedule };
  }

  @Post(':employeeId/working-hours')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Set working hours for an employee' })
  async setWorkingHours(
    @Param('employeeId') employeeId: string,
    @Body() createWorkingHoursDto: Omit<CreateWorkingHoursDto, 'employeeId'>,
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const workingHours = await this.employeeScheduleService.setWorkingHours({
      employeeId,
      ...createWorkingHoursDto,
    });

    return { data: workingHours };
  }

  @Put(':employeeId/weekly-schedule')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Set weekly schedule for an employee' })
  async setWeeklySchedule(
    @Param('employeeId') employeeId: string,
    @Body() schedule: Omit<CreateWorkingHoursDto, 'employeeId'>[],
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const workingHours = await this.employeeScheduleService.setWeeklySchedule(
      employeeId,
      schedule,
    );

    return { data: workingHours };
  }

  @Delete(':employeeId/working-hours/:dayOfWeek')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Remove working hours for a specific day' })
  async removeWorkingHours(
    @Param('employeeId') employeeId: string,
    @Param('dayOfWeek') dayOfWeek: string,
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    await this.employeeScheduleService.removeWorkingHours(
      employeeId,
      parseInt(dayOfWeek, 10),
    );

    return { message: 'Working hours removed successfully' };
  }

  @Put(':employeeId/availability-rules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Set availability rules for an employee' })
  async setAvailabilityRules(
    @Param('employeeId') employeeId: string,
    @Body()
    updateAvailabilityRulesDto: Omit<UpdateAvailabilityRulesDto, 'employeeId'>,
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const rules = await this.employeeScheduleService.setAvailabilityRules({
      employeeId,
      ...updateAvailabilityRulesDto,
    });

    return { data: rules };
  }

  @Post(':employeeId/blackout-dates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Add blackout dates for an employee' })
  async addBlackoutDates(
    @Param('employeeId') employeeId: string,
    @Body() { dates }: { dates: string[] },
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const rules = await this.employeeScheduleService.addBlackoutDates(
      employeeId,
      dates,
    );
    return { data: rules };
  }

  @Delete(':employeeId/blackout-dates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Remove blackout dates for an employee' })
  async removeBlackoutDates(
    @Param('employeeId') employeeId: string,
    @Body() { dates }: { dates: string[] },
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const rules = await this.employeeScheduleService.removeBlackoutDates(
      employeeId,
      dates,
    );
    return { data: rules };
  }

  @Post(':employeeId/setup/standard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({
    summary: 'Set up standard working hours and rules for an employee',
  })
  async setupStandardSchedule(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user has permission to modify this employee's schedule
    await this.checkEmployeeAccess(user, employeeId);

    const [workingHours, rules] = await Promise.all([
      this.employeeScheduleService.setStandardWorkingHours(employeeId),
      this.employeeScheduleService.setDefaultRules(employeeId),
    ]);

    return {
      data: {
        workingHours,
        availabilityRules: rules,
      },
    };
  }

  /**
   * Check if the current user has access to modify the employee's schedule
   */
  private async checkEmployeeAccess(
    user: any,
    employeeId: string,
  ): Promise<void> {
    // Super admins and association admins can access all employees
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ASSOCIATION_ADMIN
    ) {
      return;
    }

    // Get the employee details to find which salon they belong to
    const employee = await this.salonsService.findEmployeeById(employeeId);
    if (!employee) {
      throw new ForbiddenException('Employee not found');
    }

    // Get the salon details
    const salon = await this.salonsService.findOne(employee.salonId);
    if (!salon) {
      throw new ForbiddenException('Salon not found');
    }

    // Salon owners can only access employees from their own salon
    if (user.role === UserRole.SALON_OWNER) {
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only manage schedules for employees in your own salon',
        );
      }
      return;
    }

    // Salon employees can only view their own schedule
    if (user.role === UserRole.SALON_EMPLOYEE) {
      if (employee.userId !== user.id) {
        throw new ForbiddenException('You can only view your own schedule');
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
