import { Module, forwardRef } from '@nestjs/common';
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
import { LoyaltyPointTransaction } from './entities/loyalty-point-transaction.entity';
import { LoyaltyPointsService } from './loyalty-points.service';
import { SalonRewardsConfig } from './entities/rewards-config.entity';
import { RewardsConfigService } from './rewards-config.service';
import { CustomerFavorite } from './entities/customer-favorite.entity';
import { CustomerFavoritesService } from './customer-favorites.service';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerStyleReference,
      SalonCustomer,
      CustomerCommunication,
      LoyaltyPointTransaction,
      SalonRewardsConfig,
      CustomerFavorite,
    ]),
    forwardRef(() => UsersModule),
    FileUploadModule,
    forwardRef(() => SalonsModule),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerStyleReferencesService,
    SalonCustomerService,
    CustomerCommunicationService,
    LoyaltyPointsService,
    RewardsConfigService,
    CustomerFavoritesService,
  ],
  exports: [
    CustomersService,
    CustomerStyleReferencesService,
    SalonCustomerService,
    CustomerCommunicationService,
    LoyaltyPointsService,
    RewardsConfigService,
    CustomerFavoritesService,
  ],
})
export class CustomersModule {}
