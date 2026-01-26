import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { SalonsService } from '../salons/salons.service';
import { ServicesService } from '../services/services.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Product } from '../inventory/entities/product.entity';

export interface SearchResultItem {
  id: string;
  type: 'salon' | 'service' | 'customer' | 'user' | 'sale' | 'appointment' | 'product' | 'page';
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  metadata?: Record<string, any>;
}

export interface GlobalSearchResult {
  query: string;
  totalCount: number;
  categories: {
    name: string;
    items: SearchResultItem[];
  }[];
}

interface SearchContext {
  userId: string;
  userRole: UserRole;
  salonIds?: string[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly salonsService: SalonsService,
    private readonly servicesService: ServicesService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  /**
   * Global search with role-based access control
   */
  async globalSearch(
    query: string,
    context: SearchContext,
  ): Promise<GlobalSearchResult> {
    // If no query, return default navigation pages
    if (!query || query.trim() === '') {
      const { userRole } = context;
      const pages = this.searchPages('', userRole);
      return {
        query: '',
        totalCount: pages.length,
        categories: [{ name: 'Quick Navigation', items: pages }]
      };
    }

    if (query.length < 2) {
      return { query, totalCount: 0, categories: [] };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const categories: GlobalSearchResult['categories'] = [];
    let totalCount = 0;

    try {
      // Determine what the user can search based on their role
      const { userRole, salonIds } = context;

      // 1. Search Salons (role-filtered)
      if (this.canSearchSalons(userRole)) {
        const salons = await this.searchSalons(query, context);
        if (salons.length > 0) {
          categories.push({ name: 'Salons', items: salons });
          totalCount += salons.length;
        }
      }

      // 2. Search Services (role-filtered)
      if (this.canSearchServices(userRole)) {
        const services = await this.searchServices(query, context);
        if (services.length > 0) {
          categories.push({ name: 'Services', items: services });
          totalCount += services.length;
        }
      }

      // 3. Search Customers (role-filtered)
      if (this.canSearchCustomers(userRole)) {
        const customers = await this.searchCustomers(query, context);
        if (customers.length > 0) {
          categories.push({ name: 'Customers', items: customers });
          totalCount += customers.length;
        }
      }

      // 4. Search Products (role-filtered)
      if (this.canSearchProducts(userRole)) {
        const products = await this.searchProducts(query, context);
        if (products.length > 0) {
          categories.push({ name: 'Products', items: products });
          totalCount += products.length;
        }
      }

      // 5. Search Users (admin only)
      if (this.canSearchUsers(userRole)) {
        const users = await this.searchUsers(query, context);
        if (users.length > 0) {
          categories.push({ name: 'Users', items: users });
          totalCount += users.length;
        }
      }

      // 6. Search Appointments (role-filtered)
      if (this.canSearchAppointments(userRole)) {
        const appointments = await this.searchAppointments(query, context);
        if (appointments.length > 0) {
          categories.push({ name: 'Appointments', items: appointments });
          totalCount += appointments.length;
        }
      }

      // 7. Search Sales (role-filtered)
      if (this.canSearchSales(userRole)) {
        const sales = await this.searchSales(query, context);
        if (sales.length > 0) {
          categories.push({ name: 'Sales', items: sales });
          totalCount += sales.length;
        }
      }

      // 8. Add matching pages/commands
      const pages = this.searchPages(query, userRole);
      if (pages.length > 0) {
        categories.unshift({ name: 'Pages', items: pages });
        totalCount += pages.length;
      }

    } catch (error) {
      this.logger.error(`Global search failed: ${error.message}`, error.stack);
    }

    return { query, totalCount, categories };
  }

  // --- Permission Checks ---

  private canSearchSalons(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ].includes(role);
  }

  private canSearchServices(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
      UserRole.CUSTOMER,
    ].includes(role);
  }

  private canSearchCustomers(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ].includes(role);
  }

  private canSearchProducts(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ].includes(role);
  }

  private canSearchUsers(role: UserRole): boolean {
    return [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN].includes(role);
  }

  private canSearchAppointments(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ].includes(role);
  }

  private canSearchSales(role: UserRole): boolean {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.ASSOCIATION_ADMIN,
      UserRole.DISTRICT_LEADER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ].includes(role);
  }

  // --- Search Methods ---

  private async searchSalons(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const salons = await this.salonsService.search(query);
      
      // Filter by accessible salons for non-admins
      let filteredSalons = salons;
      if (
        context.userRole === UserRole.SALON_OWNER ||
        context.userRole === UserRole.SALON_EMPLOYEE
      ) {
        if (context.salonIds && context.salonIds.length > 0) {
          filteredSalons = salons.filter((s: any) =>
            context.salonIds!.includes(s.id),
          );
        }
      }

      return filteredSalons.slice(0, 5).map((salon: any) => ({
        id: salon.id,
        type: 'salon' as const,
        title: salon.name,
        subtitle: salon.address || salon.district || 'Salon',
        description: salon.phone,
        href: `/salons/${salon.id}`,
        metadata: { status: salon.status },
      }));
    } catch (error) {
      this.logger.warn(`Salon search failed: ${error.message}`);
      return [];
    }
  }

  private async searchServices(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const services = await this.servicesService.search(query);
      
      return services.slice(0, 5).map((service: any) => ({
        id: service.id,
        type: 'service' as const,
        title: service.name,
        subtitle: `RWF ${Number(service.price || 0).toLocaleString()}`,
        description: service.description?.substring(0, 60),
        href: `/services?highlight=${service.id}`,
        metadata: { duration: service.duration, category: service.category },
      }));
    } catch (error) {
      this.logger.warn(`Service search failed: ${error.message}`);
      return [];
    }
  }

  private async searchCustomers(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const whereConditions: any = [
        { fullName: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
        { phone: ILike(`%${query}%`) },
      ];

      const customers = await this.customersRepository.find({
        where: whereConditions,
        take: 5,
        order: { createdAt: 'DESC' },
      });

      return customers.map((customer) => ({
        id: customer.id,
        type: 'customer' as const,
        title: customer.fullName || 'Unknown Customer',
        subtitle: customer.phone || customer.email || '',
        href: `/customers/${customer.id}`,
        metadata: { loyaltyPoints: customer.loyaltyPoints },
      }));
    } catch (error) {
      this.logger.warn(`Customer search failed: ${error.message}`);
      return [];
    }
  }

  private async searchProducts(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const whereConditions: any = [
        { name: ILike(`%${query}%`) },
        { sku: ILike(`%${query}%`) },
      ];

      let products: Product[];

      // Filter by salon for non-admins
      if (
        context.salonIds &&
        context.salonIds.length > 0 &&
        (context.userRole === UserRole.SALON_OWNER ||
          context.userRole === UserRole.SALON_EMPLOYEE)
      ) {
        products = await this.productsRepository.find({
          where: whereConditions.map((cond: any) => ({
            ...cond,
            salonId: In(context.salonIds!),
          })),
          take: 5,
          order: { name: 'ASC' },
        });
      } else {
        products = await this.productsRepository.find({
          where: whereConditions,
          take: 5,
          order: { name: 'ASC' },
        });
      }

      return products.map((product) => ({
        id: product.id,
        type: 'product' as const,
        title: product.name,
        subtitle: `RWF ${Number(product.unitPrice || 0).toLocaleString()}`,
        description: product.sku ? `SKU: ${product.sku}` : undefined,
        href: `/inventory?product=${product.id}`,
        metadata: { isInventoryItem: product.isInventoryItem },
      }));
    } catch (error) {
      this.logger.warn(`Product search failed: ${error.message}`);
      return [];
    }
  }

  private async searchUsers(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const users = await this.usersRepository.find({
        where: [
          { fullName: ILike(`%${query}%`) },
          { email: ILike(`%${query}%`) },
          { phone: ILike(`%${query}%`) },
        ],
        take: 5,
        order: { createdAt: 'DESC' },
      });

      return users.map((user) => ({
        id: user.id,
        type: 'user' as const,
        title: user.fullName || 'Unknown User',
        subtitle: user.role?.replace(/_/g, ' ') || 'User',
        description: user.email,
        href: `/users/${user.id}`,
        metadata: { role: user.role, isActive: user.isActive },
      }));
    } catch (error) {
      this.logger.warn(`User search failed: ${error.message}`);
      return [];
    }
  }

  private async searchAppointments(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      // Search by customer name or service - requires join
      const qb = this.appointmentsRepository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.customer', 'customer')
        .leftJoinAndSelect('appointment.service', 'service')
        .leftJoinAndSelect('appointment.salon', 'salon')
        .where('customer.fullName ILIKE :query', { query: `%${query}%` })
        .orWhere('service.name ILIKE :query', { query: `%${query}%` })
        .orderBy('appointment.scheduledStart', 'DESC')
        .take(5);

      // Filter by salon for non-admins
      if (
        context.salonIds &&
        context.salonIds.length > 0 &&
        (context.userRole === UserRole.SALON_OWNER ||
          context.userRole === UserRole.SALON_EMPLOYEE)
      ) {
        qb.andWhere('appointment.salonId IN (:...salonIds)', {
          salonIds: context.salonIds,
        });
      }

      const appointments = await qb.getMany();

      return appointments.map((apt) => ({
        id: apt.id,
        type: 'appointment' as const,
        title: (apt as any).customer?.fullName || 'Walk-in',
        subtitle: (apt as any).service?.name || 'Appointment',
        description: apt.scheduledStart
          ? new Date(apt.scheduledStart).toLocaleDateString()
          : undefined,
        href: `/appointments/${apt.id}`,
        metadata: { status: apt.status },
      }));
    } catch (error) {
      this.logger.warn(`Appointment search failed: ${error.message}`);
      return [];
    }
  }

  private async searchSales(
    query: string,
    context: SearchContext,
  ): Promise<SearchResultItem[]> {
    try {
      const qb = this.salesRepository
        .createQueryBuilder('sale')
        .leftJoinAndSelect('sale.customer', 'customer')
        .leftJoinAndSelect('sale.salon', 'salon')
        .where('customer.fullName ILIKE :query', { query: `%${query}%` })
        .orWhere('sale.id::text ILIKE :query', { query: `%${query}%` })
        .orderBy('sale.createdAt', 'DESC')
        .take(5);

      // Filter by salon for non-admins
      if (
        context.salonIds &&
        context.salonIds.length > 0 &&
        (context.userRole === UserRole.SALON_OWNER ||
          context.userRole === UserRole.SALON_EMPLOYEE)
      ) {
        qb.andWhere('sale.salonId IN (:...salonIds)', {
          salonIds: context.salonIds,
        });
      }

      const sales = await qb.getMany();

      return sales.map((sale) => ({
        id: sale.id,
        type: 'sale' as const,
        title: (sale as any).customer?.fullName || 'Walk-in Sale',
        subtitle: `RWF ${Number(sale.totalAmount || 0).toLocaleString()}`,
        description: new Date(sale.createdAt).toLocaleDateString(),
        href: `/sales/${sale.id}`,
        metadata: { status: sale.status, paymentMethod: sale.paymentMethod },
      }));
    } catch (error) {
      this.logger.warn(`Sales search failed: ${error.message}`);
      return [];
    }
  }

  private searchPages(query: string, userRole: UserRole): SearchResultItem[] {
    const pages: Array<{
      id: string;
      name: string;
      href: string;
      keywords: string[];
      requiredRoles?: UserRole[];
    }> = [
      // Main
      { id: 'dashboard', name: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview', 'stats'] },
      
      // Management
      { id: 'users', name: 'Users', href: '/users', keywords: ['user', 'people', 'admin', 'role'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN] },
      { id: 'memberships', name: 'Memberships', href: '/memberships', keywords: ['membership', 'salon', 'member', 'association'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      { id: 'salons-list', name: 'Salons List', href: '/salons', keywords: ['salon', 'business', 'shop'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
      { id: 'customers', name: 'Customers', href: '/customers', keywords: ['client', 'customer', 'people'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },

      // Membership Specific
      { id: 'membership-apply', name: 'Apply for Membership', href: '/membership/apply', keywords: ['membership', 'apply', 'application', 'join'], requiredRoles: [UserRole.CUSTOMER, UserRole.SALON_OWNER] },
      { id: 'membership-applications', name: 'Review Applications', href: '/membership/applications', keywords: ['membership', 'applications', 'review', 'approve'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN] },

      // Operations
      { id: 'appointments', name: 'Appointments', href: '/appointments', keywords: ['booking', 'schedule', 'calendar'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
      { id: 'services', name: 'Services', href: '/services', keywords: ['service', 'offering', 'treatment'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
      { id: 'sales', name: 'Sales & POS', href: '/sales', keywords: ['pos', 'transaction', 'sale', 'checkout'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
      { id: 'inventory', name: 'Inventory', href: '/inventory', keywords: ['stock', 'products', 'items'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },

      // Finance
      { id: 'commissions', name: 'Commissions', href: '/commissions', keywords: ['commission', 'employee', 'earnings'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE] },
      { id: 'payroll', name: 'Payroll', href: '/payroll', keywords: ['payroll', 'salary', 'payment', 'wages'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER] },
      { id: 'accounting', name: 'Accounting', href: '/accounting', keywords: ['finance', 'money', 'accounts'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      { id: 'loans', name: 'Loans', href: '/loans', keywords: ['loan', 'credit', 'lending'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      { id: 'wallets', name: 'Wallets', href: '/wallets', keywords: ['wallet', 'balance', 'payment'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      
      // Integrations & Analytics
      { id: 'airtel', name: 'Airtel', href: '/airtel', keywords: ['airtel', 'mobile', 'money'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      { id: 'reports', name: 'Reports', href: '/reports', keywords: ['report', 'analytics', 'data'], requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER] },
      
      // System
      { id: 'settings', name: 'Settings', href: '/settings', keywords: ['config', 'preferences', 'setup'] },
    ];

    const searchLower = query.toLowerCase();
    
    return pages
      .filter((page) => {
        // Check role permission
        if (page.requiredRoles && page.requiredRoles.length > 0) {
          // If user role is NOT in required roles
          if (!page.requiredRoles.includes(userRole)) {
            return false;
          }
        }
        
        // If empty query, return everything user has access to (limit to top results in UI)
        if (!query || query.trim() === '') {
          return true;
        }

        // Check if matches
        return (
          page.name.toLowerCase().includes(searchLower) ||
          page.keywords.some((kw) => kw.includes(searchLower))
        );
      })
      .map((page) => ({
        id: page.id,
        type: 'page' as const,
        title: page.name,
        subtitle: 'Navigation',
        href: page.href,
        metadata: { category: 'Navigation' }
      }));
  }

  // Legacy method for backwards compatibility
  async search(query: string): Promise<{ salons: any[]; services: any[] }> {
    if (!query || query.length < 2) {
      return { salons: [], services: [] };
    }

    const [salons, services] = await Promise.all([
      this.salonsService.search(query),
      this.servicesService.search(query),
    ]);

    return { salons, services };
  }
}
