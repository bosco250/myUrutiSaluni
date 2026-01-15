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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background: #4f46e5; color: white; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827; }
        .message { color: #4b5563; margin-bottom: 24px; }
        .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
        .info-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; }
        .info-value { color: #111827; font-weight: 500; font-size: 14px; text-align: right; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .button:hover { background: #4338ca; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
        .items-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; }
        .items-table td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151; }
        .items-table tr:last-child td { border-bottom: none; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .footer a { color: #6b7280; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>{{headerTitle}}</h1>
        </div>
        <div class="content">
          {{content}}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SalonJu. All rights reserved.</p>
          {{#if unsubscribeUrl}}<p><a href="{{unsubscribeUrl}}">Manage Notification Preferences</a></p>{{/if}}
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

    // Standard variable replacement
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'saleItems') continue; // Skip already handled complex types
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, String(value || ''));
    }

    // Remove unused placeholders
    template = template.replace(/{{[^}]+}}/g, '');

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
        <td style="text-align: right">${item.price}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center">Qty</th>
            <th style="text-align: right">Price</th>
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
      sale_completed: this.getSaleCompletedTemplate(),
      commission_earned: this.getCommissionEarnedTemplate(),
      commission_paid: this.getCommissionPaidTemplate(),
      points_earned: this.getPointsEarnedTemplate(),
      low_stock_alert: this.getLowStockAlertTemplate(),
      password_reset: this.getPasswordResetTemplate(),
    };

    return templates[templateName] || this.getDefaultTemplate();
  }

  private getAppointmentBookedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Appointment Confirmed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Your appointment has been successfully booked! Here are the details:</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Salon</span>
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
            <span class="info-label">Stylist</span>
            <span class="info-value">{{employeeName}}</span>
          </div>
          {{/if}}
        </div>
        <div class="message">We look forward to seeing you!</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentReminderTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Appointment Reminder')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">This is a friendly reminder about your upcoming appointment:</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Salon</span>
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
            <span class="info-label">Stylist</span>
            <span class="info-value">{{employeeName}}</span>
          </div>
          {{/if}}
        </div>
        <div class="message">If you need to reschedule or cancel, please contact us as soon as possible.</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Appointment</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getAppointmentConfirmedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Appointment Confirmed')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Your appointment has been confirmed!</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Salon</span>
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
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Appointment</a>
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
        <div class="message">Your appointment has been cancelled.</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Salon</span>
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
        <div class="message">If you would like to reschedule, please visit our website or contact us.</div>
      `,
      );
  }

  private getAppointmentCompletedTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', 'Thank You!').replace(
      '{{content}}',
      `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Thank you for visiting {{salonName}}! We hope you enjoyed your service.</div>
        <div class="message">We'd love to hear your feedback to help us improve.</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Leave Feedback</a>
        </div>
        {{/if}}
      `,
    );
  }

  private getSaleCompletedTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', 'Receipt').replace(
      '{{content}}',
      `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Thank you for your purchase at {{salonName}}! Here is your receipt:</div>
        
        <div class="info-card">
          {{saleItemsTable}}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
            <div class="info-row">
              <span class="info-label" style="font-size: 16px; color: #111827;">Total Amount</span>
              <span class="info-value" style="font-size: 18px; font-weight: 700; color: #4f46e5;">{{saleAmount}}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method</span>
              <span class="info-value">{{paymentMethod}}</span>
            </div>
          </div>
        </div>

        {{#if pointsEarned}}
        <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 24px;">🌟</span>
          <div style="color: #065f46; font-weight: 600; margin-top: 8px;">You earned {{pointsEarned}} loyalty points!</div>
        </div>
        {{/if}}

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
      .replace('{{headerTitle}}', 'Commission Earned')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">You have earned a new commission!</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Amount</span>
            <span class="info-value" style="color: #059669; font-weight: 700;">{{commissionAmount}}</span>
          </div>
        </div>
        <div class="message">This commission will be included in your next payroll.</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Commission</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getCommissionPaidTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Commission Paid')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">Your commission has been paid out!</div>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Amount Paid</span>
            <span class="info-value" style="color: #059669; font-weight: 700;">{{commissionAmount}}</span>
          </div>
        </div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Details</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getPointsEarnedTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', 'Loyalty Points Earned')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">Great news! You've earned loyalty points from your recent visit.</div>
        
        <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #d97706; margin-bottom: 4px;">+{{pointsEarned}}</div>
          <div style="color: #92400e; font-weight: 500;">Points Earned</div>
          
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #fde68a;">
            <div style="color: #78350f; font-size: 14px;">Current Balance</div>
            <div style="color: #b45309; font-size: 20px; font-weight: 600;">{{pointsBalance}} Points</div>
          </div>
        </div>

        <div class="message">Thank you for your continued loyalty! Redeem your points for discounts on future services.</div>
        
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Points History</a>
        </div>
        {{/if}}
      `,
      );
  }

  private getLowStockAlertTemplate(): string {
    return this.baseTemplate
      .replace('{{headerTitle}}', '⚠️ Low Stock Alert')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello,</div>
        <div class="message">The following product is running low in stock and needs attention:</div>
        <div class="info-card" style="border-left: 4px solid #ef4444;">
          <div class="info-row">
            <span class="info-label">Product</span>
            <span class="info-value">{{productName}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Current Stock</span>
            <span class="info-value" style="color: #dc2626; font-weight: 700;">{{stockLevel}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Minimum Required</span>
            <span class="info-value">{{minStock}}</span>
          </div>
        </div>
        <div class="message">Please replenish stock soon to avoid running out.</div>
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
      .replace('{{headerTitle}}', 'Reset Your Password')
      .replace(
        '{{content}}',
        `
        <div class="greeting">Hello {{customerName}},</div>
        <div class="message">We received a request to reset your password. Click the button below to create a new password:</div>
        
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">Reset Password</a>
        </div>

        <div class="info-card" style="border-left: 4px solid #f59e0b; margin-top: 24px;">
          <div style="color: #92400e; font-size: 14px;">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>This link expires in <strong>1 hour</strong></li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
        </div>

        <div class="message" style="margin-top: 24px; color: #6b7280; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #4f46e5;">{{actionUrl}}</span>
        </div>
      `,
      );
  }

  private getDefaultTemplate(): string {
    return this.baseTemplate.replace('{{headerTitle}}', 'Notification').replace(
      '{{content}}',
      `
        <div class="message">{{message}}</div>
        {{#if actionUrl}}
        <div class="button-container">
          <a href="{{actionUrl}}" class="button">View Details</a>
        </div>
        {{/if}}
      `,
    );
  }
}
