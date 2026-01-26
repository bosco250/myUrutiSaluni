import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(customerData: Partial<Customer>): Promise<Customer> {
    const customer = this.customersRepository.create(customerData);
    return this.customersRepository.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return this.customersRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customersRepository.findOne({ where: { phone } });
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async update(id: string, updateData: Partial<Customer>): Promise<Customer> {
    await this.customersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.customersRepository.delete(id);
  }

  /**
   * Get or create customer profile for any user
   * This allows salon owners/employees to book appointments as customers
   */
  async getOrCreateCustomerForUser(user: any): Promise<Customer> {
    // Check if customer profile already exists
    let customer = await this.findByUserId(user.id);

    if (!customer) {
      // Auto-create customer profile for this user
      // Handle different possible field names and provide fallbacks
      const fullName = user.fullName || user.full_name || user.name || user.email || 'Guest User';

      customer = await this.customersRepository.save({
        userId: user.id,
        fullName: fullName,
        email: user.email || null,
        phone: user.phone || null,
        metadata: {
          autoCreated: true,
          userRole: user.role,
          createdForSelfBooking: true,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return customer;
  }
}
