import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../Decorator/roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    const request = context.switchToHttp().getRequest();

    // If no roles are specified, allow access (only authentication required)
    if (!roles || !Array.isArray(roles)) {
      return true;
    }

    if (!roles.includes(request.user.role))
      throw new UnauthorizedException('Not allow for you');
    return true;
  }
}
