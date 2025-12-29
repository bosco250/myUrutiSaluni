import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomerFavorite } from './entities/customer-favorite.entity';

@Injectable()
export class CustomerFavoritesService {
  constructor(
    @InjectRepository(CustomerFavorite)
    private favoritesRepository: Repository<CustomerFavorite>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get all favorites for a customer with employee details
   */
  async findByCustomerId(customerId: string): Promise<any[]> {
    const favorites = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .where('favorite.customerId = :customerId', { customerId })
      .orderBy('favorite.createdAt', 'DESC')
      .getMany();

    // Fetch employee details for each favorite
    const favoritesWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        try {
          // Fetch employee with user and salon details
          // Note: accessing skills directly (stored as string/text in DB)
          const employee = await this.dataSource.query(
            `SELECT 
              se.id, se.user_id as "userId", se.salon_id as "salonId", se.skills,
              u.id as "user_id", u.full_name as "user_fullName", u.email as "user_email", 
              s.id as "salon_id", s.name as "salon_name", s.address as "salon_address"
            FROM salon_employees se
            LEFT JOIN users u ON se.user_id = u.id
            LEFT JOIN salons s ON se.salon_id = s.id
            WHERE se.id = $1`,
            [fav.salonEmployeeId],
          );

          if (employee && employee[0]) {
            const emp = employee[0];

            // Parse details
            // Skills typically stored as comma-separated string in simple-array
            let specialization = 'Stylist';
            if (emp.skills) {
              // If it's a string, use it or split it. simple-array usually stores as "skill1,skill2"
              specialization = emp.skills.split(',')[0] || 'Stylist';
            }

            return {
              id: fav.id,
              customerId: fav.customerId,
              salonEmployeeId: fav.salonEmployeeId,
              createdAt: fav.createdAt,
              employee: {
                id: emp.id,
                userId: emp.userId,
                salonId: emp.salonId,
                specialization: specialization,
                rating: 5.0, // Default rating as it's not in the main table
                user: {
                  id: emp.user_id,
                  fullName: emp.user_fullName,
                  email: emp.user_email,
                  profileImage: null,
                },
                salon: {
                  id: emp.salon_id,
                  name: emp.salon_name,
                  address: emp.salon_address,
                },
              },
            };
          }

          // If employee not found, return basic info
          console.warn(
            '[FAVORITES] Employee not found for ID:',
            fav.salonEmployeeId,
          );
          return {
            id: fav.id,
            customerId: fav.customerId,
            salonEmployeeId: fav.salonEmployeeId,
            createdAt: fav.createdAt,
          };
        } catch (error) {
          console.error('[FAVORITES] Error fetching employee details:', error);
          // Return basic info if error
          return {
            id: fav.id,
            customerId: fav.customerId,
            salonEmployeeId: fav.salonEmployeeId,
            createdAt: fav.createdAt,
          };
        }
      }),
    );

    return favoritesWithDetails;
  }

  /**
   * Add an employee to favorites
   */
  async addFavorite(
    customerId: string,
    salonEmployeeId: string,
  ): Promise<CustomerFavorite> {
    // Check if already exists
    const existing = await this.favoritesRepository.findOne({
      where: { customerId, salonEmployeeId },
    });

    if (existing) {
      throw new ConflictException('This employee is already in your favorites');
    }

    const favorite = this.favoritesRepository.create({
      customerId,
      salonEmployeeId,
    });

    return this.favoritesRepository.save(favorite);
  }

  /**
   * Remove an employee from favorites
   */
  async removeFavorite(favoriteId: string, customerId: string): Promise<void> {
    const favorite = await this.favoritesRepository.findOne({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    // Ensure the favorite belongs to the customer
    if (favorite.customerId !== customerId) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoritesRepository.remove(favorite);
  }

  /**
   * Check if an employee is favorited by a customer
   */
  async isFavorite(
    customerId: string,
    salonEmployeeId: string,
  ): Promise<boolean> {
    const favorite = await this.favoritesRepository.findOne({
      where: { customerId, salonEmployeeId },
    });

    return !!favorite;
  }
}
