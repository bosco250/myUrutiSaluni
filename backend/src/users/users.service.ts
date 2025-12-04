import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.usersRepository.find({ where: { role } });
    }
    return this.usersRepository.find();
  }

  async findAllForEmployeeSelection(): Promise<Partial<User>[]> {
    // Return only necessary fields for employee selection
    // Exclude admins and other salon owners from selection
    return this.usersRepository.find({
      select: ['id', 'fullName', 'email', 'phone', 'role'],
      where: [
        { role: UserRole.CUSTOMER },
        { role: UserRole.SALON_EMPLOYEE }, // Can reassign existing employees
      ],
    });
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

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async assignMembershipNumber(userId: string, membershipNumber?: string): Promise<User> {
    const user = await this.findOne(userId);
    
    if (membershipNumber) {
      // Check if the membership number is already taken
      const existing = await this.usersRepository.findOne({
        where: { membershipNumber },
      });
      
      if (existing && existing.id !== userId) {
        throw new BadRequestException(`Membership number ${membershipNumber} is already assigned to another user`);
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
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
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
}

