import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan application' })
  createLoan(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.createLoan(createLoanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all loans' })
  findAllLoans(@CurrentUser() user: any) {
    return this.loansService.findAllLoans(user);
  }

  @Get(':id/audit')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get detailed audit data for a loan application' })
  getAuditData(@Param('id') id: string, @CurrentUser() user: any) {
    return this.loansService.getLoanAuditData(id, user);
  }

  @Post('products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Create a loan product' })
  createLoanProduct(@Body() createProductDto: CreateLoanProductDto) {
    return this.loansService.createLoanProduct(createProductDto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all loan products' })
  findAllLoanProducts() {
    return this.loansService.findAllLoanProducts();
  }

  @Post('credit-score/:userId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Calculate credit score for a user' })
  calculateCreditScore(@Param('userId') userId: string) {
    return this.loansService.calculateCreditScore(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan by ID' })
  findLoanById(@Param('id') id: string) {
    return this.loansService.findLoanById(id);
  }

  @Post(':id/approve')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Approve a loan application' })
  approveLoan(@Param('id') id: string, @Body() body: { approvedById: string }) {
    return this.loansService.approveLoan(id, body.approvedById);
  }

  @Post(':id/disburse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Disburse an approved loan' })
  disburseLoan(
    @Param('id') id: string,
    @Body() body: { method?: string; reference?: string },
  ) {
    return this.loansService.disburseLoan(id, body);
  }

  @Post(':id/reject')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Reject a loan application' })
  rejectLoan(
    @Param('id') id: string,
    @Body() body: { rejectedById: string; reason: string },
  ) {
    return this.loansService.rejectLoan(id, body.rejectedById, body.reason);
  }
}
