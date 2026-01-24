import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { EmailService } from '../notifications/services/email.service';
import { EmailTemplateService } from '../notifications/services/email-template.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private emailTemplateService: EmailTemplateService,
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save the hashed token to the database
    await this.usersService.update(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    });

    // Build reset URL
    const frontendUrls = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    ).split(',');
    
    // Use the first URL (primary) for reset links
    const frontendUrl = frontendUrls[0].trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      const emailHtml = this.emailTemplateService.renderTemplate(
        'password_reset',
        {
          customerName: user.fullName || 'User',
          actionUrl: resetUrl,
        },
      );

      await this.emailService.sendEmail(
        user.email,
        'Reset Your Password - Uruti Saluni',
        emailHtml,
      );

      this.logger.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}:`,
        error,
      );
      // Still return success for security - don't reveal email sending failures
    }

    // Log token for development purposes (remove in production)
    this.logger.debug(`Password reset token for ${email}: ${resetToken}`);

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const users = await this.usersService.findAll();
    const user = users.find(
      (u) =>
        u.resetPasswordToken === hashedToken &&
        u.resetPasswordExpires &&
        new Date(u.resetPasswordExpires) > new Date(),
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user.id, {
      passwordHash: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    this.logger.log(`Password successfully reset for user: ${user.email}`);

    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}
