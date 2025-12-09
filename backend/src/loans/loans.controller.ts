import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  findAllLoans() {
    return this.loansService.findAllLoans();
  }

  @Post('products')
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
  @ApiOperation({ summary: 'Calculate credit score for a user' })
  calculateCreditScore(@Param('userId') userId: string) {
    return this.loansService.calculateCreditScore(userId);
  }
}
