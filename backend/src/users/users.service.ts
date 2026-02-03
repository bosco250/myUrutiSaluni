import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => WalletsService))
    private walletsService: WalletsService,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);
    
    // Automatically provision a wallet for the new user
    await this.walletsService.getOrCreateWallet(savedUser.id);
    
    return savedUser;
  }

  async findAll(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.usersRepository.find({ where: { role } });
    }
    return this.usersRepository.find();
  }

  async findAllForEmployeeSelection(search?: string): Promise<Partial<User>[]> {
    // Return only necessary fields for employee selection
    // Only return registered salon employees (users who have registered as salon employees)
    const query = this.usersRepository.createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email', 'user.phone', 'user.role'])
      .where('user.role = :employeeRole', { 
        employeeRole: UserRole.SALON_EMPLOYEE 
      });

    if (search) {
      query.andWhere(
        '(LOWER(user.fullName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search) OR user.phone LIKE :search)',
        { search: `%${search}%` }
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async findNamesByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; fullName: string }>> {
    if (!userIds || userIds.length === 0) {
      return [];
    }
    const users = await this.usersRepository.find({
      where: userIds.map((id) => ({ id })),
      select: ['id', 'fullName'],
    });
    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName || 'Unknown',
    }));
  }

  async update(id: string, updateData: any): Promise<User> {
    // Map avatar to avatarUrl if present (fix for DTO mismatch)
    if (updateData.avatar) {
      updateData.avatarUrl = updateData.avatar;
      delete updateData.avatar;
    }

    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async assignMembershipNumber(
    userId: string,
    membershipNumber?: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (membershipNumber) {
      // Check if the membership number is already taken
      const existing = await this.usersRepository.findOne({
        where: { membershipNumber },
      });

      if (existing && existing.id !== userId) {
        throw new BadRequestException(
          `Membership number ${membershipNumber} is already assigned to another user`,
        );
      }

      user.membershipNumber = membershipNumber;
    } else {
      // Generate a new membership number if not provided
      user.membershipNumber = await this.generateMemberMembershipNumber();
    }

    return this.usersRepository.save(user);
  }

  private async generateMemberMembershipNumber(): Promise<string> {
    // Generate a unique membership number for individual member: MEMBER-YYYY-XXXXXX
    // Ensure uniqueness by checking database
    let membershipNumber: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');
      membershipNumber = `MEMBER-${year}-${random}`;

      // Check if this membership number already exists
      const existing = await this.usersRepository.findOne({
        where: { membershipNumber },
      });

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      // Fallback: use timestamp-based number
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      membershipNumber = `MEMBER-${year}-${timestamp}`;
    }

    return membershipNumber!;
  }

  /**
   * Find users in a specific district (for district leaders)
   */
  async findByDistrict(district: string, role?: UserRole): Promise<User[]> {
    const where: any = { district };
    if (role) {
      where.role = role;
    }
    return this.usersRepository.find({ where });
  }
}
