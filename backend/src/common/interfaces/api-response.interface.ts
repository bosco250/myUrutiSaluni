export interface ApiResponse<T = any> {
  data: T;
  statusCode: number;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
  };
}

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  errors?: any;
  stack?: string;
}
