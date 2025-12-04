import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly maxRequests = 100; // max requests per window
  private readonly windowMs = 60 * 1000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: any): string {
    // Use user ID if authenticated, otherwise use IP
    return request.user?.id || request.ip || 'unknown';
  }
}
