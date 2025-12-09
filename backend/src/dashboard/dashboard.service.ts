import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDashboardStats(_salonId?: string) {
    // Placeholder - implement actual analytics
    return {
      totalRevenue: 0,
      totalSales: 0,
      activeLoans: 0,
      totalMembers: 0,
      airtelTransactions: 0,
      totalAppointments: 0,
    };
  }
}
