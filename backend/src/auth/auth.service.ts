import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { EmailService } from '../notifications/services/email.service';
import { UserSessionsService } from './user-sessions.service';
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
    private sessionsService: UserSessionsService,
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

  async login(user: any, deviceInfo?: any) {
    const payload = {
      email: user.email,
      phone: user.phone,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Create session if device info is provided
    let sessionId = null;
    if (deviceInfo) {
      const session = await this.sessionsService.createSession(
        user.id,
        deviceInfo,
      );
      sessionId = session.id;
    }

    return {
      access_token: accessToken,
      session_id: sessionId,
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
    const frontendUrls = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',');

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

  async requestEmailChange(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store in metadata
    await this.usersService.update(userId, {
      metadata: {
        ...user.metadata,
        emailChangeToken: hashedToken,
        emailChangeExpires: expiresAt,
      },
    });

    // Generate Frontend URL
    const frontendUrls = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',');
    const frontendUrl = frontendUrls[0].trim();
    const actionUrl = `${frontendUrl}/change-email?token=${token}`;

    // Send email
    try {
      const emailHtml = this.emailTemplateService.renderTemplate(
        'email_change_verification',
        {
          customerName: user.fullName || 'User',
          actionUrl: actionUrl,
        },
      );

      await this.emailService.sendEmail(
        user.email,
        'Update Email Address - Uruti Saluni',
        emailHtml,
      );

      this.logger.log(`Email change link sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email change link:`, error);
      throw new BadRequestException('Failed to send verification email');
    }

    return { message: 'Verification link sent to your email' };
  }

  async changeEmail(
    token: string,
    newEmail: string,
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Ideally we should query by the metadata field, but simple-json querying can be specific to DB driver.
    // For now, iterate or use a query builder if possible.
    // Since we are using TypeORM repository find, and metadata is json, strict query might be hard without custom query.
    // We will fetch all users who requested change (not efficient for millions, but fine for now) or better:
    // If we assume we don't have the user ID from the token, we have to search.
    // Wait, the link is just token. We need to find the user BY token.

    // Optimization: Since we don't have a column for this token, we have to scan.
    // OR we pass userId in the query param too? But that's less secure if not signed.
    // The previous implementation used `resetPasswordToken` column which is indexed.
    // Here we are using `metadata.emailChangeToken`.
    // Valid approach: Fetch all users where `metadata` is not null (if possible) or just fetch all active users and filter in memory (bad for scale).
    // BETTER: For now, I will use `resetPasswordToken` column for this purpose as well (or add a column properly, but I can't migrate DB now easily).
    // OR: I'll accept `userId` in the frontend URL query param too. `?token=...&id=...`.
    // BUT user said "when click on that token", implying just token.

    // Let's iterate users for now.
    const users = await this.usersService.findAll();
    const user = users.find(
      (u) =>
        u.metadata?.emailChangeToken === hashedToken &&
        u.metadata?.emailChangeExpires &&
        new Date(u.metadata.emailChangeExpires) > new Date(),
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if new email is taken
    const existingUser = await this.usersService.findByEmail(newEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new BadRequestException('Email is already in use');
    }

    // Update email
    const updatedMetadata = { ...user.metadata };
    delete updatedMetadata.emailChangeToken;
    delete updatedMetadata.emailChangeExpires;

    await this.usersService.update(user.id, {
      email: newEmail,
      metadata: updatedMetadata,
    });

    return { message: 'Email updated successfully' };
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

  async changePassword(
    userId: string,
    changePasswordDto: { oldPassword?: string; newPassword: string },
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user has a password set (social login might not)
    if (user.passwordHash && changePasswordDto.oldPassword) {
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.oldPassword,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid old password');
      }
    } else if (user.passwordHash && !changePasswordDto.oldPassword) {
      // If user has a password but didn't provide old one
      throw new BadRequestException('Old password is required');
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.usersService.update(userId, {
      passwordHash: hashedPassword,
    });

    this.logger.log(`Password successfully updated for user: ${user.email}`);

    return {
      message: 'Password has been updated successfully.',
    };
  }
}
