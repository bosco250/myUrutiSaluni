import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as QRCode from 'qrcode';

// Use require for jsreport as it doesn't have proper ES module exports
const jsreport = require('jsreport');
import { SalesService } from '../sales/sales.service';
import { Sale } from '../sales/entities/sale.entity';
import { UsersService } from '../users/users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { SalonsService } from '../salons/salons.service';

@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private jsreportInstance: any;
  private jsreportInitializing: Promise<void> | null = null;

  constructor(
    private salesService: SalesService,
    private usersService: UsersService,
    private membershipsService: MembershipsService,
    private salonsService: SalonsService,
  ) {}

  async onModuleInit() {
    // Initialize jsreport in the background without blocking server startup
    this.initializeJsReport().catch((error) => {
      console.error('Failed to initialize jsreport:', error);
      // Don't throw - allow the app to start even if jsreport fails
    });
  }

  private async initializeJsReport() {
    if (this.jsreportInitializing) {
      return this.jsreportInitializing;
    }

    this.jsreportInitializing = (async () => {
      // Suppress jsreport console logs during initialization
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalDebug = console.debug;
      const originalError = console.error;
      
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
      console.error = (message?: any, ...optionalParams: any[]) => {
        // Only show actual errors, not jsreport info messages
        if (message && typeof message === 'string' && !message.includes('jsreport') && !message.includes('info:')) {
          originalError(message, ...optionalParams);
        }
      };
      
      try {
        this.jsreportInstance = jsreport({
          logger: {
            silent: true, // Suppress jsreport logs
          },
          extensions: {
            express: {
              enabled: false, // Disable express extension as we're using NestJS
            },
            'chrome-pdf': {
              enabled: true,
            },
            handlebars: {
              enabled: true,
            },
          },
        });

        await this.jsreportInstance.init();
        
        // Create receipt template if it doesn't exist
        await this.ensureReceiptTemplate();
        // Create membership certificate template if it doesn't exist
        await this.ensureMembershipCertificateTemplate();
      } finally {
        // Restore original console methods
        console.log = originalLog;
        console.info = originalInfo;
        console.debug = originalDebug;
        console.error = originalError;
        this.jsreportInitializing = null;
      }
    })();

    return this.jsreportInitializing;
  }

  private async ensureJsReportReady() {
    if (!this.jsreportInstance && !this.jsreportInitializing) {
      await this.initializeJsReport();
    } else if (this.jsreportInitializing) {
      await this.jsreportInitializing;
    }
    
    await this.ensureJsReportReady();
  }

  async onModuleDestroy() {
    if (this.jsreportInstance) {
      await this.jsreportInstance.close();
    }
  }

  private async ensureReceiptTemplate() {
    try {
      if (!this.jsreportInstance) return;
      
      // Check if template exists
      const templates = await this.jsreportInstance.documentStore.collection('templates').find({});
      const receiptTemplate = templates.find((t: any) => t.name === 'receipt');

      if (!receiptTemplate) {
        // Create receipt template
        await this.jsreportInstance.documentStore.collection('templates').insert({
          name: 'receipt',
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          content: this.getReceiptTemplate(),
        });
      }
    } catch (error) {
      console.error('Error ensuring receipt template:', error);
    }
  }

  private getReceiptTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 11px;
      color: #666;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .info-box {
      flex: 1;
      margin: 0 10px;
    }
    .info-box h3 {
      font-size: 11px;
      margin-bottom: 5px;
      color: #666;
    }
    .info-box p {
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #f5f5f5;
      padding: 8px;
      text-align: left;
      border-bottom: 2px solid #000;
      font-size: 11px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .total-row.final {
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #000;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{salon.name}}</h1>
    {{#if salon.address}}<p>{{salon.address}}</p>{{/if}}
    {{#if salon.phone}}<p>Tel: {{salon.phone}}</p>{{/if}}
    {{#if salon.email}}<p>Email: {{salon.email}}</p>{{/if}}
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Sale Information</h3>
      <p><strong>Sale ID:</strong> {{sale.id}}</p>
      <p><strong>Date:</strong> {{sale.createdAt}}</p>
      <p><strong>Status:</strong> {{sale.status}}</p>
    </div>
    {{#if customer}}
    <div class="info-box">
      <h3>Customer</h3>
      <p><strong>{{customer.fullName}}</strong></p>
      <p>{{customer.phone}}</p>
      {{#if customer.email}}<p>{{customer.email}}</p>{{/if}}
    </div>
    {{/if}}
    {{#if createdBy}}
    <div class="info-box">
      <h3>Processed By</h3>
      <p><strong>{{createdBy.fullName}}</strong></p>
    </div>
    {{/if}}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Price</th>
        <th class="text-right">Discount</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>
          <strong>{{name}}</strong>
          {{#if description}}
            <br><small>{{description}}</small>
          {{/if}}
          {{#if salonEmployee}}
            {{#if salonEmployee.user}}
              <br><small>Assigned to: {{salonEmployee.user.fullName}}</small>
            {{/if}}
          {{/if}}
        </td>
        <td class="text-right">{{quantity}}</td>
        <td class="text-right">{{currency}} {{unitPrice}}</td>
        <td class="text-right">
          {{#if discountAmount}}
            {{#unless (eq discountAmount "0.00")}}
              {{currency}} {{discountAmount}}
            {{else}}
              -
            {{/unless}}
          {{else}}
            -
          {{/if}}
        </td>
        <td class="text-right"><strong>{{currency}} {{lineTotal}}</strong></td>
      </tr>
      {{else}}
      <tr>
        <td colspan="5" class="text-center" style="padding: 20px; color: #999;">
          No items found
        </td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>{{currency}} {{subtotal}}</span>
    </div>
    {{#if discount}}
    <div class="total-row">
      <span>Discount:</span>
      <span>-{{currency}} {{discount}}</span>
    </div>
    {{/if}}
    {{#if tax}}
    <div class="total-row">
      <span>Tax:</span>
      <span>{{currency}} {{tax}}</span>
    </div>
    {{/if}}
    <div class="total-row final">
      <span>Total:</span>
      <span>{{currency}} {{total}}</span>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Payment Information</h3>
      <p><strong>Method:</strong> {{paymentMethodFormatted}}</p>
      {{#if sale.paymentReference}}
      <p><strong>Reference:</strong> {{sale.paymentReference}}</p>
      {{/if}}
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>Sale ID: {{sale.id}}</p>
  </div>
</body>
</html>
    `;
  }

  async generateReceipt(saleId: string): Promise<Buffer> {
    await this.ensureJsReportReady();

    const sale = await this.salesService.findOne(saleId);
    
    if (!sale) {
      throw new Error('Sale not found');
    }

    // Debug: Log sale items
    const saleItems = (sale as any).items || [];
    console.log('[RECEIPT] Sale items count:', saleItems.length);
    console.log('[RECEIPT] Sale items:', JSON.stringify(saleItems, null, 2));

    // Calculate totals
    const subtotal = saleItems.reduce((sum: number, item: any) => 
      sum + (Number(item.unitPrice) * Number(item.quantity)), 0) || 0;
    const discount = saleItems.reduce((sum: number, item: any) => 
      sum + (Number(item.discountAmount) || 0), 0) || 0;
    const tax = 0; // Calculate if needed
    
    console.log('[RECEIPT] Calculated totals:', { subtotal, discount, tax, total: sale.totalAmount });

    // Helper function to format dates (used before passing to jsreport)
    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatNumber = (num: number) => {
      return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const formatPaymentMethod = (method: string) => {
      return method
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const templateData = {
      sale: {
        id: sale.id,
        totalAmount: sale.totalAmount,
        currency: sale.currency || 'RWF',
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        paymentReference: sale.paymentReference,
        createdAt: formatDate(sale.createdAt), // Pre-format date as string
        createdAtRaw: sale.createdAt, // Keep raw date if needed
      },
      salon: sale.salon || {},
      customer: sale.customer || null,
      createdBy: sale.createdBy || null,
      items: saleItems.map((item: any) => {
        const itemLineTotal = Number(item.lineTotal) || (Number(item.unitPrice) * Number(item.quantity) - Number(item.discountAmount || 0));
        const itemName = item.service?.name || item.product?.name || 'Item';
        
        console.log('[RECEIPT] Processing item:', {
          id: item.id,
          name: itemName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: itemLineTotal,
          hasService: !!item.service,
          hasProduct: !!item.product,
        });
        
        return {
          id: item.id,
          name: itemName,
          description: item.service?.description || item.product?.description || '',
          unitPrice: formatNumber(Number(item.unitPrice)),
          quantity: Number(item.quantity),
          lineTotal: formatNumber(itemLineTotal),
          discountAmount: item.discountAmount ? formatNumber(Number(item.discountAmount)) : '0.00',
          salonEmployee: item.salonEmployee ? {
            id: item.salonEmployee.id,
            user: item.salonEmployee.user ? {
              fullName: item.salonEmployee.user.fullName,
            } : null,
          } : null,
        };
      }),
      subtotal: formatNumber(subtotal),
      discount: formatNumber(discount),
      tax: formatNumber(tax),
      total: formatNumber(sale.totalAmount),
      currency: sale.currency || 'RWF',
      paymentMethodFormatted: sale.paymentMethod ? formatPaymentMethod(sale.paymentMethod) : '',
    };

    console.log('[RECEIPT] Template data items count:', templateData.items.length);
    console.log('[RECEIPT] Template data items:', JSON.stringify(templateData.items, null, 2));
    console.log('[RECEIPT] Full template data keys:', Object.keys(templateData));

    const report = await this.jsreportInstance.render({
      template: {
        name: 'receipt',
      },
      data: templateData,
    });

    return report.content;
  }

  async generateSalesReport(filters: {
    salonId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Buffer> {
    await this.ensureJsReportReady();

    // This would generate a sales report
    // For now, return a simple report
    const salesResult = filters.salonId
      ? await this.salesService.findAll(filters.salonId, 1, 10000) // Get all sales with high limit
      : await this.salesService.findAll(undefined, 1, 10000); // Get all sales with high limit

    // Extract the sales array from paginated result
    let sales: Sale[] = Array.isArray(salesResult) ? salesResult : salesResult.data;

    // Filter by date if provided
    let filteredSales: Sale[] = sales;
    if (filters.startDate || filters.endDate) {
      filteredSales = sales.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        if (filters.startDate && saleDate < filters.startDate) return false;
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (saleDate > endDate) return false;
        }
        return true;
      });
    }

    const totalRevenue = filteredSales.reduce((sum: number, sale: Sale) => sum + Number(sale.totalAmount), 0);
    const totalSales = filteredSales.length;

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <p><strong>Total Sales:</strong> ${totalSales}</p>
  <p><strong>Total Revenue:</strong> RWF ${totalRevenue.toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Sale ID</th>
        <th>Customer</th>
        <th>Amount</th>
        <th>Payment Method</th>
      </tr>
    </thead>
    <tbody>
      ${filteredSales.map(sale => `
        <tr>
          <td>${new Date(sale.createdAt).toLocaleDateString()}</td>
          <td>${sale.id.slice(0, 8)}</td>
          <td>${sale.customer?.fullName || 'Walk-in'}</td>
          <td>RWF ${Number(sale.totalAmount).toLocaleString()}</td>
          <td>${sale.paymentMethod}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `;

    const report = await this.jsreportInstance.render({
      template: {
        content: reportContent,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
      },
      data: {},
    });

    return report.content;
  }

  private async ensureMembershipCertificateTemplate() {
    try {
      if (!this.jsreportInstance) {
        console.warn('jsreport instance not available, skipping template creation');
        return;
      }
      
      // Check if template exists
      const templates = await this.jsreportInstance.documentStore.collection('templates').find({});
      const certificateTemplate = templates.find((t: any) => t.name === 'membership-certificate');

      if (!certificateTemplate) {
        // Template creation in progress (suppressed for cleaner logs)
        // Create certificate template
        await this.jsreportInstance.documentStore.collection('templates').insert({
          name: 'membership-certificate',
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          content: this.getMembershipCertificateTemplate(),
        });
        // Membership certificate template ready
      } else {
        // Update template if it exists (in case of changes)
        // Updating membership certificate template (suppressed)
        // Remove old template and insert new one
        await this.jsreportInstance.documentStore.collection('templates').remove({ name: 'membership-certificate' });
        await this.jsreportInstance.documentStore.collection('templates').insert({
          name: 'membership-certificate',
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          content: this.getMembershipCertificateTemplate(),
        });
        // Membership certificate template updated
      }
    } catch (error) {
      console.error('Error ensuring membership certificate template:', error);
      throw error; // Re-throw to prevent silent failures
    }
  }

  private getMembershipCertificateTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 40px;
      min-height: 100vh;
    }
    .certificate {
      background: white;
      border: 8px solid #2c3e50;
      padding: 60px;
      max-width: 900px;
      margin: 0 auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      position: relative;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      border: 2px solid #3498db;
      pointer-events: none;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 36px;
      color: #2c3e50;
      margin-bottom: 10px;
      font-weight: bold;
      letter-spacing: 2px;
    }
    .header h2 {
      font-size: 24px;
      color: #34495e;
      font-weight: normal;
      font-style: italic;
    }
    .main-content {
      text-align: center;
      margin: 50px 0;
    }
    .main-content p {
      font-size: 18px;
      line-height: 1.8;
      color: #2c3e50;
      margin-bottom: 20px;
    }
    .member-name {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
      margin: 30px 0;
      text-decoration: underline;
      text-decoration-color: #3498db;
      text-decoration-thickness: 3px;
    }
    .member-details {
      margin: 40px 0;
      padding: 30px;
      background: #f8f9fa;
      border-left: 5px solid #3498db;
    }
    .member-details p {
      font-size: 16px;
      margin: 10px 0;
      text-align: left;
    }
    .member-details strong {
      color: #2c3e50;
      min-width: 150px;
      display: inline-block;
    }
    .qr-section {
      margin: 40px 0;
      text-align: center;
    }
    .qr-code {
      display: inline-block;
      padding: 20px;
      background: white;
      border: 3px solid #2c3e50;
      border-radius: 10px;
    }
    .qr-code img {
      display: block;
      width: 200px;
      height: 200px;
    }
    .qr-label {
      margin-top: 10px;
      font-size: 12px;
      color: #7f8c8d;
    }
    .footer {
      margin-top: 60px;
      border-top: 2px solid #2c3e50;
      padding-top: 30px;
      display: flex;
      justify-content: space-between;
    }
    .signature {
      text-align: center;
      flex: 1;
    }
    .signature-line {
      border-top: 2px solid #2c3e50;
      width: 200px;
      margin: 50px auto 10px;
    }
    .signature p {
      font-size: 14px;
      color: #2c3e50;
      margin-top: 5px;
    }
    .certificate-number {
      position: absolute;
      bottom: 20px;
      right: 30px;
      font-size: 11px;
      color: #95a5a6;
    }
    .seal {
      position: absolute;
      top: 30px;
      right: 30px;
      width: 100px;
      height: 100px;
      border: 3px solid #e74c3c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      font-size: 12px;
      text-align: center;
      color: #e74c3c;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="seal">
      <div>OFFICIAL<br>SEAL</div>
    </div>
    
    <div class="header">
      <h1>MEMBERSHIP CERTIFICATE</h1>
      <h2>Salon Association of Rwanda</h2>
    </div>

    <div class="main-content">
      <p>This is to certify that</p>
      <div class="member-name">{{member.fullName}}</div>
      <p>is a duly registered member of the Salon Association of Rwanda</p>
      <p>with the following membership details:</p>
    </div>

    <div class="member-details">
      <p><strong>Membership Number:</strong> {{member.membershipNumber}}</p>
      <p><strong>Member Name:</strong> {{member.fullName}}</p>
      <p><strong>Email:</strong> {{member.email}}</p>
      {{#if member.phone}}<p><strong>Phone:</strong> {{member.phone}}</p>{{/if}}
      <p><strong>Member Since:</strong> {{member.memberSince}}</p>
      {{#if salon}}
      <p><strong>Salon:</strong> {{salon.name}}</p>
      {{#if salon.registrationNumber}}<p><strong>Salon Registration:</strong> {{salon.registrationNumber}}</p>{{/if}}
      {{/if}}
    </div>

    <div class="qr-section">
      <div class="qr-code">
        <img src="{{qrCodeDataUrl}}" alt="QR Code" />
      </div>
      <div class="qr-label">Scan to verify membership</div>
    </div>

    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <p>Association Secretary</p>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <p>Date: {{issueDate}}</p>
      </div>
    </div>

    <div class="certificate-number">
      Certificate ID: {{certificateId}}
    </div>
  </div>
</body>
</html>
    `;
  }

  async generateMembershipCertificate(userId: string): Promise<Buffer> {
    try {
      if (!this.jsreportInstance) {
        throw new Error('jsreport is not initialized');
      }

      // Get user information
      const user = await this.usersService.findOne(userId);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!user.membershipNumber) {
        throw new Error(`User ${user.fullName} (${user.email}) does not have a membership number assigned`);
      }

      // Get user's salon if they are a salon owner
      let salon = null;
      if (user.role === 'salon_owner') {
        try {
          const salons = await this.salonsService.findByOwnerId(userId);
          if (salons && salons.length > 0) {
            salon = salons[0]; // Get the first salon
          }
        } catch (error) {
          console.error('Error fetching salon:', error);
          // Continue without salon info
        }
      }

      // Generate QR code
      // QR code will contain a verification URL or membership number
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/membership/${user.membershipNumber}`;
      let qrCodeDataUrl: string;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 200,
          margin: 1,
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error(`Failed to generate QR code: ${error.message}`);
      }

      // Generate certificate ID
      const certificateId = `CERT-${new Date().getFullYear()}-${user.membershipNumber.split('-').pop()}`;

      const templateData = {
        member: {
          fullName: user.fullName,
          membershipNumber: user.membershipNumber,
          email: user.email,
          phone: user.phone,
          memberSince: new Date(user.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        },
        salon: salon ? {
          name: salon.name,
          registrationNumber: salon.registrationNumber,
        } : null,
        qrCodeDataUrl,
        certificateId,
        issueDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      // Ensure template exists before rendering
      await this.ensureMembershipCertificateTemplate();

      // Verify template exists
      const templates = await this.jsreportInstance.documentStore.collection('templates').find({});
      const certificateTemplate = templates.find((t: any) => t.name === 'membership-certificate');
      
      if (!certificateTemplate) {
        throw new Error('Membership certificate template not found in jsreport. Please check template initialization.');
      }

      let report;
      try {
        report = await this.jsreportInstance.render({
          template: {
            name: 'membership-certificate',
          },
          data: templateData,
        });
      } catch (renderError) {
        console.error('jsreport render error:', renderError);
        throw new Error(`Failed to render PDF: ${renderError.message || JSON.stringify(renderError)}`);
      }

      if (!report || !report.content) {
        throw new Error('jsreport returned empty content');
      }

      return report.content;
    } catch (error) {
      console.error('Error generating membership certificate:', error);
      throw error;
    }
  }
}

