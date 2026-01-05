import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AirtelService } from './airtel.service';
import { AirtelController } from './airtel.controller';
import { AirtelAgent } from './entities/airtel-agent.entity';
import { AirtelTransaction } from './entities/airtel-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AirtelAgent, AirtelTransaction])],
  controllers: [AirtelController],
  providers: [AirtelService],
  exports: [AirtelService],
})
export class AirtelModule {}
