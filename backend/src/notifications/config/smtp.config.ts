import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

@Injectable()
export class SmtpConfigService implements OnModuleInit {
  private readonly logger = new Logger(SmtpConfigService.name);
  private config: SmtpConfig;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.validateAndLoadConfig();
  }

  private validateAndLoadConfig(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure =
      this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'SalonJu',
    );

    // Check if SMTP is configured (at least host and user should be present)
    const isConfigured = host && user && password && fromEmail;

    if (!isConfigured) {
      const missing = [];
      if (!host) missing.push('SMTP_HOST');
      if (!user) missing.push('SMTP_USER');
      if (!password) missing.push('SMTP_PASSWORD');
      if (!fromEmail) missing.push('SMTP_FROM_EMAIL');

      this.logger.warn(
        `⚠️  SMTP not fully configured. Missing: ${missing.join(', ')}. Email notifications will be disabled. In-app notifications will still work.`,
      );
      this.logger.warn(
        `To enable email notifications, add these to your .env file: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL`,
      );

      // Set default/empty config so app doesn't crash
      this.config = {
        host: host || 'localhost',
        port: port || 587,
        secure,
        user: user || '',
        password: password || '',
        fromEmail: fromEmail || 'noreply@salonju.com',
        fromName,
      };
      return;
    }

    this.config = {
      host,
      port: Number(port),
      secure,
      user,
      password,
      fromEmail,
      fromName,
    };

    this.logger.log('✅ SMTP configuration loaded successfully');
    this.logger.debug(`SMTP Host: ${this.config.host}:${this.config.port}`);
  }

  getConfig(): SmtpConfig {
    if (!this.config) {
      this.validateAndLoadConfig();
    }
    return this.config;
  }
}
