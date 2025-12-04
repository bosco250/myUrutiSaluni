import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    // For production, configure with actual SMTP settings
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      // In development, log instead of actually sending
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`[DEV] Email would be sent to ${to}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Body: ${text || html.substring(0, 100)}...`);
        return true;
      }

      const info = await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@salonju.com'),
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html,
      });

      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendAppointmentReminder(
    to: string,
    customerName: string,
    appointmentDate: Date,
    salonName: string,
    serviceName: string,
  ): Promise<boolean> {
    const subject = `Appointment Reminder - ${salonName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #6366f1; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
            </div>
            <div class="content">
              <p>Hello ${customerName},</p>
              <p>This is a reminder about your upcoming appointment:</p>
              <div class="info-box">
                <p><strong>Salon:</strong> ${salonName}</p>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Date & Time:</strong> ${appointmentDate.toLocaleString()}</p>
              </div>
              <p>We look forward to seeing you!</p>
              <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from SalonJu</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }
}

