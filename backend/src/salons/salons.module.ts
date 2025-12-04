import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { Salon } from './entities/salon.entity';
import { SalonEmployee } from './entities/salon-employee.entity';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Salon, SalonEmployee]),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [SalonsController],
  providers: [SalonsService],
  exports: [SalonsService],
})
export class SalonsModule {}

