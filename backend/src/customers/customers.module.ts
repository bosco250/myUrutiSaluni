import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { UsersModule } from '../users/users.module';
import { CustomerStyleReference } from './entities/customer-style-reference.entity';
import { CustomerStyleReferencesService } from './customer-style-references.service';
import { FileUploadModule } from '../common/services/file-upload.module';
import { SalonCustomer } from './entities/salon-customer.entity';
import { SalonCustomerService } from './salon-customer.service';
import { CustomerCommunication } from './entities/customer-communication.entity';
import { CustomerCommunicationService } from './customer-communication.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerStyleReference,
      SalonCustomer,
      CustomerCommunication,
    ]),
    UsersModule,
    FileUploadModule,
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerStyleReferencesService,
    SalonCustomerService,
    CustomerCommunicationService,
  ],
  exports: [
    CustomersService,
    CustomerStyleReferencesService,
    SalonCustomerService,
    CustomerCommunicationService,
  ],
})
export class CustomersModule {}
