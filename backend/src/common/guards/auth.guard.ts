import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PUBLIC_ROUTE, ACCESS_COOKIE, CSRF_COOKIE } from '../constants';
import { UsersService } from '../../users/users.service';
import { SecurityService } from '../../security/security.service';
import { RequestUser } from '../types/request-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly security: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Authentication required');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (payload.purpose === 'MFA' || !payload.sid) {
      throw new UnauthorizedException('MFA verification required');
    }

    // 1.1 Session Validation in DB
    const isValidSession = await this.security.validateSession(payload.sid, payload.sub);
    if (!isValidSession) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.disabled) throw new UnauthorizedException('Account unavailable');

    // 1.4 CSRF Protection: For mutating requests (POST, PUT, PATCH, DELETE)
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (isMutatingMethod) {
      const csrfCookie = req.cookies?.[CSRF_COOKIE];
      const csrfHeader = req.headers['x-csrf-token'] as string | undefined;

      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        throw new ForbiddenException('Invalid or missing CSRF token');
      }
    }

    (req as Request & { user: RequestUser }).user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId: payload.sid,
    };

    return true;
  }
}