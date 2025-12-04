import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has required role
    const userRole = user.role;
    const hasRole = requiredRoles.some((role) => {
      // Compare both enum value and string value
      return userRole === role || userRole === String(role);
    });
    
    if (!hasRole) {
      const roleNames = requiredRoles.map(r => String(r)).join(', ');
      throw new ForbiddenException(
        `Access denied. Required roles: ${roleNames}. Your role: ${userRole}`
      );
    }

    return true;
  }
}

