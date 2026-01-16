import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request } from 'express';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Resolution result with source tracking for debugging
 */
export interface SalonIdResolutionResult {
  salonId: string | null;
  source:
    | 'url_param'
    | 'body'
    | 'query'
    | 'entity_appointment'
    | 'entity_service'
    | 'entity_customer'
    | 'employee_default'
    | 'not_found';
  employeeRecord?: SalonEmployee;
}

/**
 * SalonIdResolverService
 *
 * Resolves salonId from multiple sources using a fallback chain:
 * 1. URL path (:salonId param) → Highest priority
 * 2. Request body (body.salonId) → Second priority
 * 3. Request query (?salonId=xxx) → Third priority
 * 4. Entity extraction (from appointmentId, serviceId, etc.)
 * 5. Employee's active/default salon (from context)
 */
@Injectable()
export class SalonIdResolverService {
  private readonly logger = new Logger(SalonIdResolverService.name);

  constructor(
    @InjectRepository(SalonEmployee)
    private salonEmployeeRepository: Repository<SalonEmployee>,
    private dataSource: DataSource,
  ) {}

  /**
   * Resolve salonId from request using fallback chain
   */
  async resolveSalonId(
    request: Request,
    user: User,
  ): Promise<SalonIdResolutionResult> {
    // 1. URL path parameter (highest priority)
    if (request.params?.salonId && this.isValidUUID(request.params.salonId)) {
      this.logger.debug(
        `✅ Resolved salonId from URL param: ${request.params.salonId}`,
      );
      return {
        salonId: request.params.salonId,
        source: 'url_param',
      };
    }

    // 2. Request body
    const body = request.body || {};
    if (body.salonId && this.isValidUUID(body.salonId)) {
      this.logger.debug(`✅ Resolved salonId from body: ${body.salonId}`);
      return {
        salonId: body.salonId,
        source: 'body',
      };
    }

    // 3. Query string
    const query = request.query || {};
    if (query.salonId && this.isValidUUID(query.salonId as string)) {
      this.logger.debug(`✅ Resolved salonId from query: ${query.salonId}`);
      return {
        salonId: query.salonId as string,
        source: 'query',
      };
    }

    // 4. Entity extraction using raw queries to avoid circular deps
    const entityResult = await this.extractFromEntities(request);
    if (entityResult.salonId) {
      this.logger.debug(
        `✅ Resolved salonId from entity: ${entityResult.salonId} (${entityResult.source})`,
      );
      return entityResult;
    }

    // 5. Employee's default/active salon
    const employeeResult = await this.getEmployeeActiveSalon(user.id);
    if (employeeResult.salonId) {
      this.logger.debug(
        `✅ Resolved salonId from employee default: ${employeeResult.salonId}`,
      );
      return employeeResult;
    }

    // Not found
    this.logger.warn(`⚠️ Could not resolve salonId for user: ${user.id}`);
    return {
      salonId: null,
      source: 'not_found',
    };
  }

  /**
   * Extract salonId from related entities using raw queries
   * This avoids circular dependencies between modules
   */
  private async extractFromEntities(
    request: Request,
  ): Promise<SalonIdResolutionResult> {
    const params = request.params || {};
    const body = request.body || {};

    // Try appointmentId
    const appointmentId =
      params.appointmentId || params.id || body.appointmentId;
    if (appointmentId && this.isValidUUID(appointmentId)) {
      try {
        const result = await this.dataSource.query(
          `SELECT salon_id as "salonId" FROM appointments WHERE id = $1`,
          [appointmentId],
        );
        if (result?.[0]?.salonId) {
          return {
            salonId: result[0].salonId,
            source: 'entity_appointment',
          };
        }
      } catch (error) {
        this.logger.debug(`Could not find appointment: ${appointmentId}`);
      }
    }

    // Try serviceId
    const serviceId = params.serviceId || body.serviceId;
    if (serviceId && this.isValidUUID(serviceId)) {
      try {
        const result = await this.dataSource.query(
          `SELECT salon_id as "salonId" FROM services WHERE id = $1`,
          [serviceId],
        );
        if (result?.[0]?.salonId) {
          return {
            salonId: result[0].salonId,
            source: 'entity_service',
          };
        }
      } catch (error) {
        this.logger.debug(`Could not find service: ${serviceId}`);
      }
    }

    // Try customerId to get their last salon
    const customerId = params.customerId || body.customerId;
    if (customerId && this.isValidUUID(customerId)) {
      try {
        const result = await this.dataSource.query(
          `SELECT salon_id as "salonId" FROM customers WHERE id = $1`,
          [customerId],
        );
        if (result?.[0]?.salonId) {
          return {
            salonId: result[0].salonId,
            source: 'entity_customer',
          };
        }
      } catch (error) {
        this.logger.debug(`Could not find customer: ${customerId}`);
      }
    }

    // Try expenseId
    const expenseId = params.expenseId || params.id || body.expenseId;
    if (expenseId && this.isValidUUID(expenseId)) {
      try {
        const result = await this.dataSource.query(
          `SELECT salon_id as "salonId" FROM expenses WHERE id = $1`,
          [expenseId],
        );
        if (result?.[0]?.salonId) {
          return {
            salonId: result[0].salonId,
            source: 'entity_expense' as any,
          };
        }
      } catch (error) {
        this.logger.debug(`Could not find expense: ${expenseId}`);
      }
    }

    return {
      salonId: null,
      source: 'not_found',
    };
  }

  /**
   * Get employee's active/default salon
   * Prioritizes salons where employee has permissions
   */
  private async getEmployeeActiveSalon(
    userId: string,
  ): Promise<SalonIdResolutionResult> {
    try {
      // Get all active employee records for this user
      const employeeRecords = await this.salonEmployeeRepository.find({
        where: {
          userId,
          isActive: true,
        },
        relations: ['salon'],
        order: {
          createdAt: 'DESC',
        },
      });

      if (employeeRecords.length === 0) {
        return {
          salonId: null,
          source: 'not_found',
        };
      }

      // If only one salon, use it
      if (employeeRecords.length === 1) {
        return {
          salonId: employeeRecords[0].salonId,
          source: 'employee_default',
          employeeRecord: employeeRecords[0],
        };
      }

      // Multiple salons - check which has more permissions
      // Using raw query to avoid circular dependency
      const permissionCounts = await this.dataSource.query(
        `SELECT salon_employee_id as "employeeId", COUNT(*) as "count"
         FROM employee_permissions 
         WHERE salon_employee_id = ANY($1) AND is_active = true
         GROUP BY salon_employee_id`,
        [employeeRecords.map((e) => e.id)],
      );

      const countMap = new Map<string, number>();
      for (const row of permissionCounts || []) {
        countMap.set(row.employeeId, parseInt(row.count, 10));
      }

      // Find employee with most permissions
      const bestRecord = employeeRecords.reduce((best, current) => {
        const bestCount = countMap.get(best.id) || 0;
        const currentCount = countMap.get(current.id) || 0;
        return currentCount > bestCount ? current : best;
      }, employeeRecords[0]);

      return {
        salonId: bestRecord.salonId,
        source: 'employee_default',
        employeeRecord: bestRecord,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching employee salons for user ${userId}:`,
        error,
      );
      return {
        salonId: null,
        source: 'not_found',
      };
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get all salons where user is an active employee
   */
  async getEmployeeSalons(userId: string): Promise<SalonEmployee[]> {
    return this.salonEmployeeRepository.find({
      where: {
        userId,
        isActive: true,
      },
      relations: ['salon'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
