import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      
      // Handle specific database errors
      const error = exception as any;
      const errorMessage = exception.message || 'Database query failed';
      
      // Extract SQLite error details
      if (errorMessage.includes('NOT NULL constraint')) {
        const match = errorMessage.match(/NOT NULL constraint failed: (\w+\.\w+)/);
        if (match) {
          message = `Required field missing: ${match[1]}`;
        } else {
          message = 'Required field is missing';
        }
      } else if (error.code === '23505') {
        message = 'Duplicate entry found';
      } else if (error.code === '23503') {
        message = 'Foreign key constraint violation';
      } else {
        // Show the actual database error message in development
        message = process.env.NODE_ENV === 'development' 
          ? errorMessage 
          : 'Database query failed';
      }
      
      this.logger.error(`Database error: ${errorMessage}`, exception.stack);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errors && { errors }),
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error && { 
        stack: exception.stack 
      }),
    };

    response.status(status).json(errorResponse);
  }
}
