import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CustomersService } from '../customers/customers.service';
import { SalonsService } from '../salons/salons.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private customersService: CustomersService,
    private salonsService: SalonsService,
    private appointmentsService: AppointmentsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createReviewDto: CreateReviewDto, user: User): Promise<Review> {
    // Get customer
    const customer = await this.customersService.findByUserId(user.id);
    if (!customer) {
      throw new BadRequestException('Customer profile not found');
    }

    // Validate salon exists
    const salon = await this.salonsService.findOne(createReviewDto.salonId);
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    // Check if already reviewed this appointment
    if (createReviewDto.appointmentId) {
      const existingReview = await this.reviewsRepository.findOne({
        where: {
          customerId: customer.id,
          appointmentId: createReviewDto.appointmentId,
        },
      });
      if (existingReview) {
        throw new BadRequestException(
          'You have already reviewed this appointment',
        );
      }

      // Verify it's a completed appointment
      const appointment = await this.appointmentsService.findOne(
        createReviewDto.appointmentId,
      );
      if (appointment.status !== 'completed') {
        throw new BadRequestException('Can only review completed appointments');
      }
    }

    const review = this.reviewsRepository.create({
      ...createReviewDto,
      customerId: customer.id,
      isVerified: !!createReviewDto.appointmentId,
    });

    const savedReview = await this.reviewsRepository.save(review);

    // Update salon average rating
    await this.updateSalonRating(createReviewDto.salonId);

    // Notify salon owner
    try {
      await this.notificationsService.sendNotification(
        salon.ownerId,
        undefined,
        undefined,
        'in_app' as any,
        'review' as any,
        'New Review',
        `${customer.user.fullName} left a ${createReviewDto.rating}-star review`,
      );
    } catch (error) {
      // Don't fail if notification fails
      console.error('Failed to send review notification:', error);
    }

    return savedReview;
  }

  async findAll(filters?: {
    salonId?: string;
    employeeId?: string;
    customerId?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const query = this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('review.salon', 'salon')
      .leftJoinAndSelect('review.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'employeeUser')
      .where('review.isPublished = :isPublished', { isPublished: true });

    if (filters?.salonId) {
      query.andWhere('review.salonId = :salonId', { salonId: filters.salonId });
    }

    if (filters?.employeeId) {
      query.andWhere('review.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters?.customerId) {
      query.andWhere('review.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters?.minRating) {
      query.andWhere('review.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    query.orderBy('review.createdAt', 'DESC');

    const total = await query.getCount();

    if (filters?.limit) {
      query.limit(filters.limit);
    }
    if (filters?.offset) {
      query.offset(filters.offset);
    }

    const reviews = await query.getMany();

    // Calculate average rating
    const avgResult = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where(filters?.salonId ? 'review.salonId = :salonId' : '1=1', {
        salonId: filters?.salonId,
      })
      .andWhere('review.isPublished = :isPublished', { isPublished: true })
      .getRawOne();

    return {
      reviews,
      total,
      averageRating: parseFloat(avgResult?.avg) || 0,
    };
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'customer.user',
        'salon',
        'employee',
        'employee.user',
      ],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async findByCustomer(userId: string): Promise<Review[]> {
    const customer = await this.customersService.findByUserId(userId);
    if (!customer) {
      return [];
    }

    return this.reviewsRepository.find({
      where: { customerId: customer.id },
      relations: ['salon', 'employee', 'employee.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    user: User,
  ): Promise<Review> {
    const review = await this.findOne(id);
    const customer = await this.customersService.findByUserId(user.id);

    if (!customer || review.customerId !== customer.id) {
      throw new ForbiddenException('Not authorized to update this review');
    }

    // Only allow updating within 24 hours
    const hoursSinceCreation =
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new BadRequestException(
        'Reviews can only be edited within 24 hours',
      );
    }

    Object.assign(review, updateReviewDto);
    const savedReview = await this.reviewsRepository.save(review);

    // Update salon rating
    await this.updateSalonRating(review.salonId);

    return savedReview;
  }

  async remove(id: string, user: User): Promise<void> {
    const review = await this.findOne(id);
    const customer = await this.customersService.findByUserId(user.id);

    if (!customer || review.customerId !== customer.id) {
      throw new ForbiddenException('Not authorized to delete this review');
    }

    await this.reviewsRepository.remove(review);
    await this.updateSalonRating(review.salonId);
  }

  async getSalonStats(salonId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    aspectAverages: {
      service: number;
      punctuality: number;
      cleanliness: number;
      value: number;
    };
  }> {
    const reviews = await this.reviewsRepository.find({
      where: { salonId, isPublished: true },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        aspectAverages: {
          service: 0,
          punctuality: 0,
          cleanliness: 0,
          value: 0,
        },
      };
    }

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    const reviewsWithAspects = reviews.filter((r) => r.aspects);
    const aspectAverages = {
      service: 0,
      punctuality: 0,
      cleanliness: 0,
      value: 0,
    };

    if (reviewsWithAspects.length > 0) {
      aspectAverages.service =
        reviewsWithAspects.reduce(
          (sum, r) => sum + (r.aspects?.service || 0),
          0,
        ) / reviewsWithAspects.length;
      aspectAverages.punctuality =
        reviewsWithAspects.reduce(
          (sum, r) => sum + (r.aspects?.punctuality || 0),
          0,
        ) / reviewsWithAspects.length;
      aspectAverages.cleanliness =
        reviewsWithAspects.reduce(
          (sum, r) => sum + (r.aspects?.cleanliness || 0),
          0,
        ) / reviewsWithAspects.length;
      aspectAverages.value =
        reviewsWithAspects.reduce(
          (sum, r) => sum + (r.aspects?.value || 0),
          0,
        ) / reviewsWithAspects.length;
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      aspectAverages,
    };
  }

  private async updateSalonRating(salonId: string): Promise<void> {
    // Get salon stats (currently unused but may be needed for future implementation)
    await this.getSalonStats(salonId);
    // Update salon's average rating in salon entity if it has that field
    // This would require modifying the Salon entity to have an averageRating field
  }
}
