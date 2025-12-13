import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: User) {
    return this.paymentsService.initiatePayment(dto, user);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.paymentsService.findByCustomer(
      user.id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/status')
  checkStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.checkStatus(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.paymentsService.cancelPayment(id, user);
  }
}
