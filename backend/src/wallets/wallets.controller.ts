import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get or create wallet for user' })
  getWallet(@Param('userId') userId: string, @Query('salonId') salonId?: string) {
    return this.walletsService.getOrCreateWallet(userId, salonId);
  }

  @Get(':walletId/transactions')
  @ApiOperation({ summary: 'Get wallet transactions' })
  getTransactions(@Param('walletId') walletId: string) {
    return this.walletsService.getWalletTransactions(walletId);
  }

  @Post(':walletId/transactions')
  @ApiOperation({ summary: 'Create a wallet transaction' })
  createTransaction(@Param('walletId') walletId: string, @Body() createTransactionDto: CreateWalletTransactionDto) {
    return this.walletsService.createTransaction(
      walletId,
      createTransactionDto.transactionType,
      createTransactionDto.amount,
      createTransactionDto.description,
    );
  }
}

