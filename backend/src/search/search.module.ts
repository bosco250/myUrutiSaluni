import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Product } from '../inventory/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer, Sale, Appointment, Product]),
    forwardRef(() => SalonsModule),
    forwardRef(() => ServicesModule),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
