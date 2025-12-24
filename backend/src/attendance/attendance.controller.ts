import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Record attendance' })
  async create(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @CurrentUser() user: any,
  ) {
    // Security: Verify employee can only record their own attendance
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee || employee.id !== createAttendanceDto.salonEmployeeId) {
        throw new ForbiddenException(
          'You can only record attendance for yourself',
        );
      }
    }
    // Salon owners can record attendance for their employees
    else if (user.role === UserRole.SALON_OWNER) {
      const employee = await this.salonsService.findEmployeeById(
        createAttendanceDto.salonEmployeeId,
      );
      if (!employee) {
        throw new ForbiddenException('Employee not found');
      }
      const salon = await this.salonsService.findOne(employee.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only record attendance for your salon employees',
        );
      }
    }

    return this.attendanceService.create(createAttendanceDto);
  }

  // IMPORTANT: Specific routes must come BEFORE general routes
  // NestJS matches routes in order, so more specific paths must be defined first

  @Get('current/:employeeId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get current attendance status (if clocked in)' })
  async getCurrentAttendance(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Security: Verify employee can only access their own current attendance
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException(
          'You can only access your own attendance status',
        );
      }
    }
    // Salon owners can access current attendance for their employees
    else if (user.role === UserRole.SALON_OWNER) {
      const employee = await this.salonsService.findEmployeeById(employeeId);
      if (!employee) {
        throw new ForbiddenException('Employee not found');
      }
      const salon = await this.salonsService.findOne(employee.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access attendance status for your salon employees',
        );
      }
    }

    return this.attendanceService.getCurrentAttendance(employeeId);
  }

  @Get('employee/:employeeId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get attendance history for an employee' })
  async getAttendanceHistory(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Security: Verify employee can only access their own attendance
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException(
          'You can only access your own attendance records',
        );
      }
    }
    // Salon owners can access attendance for their employees
    else if (user.role === UserRole.SALON_OWNER) {
      const employee = await this.salonsService.findEmployeeById(employeeId);
      if (!employee) {
        throw new ForbiddenException('Employee not found');
      }
      const salon = await this.salonsService.findOne(employee.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access attendance for your salon employees',
        );
      }
    }

    return this.attendanceService.findByEmployee(
      employeeId,
      startDate,
      endDate,
    );
  }

  // General route must come LAST (after all specific routes)
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get attendance logs' })
  async findByEmployee(
    @Query('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    if (!employeeId) {
      throw new ForbiddenException('Employee ID is required');
    }

    // Security: Verify employee can only access their own attendance
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException(
          'You can only access your own attendance records',
        );
      }
    }
    // Salon owners can access attendance for their employees
    else if (user.role === UserRole.SALON_OWNER) {
      const employee = await this.salonsService.findEmployeeById(employeeId);
      if (!employee) {
        throw new ForbiddenException('Employee not found');
      }
      const salon = await this.salonsService.findOne(employee.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access attendance for your salon employees',
        );
      }
    }

    return this.attendanceService.findByEmployee(employeeId);
  }
}
