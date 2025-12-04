import { AxiosError } from 'axios';

export interface ErrorDetails {
  message: string;
  statusCode?: number;
  originalError?: any;
  context?: string;
}

export class AppError extends Error {
  statusCode?: number;
  originalError?: any;
  context?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.statusCode = details.statusCode;
    this.originalError = details.originalError;
    this.context = details.context;
  }
}

export function handleAPIError(error: unknown, context?: string): AppError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;
    
    let message = 'An error occurred';
    
    if (status === 401) {
      message = 'Authentication required. Please log in.';
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status === 422) {
      message = data?.message || 'Validation error. Please check your input.';
    } else if (status === 429) {
      message = 'Too many requests. Please try again later.';
    } else if (status && status >= 500) {
      message = 'Server error. Please try again later.';
    } else if (data?.message) {
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    } else if (error.message) {
      message = error.message;
    }

    return new AppError({
      message,
      statusCode: status,
      originalError: error,
      context,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      originalError: error,
      context,
    });
  }

  return new AppError({
    message: 'An unknown error occurred',
    originalError: error,
    context,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof AxiosError) {
    return handleAPIError(error).message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && !!error.request;
  }
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

export function isValidationError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 422 || error.response?.status === 400;
  }
  return false;
}
