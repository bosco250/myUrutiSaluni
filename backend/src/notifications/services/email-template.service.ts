import { Injectable } from '@nestjs/common';

export interface EmailTemplateVariables {
  customerName?: string;
  salonName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  employeeName?: string;
  saleAmount?: string;
  saleItems?: Array<{ name: string; quantity: number; price: string }>;
  paymentMethod?: string;
  pointsEarned?: number;
  pointsBalance?: number;
  commissionAmount?: string;
  productName?: string;
  stockLevel?: number;
  minStock?: number;
  actionUrl?: string;
  unsubscribeUrl?: string;
  [key: string]: any;
}

@Injectable()
export class EmailTemplateService {
  private readonly baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.5; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .email-wrapper { width: 100%; background-color: #f9fafb; padding: 24px 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
        .header { background-color: #C89B68; background-image: linear-gradient(135deg, #C89B68 0%, #A67C52 100%); padding: 32px 24px; border-bottom: 3px solid #8D6E46; }
        .header-content { display: table; width: 100%; }
        .brand-section { display: table-cell; vertical-align: middle; }
        .brand-logo { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
        .brand-tagline { font-size: 11px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; letter-spacing: 0.3px; }
        .header-title { display: table-cell; vertical-align: middle; text-align: right; }
        .header-title h1 { font-size: 15px; font-weight: 600; color: #ffffff; margin: 0; letter-spacing: 0.3px; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .message { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; }
        .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 3px solid #C89B68; }
        .info-row { display: table; width: 100%; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .info-row:last-child { border-bottom: none; padding-bottom: 0; }
        .info-row:first-child { padding-top: 0; }
        .info-label { display: table-cell; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; width: 45%; vertical-align: top; padding-top: 2px; }
        .info-value { display: table-cell; font-size: 14px; font-weight: 600; color: #111827; text-align: right; vertical-align: top; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .data-table td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table .info-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; width: 42%; }
        .data-table .info-value { font-size: 14px; font-weight: 600; color: #111827; text-align: right; }
        .highlight-box { background-color: #fffbeb; background-image: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
        .highlight-number { font-size: 28px; font-weight: 700; color: #d97706; margin-bottom: 4px; }
        .highlight-label { font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; }
        .highlight-divider { height: 1px; background: #fde68a; margin: 16px 0; }
        .highlight-secondary { font-size: 11px; color: #78350f; margin-top: 4px; font-weight: 500; }
        .highlight-balance { font-size: 18px; font-weight: 700; color: #b45309; margin-top: 6px; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 3px solid #ef4444; border-radius: 6px; padding: 18px; margin: 20px 0; }
        .alert-box-warning { background: #fffbeb; border: 1px solid #fde68a; border-left: 3px solid #f59e0b; }
        .alert-box-success { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 3px solid #22c55e; }
        .alert-title { font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 8px; display: flex; align-items: center; }
        .alert-box-warning .alert-title { color: #92400e; }
        .alert-box-success .alert-title { color: #166534; }
        .alert-content { font-size: 13px; color: #7f1d1d; line-height: 1.5; }
        .alert-box-warning .alert-content { color: #78350f; }
        .alert-box-success .alert-content { color: #14532d; }
        .alert-list { margin: 8px 0 0 0; padding-left: 20px; }
        .alert-list li { margin: 4px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .items-table th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
        .items-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .items-table tr:last-child td { border-bottom: none; }
        .total-row { background: #fafafa; border-top: 2px solid #e5e7eb !important; }
        .total-row td { padding: 14px 12px !important; font-weight: 600; }
        .total-label { font-size: 13px; color: #111827; text-transform: uppercase; letter-spacing: 0.5px; }
        .total-amount { font-size: 16px; color: #C89B68; font-weight: 700; }
        .button-container { text-align: center; margin: 28px 0 24px; }
        .button { display: inline-block; background: #C89B68; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; letter-spacing: 0.3px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(200, 155, 104, 0.25); }
        .button:hover { background: #A67C52; box-shadow: 0 4px 6px rgba(200, 155, 104, 0.35); }
        .footer { background: #f9fafb; padding: 28px 24px; border-top: 1px solid #e5e7eb; }
        .footer-brand { font-weight: 700; color: #C89B68; font-size: 14px; margin-bottom: 12px; letter-spacing: 0.5px; text-align: center; }
        .footer-links { text-align: center; margin-bottom: 16px; }
        .footer-link { color: #6b7280; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: 500; }
        .footer-link:hover { color: #C89B68; }
        .footer-text { text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; }
        .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
        .url-break { word-break: break-all; color: #C89B68; font-size: 12px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="header-content">
              <div class="brand-section">
                <div class="brand-logo">URUTI SALUNI</div>
                <div class="brand-tagline">Professional Beauty Services</div>
              </div>
              <div class="header-title">
                <h1>{{headerTitle}}</h1>
              </div>
            </div>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <div class="footer-brand">URUTI SALUNI</div>
            <div class="footer-links">
              <a href="#" class="footer-link">Website</a>
              <a href="#" class="footer-link">Contact</a>
              <a href="#" class="footer-link">Privacy</a>
            </div>
            <div class="footer-text">
              &copy; ${new Date().getFullYear()} Uruti Saluni. All rights reserved.<br>
              You're receiving this as a registered member.
              {{#if unsubscribeUrl}}<br><a href="{{unsubscribeUrl}}" style="color: #9ca3af; text-decoration: underline;">Manage Preferences</a>{{/if}}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  renderTemplate(
    templateName: string,
    variables: EmailTemplateVariables,
  ): string {
    let template = this.getTemplate(templateName);

    // Handle saleItems specifically
    if (variables.saleItems) {
      const itemsHtml = this.renderItemsTable(variables.saleItems);
      template = template.replace('{{saleItemsTable}}', itemsHtml);
    } else {
      template = template.replace('{{saleItemsTable}}', '');
    }

    // Process {{#if variable}}...{{/if}} conditional blocks
    // Uses a loop to handle nested blocks by processing innermost ones first
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}((?:(?!\{\{#if)[\s\S])*?)(?:\{\{else\}\}((?:(?!\{\{#if)[\s\S])*?))?\{\{\/if\}\}/g;
    
    let matchFound = true;
    while (matchFound) {
      matchFound = false;
      template = template.replace(
        conditionalRegex,
        (match, varName, ifContent, elseContent) => {
          matchFound = true; // Continue loop if we found a match
          const value = variables[varName];
          return value ? ifContent : (elseContent || '');
        },
      );
    }

    // Standard variable replacement
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'saleItems') continue; // Skip already handled complex types
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, String(value ?? ''));
    }

    // Remove unused placeholders (but preserve structure)
    template = template.replace(/\{\{[^#/][^}]*\}\}/g, '');

    return template;
  }

  private renderItemsTable(
    items: Array<{ name: string; quantity: number; price: string }>,
  ): string {
    if (!items || items.length === 0) return '';

    const rows = items
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center">${item.quantity}</td>
        <td style="text-align: right; font-weight: 600;">${item.price}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center; width: 60px;">Qty</th>
            <th style="text-align: right; width: 100px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private getTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      appointment_booked: this.getAppointmentBookedTemplate(),
      appointment_reminder: this.getAppointmentReminderTemplate(),
      appointment_confirmed: this.getAppointmentConfirmedTemplate(),
      appointment_cancelled: this.getAppointmentCancelledTemplate(),
      appointment_completed: this.getAppointmentCompletedTemplate(),
      appointment_rescheduled: this.getAppointmentRescheduledTemplate(),
      appointment_no_show: this.getAppointmentNoShowTemplate(),
      sale_completed: this.getSaleCompletedTemplate(),
      commission_earned: this.getCommissionEarnedTemplate(),
      commission_paid: this.getCommissionPaidTemplate(),
      commission_updated: this.getCommissionUpdatedTemplate(),
      payment_received: this.getPaymentReceivedTemplate(),
      payment_failed: this.getPaymentFailedTemplate(),
      points_earned: this.getPointsEarnedTemplate(),
      low_stock_alert: this.getLowStockAlertTemplate(),
      password_reset: this.getPasswordResetTemplate(),
      permission_granted: this.getPermissionGrantedTemplate(),
      permission_revoked: this.getPermissionRevokedTemplate(),
      membership_status: this.getMembershipStatusTemplate(),
      email_change_verification: this.getEmailChangeVerificationTemplate(),
    };

    return templates[templateName] || this.getDefaultTemplate();
  }

  private getEmailChangeVerificationTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Update Email Address')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">You have requested to change your email address. Please click the button below to proceed to the email update page:</div>
        
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Update Email Address</a>
        </div>

        <div class="alert-box alert-box-warning">
          <div class="alert-title">🔒 Security Notice</div>
          <div class="alert-content">
            This link will expire in 15 minutes. If you did not request this change, please ignore this email.
          </div>
        </div>
        
        <div class="divider"></div>

        <div class="message" style="font-size: 12px; color: #9ca3af;">
          <strong>Button not working?</strong> Copy and paste this link into your browser:<br>
          <span class="url-break">{{actionUrl}}</span>
        </div>
      `,
      );
  }



  private getAppointmentBookedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Booking Confirmed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Your appointment has been successfully scheduled. We've reserved your preferred time slot and look forward to serving you.</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span class="info-value">{{appointmentTime}}</span>
          </div>
          {{#if employeeName}}
          <div class="info-row">
            <span class="info-label">Your Stylist</span>
            <span class="info-value">{{employeeName}}</span>
          </div>
          {{/if}}
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Please arrive 5-10 minutes early. If you need to reschedule or cancel, kindly notify us at least 24 hours in advance.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Appointment Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentReminderTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Upcoming Appointment')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">This is a friendly reminder about your upcoming appointment. We're looking forward to seeing you soon!</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span class="info-value">{{appointmentTime}}</span>
          </div>
          {{#if employeeName}}
          <div class="info-row">
            <span class="info-label">Your Stylist</span>
            <span class="info-value">{{employeeName}}</span>
          </div>
          {{/if}}
        </div>

        <div class="alert-box alert-box-warning">
          <div class="alert-title">⏰ Important Reminders</div>
          <div class="alert-content">
            <ul class="alert-list">
              <li>Please arrive 5-10 minutes before your scheduled time</li>
              <li>Cancellations require 24 hours advance notice</li>
              <li>Contact us immediately if you need to reschedule</li>
            </ul>
          </div>
        </div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Manage Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentConfirmedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Confirmed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Great news! Your appointment has been confirmed by our team. Everything is set for your visit.</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span class="info-value">{{appointmentTime}}</span>
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">You'll receive a reminder notification before your appointment. We're excited to serve you!</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentCancelledTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Appointment Cancelled')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Your appointment has been cancelled as requested. We hope to serve you again soon.</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Ready to book again? Visit our website or contact us to schedule a new appointment at your convenience.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Book New Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentCompletedTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', 'Thank You!').replace(
      '{{content}}',
      `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Thank you for choosing {{salonName}}! We hope you loved your service and that you're enjoying your new look.</div>
        
        <div class="alert-box alert-box-success">
          <div class="alert-title">💚 We Value Your Feedback</div>
          <div class="alert-content">
            Your opinion helps us improve our services and better serve our community. Please take a moment to share your experience with us.
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">We'd love to see you again! Check out our loyalty program to earn rewards on your next visit.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Share Your Feedback</a>
        </div>
        {{/if}}
      `,
    );
  }

  private getSaleCompletedTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', 'Payment Receipt').replace(
      '{{content}}',
      `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Thank you for your purchase at {{salonName}}. Your transaction has been completed successfully.</div>
        
        <div class="info-card">
          {{saleItemsTable}}
          
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
            <table class="data-table">
              <tr>
                <td class="info-label" style="font-size: 13px; color: #111827;">Total Amount</td>
                <td class="info-value" style="font-size: 18px; color: #C89B68;">{{saleAmount}}</td>
              </tr>
              <tr>
                <td class="info-label">Payment Method</td>
                <td class="info-value" style="font-size: 13px;">{{paymentMethod}}</td>
              </tr>
            </table>
          </div>
        </div>

        {{#if pointsEarned}}
        <div class="highlight-box">
          <div class="highlight-number">+{{pointsEarned}}</div>
          <div class="highlight-label">Loyalty Points Earned</div>
          <div class="highlight-divider"></div>
          <div class="highlight-secondary">Current Balance</div>
          <div class="highlight-balance">{{pointsBalance}} Points</div>
        </div>
        {{/if}}

        <div class="message" style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Keep this receipt for your records. Contact us if you have any questions about this transaction.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Full Receipt</a>
        </div>
        {{/if}}
      `,
    );
  }

  private getCommissionEarnedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'New Commission')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Congratulations! You've earned a new commission. This amount will be included in your upcoming payroll cycle.</div>
        
        <div class="highlight-box" style="background-color: #f0fdf4; background-image: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #bbf7d0;">
          <div class="highlight-number" style="color: #059669;">{{commissionAmount}}</div>
          <div class="highlight-label" style="color: #166534;">Commission Earned</div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Track all your earnings and commission history through your dashboard.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Commission Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getCommissionPaidTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Payment Processed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Your commission payment has been successfully processed and transferred to your account.</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Amount Paid</span>
            <span class="info-value" style="color: #059669;">{{commissionAmount}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value" style="color: #059669;">Completed</span>
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Please allow 1-3 business days for the payment to reflect in your account. Check your commission history for detailed breakdowns.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Payment Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPointsEarnedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Points Earned')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Excellent news! You've earned loyalty points from your recent visit. Thank you for being a valued member.</div>
        
        <div class="highlight-box">
          <div class="highlight-number">+{{pointsEarned}}</div>
          <div class="highlight-label">Points Added</div>
          <div class="highlight-divider"></div>
          <div class="highlight-secondary">Total Balance</div>
          <div class="highlight-balance">{{pointsBalance}} Points</div>
        </div>

        <div class="alert-box alert-box-success">
          <div class="alert-title">💎 Redeem Your Points</div>
          <div class="alert-content">
            Use your points for discounts on services, exclusive promotions, or special perks. The more you visit, the more you save!
          </div>
        </div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Points & Rewards</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getLowStockAlertTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Low Stock Alert')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Urgent attention required: The following product inventory has fallen below the minimum threshold and needs immediate restocking.</div>
        
        <div class="alert-box">
          <div class="alert-title">⚠️ Inventory Alert</div>
          <div class="alert-content">
            <strong>Product:</strong> {{productName}}<br>
            <strong>Current Stock:</strong> {{stockLevel}} units<br>
            <strong>Minimum Required:</strong> {{minStock}} units
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Please place a reorder to maintain adequate inventory levels and avoid service disruptions.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Manage Inventory</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPasswordResetTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Password Reset')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">We received a request to reset your password. Click the button below to create a new secure password for your account.</div>
        
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Reset Your Password</a>
        </div>

        <div class="alert-box alert-box-warning">
          <div class="alert-title">🔒 Security Information</div>
          <div class="alert-content">
            <ul class="alert-list">
              <li>This reset link expires in <strong>1 hour</strong> for security</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your current password remains active until changed</li>
              <li>Never share your password or reset links with anyone</li>
            </ul>
          </div>
        </div>

        <div class="divider"></div>

        <div class="message" style="font-size: 12px; color: #9ca3af;">
          <strong>Button not working?</strong> Copy and paste this link into your browser:<br>
          <span class="url-break">{{actionUrl}}</span>
        </div>
      `,
      );
  }

  private getDefaultTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', '{{title}}').replace(
      '{{content}}',
      `
        {{#if customerName}}<div class="greeting">Hello {{customerName}},</div>{{/if}}
        <div class="message">{{body}}</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button" style="color: #ffffff;">{{#if actionLabel}}{{actionLabel}}{{else}}View Details{{/if}}</a>
        </div>
        {{/if}}
      `,
    );
  }

  private getAppointmentRescheduledTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Appointment Rescheduled')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Your appointment has been successfully rescheduled. Here are your updated appointment details:</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">New Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">New Time</span>
            <span class="info-value">{{appointmentTime}}</span>
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">You'll receive a reminder before your appointment. Please arrive 5-10 minutes early.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentNoShowTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Missed Appointment')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">We noticed you were unable to attend your scheduled appointment. We understand that circumstances change and hope everything is alright.</div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Location</span>
            <span class="info-value">{{salonName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{serviceName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{appointmentDate}}</span>
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">We'd love to serve you! Book a new appointment online or contact us directly to find a convenient time.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Book New Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getCommissionUpdatedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Commission Updated')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Your commission details have been updated in the system. Please review the changes below.</div>
        
        {{#if commissionAmount}}
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Updated Amount</span>
            <span class="info-value" style="color: #C89B68;">{{commissionAmount}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value">Updated</span>
          </div>
        </div>
        {{/if}}

        <div class="message" style="font-size: 13px; color: #6b7280;">For more detailed information about this update, please check your commission dashboard or contact management.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Commission Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPaymentReceivedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Payment Confirmed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Your payment has been successfully received and processed. Thank you for your prompt payment.</div>
        
        {{#if amount}}
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Amount Received</span>
            <span class="info-value" style="color: #059669;">{{amount}}</span>
          </div>
          {{#if paymentMethod}}
          <div class="info-row">
            <span class="info-label">Payment Method</span>
            <span class="info-value">{{paymentMethod}}</span>
          </div>
          {{/if}}
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value" style="color: #059669;">Completed</span>
          </div>
        </div>
        {{/if}}

        <div class="message" style="font-size: 13px; color: #6b7280;">A detailed receipt has been generated for your records. Contact us if you have any questions about this transaction.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Receipt</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPaymentFailedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Payment Failed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">We were unable to process your payment. Please review the information below and try again.</div>
        
        <div class="alert-box">
          <div class="alert-title">❌ Payment Failed</div>
          <div class="alert-content">
            {{#if amount}}<strong>Amount:</strong> {{amount}}<br>{{/if}}
            {{#if errorMessage}}<strong>Reason:</strong> {{errorMessage}}<br>{{/if}}
            <strong>Action Required:</strong> Please update your payment method and retry
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">If this issue persists, please contact our support team for assistance. We're here to help resolve this quickly.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Retry Payment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPermissionGrantedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Access Granted')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">You've been granted new access permissions at {{salonName}}. You can now access additional features and functionality.</div>
        
        <div class="alert-box alert-box-success">
          <div class="alert-title">✓ New Permissions</div>
          <div class="alert-content">
            <strong>Granted Access:</strong> {{permissions}}<br>
            <strong>Effective:</strong> Immediately
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">Log in to your dashboard to explore your new capabilities. If you have questions about your permissions, contact your administrator.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Go to Dashboard</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPermissionRevokedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Access Updated')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Your access permissions at {{salonName}} have been updated. Some features may no longer be accessible.</div>
        
        <div class="alert-box alert-box-warning">
          <div class="alert-title">⚠️ Permissions Changed</div>
          <div class="alert-content">
            <strong>Removed Access:</strong> {{permissions}}<br>
            <strong>Effective:</strong> Immediately
          </div>
        </div>

        <div class="message" style="font-size: 13px; color: #6b7280;">If you believe this change was made in error or have questions, please contact your system administrator for clarification.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Contact Administrator</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getMembershipStatusTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', '{{title}}')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">{{body}}</div>
        
        <div class="info-card">
           <table class="data-table">
             <tr>
               <td class="info-label">Location</td>
               <td class="info-value">{{salonName}}</td>
             </tr>
             {{#if status}}
             <tr>
               <td class="info-label">Status</td>
               <td class="info-value" style="color: #C89B68;">{{status}}</td>
             </tr>
             {{/if}}
             {{#if expiryDate}}
             <tr>
               <td class="info-label">Expiry Date</td>
               <td class="info-value">{{expiryDate}}</td>
             </tr>
             {{/if}}
             {{#if balance}}
             <tr>
               <td class="info-label">Outstanding Balance</td>
               <td class="info-value" style="color: #ef4444;">{{balance}}</td>
             </tr>
             {{/if}}
           </table>
        </div>

        {{#if balance}}
        <div class="alert-box alert-box-warning">
          <div class="alert-title">💳 Payment Required</div>
          <div class="alert-content">
            Please settle your outstanding balance to maintain your membership benefits and avoid service interruptions.
          </div>
        </div>
        {{/if}}

        <div class="message" style="font-size: 13px; color: #6b7280;">Access your member dashboard for detailed information, transaction history, and payment options.</div>

        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button" style="color: #ffffff;">{{#if actionLabel}}{{actionLabel}}{{else}}View Membership{{/if}}</a>
        </div>
        {{/if}}
      `,
      );
  }
}