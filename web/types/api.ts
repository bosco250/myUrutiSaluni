export interface APIResponse<T = any> {
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
  message: string | string[];
  errors?: Record<string, string[]>;
  stack?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: string;
}

export interface RegisterResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  [key: string]: any;
}
