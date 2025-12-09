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
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService, TypeOrmModule],
})
export class MembershipsModule {}
