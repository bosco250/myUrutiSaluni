import { api } from "./api";

export interface LoyaltyPointsBalance {
  balance: number;
}

export interface LoyaltyPointTransaction {
  id: string;
  points: number;
  balanceAfter: number;
  sourceType: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface LoyaltyPointsHistory {
  transactions: LoyaltyPointTransaction[];
  total: number;
  page?: number;
  limit?: number;
}

export interface LoyaltyData {
  membershipTier: "Bronze" | "Silver" | "Gold" | "Platinum";
  pointsBalance: number;
  pointsExpiry: string | null;
  rewards: Reward[];
}

export interface Reward {
  id: string;
  title: string;
  pointsRequired: number;
  pointsProgress: number;
  description: string;
}

class LoyaltyService {
  /**
   * Get loyalty points balance for a customer
   */
  async getPointsBalance(customerId: string): Promise<number> {
    try {
      const response = await api.get<LoyaltyPointsBalance>(
        `/customers/${customerId}/loyalty-points/balance`
      );
      return response.balance || 0;
    } catch (error: any) {
      console.error("Error fetching points balance:", error);
      return 0;
    }
  }

  /**
   * Get loyalty points transaction history
   */
  async getPointsHistory(
    customerId: string,
    page?: number,
    limit?: number
  ): Promise<LoyaltyPointsHistory> {
    try {
      const params = new URLSearchParams();
      if (page) params.append("page", page.toString());
      if (limit) params.append("limit", limit.toString());

      const queryString = params.toString();
      const url = `/customers/${customerId}/loyalty-points/transactions${
        queryString ? `?${queryString}` : ""
      }`;

      // Backend returns { data: [], total, page, limit, totalPages }
      // Map it to { transactions: [], total, page, limit }
      const response = await api.get<{
        data: LoyaltyPointTransaction[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(url);
      
      return {
        transactions: response.data || [],
        total: response.total || 0,
        page: response.page,
        limit: response.limit,
      };
    } catch (error: any) {
      console.error("Error fetching points history:", error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Calculate membership tier based on points
   */
  calculateMembershipTier(
    points: number
  ): "Bronze" | "Silver" | "Gold" | "Platinum" {
    if (points >= 5000) return "Platinum";
    if (points >= 2500) return "Gold";
    if (points >= 1000) return "Silver";
    return "Bronze";
  }

  /**
   * Calculate points expiry date (if configured)
   * Default: points never expire (null)
   */
  calculatePointsExpiry(): string | null {
    // For now, points don't expire
    // In the future, this could use rewards config to determine expiry
    return null;
  }

  /**
   * Get available rewards based on points balance
   * This generates rewards dynamically based on the user's current points
   */
  getAvailableRewards(pointsBalance: number): Reward[] {
    const rewards: Reward[] = [];

    // Define reward tiers
    const rewardTiers = [
      {
        id: "1",
        title: "Free Hair Treatment",
        pointsRequired: 1000,
        description: "Redeem for 1,000 points",
      },
      {
        id: "2",
        title: "Free Haircut",
        pointsRequired: 500,
        description: "Redeem for 500 points",
      },
      {
        id: "3",
        title: "20% Discount",
        pointsRequired: 250,
        description: "Redeem for 250 points",
      },
      {
        id: "4",
        title: "Free Styling",
        pointsRequired: 1500,
        description: "Redeem for 1,500 points",
      },
      {
        id: "5",
        title: "VIP Membership",
        pointsRequired: 5000,
        description: "Redeem for 5,000 points",
      },
    ];

    // Generate rewards with progress
    rewardTiers.forEach((tier) => {
      rewards.push({
        ...tier,
        pointsProgress: Math.min(pointsBalance, tier.pointsRequired),
      });
    });

    // Sort by points required (ascending)
    return rewards.sort((a, b) => a.pointsRequired - b.pointsRequired);
  }

  /**
   * Get complete loyalty data for a customer
   */
  async getLoyaltyData(customerId: string): Promise<LoyaltyData> {
    try {
      const pointsBalance = await this.getPointsBalance(customerId);
      const membershipTier = this.calculateMembershipTier(pointsBalance);
      const pointsExpiry = this.calculatePointsExpiry();
      const rewards = this.getAvailableRewards(pointsBalance);

      return {
        membershipTier,
        pointsBalance,
        pointsExpiry,
        rewards,
      };
    } catch (error: any) {
      console.error("Error fetching loyalty data:", error);
      // Return default data on error
      return {
        membershipTier: "Bronze",
        pointsBalance: 0,
        pointsExpiry: null,
        rewards: this.getAvailableRewards(0),
      };
    }
  }
}

export const loyaltyService = new LoyaltyService();
