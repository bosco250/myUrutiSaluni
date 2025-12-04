import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { Commission } from './entities/commission.entity';
import { SalonsModule } from '../salons/salons.module';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commission, SalonEmployee]),
    SalonsModule,
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}

