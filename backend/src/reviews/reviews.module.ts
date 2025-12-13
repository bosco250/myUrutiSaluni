import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from './entities/review.entity';
import { CustomersModule } from '../customers/customers.module';
import { SalonsModule } from '../salons/salons.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    forwardRef(() => CustomersModule),
    forwardRef(() => SalonsModule),
    forwardRef(() => AppointmentsModule),
    NotificationsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
