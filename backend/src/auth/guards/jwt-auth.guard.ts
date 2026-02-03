import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Attempt to extract user from token so @CurrentUser() works when a
      // valid token is present, but don't fail if there is none.
      try {
        await super.canActivate(context);
      } catch {
        // No valid token — allowed on public routes
      }
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
