import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly salonsService: SalonsService,
  ) {}

  @Get('receipt/:saleId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Generate PDF receipt for a sale' })
  async generateReceipt(
    @Param('saleId') saleId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      console.log(`[RECEIPT] Generating receipt for sale: ${saleId}`);
      const pdf = await this.reportsService.generateReceipt(saleId);

      if (!pdf || pdf.length === 0) {
        console.error('[RECEIPT] Generated PDF is empty');
        return res.status(500).json({
          message: 'Generated receipt is empty',
          error: 'PDF generation failed'
        });
      }

      console.log(`[RECEIPT] Successfully generated PDF (${pdf.length} bytes)`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="receipt-${saleId.slice(0, 8)}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      console.error('[RECEIPT] Error generating receipt:', error);

      let statusCode = 500;
      let errorMessage = 'Failed to generate receipt';

      if (error.message?.includes('not found')) {
        statusCode = 404;
        errorMessage = 'Sale not found';
      } else if (error.message?.includes('permission')) {
        statusCode = 403;
        errorMessage = 'Permission denied';
      } else if (error.message?.includes('jsreport')) {
        errorMessage = 'PDF generation service temporarily unavailable';
      }

      res.status(statusCode).json({
        message: errorMessage,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  @Get('sales')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Generate sales report PDF' })
  async generateSalesReport(
    @Query('salonId') salonId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    // Salon owners and employees can only generate reports for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only generate reports for your own salon',
        );
      }
      // Use first salon if no salonId specified
      if (!salonId && salonIds.length > 0) {
        salonId = salonIds[0];
      }
    }

    try {
      const filters = {
        salonId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const pdf = await this.reportsService.generateSalesReport(filters);

      res.setHeader('Content-Type', 'application/pdf');
      const filename = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(pdf);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to generate sales report',
        error: error.message,
      });
    }
  }

  @Get('membership-certificate/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Generate membership certificate PDF with QR code' })
  async generateMembershipCertificate(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    // Users can only generate their own certificate unless they're admins
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.ASSOCIATION_ADMIN
    ) {
      if (userId !== user.id) {
        throw new ForbiddenException(
          'You can only generate your own membership certificate',
        );
      }
    }

    try {
      const pdf =
        await this.reportsService.generateMembershipCertificate(userId);

      res.setHeader('Content-Type', 'application/pdf');
      const filename = `membership-certificate-${userId.slice(0, 8)}.pdf`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(pdf);
    } catch (error) {
      console.error(
        'Error in generateMembershipCertificate controller:',
        error,
      );
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error occurred';
      res.status(500).json({
        message: 'Failed to generate membership certificate',
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      });
    }
  }
}
