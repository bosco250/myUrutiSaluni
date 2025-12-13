import { api } from './api';

export interface ReviewAspects {
  service: number;
  punctuality: number;
  cleanliness: number;
  value: number;
}

export interface Review {
  id: string;
  customerId: string;
  salonId: string;
  employeeId?: string;
  appointmentId?: string;
  rating: number;
  comment?: string;
  aspects?: ReviewAspects;
  isVerified: boolean;
  createdAt: string;
  customer?: {
    id: string;
    user: {
      fullName: string;
    };
  };
  salon?: {
    id: string;
    name: string;
  };
  employee?: {
    id: string;
    user: {
      fullName: string;
    };
  };
}

export interface CreateReviewData {
  salonId: string;
  employeeId?: string;
  appointmentId?: string;
  rating: number;
  comment?: string;
  aspects?: ReviewAspects;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  aspectAverages: ReviewAspects;
}

class ReviewsService {
  /**
   * Create a new review
   */
  async createReview(data: CreateReviewData): Promise<Review> {
    return api.post<Review>('/reviews', data);
  }

  /**
   * Get reviews with optional filters
   */
  async getReviews(filters?: {
    salonId?: string;
    employeeId?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const params = new URLSearchParams();
    if (filters?.salonId) params.append('salonId', filters.salonId);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return api.get<{ reviews: Review[]; total: number; averageRating: number }>(
      `/reviews?${params.toString()}`
    );
  }

  /**
   * Get current user's reviews
   */
  async getMyReviews(): Promise<Review[]> {
    return api.get<Review[]>('/reviews/my-reviews');
  }

  /**
   * Get salon review stats
   */
  async getSalonStats(salonId: string): Promise<ReviewStats> {
    return api.get<ReviewStats>(`/reviews/salon/${salonId}/stats`);
  }

  /**
   * Get single review
   */
  async getReview(id: string): Promise<Review> {
    return api.get<Review>(`/reviews/${id}`);
  }

  /**
   * Update a review
   */
  async updateReview(id: string, data: Partial<CreateReviewData>): Promise<Review> {
    return api.patch<Review>(`/reviews/${id}`, data);
  }

  /**
   * Delete a review
   */
  async deleteReview(id: string): Promise<void> {
    return api.delete<void>(`/reviews/${id}`);
  }

  /**
   * Check if user can review an appointment
   */
  async canReviewAppointment(appointmentId: string): Promise<boolean> {
    try {
      const myReviews = await this.getMyReviews();
      return !myReviews.some(r => r.appointmentId === appointmentId);
    } catch {
      return true;
    }
  }
}

export const reviewsService = new ReviewsService();
