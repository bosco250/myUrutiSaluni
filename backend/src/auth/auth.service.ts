import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (isPasswordValid) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async validateUserByPhone(phone: string, password: string): Promise<any> {
    const user = await this.usersService.findByPhone(phone);
    if (user && user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (isPasswordValid) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      phone: user.phone,
      sub: user.id,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role?: string,
  ) {
    // Validate and restrict role selection for public registration
    // Only allow CUSTOMER, SALON_OWNER, or SALON_EMPLOYEE roles for public registration
    const allowedRoles = [
      UserRole.CUSTOMER,
      UserRole.SALON_OWNER,
      UserRole.SALON_EMPLOYEE,
    ];
    let userRole = UserRole.CUSTOMER; // Default

    if (role) {
      const requestedRole = role as UserRole;
      if (allowedRoles.includes(requestedRole)) {
        userRole = requestedRole;
      } else {
        // If invalid role provided, default to CUSTOMER
        console.warn(
          `[AUTH] Invalid role '${role}' provided during registration. Defaulting to CUSTOMER.`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      passwordHash: hashedPassword,
      fullName,
      phone,
      role: userRole,
    });
    return this.login(user);
  }
}
