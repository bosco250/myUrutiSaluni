import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletTransactionType } from './entities/wallet-transaction.entity';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user wallet' })
  async getMyWallet(@CurrentUser() user: User) {
    return this.walletsService.getOrCreateWallet(user.id);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal' })
  async withdraw(
    @CurrentUser() user: User,
    @Body() body: { amount: number; phoneNumber: string },
  ) {
    if (!body.amount || body.amount < 1000) {
      throw new BadRequestException('Minimum withdrawal is 1,000 RWF');
    }

    if (!body.phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }

    const wallet = await this.walletsService.getOrCreateWallet(user.id);
    
    if (Number(wallet.balance) < body.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create withdrawal transaction
    return this.walletsService.createTransaction(
      wallet.id,
      WalletTransactionType.WITHDRAWAL,
      body.amount,
      `Withdrawal to ${body.phoneNumber}`,
    );
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get or create wallet for user' })
  getWallet(
    @Param('userId') userId: string,
    @Query('salonId') salonId?: string,
  ) {
    return this.walletsService.getOrCreateWallet(userId, salonId);
  }

  @Get(':walletId/transactions')
  @ApiOperation({ summary: 'Get wallet transactions' })
  getTransactions(@Param('walletId') walletId: string) {
    return this.walletsService.getWalletTransactions(walletId);
  }

  @Post(':walletId/transactions')
  @ApiOperation({ summary: 'Create a wallet transaction' })
  createTransaction(
    @Param('walletId') walletId: string,
    @Body() createTransactionDto: CreateWalletTransactionDto,
  ) {
    return this.walletsService.createTransaction(
      walletId,
      createTransactionDto.transactionType,
      createTransactionDto.amount,
      createTransactionDto.description,
    );
  }
}

