import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { UsersModule } from '../users/users.module';
import { CustomerStyleReference } from './entities/customer-style-reference.entity';
import { CustomerStyleReferencesService } from './customer-style-references.service';
import { FileUploadModule } from '../common/services/file-upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerStyleReference]),
    UsersModule,
    FileUploadModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerStyleReferencesService],
  exports: [CustomersService, CustomerStyleReferencesService],
})
export class CustomersModule {}

