import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as QRCode from 'qrcode';

// Use require for jsreport as it doesn't have proper ES module exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
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
        if (
          message &&
          typeof message === 'string' &&
          !message.includes('jsreport') &&
          !message.includes('info:')
        ) {
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

    if (!this.jsreportInstance) {
      throw new Error('Failed to initialize jsreport instance');
    }
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
      const templates = await this.jsreportInstance.documentStore
        .collection('templates')
        .find({});
      const receiptTemplate = templates.find((t: any) => t.name === 'receipt');

      if (!receiptTemplate) {
        // Create receipt template
        await this.jsreportInstance.documentStore
          .collection('templates')
          .insert({
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
          {{#if hasDiscount}}
            {{currency}} {{discountAmount}}
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
    try {
      await this.ensureJsReportReady();
    } catch (initError) {
      console.error('[RECEIPT] jsreport initialization failed:', initError);
      throw new Error(`PDF generation service is not available: ${initError.message}`);
    }

    const sale = await this.salesService.findOne(saleId);

    if (!sale) {
      throw new Error('Sale not found');
    }

    // Debug: Log sale items
    const saleItems = (sale as any).items || [];
    console.log('[RECEIPT] Sale items count:', saleItems.length);
    console.log('[RECEIPT] Sale items:', JSON.stringify(saleItems, null, 2));

    // Calculate totals
    const subtotal =
      saleItems.reduce(
        (sum: number, item: any) =>
          sum + Number(item.unitPrice) * Number(item.quantity),
        0,
      ) || 0;
    const discount =
      saleItems.reduce(
        (sum: number, item: any) => sum + (Number(item.discountAmount) || 0),
        0,
      ) || 0;
    const tax = 0; // Calculate if needed

    console.log('[RECEIPT] Calculated totals:', {
      subtotal,
      discount,
      tax,
      total: sale.totalAmount,
    });

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
        const itemLineTotal =
          Number(item.lineTotal) ||
          Number(item.unitPrice) * Number(item.quantity) -
            Number(item.discountAmount || 0);
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
          description:
            item.service?.description || item.product?.description || '',
          unitPrice: formatNumber(Number(item.unitPrice)),
          quantity: Number(item.quantity),
          lineTotal: formatNumber(itemLineTotal),
          discountAmount: item.discountAmount
            ? formatNumber(Number(item.discountAmount))
            : '0.00',
          hasDiscount: Number(item.discountAmount || 0) > 0,
          salonEmployee: item.salonEmployee
            ? {
                id: item.salonEmployee.id,
                user: item.salonEmployee.user
                  ? {
                      fullName: item.salonEmployee.user.fullName,
                    }
                  : null,
              }
            : null,
        };
      }),
      subtotal: formatNumber(subtotal),
      discount: formatNumber(discount),
      tax: formatNumber(tax),
      total: formatNumber(sale.totalAmount),
      currency: sale.currency || 'RWF',
      paymentMethodFormatted: sale.paymentMethod
        ? formatPaymentMethod(sale.paymentMethod)
        : '',
    };

    console.log(
      '[RECEIPT] Template data items count:',
      templateData.items.length,
    );
    console.log(
      '[RECEIPT] Template data items:',
      JSON.stringify(templateData.items, null, 2),
    );
    console.log(
      '[RECEIPT] Full template data keys:',
      Object.keys(templateData),
    );

    try {
      console.log('[RECEIPT] Starting PDF rendering...');
      const report = await this.jsreportInstance.render({
        template: {
          name: 'receipt',
        },
        data: templateData,
      });

      if (!report || !report.content) {
        throw new Error('jsreport returned empty content');
      }

      console.log(`[RECEIPT] PDF rendered successfully (${report.content.length} bytes)`);
      return report.content;
    } catch (renderError) {
      console.error('[RECEIPT] PDF rendering failed:', renderError);
      throw new Error(`Failed to generate PDF: ${renderError.message}`);
    }
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
    const sales: Sale[] = Array.isArray(salesResult)
      ? salesResult
      : salesResult.data;

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

    const totalRevenue = filteredSales.reduce(
      (sum: number, sale: Sale) => sum + Number(sale.totalAmount),
      0,
    );
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
      ${filteredSales
        .map(
          (sale) => `
        <tr>
          <td>${new Date(sale.createdAt).toLocaleDateString()}</td>
          <td>${sale.id.slice(0, 8)}</td>
          <td>${sale.customer?.fullName || 'Walk-in'}</td>
          <td>RWF ${Number(sale.totalAmount).toLocaleString()}</td>
          <td>${sale.paymentMethod}</td>
        </tr>
      `,
        )
        .join('')}
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
        console.warn(
          'jsreport instance not available, skipping template creation',
        );
        return;
      }

      // Check if template exists
      const templates = await this.jsreportInstance.documentStore
        .collection('templates')
        .find({});
      const certificateTemplate = templates.find(
        (t: any) => t.name === 'membership-certificate',
      );

      if (!certificateTemplate) {
        // Template creation in progress (suppressed for cleaner logs)
        // Create certificate template
        await this.jsreportInstance.documentStore
          .collection('templates')
          .insert({
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
        await this.jsreportInstance.documentStore
          .collection('templates')
          .remove({ name: 'membership-certificate' });
        await this.jsreportInstance.documentStore
          .collection('templates')
          .insert({
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
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; width: 210mm; height: 297mm; margin: 0; padding: 0; background: #fff; }
  .certificate { width: 100%; height: 100%; padding: 12mm 15mm; background: linear-gradient(180deg, #fffdf5 0%, #fff8e7 100%); position: relative; overflow: hidden; }
  .border-outer { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 3px solid #8B6914; }
  .border-inner { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 1px solid #C9A227; }
  .corner { position: absolute; width: 20mm; height: 20mm; border: 2px solid #8B6914; }
  .corner-tl { top: 8mm; left: 8mm; border-right: none; border-bottom: none; }
  .corner-tr { top: 8mm; right: 8mm; border-left: none; border-bottom: none; }
  .corner-bl { bottom: 8mm; left: 8mm; border-right: none; border-top: none; }
  .corner-br { bottom: 8mm; right: 8mm; border-left: none; border-top: none; }
  .content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }
  .header { text-align: center; padding-bottom: 6mm; border-bottom: 2px solid #C9A227; margin-bottom: 5mm; }
  .org-name { font-size: 13pt; color: #8B6914; text-transform: uppercase; letter-spacing: 3px; font-weight: bold; margin-bottom: 2mm; }
  .title { font-size: 26pt; color: #2C3E50; text-transform: uppercase; letter-spacing: 4px; font-weight: bold; margin-bottom: 2mm; }
  .subtitle { font-size: 10pt; color: #5D6D7E; font-style: italic; }
  .body { flex: 1; display: flex; flex-direction: column; justify-content: flex-start; text-align: center; position: relative; }
  .certify-text { font-size: 11pt; color: #34495E; margin-top: 4mm; margin-bottom: 3mm; }
  .member-name { font-size: 22pt; font-weight: bold; color: #1A5276; margin: 3mm 0; padding: 2mm 0; border-bottom: 2px solid #C9A227; border-top: 2px solid #C9A227; display: inline-block; }
  .description { font-size: 10pt; color: #5D6D7E; line-height: 1.5; margin-bottom: 4mm; max-width: 150mm; margin-left: auto; margin-right: auto; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 4mm auto; padding: 3mm 6mm; background: rgba(201, 162, 39, 0.08); border-radius: 2mm; max-width: 155mm; text-align: left; }
  .detail-item { display: flex; align-items: center; font-size: 9pt; padding: 1mm 0; }
  .detail-label { color: #7F8C8D; font-weight: 600; min-width: 32mm; }
  .detail-value { color: #2C3E50; font-weight: bold; }
  
  /* QR Section positioned at bottom right */
  .qr-section { position: absolute; bottom: 0; right: 0; text-align: center; background: rgba(255,255,255,0.9); padding: 3mm; border: 1px solid #C9A227; border-radius: 2mm; }
  .qr-box img { width: 35mm; height: 35mm; display: block; }
  .qr-text { font-size: 8pt; color: #7F8C8D; margin-top: 2mm; font-weight: bold; }
  
  .footer { margin-top: auto; padding-top: 4mm; border-top: 1px solid #C9A227; }
  .signatures { display: flex; justify-content: space-around; padding: 4mm 0; }
  .signature-block { text-align: center; min-width: 40mm; }
  .signature-line { border-top: 1.5px solid #2C3E50; width: 40mm; margin: 0 auto 2mm; }
  .signature-title { font-size: 8pt; color: #2C3E50; font-weight: bold; }
  .signature-org { font-size: 7pt; color: #7F8C8D; }
  .seal { position: absolute; bottom: 25mm; left: 25mm; width: 20mm; height: 20mm; border: 2px solid #C9A227; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #fff 0%, #fffdf5 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .seal-text { font-size: 5pt; color: #8B6914; text-transform: uppercase; font-weight: bold; letter-spacing: 0.3px; }
  .seal-year { font-size: 9pt; color: #8B6914; font-weight: bold; }
  .cert-id { position: absolute; bottom: 4mm; left: 50%; transform: translateX(-50%); font-size: 6pt; color: #95A5A6; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="certificate">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>
  
  <div class="content">
    <div class="header">
      <div class="org-name">Salon Association of Rwanda</div>
      <div class="title">Certificate of Membership</div>
      <div class="subtitle">Official Recognition of Professional Standing</div>
    </div>
    
    <div class="body">
      <div class="certify-text">This is to certify that</div>
      <div class="member-name">{{member.fullName}}</div>
      <div class="description">
        is a duly registered and recognized member of the Salon Association of Rwanda,
        entitled to all the rights, privileges, and benefits of membership.
      </div>
      
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Membership No:</span>
          <span class="detail-value">{{member.membershipNumber}}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Member Since:</span>
          <span class="detail-value">{{member.memberSince}}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email:</span>
          <span class="detail-value">{{member.email}}</span>
        </div>
        {{#if member.phone}}
        <div class="detail-item">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">{{member.phone}}</span>
        </div>
        {{/if}}
        {{#if salon}}
        <div class="detail-item">
          <span class="detail-label">Salon:</span>
          <span class="detail-value">{{salon.name}}</span>
        </div>
        {{#if salon.registrationNumber}}
        <div class="detail-item">
          <span class="detail-label">Registration:</span>
          <span class="detail-value">{{salon.registrationNumber}}</span>
        </div>
        {{/if}}
        {{/if}}
      </div>
      
      <div class="qr-section">
        <div class="qr-box">
          <img src="{{qrCodeDataUrl}}" alt="Verify" />
        </div>
        <div class="qr-text">Scan to verify</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Association Secretary</div>
          <div class="signature-org">Salon Association of Rwanda</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Issue Date</div>
          <div class="signature-org">{{issueDate}}</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Association President</div>
          <div class="signature-org">Salon Association of Rwanda</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="seal">
    <div class="seal-text">Official</div>
    <div class="seal-year">{{currentYear}}</div>
    <div class="seal-text">Seal</div>
  </div>
  
  <div class="cert-id">Certificate ID: {{certificateId}}</div>
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
        throw new Error(
          `User ${user.fullName} (${user.email}) does not have a membership number assigned`,
        );
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
      // Use FRONTEND_URL environment variable or default to localhost:3001 (frontend port)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const verificationUrl = `${frontendUrl}/verify/membership/${user.membershipNumber}`;
      let qrCodeDataUrl: string;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 400,
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
        salon: salon
          ? {
              name: salon.name,
              registrationNumber: salon.registrationNumber,
            }
          : null,
        qrCodeDataUrl,
        certificateId,
        currentYear: new Date().getFullYear(),
        issueDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      // Ensure template exists before rendering
      await this.ensureMembershipCertificateTemplate();

      // Verify template exists
      const templates = await this.jsreportInstance.documentStore
        .collection('templates')
        .find({});
      const certificateTemplate = templates.find(
        (t: any) => t.name === 'membership-certificate',
      );

      if (!certificateTemplate) {
        throw new Error(
          'Membership certificate template not found in jsreport. Please check template initialization.',
        );
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
        throw new Error(
          `Failed to render PDF: ${renderError.message || JSON.stringify(renderError)}`,
        );
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
