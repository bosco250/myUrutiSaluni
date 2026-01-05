import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonCustomer } from './entities/salon-customer.entity';
import { Customer } from './entities/customer.entity';

export interface SalonCustomerWithStats extends SalonCustomer {
  customer: Customer;
  averageOrderValue?: number;
  averageDaysBetweenVisits?: number;
  daysSinceLastVisit?: number;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number; // Visited in last 30 days
  newCustomers: number; // First visit in last 30 days
  churnedCustomers: number; // No visit in last 90 days
  averageCLV: number; // Customer Lifetime Value
  averageVisitFrequency: number;
  topCustomers: SalonCustomerWithStats[];
}

@Injectable()
export class SalonCustomerService {
  private readonly logger = new Logger(SalonCustomerService.name);

  constructor(
    @InjectRepository(SalonCustomer)
    private salonCustomerRepository: Repository<SalonCustomer>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  /**
   * Get or create salon-customer relationship
   */
  async getOrCreate(
    salonId: string,
    customerId: string,
  ): Promise<SalonCustomer> {
    let salonCustomer = await this.salonCustomerRepository.findOne({
      where: { salonId, customerId },
      relations: ['customer', 'salon'],
    });

    if (!salonCustomer) {
      salonCustomer = this.salonCustomerRepository.create({
        salonId,
        customerId,
        visitCount: 0,
        totalSpent: 0,
        tags: [],
        preferences: {},
        communicationPreferences: {},
      });
      salonCustomer = await this.salonCustomerRepository.save(salonCustomer);
    }

    return salonCustomer;
  }

  /**
   * Update visit tracking when a sale is made
   */
  async recordVisit(
    salonId: string,
    customerId: string,
    amount: number,
    visitDate?: Date,
  ): Promise<void> {
    if (!salonId || !customerId) {
      this.logger.warn(
        `Cannot record visit: missing salonId or customerId (salonId: ${salonId}, customerId: ${customerId})`,
      );
      return;
    }

    const salonCustomer = await this.getOrCreate(salonId, customerId);
    const now = visitDate || new Date();
    const visitAmount = Number(amount) || 0;

    // Increment visit count
    salonCustomer.visitCount = (salonCustomer.visitCount || 0) + 1;

    // Add to total spent
    salonCustomer.totalSpent =
      Number(salonCustomer.totalSpent || 0) + visitAmount;

    // Update last visit date
    if (
      !salonCustomer.lastVisitDate ||
      now > new Date(salonCustomer.lastVisitDate)
    ) {
      salonCustomer.lastVisitDate = now;
    }

    // Set first visit date if not set
    if (!salonCustomer.firstVisitDate) {
      salonCustomer.firstVisitDate = now;
    } else {
      // Ensure first visit date is the earliest
      const existingFirstVisit = new Date(salonCustomer.firstVisitDate);
      if (now < existingFirstVisit) {
        salonCustomer.firstVisitDate = now;
      }
    }

    await this.salonCustomerRepository.save(salonCustomer);
    this.logger.debug(
      `Recorded visit for customer ${customerId} at salon ${salonId}: amount=${visitAmount}, visitCount=${salonCustomer.visitCount}`,
    );
  }

  /**
   * Update visit tracking when an appointment is completed
   * @param amount - Optional amount from service price or actual payment
   */
  async recordAppointmentVisit(
    salonId: string,
    customerId: string,
    visitDate?: Date,
    amount?: number,
  ): Promise<void> {
    if (!salonId || !customerId) {
      this.logger.warn(
        `Cannot record appointment visit: missing salonId or customerId (salonId: ${salonId}, customerId: ${customerId})`,
      );
      return;
    }

    const salonCustomer = await this.getOrCreate(salonId, customerId);
    const now = visitDate || new Date();
    const visitAmount = Number(amount) || 0;

    // Increment visit count for completed appointments
    salonCustomer.visitCount = (salonCustomer.visitCount || 0) + 1;

    // Add service amount to total spent if provided
    if (visitAmount > 0) {
      salonCustomer.totalSpent =
        Number(salonCustomer.totalSpent || 0) + visitAmount;
    }

    // Update last visit date
    if (
      !salonCustomer.lastVisitDate ||
      now > new Date(salonCustomer.lastVisitDate)
    ) {
      salonCustomer.lastVisitDate = now;
    }

    // Set first visit date if not set
    if (!salonCustomer.firstVisitDate) {
      salonCustomer.firstVisitDate = now;
    } else {
      // Ensure first visit date is the earliest
      const existingFirstVisit = new Date(salonCustomer.firstVisitDate);
      if (now < existingFirstVisit) {
        salonCustomer.firstVisitDate = now;
      }
    }

    await this.salonCustomerRepository.save(salonCustomer);
    this.logger.debug(
      `Recorded appointment visit for customer ${customerId} at salon ${salonId}: amount=${visitAmount}, visitCount=${salonCustomer.visitCount}`,
    );
  }

  /**
   * Get all customers for a salon with statistics
   */
  async findBySalonId(
    salonId: string,
    options?: {
      search?: string;
      tags?: string[];
      minVisits?: number;
      minSpent?: number;
      daysSinceLastVisit?: number;
      sortBy?: 'lastVisit' | 'totalSpent' | 'visitCount' | 'name';
      sortOrder?: 'ASC' | 'DESC';
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: SalonCustomerWithStats[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Check if we have any salon-customer records, if not, try to sync from existing data
    const existingCount = await this.salonCustomerRepository.count({
      where: { salonId },
    });

    if (existingCount === 0) {
      // Auto-sync if no records exist (might be first time or data migration needed)
      try {
        await this.syncFromExistingData(salonId);
        this.logger.log(`Auto-synced salon-customer data for salon ${salonId}`);
      } catch (error) {
        this.logger.warn(
          `Auto-sync failed for salon ${salonId}: ${error.message}`,
        );
      }
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const query = this.salonCustomerRepository
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.customer', 'customer')
      .where('sc.salonId = :salonId', { salonId });

    // Apply filters
    if (options?.search) {
      query.andWhere(
        '(customer.fullName ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.tags && options.tags.length > 0) {
      query.andWhere('sc.tags && :tags', { tags: options.tags });
    }

    if (options?.minVisits) {
      query.andWhere('sc.visitCount >= :minVisits', {
        minVisits: options.minVisits,
      });
    }

    if (options?.minSpent) {
      query.andWhere('sc.totalSpent >= :minSpent', {
        minSpent: options.minSpent,
      });
    }

    if (options?.daysSinceLastVisit !== undefined) {
      const dateThreshold = new Date();
      dateThreshold.setDate(
        dateThreshold.getDate() - options.daysSinceLastVisit,
      );
      query.andWhere('sc.lastVisitDate <= :dateThreshold', {
        dateThreshold,
      });
    }

    // Apply sorting with NULL handling
    const sortBy = options?.sortBy || 'lastVisit';
    const sortOrder = options?.sortOrder || 'DESC';

    switch (sortBy) {
      case 'totalSpent':
        query.orderBy('sc.totalSpent', sortOrder);
        break;
      case 'visitCount':
        query.orderBy('sc.visitCount', sortOrder);
        break;
      case 'name':
        query.orderBy('customer.fullName', sortOrder);
        break;
      case 'lastVisit':
      default:
        // PostgreSQL handles NULLs: NULLS LAST for DESC (default), NULLS FIRST for ASC (default)
        query.orderBy('sc.lastVisitDate', sortOrder);
        break;
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination and get data
    const data = await query.skip(skip).take(limit).getMany();

    // Enrich with additional statistics (with error handling)
    const enrichedData = await Promise.all(
      data.map((sc) => {
        try {
          return this.enrichWithStats(sc);
        } catch (error) {
          this.logger.warn(
            `Failed to enrich stats for salon-customer ${sc.id}: ${error.message}`,
          );
          return sc as SalonCustomerWithStats;
        }
      }),
    );

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Enrich salon customer with additional statistics
   */
  private enrichWithStats(
    salonCustomer: SalonCustomer,
  ): SalonCustomerWithStats {
    const stats: Partial<SalonCustomerWithStats> = {};

    // Calculate average order value
    if (salonCustomer.visitCount > 0 && salonCustomer.totalSpent > 0) {
      stats.averageOrderValue =
        Number(salonCustomer.totalSpent) / salonCustomer.visitCount;
    }

    // Calculate days since last visit
    if (salonCustomer.lastVisitDate) {
      const now = new Date();
      const lastVisit = new Date(salonCustomer.lastVisitDate);
      stats.daysSinceLastVisit = Math.floor(
        (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Calculate average days between visits
    if (
      salonCustomer.firstVisitDate &&
      salonCustomer.lastVisitDate &&
      salonCustomer.visitCount > 1
    ) {
      const firstVisit = new Date(salonCustomer.firstVisitDate);
      const lastVisit = new Date(salonCustomer.lastVisitDate);
      const totalDays =
        (lastVisit.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24);
      stats.averageDaysBetweenVisits = Math.floor(
        totalDays / (salonCustomer.visitCount - 1),
      );
    }

    return { ...salonCustomer, ...stats } as SalonCustomerWithStats;
  }

  /**
   * Get customer analytics for a salon
   */
  async getSalonCustomerAnalytics(salonId: string): Promise<CustomerAnalytics> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const allCustomers = await this.salonCustomerRepository.find({
        where: { salonId },
      });

      const activeCustomers = allCustomers.filter(
        (c) => c.lastVisitDate && new Date(c.lastVisitDate) >= thirtyDaysAgo,
      );

      const newCustomers = allCustomers.filter(
        (c) => c.firstVisitDate && new Date(c.firstVisitDate) >= thirtyDaysAgo,
      );

      const churnedCustomers = allCustomers.filter(
        (c) => !c.lastVisitDate || new Date(c.lastVisitDate) < ninetyDaysAgo,
      );

      const totalCLV = allCustomers.reduce(
        (sum, c) => sum + Number(c.totalSpent || 0),
        0,
      );
      const averageCLV =
        allCustomers.length > 0 ? totalCLV / allCustomers.length : 0;

      const totalVisits = allCustomers.reduce(
        (sum, c) => sum + (c.visitCount || 0),
        0,
      );
      const averageVisitFrequency =
        allCustomers.length > 0 ? totalVisits / allCustomers.length : 0;

      // Get top customers
      const topCustomersData = await this.salonCustomerRepository.find({
        where: { salonId },
        relations: ['customer'],
        order: { totalSpent: 'DESC' },
        take: 10,
      });

      const topCustomers = await Promise.all(
        topCustomersData.map((sc) => {
          try {
            return this.enrichWithStats(sc);
          } catch (error) {
            this.logger.warn(
              `Failed to enrich stats for customer ${sc.id}: ${error.message}`,
            );
            return sc as SalonCustomerWithStats;
          }
        }),
      );

      return {
        totalCustomers: allCustomers.length,
        activeCustomers: activeCustomers.length,
        newCustomers: newCustomers.length,
        churnedCustomers: churnedCustomers.length,
        averageCLV,
        averageVisitFrequency,
        topCustomers,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get salon customer analytics for salon ${salonId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a single salon-customer by salonId and customerId
   */
  async findBySalonAndCustomer(
    salonId: string,
    customerId: string,
  ): Promise<SalonCustomerWithStats | null> {
    const salonCustomer = await this.salonCustomerRepository.findOne({
      where: { salonId, customerId },
      relations: ['customer', 'salon'],
    });

    if (!salonCustomer) {
      // If salon-customer doesn't exist, try to create it from existing data
      // This handles cases where customer has activity but no salon_customer record
      try {
        await this.syncFromExistingData(salonId);
        // Try again after sync
        const retrySalonCustomer = await this.salonCustomerRepository.findOne({
          where: { salonId, customerId },
          relations: ['customer', 'salon'],
        });
        if (!retrySalonCustomer) {
          return null;
        }
        return this.enrichWithStats(retrySalonCustomer);
      } catch (error) {
        this.logger.warn(
          `Failed to sync customer data for ${customerId} at salon ${salonId}: ${error.message}`,
        );
        return null;
      }
    }

    // Ensure customer relation is loaded
    if (!salonCustomer.customer) {
      this.logger.warn(
        `SalonCustomer ${salonCustomer.id} has no customer relation. CustomerId: ${customerId}`,
      );
      // Try to reload with customer
      const reloaded = await this.salonCustomerRepository.findOne({
        where: { salonId, customerId },
        relations: ['customer', 'salon'],
      });
      if (reloaded && reloaded.customer) {
        return this.enrichWithStats(reloaded);
      }
      return null;
    }

    return this.enrichWithStats(salonCustomer);
  }

  /**
   * Update salon-customer relationship
   */
  async update(
    salonId: string,
    customerId: string,
    updateData: Partial<SalonCustomer>,
  ): Promise<SalonCustomer> {
    const salonCustomer = await this.getOrCreate(salonId, customerId);

    Object.assign(salonCustomer, updateData);
    return this.salonCustomerRepository.save(salonCustomer);
  }

  /**
   * Add tags to a customer
   */
  async addTags(
    salonId: string,
    customerId: string,
    tags: string[],
  ): Promise<SalonCustomer> {
    const salonCustomer = await this.getOrCreate(salonId, customerId);
    const existingTags = salonCustomer.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];
    salonCustomer.tags = newTags;
    return this.salonCustomerRepository.save(salonCustomer);
  }

  /**
   * Remove tags from a customer
   */
  async removeTags(
    salonId: string,
    customerId: string,
    tags: string[],
  ): Promise<SalonCustomer> {
    const salonCustomer = await this.getOrCreate(salonId, customerId);
    const existingTags = salonCustomer.tags || [];
    salonCustomer.tags = existingTags.filter((tag) => !tags.includes(tag));
    return this.salonCustomerRepository.save(salonCustomer);
  }

  /**
   * Get customer activity timeline
   * Note: This method uses raw queries to avoid circular dependencies
   */
  async getCustomerActivityTimeline(
    salonId: string,
    customerId: string,
  ): Promise<any[]> {
    const queryRunner =
      this.salonCustomerRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();

      // Get sales
      const sales = await queryRunner.query(
        `SELECT s.*, 
         json_agg(json_build_object(
           'id', si.id,
           'serviceId', si.service_id,
           'productId', si.product_id,
           'unitPrice', si.unit_price,
           'quantity', si.quantity,
           'lineTotal', si.line_total
         )) as items
         FROM sales s
         LEFT JOIN sale_items si ON si.sale_id = s.id
         WHERE s.salon_id = $1 AND s.customer_id = $2
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [salonId, customerId],
      );

      // Get appointments
      const appointments = await queryRunner.query(
        `SELECT a.*, 
         json_build_object('id', s.id, 'name', s.name) as service
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.salon_id = $1 AND a.customer_id = $2
         ORDER BY a.scheduled_start DESC`,
        [salonId, customerId],
      );

      const timeline: any[] = [];

      // Add sales to timeline
      sales.forEach((sale: any) => {
        timeline.push({
          type: 'sale',
          id: sale.id,
          date: new Date(sale.created_at),
          title: `Sale - RWF ${Number(sale.total_amount).toLocaleString()}`,
          description: `Payment: ${sale.payment_method || 'N/A'}`,
          data: sale,
        });
      });

      // Add appointments to timeline
      appointments.forEach((apt: any) => {
        timeline.push({
          type: 'appointment',
          id: apt.id,
          date: new Date(apt.scheduled_start),
          title: `Appointment - ${apt.service?.name || 'Service'}`,
          description: `Status: ${apt.status}`,
          data: apt,
        });
      });

      // Sort by date descending
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

      return timeline;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Recalculate customer statistics from scratch for accurate data
   * This ensures visit counts and totals match actual sales and appointments
   * IMPORTANT: This recalculates from scratch, not adding to existing data
   */
  async recalculateCustomerData(salonId: string): Promise<{
    updated: number;
    fromSales: number;
    fromAppointments: number;
  }> {
    const queryRunner =
      this.salonCustomerRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();

      // Step 1: Calculate combined data from both sales and appointments
      // This ensures we get the correct totals without doubling
      const combinedRecalcQuery = `
        WITH sales_data AS (
          SELECT 
            salon_id,
            customer_id,
            COUNT(*)::integer as sales_visit_count,
            MAX(created_at) as sales_last_visit,
            MIN(created_at) as sales_first_visit,
            COALESCE(SUM(COALESCE(total_amount, 0)), 0) as sales_total
          FROM sales
          WHERE salon_id = $1 AND customer_id IS NOT NULL
          GROUP BY salon_id, customer_id
        ),
        appointments_data AS (
          SELECT 
            a.salon_id,
            a.customer_id,
            COUNT(*)::integer as apt_visit_count,
            MAX(a.scheduled_start) as apt_last_visit,
            MIN(a.scheduled_start) as apt_first_visit,
            COALESCE(SUM(COALESCE(s.base_price, 0)), 0) as apt_total
          FROM appointments a
          LEFT JOIN services s ON s.id = a.service_id
          WHERE a.salon_id = $1 
            AND a.customer_id IS NOT NULL 
            AND a.status = 'completed'
          GROUP BY a.salon_id, a.customer_id
        ),
        combined_data AS (
          SELECT 
            COALESCE(s.salon_id, a.salon_id) as salon_id,
            COALESCE(s.customer_id, a.customer_id) as customer_id,
            COALESCE(s.sales_visit_count, 0) + COALESCE(a.apt_visit_count, 0) as total_visit_count,
            COALESCE(s.sales_total, 0) + COALESCE(a.apt_total, 0) as total_spent,
            GREATEST(
              COALESCE(s.sales_last_visit, '1970-01-01'::timestamp),
              COALESCE(a.apt_last_visit, '1970-01-01'::timestamp)
            ) as last_visit_date,
            LEAST(
              COALESCE(s.sales_first_visit, '9999-12-31'::timestamp),
              COALESCE(a.apt_first_visit, '9999-12-31'::timestamp)
            ) as first_visit_date
          FROM sales_data s
          FULL OUTER JOIN appointments_data a 
            ON s.salon_id = a.salon_id AND s.customer_id = a.customer_id
        )
        UPDATE salon_customers sc
        SET 
          visit_count = COALESCE(cd.total_visit_count, 0),
          total_spent = COALESCE(cd.total_spent, 0),
          last_visit_date = cd.last_visit_date,
          first_visit_date = cd.first_visit_date
        FROM combined_data cd
        WHERE sc.salon_id = $1 
          AND sc.salon_id = cd.salon_id 
          AND sc.customer_id = cd.customer_id;
      `;

      const updateResult = await queryRunner.query(combinedRecalcQuery, [
        salonId,
      ]);
      const updated = updateResult.length || 0;

      // Get counts for reporting
      const salesCount = await queryRunner.query(
        `SELECT COUNT(DISTINCT customer_id) as count FROM sales WHERE salon_id = $1 AND customer_id IS NOT NULL`,
        [salonId],
      );
      const aptCount = await queryRunner.query(
        `SELECT COUNT(DISTINCT customer_id) as count FROM appointments WHERE salon_id = $1 AND customer_id IS NOT NULL AND status = 'completed'`,
        [salonId],
      );

      const fromSales = parseInt(salesCount[0]?.count || '0', 10);
      const fromAppointments = parseInt(aptCount[0]?.count || '0', 10);

      this.logger.log(
        `Recalculated customer data for salon ${salonId}: ${updated} customers updated (${fromSales} from sales, ${fromAppointments} from appointments)`,
      );

      return {
        updated,
        fromSales,
        fromAppointments,
      };
    } catch (error) {
      this.logger.error(
        `Failed to recalculate customer data: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Sync salon-customer records from existing sales and appointments
   * This backfills data for existing customers who have activity but no salon_customer record
   */
  async syncFromExistingData(salonId?: string): Promise<{
    synced: number;
    fromSales: number;
    fromAppointments: number;
  }> {
    const queryRunner =
      this.salonCustomerRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();

      // First, check if we have any sales or appointments to sync
      let checkSalesQuery = `
        SELECT COUNT(DISTINCT customer_id) as count
        FROM sales
        WHERE customer_id IS NOT NULL AND salon_id IS NOT NULL
      `;
      let checkAppointmentsQuery = `
        SELECT COUNT(DISTINCT customer_id) as count
        FROM appointments
        WHERE customer_id IS NOT NULL 
          AND salon_id IS NOT NULL
          AND status = 'completed'
      `;

      if (salonId) {
        checkSalesQuery += ' AND salon_id = $1';
        checkAppointmentsQuery += ' AND salon_id = $1';
      }

      const salesCheck = await queryRunner.query(
        checkSalesQuery,
        salonId ? [salonId] : [],
      );
      const appointmentsCheck = await queryRunner.query(
        checkAppointmentsQuery,
        salonId ? [salonId] : [],
      );

      const salesCount = parseInt(salesCheck[0]?.count || '0', 10);
      const appointmentsCount = parseInt(
        appointmentsCheck[0]?.count || '0',
        10,
      );

      this.logger.log(
        `Found ${salesCount} customers with sales and ${appointmentsCount} customers with appointments`,
      );

      // Get count before sync
      const countBefore = await this.salonCustomerRepository.count(
        salonId ? { where: { salonId } } : {},
      );

      let fromSales = 0;
      let fromAppointments = 0;

      // Use the same recalculate logic to prevent doubling - recalculate from scratch
      // This ensures sync doesn't increment existing values
      const combinedRecalcQuery = `
        WITH sales_data AS (
          SELECT 
            salon_id,
            customer_id,
            COUNT(*)::integer as sales_visit_count,
            MAX(created_at) as sales_last_visit,
            MIN(created_at) as sales_first_visit,
            COALESCE(SUM(COALESCE(total_amount, 0)), 0) as sales_total
          FROM sales
          WHERE salon_id = $1 AND customer_id IS NOT NULL
          GROUP BY salon_id, customer_id
        ),
        appointments_data AS (
          SELECT 
            a.salon_id,
            a.customer_id,
            COUNT(*)::integer as apt_visit_count,
            MAX(a.scheduled_start) as apt_last_visit,
            MIN(a.scheduled_start) as apt_first_visit,
            COALESCE(SUM(COALESCE(s.base_price, 0)), 0) as apt_total
          FROM appointments a
          LEFT JOIN services s ON s.id = a.service_id
          WHERE a.salon_id = $1 
            AND a.customer_id IS NOT NULL 
            AND a.status = 'completed'
          GROUP BY a.salon_id, a.customer_id
        ),
        combined_data AS (
          SELECT 
            COALESCE(s.salon_id, a.salon_id) as salon_id,
            COALESCE(s.customer_id, a.customer_id) as customer_id,
            COALESCE(s.sales_visit_count, 0) + COALESCE(a.apt_visit_count, 0) as total_visit_count,
            COALESCE(s.sales_total, 0) + COALESCE(a.apt_total, 0) as total_spent,
            GREATEST(
              COALESCE(s.sales_last_visit, '1970-01-01'::timestamp),
              COALESCE(a.apt_last_visit, '1970-01-01'::timestamp)
            ) as last_visit_date,
            LEAST(
              COALESCE(s.sales_first_visit, '9999-12-31'::timestamp),
              COALESCE(a.apt_first_visit, '9999-12-31'::timestamp)
            ) as first_visit_date
          FROM sales_data s
          FULL OUTER JOIN appointments_data a 
            ON s.salon_id = a.salon_id AND s.customer_id = a.customer_id
        )
        INSERT INTO salon_customers (salon_id, customer_id, visit_count, total_spent, last_visit_date, first_visit_date)
        SELECT salon_id, customer_id, total_visit_count, total_spent, last_visit_date, first_visit_date
        FROM combined_data
        ON CONFLICT (salon_id, customer_id) DO UPDATE SET
          visit_count = EXCLUDED.visit_count,
          total_spent = EXCLUDED.total_spent,
          last_visit_date = EXCLUDED.last_visit_date,
          first_visit_date = EXCLUDED.first_visit_date;
      `;

      await queryRunner.query(combinedRecalcQuery, [salonId]);

      // Get counts for reporting
      const salesCountResult = await queryRunner.query(
        `SELECT COUNT(DISTINCT customer_id) as count FROM sales WHERE salon_id = $1 AND customer_id IS NOT NULL`,
        [salonId],
      );
      const aptCountResult = await queryRunner.query(
        `SELECT COUNT(DISTINCT customer_id) as count FROM appointments WHERE salon_id = $1 AND customer_id IS NOT NULL AND status = 'completed'`,
        [salonId],
      );

      fromSales = parseInt(salesCountResult[0]?.count || '0', 10);
      fromAppointments = parseInt(aptCountResult[0]?.count || '0', 10);

      this.logger.log(
        `Synced customer data: ${fromSales} from sales, ${fromAppointments} from appointments`,
      );

      // Get actual count after sync
      const finalCount = await this.salonCustomerRepository.count(
        salonId ? { where: { salonId } } : {},
      );
      const synced = finalCount - countBefore;

      this.logger.log(
        `Sync completed. Total salon-customer records: ${finalCount} (${synced} new records, ${fromSales} from sales, ${fromAppointments} from appointments)`,
      );

      // After initial sync, recalculate to ensure accuracy
      if (salonId && finalCount > 0) {
        try {
          await this.recalculateCustomerData(salonId);
        } catch (error) {
          this.logger.warn(
            `Failed to recalculate after sync: ${error.message}`,
          );
        }
      }

      return {
        synced: synced > 0 ? synced : finalCount,
        fromSales,
        fromAppointments,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync salon-customer data: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Export customers to CSV format
   */
  async exportCustomersToCSV(salonId: string): Promise<string> {
    const customers = await this.salonCustomerRepository.find({
      where: { salonId },
      relations: ['customer'],
      order: { lastVisitDate: 'DESC' },
    });

    const headers = [
      'Name',
      'Phone',
      'Email',
      'Visit Count',
      'Total Spent',
      'Last Visit',
      'First Visit',
      'Tags',
      'Notes',
    ];

    const rows = customers.map((sc) => [
      sc.customer.fullName,
      sc.customer.phone || '',
      sc.customer.email || '',
      sc.visitCount || 0,
      Number(sc.totalSpent || 0).toFixed(2),
      sc.lastVisitDate ? new Date(sc.lastVisitDate).toISOString() : '',
      sc.firstVisitDate ? new Date(sc.firstVisitDate).toISOString() : '',
      (sc.tags || []).join('; '),
      sc.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
