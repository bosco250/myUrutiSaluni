import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

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
  // ... existing properties code ...
  private jsreportInstance: any;
  private jsreportInitializing: Promise<void> | null = null;

  constructor(
    @Inject(forwardRef(() => SalesService))
    private salesService: SalesService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => MembershipsService))
    private membershipsService: MembershipsService,
    @Inject(forwardRef(() => SalonsService))
    private salonsService: SalonsService,
  ) {}

  async generateEmployeeCards(salonId: string): Promise<Buffer> {
    await this.ensureJsReportReady();

    const salon = await this.salonsService.findOne(salonId);
    if (!salon) {
      throw new BadRequestException('Salon not found');
    }

    const employees = await this.salonsService.getSalonEmployees(salonId);
    const activeEmployees = employees.filter((e) => e.isActive !== false);

    if (activeEmployees.length === 0) {
      throw new BadRequestException('No active employees found');
    }

    // Resolve System Logo
    let systemLogoDataUrl = '';
    try {
      const logoPath = path.resolve(process.cwd(), '../web/public/logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        systemLogoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Failed to load system logo:', e);
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const resolveUrl = (url?: string) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      const cleanBase = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      return `${cleanBase}${cleanPath}`;
    };

    const salonLogo = resolveUrl(salon.images?.[0]);

    const employeesData = await Promise.all(
      activeEmployees.map(async (emp) => {
        let qrCodeDataUrl = '';
        try {
          // Generate verification URL for QR code
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const cleanFrontendUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
          const verificationUrl = `${cleanFrontendUrl}/verify/employee/${emp.id}`;

          qrCodeDataUrl = await QRCode.toDataURL(
            verificationUrl,
            {
              errorCorrectionLevel: 'M',
              width: 200,
              margin: 0,
              color: {
                  dark: '#1e293b',
                  light: '#ffffff'
              }
            },
          );
        } catch (e) {
          console.error('Error generating QR', e);
        }

        const user = emp.user;
        const names = (user?.fullName || '').split(' ').filter((n: string) => n);
        const initials =
          names.length > 0
            ? (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase()
            : '??';

        return {
          fullName: user?.fullName || 'Unknown',
          roleTitle: emp.roleTitle || 'STAFF MEMBER',
          skills: emp.skills || [],
          skillsStr: emp.skills ? emp.skills.join(' • ') : '',
          employeeId: emp.id.slice(0, 8).toUpperCase(),
          hireDate: emp.hireDate
            ? new Date(emp.hireDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'N/A',
          employmentType: emp.employmentType 
            ? emp.employmentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
            : '-',
          phone: user?.phone || '',
          email: user?.email || '',
          avatarUrl: resolveUrl(user?.avatarUrl),
          initials,
          qrCodeDataUrl,
        };
      }),
    );

    employeesData.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const templateData = {
      salon: {
        name: salon.name,
        phone: salon.phone || '',
        address: salon.address || '',
        logoUrl: salonLogo,
        email: salon.email || '',
      },
      system: {
        logoUrl: systemLogoDataUrl,
        name: 'Uruti Saluni',
        url: 'www.urutisaluni.com'
      },
      employees: employeesData,
      generatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    try {
      const report = await this.jsreportInstance.render({
        template: {
          content: this.getEmployeeCardsTemplate(),
          engine: 'handlebars',
          recipe: 'chrome-pdf',
        },
        data: templateData,
      });

      return report.content;
    } catch (e) {
      console.error('Error rendering PDF', e);
      throw new Error('Failed to generate employee cards PDF');
    }
  }

  async generateSingleEmployeeCard(salonId: string, employeeId: string): Promise<Buffer> {
    await this.ensureJsReportReady();

    const salon = await this.salonsService.findOne(salonId);
    if (!salon) {
      throw new BadRequestException('Salon not found');
    }

    const employee = await this.salonsService.findEmployeeById(employeeId);
    if (!employee || employee.salonId !== salonId) {
      throw new BadRequestException('Employee not found in this salon');
    }

    // Resolve System Logo
    let systemLogoDataUrl = '';
    try {
      const logoPath = path.resolve(process.cwd(), '../web/public/logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        systemLogoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Failed to load system logo:', e);
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const resolveUrl = (url?: string) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      const cleanBase = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      return `${cleanBase}${cleanPath}`;
    };

    const salonLogo = resolveUrl(salon.images?.[0]);

    // Generate QR code for this employee
    let qrCodeDataUrl = '';
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const cleanFrontendUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
      const verificationUrl = `${cleanFrontendUrl}/verify/employee/${employee.id}`;

      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 0,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
    } catch (e) {
      console.error('Error generating QR', e);
    }

    const user = employee.user;
    const names = (user?.fullName || '').split(' ').filter((n: string) => n);
    const initials = names.length > 0
      ? (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase()
      : '??';

    const employeeData = {
      fullName: user?.fullName || 'Unknown',
      roleTitle: employee.roleTitle || 'STAFF MEMBER',
      skills: employee.skills || [],
      skillsStr: employee.skills ? employee.skills.join(' • ') : '',
      employeeId: employee.id.slice(0, 8).toUpperCase(),
      hireDate: employee.hireDate
        ? new Date(employee.hireDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A',
      employmentType: employee.employmentType
        ? employee.employmentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        : '-',
      phone: user?.phone || '',
      email: user?.email || '',
      avatarUrl: resolveUrl(user?.avatarUrl),
      initials,
      qrCodeDataUrl,
    };

    const templateData = {
      salon: {
        name: salon.name,
        phone: salon.phone || '',
        address: salon.address || '',
        logoUrl: salonLogo,
        email: salon.email || '',
      },
      system: {
        logoUrl: systemLogoDataUrl,
        name: 'Uruti Saluni',
        url: 'www.urutisaluni.com'
      },
      employees: [employeeData],
      generatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    try {
      const report = await this.jsreportInstance.render({
        template: {
          content: this.getEmployeeCardsTemplate(),
          engine: 'handlebars',
          recipe: 'chrome-pdf',
        },
        data: templateData,
      });

      return report.content;
    } catch (e) {
      console.error('Error rendering PDF', e);
      throw new Error('Failed to generate employee card PDF');
    }
  }

  private getEmployeeCardsTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    body { 
        font-family: 'Manrope', sans-serif; 
        margin: 0; 
        padding: 0; 
        background: #fff;
        -webkit-print-color-adjust: exact;
    }
    
    .page-container {
        width: 210mm;
        box-sizing: border-box;
        padding: 10mm 12mm;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-content: flex-start;
        gap: 0;
    }

    /* Standard CR80 Card: 85.6mm x 54mm */
    .card-wrapper {
        width: 86mm; 
        height: 54mm;
        margin: 2mm 3mm;
        box-sizing: border-box;
        page-break-inside: avoid;
    }

    .card { 
        width: 100%;
        height: 100%;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 3.5mm;
        overflow: hidden;
        position: relative; 
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* HEADER: Dark & Gold */
    .header { 
        background: #111827; 
        height: 11mm;
        display: flex;
        align-items: center;
        padding: 0 4mm;
        justify-content: space-between;
        border-bottom: 2px solid #C89B68;
    }
    .system-brand { display: flex; align-items: center; gap: 2.5mm; }
    .system-logo-img { height: 7mm; width: auto; filter: brightness(0) invert(1); } /* White Logo */
    
    .system-text-col { display: flex; flex-direction: column; justify-content: center; }
    .system-label { color: #9ca3af; font-size: 3.5pt; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; line-height: 1.2; }
    .system-name { color: #C89B68; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }

    .card-content {
        flex: 1;
        padding: 3.5mm;
        display: flex;
        gap: 3.5mm;
        position: relative;
    }
    
    .card-content::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #fafafa;
        background-image: radial-gradient(#C89B68 0.5px, transparent 0.5px);
        background-size: 10px 10px;
        opacity: 0.15;
        z-index: 0;
    }

    .left-col {
        width: 25mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 1;
    }
    .avatar { 
        width: 25mm; 
        height: 29mm; 
        object-fit: cover; 
        border: 1.5px solid #C89B68;
        border-radius: 3mm; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .avatar-placeholder {
        width: 25mm; height: 29mm;
        background: #f3f4f6;
        display: flex; align-items: center; justify-content: center;
        font-size: 14pt; color: #9ca3af; font-weight: 700;
        border: 1.5px solid #C89B68; border-radius: 3mm;
    }
    
    .id-badge {
        margin-top: 2mm;
        font-size: 6.5pt;
        font-weight: 700;
        color: #111827; 
        background: #fff;
        border: 1px solid #e5e7eb;
        padding: 0.5mm 3mm;
        border-radius: 10mm;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .right-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        z-index: 1;
        padding-top: 0.5mm;
    }
    
    .salon-name { font-size: 6.5pt; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5mm; }
    .employee-name { font-size: 11pt; font-weight: 800; color: #111827; leading-trim: both; line-height: 1.1; margin-bottom: 0.5mm; }
    .role-title { font-size: 8pt; font-weight: 700; color: #C89B68; text-transform: uppercase; margin-bottom: 2.5mm; }
    
    .details { display: flex; flex-direction: column; gap: 0.8mm; margin-top: 0; }
    .detail-row { display: flex; align-items: baseline; font-size: 6.5pt; color: #374151; }
    .label { width: 14mm; color: #9ca3af; font-weight: 500; font-size: 6pt; text-transform: uppercase; }
    .value { font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 35mm; }
    
    .qr-container {
        position: absolute;
        bottom: 3.5mm;
        right: 3.5mm;
        width: 15mm;
        height: 15mm;
        background: white;
        padding: 1mm;
        border-radius: 1.5mm;
        border: 1px solid #f3f4f6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .qr-code { width: 100%; height: 100%; display: block; }

    .footer-strip {
        height: 3mm;
        background: #111827;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: 1px solid #C89B68;
    }
    .footer-text { font-size: 3.5pt; color: #C89B68; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }

  </style>
</head>
<body>
  <div class="page-container">
  {{#each employees}}
    <div class="card-wrapper">
        <div class="card">
            <div class="header">
                <div class="system-brand">
                    {{#if ../system.logoUrl}}<img src="{{../system.logoUrl}}" class="system-logo-img" alt="Logo" />{{/if}}
                    <div class="system-text-col">
                        <span class="system-label">Association</span>
                        <span class="system-name">Uruti Saluni</span>
                    </div>
                </div>
            </div>
            
            <div class="card-content">
                <div class="left-col">
                    {{#if avatarUrl}}
                    <img src="{{avatarUrl}}" class="avatar" />
                    {{else}}
                    <div class="avatar-placeholder">{{initials}}</div>
                    {{/if}}
                    <div class="id-badge">{{employeeId}}</div>
                </div>
                
                <div class="right-col">
                    <div class="salon-name">{{../salon.name}}</div>
                    <div class="employee-name">{{fullName}}</div>
                    <div class="role-title">{{roleTitle}}</div>
                    
                    <div class="details">
                        <div class="detail-row"><span class="label">Status</span> <span class="value">{{employmentType}}</span></div>
                        <div class="detail-row"><span class="label">Hired</span> <span class="value">{{hireDate}}</span></div>
                        <div class="detail-row"><span class="label">Phone</span> <span class="value">{{phone}}</span></div>
                        {{#if email}}<div class="detail-row"><span class="label">Email</span> <span class="value">{{email}}</span></div>{{/if}}
                    </div>
                </div>
                
                <div class="qr-container">
                    <img src="{{qrCodeDataUrl}}" class="qr-code" />
                </div>
            </div>
            
            <div class="footer-strip">
                <span class="footer-text">Member of Uruti Saluni Association</span>
            </div>
        </div>
    </div>
  {{/each}}
  </div>
</body>
</html>
    `;
  }

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
      throw new Error(
        `PDF generation service is not available: ${initError.message}`,
      );
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

      console.log(
        `[RECEIPT] PDF rendered successfully (${report.content.length} bytes)`,
      );
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
  async generatePnlReport(data: any): Promise<Buffer> {
    await this.ensureJsReportReady();
    await this.ensurePnlTemplate();

    const report = await this.jsreportInstance.render({
      template: {
        name: 'profit-loss',
      },
      data: {
        ...data,
        generationDate: new Date().toLocaleDateString(),
        isProfitable: data.netIncomeRaw >= 0,
      },
    });

    return report.content;
  }

  private async ensurePnlTemplate() {
    try {
      if (!this.jsreportInstance) return;

      const templates = await this.jsreportInstance.documentStore
        .collection('templates')
        .find({ name: 'profit-loss' });

      if (templates.length === 0) {
        await this.jsreportInstance.documentStore
          .collection('templates')
          .insert({
            name: 'profit-loss',
            engine: 'handlebars',
            recipe: 'chrome-pdf',
            content: this.getPnlTemplate(),
          });
      }
    } catch (error) {
      console.error('Error ensuring P&L template:', error);
    }
  }

  private getPnlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; font-size: 14px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; color: #2c3e50; text-transform: uppercase; font-size: 22px; letter-spacing: 1px; }
    .header h2 { margin: 5px 0 0; font-size: 16px; color: #7f8c8d; font-weight: normal; }
    .period { margin-top: 10px; font-size: 12px; color: #95a5a6; font-style: italic; }
    
    .section-title { 
        background: #f8f9fa; 
        padding: 8px 12px; 
        font-weight: bold; 
        border-left: 4px solid #34495e; 
        margin-top: 25px; 
        text-transform: uppercase; 
        font-size: 12px; 
        color: #2c3e50;
    }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { padding: 10px 12px; border-bottom: 1px solid #ecf0f1; }
    .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #2c3e50; }
    
    .row-indent { padding-left: 25px; color: #555; }
    
    .total-row td { 
        border-top: 2px solid #34495e; 
        border-bottom: none; 
        font-weight: bold; 
        font-size: 14px; 
        padding-top: 12px; 
        background-color: #fcfcfc;
    }
    
    .grand-total-table { est margin-top: 30px; border: 2px solid #eee; }
    .grand-total-row td { 
        font-size: 16px; 
        font-weight: bold; 
        padding: 15px; 
        border-top: 2px solid #333;
    }
    
    .net-income { color: #27ae60; }
    .net-loss { color: #c0392b; }
    
    .footer { 
        position: fixed; 
        bottom: 20px; 
        left: 40px; 
        right: 40px; 
        text-align: center; 
        font-size: 10px; 
        color: #bdc3c7; 
        border-top: 1px solid #ecf0f1; 
        padding-top: 10px; 
    }
  </style>
</head>
<body>
  <div class="header">
      <h1>Profit & Loss Statement</h1>
      <h2>{{salonName}}</h2>
      <div class="period">Reporting Period: {{startDate}} — {{endDate}}</div>
  </div>

  <!-- REVENUE SECTION -->
  <div class="section-title">Revenue</div>
  <table>
      <tr>
          <td class="row-indent">Sales Revenue (Services & Products)</td>
          <td class="amount">{{totalRevenue}}</td>
      </tr>
      <tr>
          <td class="row-indent">Other Income</td>
          <td class="amount">0</td>
      </tr>
      <tr class="total-row">
          <td>Total Operating Income</td>
          <td class="amount">{{totalRevenue}}</td>
      </tr>
  </table>

  <!-- EXPENSES SECTION -->
  <div class="section-title">Operating Expenses</div>
  <table>
      {{#each expensesByCategory}}
      <tr>
          <td class="row-indent">{{name}}</td>
          <td class="amount">{{amount}}</td>
      </tr>
      {{/each}}
      
      {{#if expensesByCategory.length}}
      {{else}}
      <tr>
          <td class="row-indent" style="font-style:italic; color:#999;">No expenses recorded</td>
          <td class="amount">0</td>
      </tr>
      {{/if}}

      <tr class="total-row">
          <td>Total Operating Expenses</td>
          <td class="amount" style="color: #c0392b;">({{totalExpenses}})</td>
      </tr>
  </table>

  <!-- NET INCOME SECTION -->
  <div style="margin-top: 40px;"></div>
  <table>
      <tr class="grand-total-row">
          <td>NET INCOME</td>
          <td class="amount {{#if isProfitable}}net-income{{else}}net-loss{{/if}}">
              {{netIncome}}
          </td>
      </tr>
  </table>

  <div class="footer">
      Generated on {{generationDate}} • Uruti Saluni Management System • Page 1 of 1
  </div>
</body>
</html>
    `;
  }

  async generateBalanceSheetReport(data: any): Promise<Buffer> {
    await this.ensureJsReportReady();

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
    .header p { margin: 2px 0; color: #666; }
    
    .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .report-table th, .report-table td { padding: 4px 0; }
    .section-header { font-weight: bold; text-transform: uppercase; color: #444; border-bottom: 1px solid #999; padding-top: 10px; }
    .sub-section-header { font-weight: bold; padding-left: 10px; font-style: italic; margin-top: 5px; }
    .item-row td { padding-left: 20px; }
    .total-row { font-weight: bold; border-top: 1px solid #333; }
    .grand-total-row { font-weight: bold; border-top: 2px solid #333; border-bottom: 4px double #333; padding-top: 5px; }
    .amount { text-align: right; }
    
    .accounting-equation { 
      background: #f4f4f4; 
      padding: 10px; 
      margin-bottom: 20px; 
      text-align: center; 
      font-weight: bold; 
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Balance Sheet</h1>
    <p>${data.salonName}</p>
    <p>As of ${data.asOfDate}</p>
  </div>

  <div class="accounting-equation">
    Assets (${data.formattedTotalAssets}) = Liabilities & Equity (${data.formattedTotalLiabEquity})
  </div>

  <table class="report-table">
    <!-- ASSETS -->
    <tr>
      <td colspan="2" class="section-header">Assets</td>
    </tr>
    ${data.assets.length > 0 ? data.assets.map((a: any) => `
    <tr class="item-row">
      <td>${a.name}</td>
      <td class="amount">${a.formattedBalance}</td>
    </tr>
    `).join('') : '<tr class="item-row"><td colspan="2" style="font-style:italic; color:#999;">No assets recorded</td></tr>'}
    <tr class="total-row">
      <td style="padding-left: 10px;">Total Assets</td>
      <td class="amount">${data.formattedTotalAssets}</td>
    </tr>

    <!-- LIABILITIES -->
    <tr><td colspan="2" style="height: 15px;"></td></tr>
    <tr>
      <td colspan="2" class="section-header">Liabilities</td>
    </tr>
    ${data.liabilities.length > 0 ? data.liabilities.map((l: any) => `
    <tr class="item-row">
      <td>${l.name}</td>
      <td class="amount">${l.formattedBalance}</td>
    </tr>
    `).join('') : '<tr class="item-row"><td colspan="2" style="font-style:italic; color:#999;">No liabilities recorded</td></tr>'}
    <tr class="total-row">
      <td style="padding-left: 10px;">Total Liabilities</td>
      <td class="amount">${data.formattedTotalLiabilities}</td>
    </tr>

    <!-- EQUITY -->
    <tr><td colspan="2" style="height: 15px;"></td></tr>
    <tr>
      <td colspan="2" class="section-header">Equity</td>
    </tr>
    ${data.equity.length > 0 ? data.equity.map((e: any) => `
    <tr class="item-row">
      <td>${e.name}</td>
      <td class="amount">${e.formattedBalance}</td>
    </tr>
    `).join('') : '<tr class="item-row"><td colspan="2" style="font-style:italic; color:#999;">No equity recorded</td></tr>'}
    <tr class="total-row">
      <td style="padding-left: 10px;">Total Equity</td>
      <td class="amount">${data.formattedTotalEquity}</td>
    </tr>

    <!-- TOTAL LIABILITIES & EQUITY -->
    <tr><td colspan="2" style="height: 10px;"></td></tr>
    <tr class="grand-total-row">
      <td>Total Liabilities & Equity</td>
      <td class="amount">${data.formattedTotalLiabEquity}</td>
    </tr>
  </table>
  
  <div style="font-size: 10px; color: #999; text-align: center; margin-top: 30px;">
    Generated by Uruti Saluni
  </div>
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

  async generateProfitAndLossReport(data: any): Promise<Buffer> {
    await this.ensureJsReportReady();

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
    .header p { margin: 2px 0; color: #666; }
    
    .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .report-table th, .report-table td { padding: 4px 0; }
    .section-header { font-weight: bold; text-transform: uppercase; color: #444; border-bottom: 1px solid #999; padding-top: 10px; }
    .item-row td { padding-left: 20px; }
    .total-row { font-weight: bold; border-top: 1px solid #333; }
    .grand-total-row { font-weight: bold; border-top: 2px solid #333; border-bottom: 4px double #333; padding-top: 5px; font-size: 14px; }
    .amount { text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Profit & Loss Statement</h1>
    <p>${data.salonName}</p>
    <p>${data.dateRange}</p>
  </div>

  <table class="report-table">
    <!-- INCOME -->
    <tr>
      <td colspan="2" class="section-header">Income</td>
    </tr>
    ${data.revenue.length > 0 ? data.revenue.map((r: any) => `
    <tr class="item-row">
      <td>${r.name}</td>
      <td class="amount">${r.formattedAmount}</td>
    </tr>
    `).join('') : '<tr class="item-row"><td colspan="2" style="font-style:italic; color:#999;">No income recorded</td></tr>'}
    <tr class="total-row">
      <td style="padding-left: 10px;">Total Income</td>
      <td class="amount">${data.formattedTotalRevenue}</td>
    </tr>

    <!-- EXPENSES -->
    <tr><td colspan="2" style="height: 15px;"></td></tr>
    <tr>
      <td colspan="2" class="section-header">Expenses</td>
    </tr>
    ${data.expenses.length > 0 ? data.expenses.map((e: any) => `
    <tr class="item-row">
      <td>${e.name}</td>
      <td class="amount">${e.formattedAmount}</td>
    </tr>
    `).join('') : '<tr class="item-row"><td colspan="2" style="font-style:italic; color:#999;">No expenses recorded</td></tr>'}
    <tr class="total-row">
      <td style="padding-left: 10px;">Total Expenses</td>
      <td class="amount">${data.formattedTotalExpenses}</td>
    </tr>

    <!-- NET INCOME -->
    <tr><td colspan="2" style="height: 20px;"></td></tr>
    <tr class="grand-total-row">
      <td>NET INCOME</td>
      <td class="amount" style="${data.netIncome < 0 ? 'color: red;' : ''}">${data.formattedNetIncome}</td>
    </tr>
  </table>

  <div style="font-size: 10px; color: #999; text-align: center; margin-top: 30px;">
    Generated by Uruti Saluni
  </div>
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

  async generateChartOfAccountsReport(data: any): Promise<Buffer> {
    await this.ensureJsReportReady();

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
    .header p { margin: 2px 0; color: #666; }
    
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 6px; border-bottom: 2px solid #333; color: #333; text-transform: uppercase; font-size: 11px; }
    td { padding: 6px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .type-badge { 
      font-size: 10px; 
      padding: 2px 6px; 
      border-radius: 4px; 
      background: #e0e0e0; 
      color: #333; 
      text-transform: uppercase; 
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Chart of Accounts</h1>
    <p>${data.salonName}</p>
    <p>As of ${data.date}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th width="15%">Code</th>
        <th width="40%">Account Name</th>
        <th width="15%">Type</th>
        <th width="30%">Category</th>
      </tr>
    </thead>
    <tbody>
      ${data.accounts.map((acc: any) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${acc.code}</td>
          <td>${acc.name}</td>
          <td><span class="type-badge">${acc.accountType}</span></td>
          <td>${acc.category || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div style="font-size: 10px; color: #999; text-align: center; margin-top: 30px;">
    Generated by Uruti Saluni
  </div>
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
}
