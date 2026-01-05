import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicePackagesService } from './service-packages.service';
import { ServicePackagesController } from './service-packages.controller';
import { ServicePackage } from './entities/service-package.entity';
import { Service } from '../services/entities/service.entity';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServicePackage, Service]), SalonsModule],
  controllers: [ServicePackagesController],
  providers: [ServicePackagesService],
  exports: [ServicePackagesService],
})
export class ServicePackagesModule {}
