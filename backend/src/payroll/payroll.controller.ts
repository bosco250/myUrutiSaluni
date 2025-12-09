import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { SalonsService } from '../salons/salons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { MarkPayrollPaidDto } from './dto/mark-payroll-paid.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post('calculate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Calculate payroll for a period' })
  async calculatePayroll(
    @Body() createPayrollDto: CreatePayrollRunDto,
    @CurrentUser() user: any,
  ) {
    // Check salon access for salon owners
    if (user.role === UserRole.SALON_OWNER) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (!salonIds.includes(createPayrollDto.salonId)) {
        throw new ForbiddenException(
          'You can only calculate payroll for your own salon',
        );
      }
    }

    return this.payrollService.calculatePayroll(
      createPayrollDto.salonId,
      new Date(createPayrollDto.periodStart),
      new Date(createPayrollDto.periodEnd),
      user.id,
    );
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Mark payroll as paid' })
  async markAsPaid(
    @Param('id') id: string,
    @Body() markPaidDto: MarkPayrollPaidDto,
    @CurrentUser() user: any,
  ) {
    // Check salon access for salon owners
    if (user.role === UserRole.SALON_OWNER) {
      const payrollRun = await this.payrollService.findOne(id);
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (!salonIds.includes(payrollRun.salonId)) {
        throw new ForbiddenException(
          'You can only mark payroll as paid for your own salon',
        );
      }
    }

    return this.payrollService.markPayrollAsPaid(
      id,
      markPaidDto.paymentMethod,
      markPaidDto.paymentReference || '',
      user.id,
    );
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get payroll summary' })
  async getSummary(
    @Query('salonId') salonId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @CurrentUser() user: any,
  ) {
    // Check salon access for salon owners
    if (user.role === UserRole.SALON_OWNER && salonId) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (!salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only view payroll summary for your own salon',
        );
      }
    }

    return this.payrollService.getPayrollSummary(
      salonId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  @Get('salon/:salonId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get payroll history for a salon' })
  async getPayrollHistory(
    @Param('salonId') salonId: string,
    @CurrentUser() user: any,
  ) {
    // Check salon access for salon owners
    if (user.role === UserRole.SALON_OWNER) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (!salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only view payroll history for your own salon',
        );
      }
    }

    return this.payrollService.getPayrollHistory(salonId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get a single payroll run' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const payrollRun = await this.payrollService.findOne(id);

    // Check salon access for salon owners
    if (user.role === UserRole.SALON_OWNER) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (!salonIds.includes(payrollRun.salonId)) {
        throw new ForbiddenException(
          'You can only view payroll runs for your own salon',
        );
      }
    }

    return payrollRun;
  }
}
