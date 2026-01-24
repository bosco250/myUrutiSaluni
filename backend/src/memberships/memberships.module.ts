import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipApplication } from './entities/membership-application.entity';
import { Membership } from './entities/membership.entity';
import { MembershipPayment } from './entities/membership-payment.entity';
import { User } from '../users/entities/user.entity';
import { Salon } from '../salons/entities/salon.entity';
import { SalonsModule } from '../salons/salons.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MembershipApplication,
      Membership,
      MembershipPayment,
      User,
      Salon,
    ]),
    forwardRef(() => SalonsModule),
    forwardRef(() => PaymentsModule),
    NotificationsModule,
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService, TypeOrmModule],
})
export class MembershipsModule {}
