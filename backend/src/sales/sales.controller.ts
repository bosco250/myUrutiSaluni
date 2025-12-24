import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalonsService } from '../salons/salons.service';
import { CustomersService } from '../customers/customers.service';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(
    private readonly salesService: SalesService,
    private readonly salonsService: SalonsService,
    private readonly customersService: CustomersService,
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

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Create a new sale' })
  async create(@Body() createSaleDto: CreateSaleDto, @CurrentUser() user: any) {
    const { items, ...saleData } = createSaleDto;

    // Salon owners and employees can only create sales for their salon
    if (
      (user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE) &&
      saleData.salonId
    ) {
      const salon = await this.salonsService.findOne(saleData.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create sales for your own salon',
        );
      }
    }

    return this.salesService.create(
      { ...saleData, createdById: user.id },
      items || [],
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all sales' })
  async findAll(
    @Query('salonId') salonId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const startDateFilter = this.parseDateFilter(startDate, false);
    const endDateFilter = this.parseDateFilter(endDate, true);

    // Salon owners and employees can only see sales for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access sales for your own salon',
        );
      }
      return this.salesService.findBySalonIds(
        salonIds,
        pageNum,
        limitNum,
        startDateFilter,
        endDateFilter,
      );
    }
    return this.salesService.findAll(
      salonId,
      pageNum,
      limitNum,
      startDateFilter,
      endDateFilter,
    );
  }

  @Get('customer/:customerId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get sales for a specific customer' })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Customers can only see their own sales
    if (user.role === UserRole.CUSTOMER) {
      // Get customer by user ID
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only access your own sales');
      }
    }

    return this.salesService.findByCustomerId(customerId, pageNum, limitNum);
  }

  @Get('employee/:employeeId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get sales for a specific employee' })
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const startDateFilter = this.parseDateFilter(startDate, false);
    const endDateFilter = this.parseDateFilter(endDate, true);

    // Security: Verify employee can only access their own sales
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.salonsService.findEmployeeByUserId(user.id);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException(
          'You can only access your own sales records',
        );
      }
    }
    // Salon owners can access sales for their employees
    else if (user.role === UserRole.SALON_OWNER) {
      const employee = await this.salonsService.findEmployeeById(employeeId);
      if (!employee) {
        throw new ForbiddenException('Employee not found');
      }
      const salon = await this.salonsService.findOne(employee.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access sales for your salon employees',
        );
      }
    }

    return this.salesService.findByEmployeeId(
      employeeId,
      pageNum,
      limitNum,
      startDateFilter,
      endDateFilter,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get a sale by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const sale = await this.salesService.findOne(id);

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Customers can only access their own sales
    if (user.role === UserRole.CUSTOMER) {
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || sale.customerId !== customer.id) {
        throw new ForbiddenException('You can only access your own sales');
      }
    }

    // Salon owners and employees can only access sales for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(sale.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access sales for your own salon',
        );
      }
    }

    return sale;
  }

  @Get('analytics/summary')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get sales analytics summary' })
  async getAnalyticsSummary(
    @Query('salonId') salonId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see analytics for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access analytics for your own salon',
        );
      }
      return this.salesService.getAnalyticsSummary(
        salonIds,
        startDate,
        endDate,
      );
    }
    return this.salesService.getAnalyticsSummary(
      salonId ? [salonId] : undefined,
      startDate,
      endDate,
    );
  }

  @Get('customer/:customerId/statistics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get customer statistics' })
  async getCustomerStatistics(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    // Customers can only see their own statistics
    if (user.role === UserRole.CUSTOMER) {
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only access your own statistics');
      }
    }

    return this.salesService.getCustomerStatistics(customerId);
  }

  @Get(':id/commission-diagnosis')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary: 'Diagnose why commissions were not created for a sale',
  })
  async diagnoseCommissionIssues(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const sale = await this.salesService.findOne(id);

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Salon owners and employees can only access sales for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(sale.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access sales for your own salon',
        );
      }
    }

    return this.salesService.diagnoseCommissionIssues(id);
  }

  @Post(':id/reprocess-commissions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  )
  @ApiOperation({
    summary: 'Retroactively process commissions for a sale that missed them',
  })
  async reprocessCommissions(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const sale = await this.salesService.findOne(id);

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Salon owners can only access sales for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(sale.salonId);
      if (!salon || salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access sales for your own salon',
        );
      }
    }

    return this.salesService.reprocessCommissions(id);
  }
}
