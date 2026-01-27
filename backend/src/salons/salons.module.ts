import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { Salon } from './entities/salon.entity';
import { SalonEmployee } from './entities/salon-employee.entity';
import { EmployeePermissionEntity } from './entities/employee-permission.entity';
import { SalonDocument } from './entities/salon-document.entity';
import { EmployeePermissionsService } from './services/employee-permissions.service';
import {
  EmployeePermissionsController,
  SalonEmployeePermissionsController,
} from './controllers/employee-permissions.controller';
import { SalonIdResolverService } from '../common/services/salon-id-resolver.service';
import { PermissionGateway } from './gateways/permission.gateway';
import { MembershipsModule } from '../memberships/memberships.module';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Salon,
      SalonEmployee,
      EmployeePermissionEntity,
      SalonDocument,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => MembershipsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => CustomersModule),
  ],
  controllers: [
    SalonsController,
    EmployeePermissionsController,
    SalonEmployeePermissionsController,
  ],
  providers: [
    SalonsService,
    EmployeePermissionsService,
    SalonIdResolverService,
    PermissionGateway,
  ],
  exports: [
    SalonsService,
    EmployeePermissionsService,
    SalonIdResolverService,
    PermissionGateway,
    TypeOrmModule,
  ],
})
export class SalonsModule {}
