import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark that a route requires resource ownership check
 * The parameter name should match the resource ID parameter
 */
export const RequireOwnership = (resourceIdParam: string = 'id') =>
  SetMetadata('requireOwnership', resourceIdParam);

