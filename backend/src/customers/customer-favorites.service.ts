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
   * Get all favorites for a customer with details
   */
  async findByCustomerId(customerId: string): Promise<any[]> {
    const favorites = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .where('favorite.customerId = :customerId', { customerId })
      .orderBy('favorite.createdAt', 'DESC')
      .getMany();

    const favoritesWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        try {
          if (fav.type === 'salon' && fav.salonId) {
            return this.fetchSalonFavoriteDetails(fav);
          } else if (fav.salonEmployeeId) {
            return this.fetchEmployeeFavoriteDetails(fav);
          }
          return {
            id: fav.id,
            customerId: fav.customerId,
            salonEmployeeId: fav.salonEmployeeId,
            salonId: fav.salonId,
            type: fav.type,
            createdAt: fav.createdAt,
          };
        } catch (error) {
          console.error('[FAVORITES] Error fetching details:', error);
          return {
            id: fav.id,
            customerId: fav.customerId,
            salonEmployeeId: fav.salonEmployeeId,
            salonId: fav.salonId,
            type: fav.type,
            createdAt: fav.createdAt,
          };
        }
      }),
    );

    return favoritesWithDetails;
  }

  /**
   * Get salon favorites for a customer (returns salon objects for browse page)
   */
  async findSalonFavoritesByCustomerId(customerId: string): Promise<any[]> {
    const favorites = await this.favoritesRepository.find({
      where: { customerId, type: 'salon' },
      order: { createdAt: 'DESC' },
    });

    const salons = await Promise.all(
      favorites.map(async (fav) => {
        try {
          const result = await this.dataSource.query(
            `SELECT id, name, address, phone, email, description, status,
                    city, district, country, latitude, longitude, website,
                    images, settings, registration_number as "registrationNumber",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM salons WHERE id = $1`,
            [fav.salonId],
          );
          if (result && result[0]) {
            return result[0];
          }
          return null;
        } catch {
          return null;
        }
      }),
    );

    return salons.filter(Boolean);
  }

  private async fetchSalonFavoriteDetails(fav: CustomerFavorite) {
    const salon = await this.dataSource.query(
      `SELECT id, name, address, phone, email, description, status,
              city, district, country, website,
              created_at as "createdAt"
       FROM salons WHERE id = $1`,
      [fav.salonId],
    );

    return {
      id: fav.id,
      customerId: fav.customerId,
      salonId: fav.salonId,
      type: 'salon',
      createdAt: fav.createdAt,
      salon: salon?.[0] || null,
    };
  }

  private async fetchEmployeeFavoriteDetails(fav: CustomerFavorite) {
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
      let specialization = 'Stylist';
      if (emp.skills) {
        specialization = emp.skills.split(',')[0] || 'Stylist';
      }

      return {
        id: fav.id,
        customerId: fav.customerId,
        salonEmployeeId: fav.salonEmployeeId,
        type: 'employee',
        createdAt: fav.createdAt,
        employee: {
          id: emp.id,
          userId: emp.userId,
          salonId: emp.salonId,
          specialization,
          rating: 5.0,
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

    console.warn(
      '[FAVORITES] Employee not found for ID:',
      fav.salonEmployeeId,
    );
    return {
      id: fav.id,
      customerId: fav.customerId,
      salonEmployeeId: fav.salonEmployeeId,
      type: 'employee',
      createdAt: fav.createdAt,
    };
  }

  /**
   * Add a salon or employee to favorites
   */
  async addFavorite(
    customerId: string,
    salonEmployeeId?: string,
    salonId?: string,
    type: string = 'employee',
  ): Promise<CustomerFavorite> {
    if (type === 'salon' && salonId) {
      const existing = await this.favoritesRepository.findOne({
        where: { customerId, salonId, type: 'salon' },
      });
      if (existing) {
        throw new ConflictException('This salon is already in your favorites');
      }
      const favorite = this.favoritesRepository.create({
        customerId,
        salonId,
        type: 'salon',
      });
      return this.favoritesRepository.save(favorite);
    }

    // Employee favorite (legacy behavior)
    if (!salonEmployeeId) {
      throw new NotFoundException('salonEmployeeId is required for employee favorites');
    }
    const existing = await this.favoritesRepository.findOne({
      where: { customerId, salonEmployeeId },
    });
    if (existing) {
      throw new ConflictException('This employee is already in your favorites');
    }
    const favorite = this.favoritesRepository.create({
      customerId,
      salonEmployeeId,
      type: 'employee',
    });
    return this.favoritesRepository.save(favorite);
  }

  /**
   * Remove a favorite by ID or by salonId
   */
  async removeFavorite(favoriteId: string, customerId: string): Promise<void> {
    // First try by favorite record ID
    let favorite = await this.favoritesRepository.findOne({
      where: { id: favoriteId },
    });

    // If not found, try treating favoriteId as a salonId
    if (!favorite) {
      favorite = await this.favoritesRepository.findOne({
        where: { customerId, salonId: favoriteId, type: 'salon' },
      });
    }

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

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
