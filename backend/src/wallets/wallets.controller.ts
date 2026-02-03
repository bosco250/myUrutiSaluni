import {
  Controller,
  Get,
  Post,
  Patch,
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
import { User, UserRole } from '../users/entities/user.entity';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all wallets (admin only)' })
  async getAllWallets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.walletsService.getAllWallets(
      { page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20 },
      search,
    );
  }

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

    return this.walletsService.requestWithdrawal({
      userId: user.id,
      amount: body.amount,
      phoneNumber: body.phoneNumber,
    });
  }

  @Get(':walletId/summary')
  @ApiOperation({ summary: 'Get wallet summary stats' })
  async getSummary(@Param('walletId') walletId: string) {
    return this.walletsService.getWalletSummary(walletId);
  }

  @Patch(':walletId/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Toggle wallet active status (admin only)' })
  async toggleWalletStatus(
    @Param('walletId') walletId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.walletsService.toggleWalletActive(walletId, body.isActive);
  }

  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Get wallet transaction by ID' })
  getTransactionById(@Param('transactionId') transactionId: string) {
    return this.walletsService.getWalletTransactionById(transactionId);
  }

  @Post('transactions/:transactionId/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cancel a pending transaction (admin only)' })
  async cancelTransaction(
    @Param('transactionId') transactionId: string,
  ) {
    return this.walletsService.cancelTransaction(transactionId);
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
  getTransactions(
    @Param('walletId') walletId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination =
      page || limit
        ? {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
          }
        : undefined;

    return this.walletsService.getWalletTransactions(walletId, pagination);
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
