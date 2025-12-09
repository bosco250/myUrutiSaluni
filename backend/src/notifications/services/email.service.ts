import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpConfigService } from '../config/smtp.config';
import {
  EmailTemplateService,
  EmailTemplateVariables,
} from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private smtpConfig: SmtpConfigService,
    private templateService: EmailTemplateService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const config = this.smtpConfig.getConfig();

    // Check if SMTP is properly configured
    if (!config.user || !config.password || config.host === 'localhost') {
      this.logger.warn(
        '⚠️  SMTP not configured - email notifications will be disabled',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    // Verify connection (async, don't block)
    this.transporter.verify((error) => {
      if (error) {
        this.logger.warn(
          'SMTP connection verification failed (emails may not work):',
          error.message,
        );
      } else {
        this.logger.log('✅ SMTP connection verified successfully');
      }
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // If SMTP not configured, skip email sending
    if (!this.transporter) {
      this.logger.warn(
        `⚠️ Email attempt to ${to} failed: SMTP not configured. Please check your .env file.`,
      );
      return {
        success: false,
        error: 'SMTP not configured - check server logs',
      };
    }
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = this.smtpConfig.getConfig();
        const textContent = text || html.replace(/<[^>]*>/g, '');

        const info = await this.transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to,
          subject,
          text: textContent,
          html,
        });

        this.logger.log(
          `✅ Email sent successfully to ${to} (attempt ${attempt}): ${info.messageId}`,
        );
        return { success: true, messageId: info.messageId };
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Failed to send email to ${to} (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `❌ Failed to send email to ${to} after ${maxRetries} attempts:`,
      lastError,
    );
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  async sendEmailNotification(params: {
    to: string;
    subject: string;
    template: string;
    variables: EmailTemplateVariables;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const html = this.templateService.renderTemplate(
        params.template,
        params.variables,
      );
      const text = html.replace(/<[^>]*>/g, '');

      return await this.sendEmail(params.to, params.subject, html, text);
    } catch (error: any) {
      this.logger.error(`Failed to send email notification:`, error);
      return {
        success: false,
        error: error.message || 'Template rendering failed',
      };
    }
  }
}
