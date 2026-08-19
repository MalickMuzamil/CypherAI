import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import { UsersService } from '../users/users.service';
import { SecurityService } from '../security/security.service';
import { AuditService } from '../audit/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SESSION_CONFIG } from '../common/session.config';
import { randomToken } from '../common/utils/random';

@Injectable()
export class AuthService {
  // 1.6 Server-side temporary map for MFA setup secrets
  private mfaSetupStore = new Map<string, { secret: string; expiresAt: number }>();

  constructor(
    private readonly users: UsersService,
    private readonly security: SecurityService,
    private readonly audit: AuditService,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  generateCsrfToken(): string {
    return randomToken();
  }

  async register(name: string, email: string, password: string) {
    const user = await this.users.create(name, email, password);

    await this.audit.log({
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: String(user._id),
      actorId: String(user._id),
      actorName: user.name,
    });

    return this.safeUser(user);
  }

  async login(
    email: string,
    password: string,
    meta: { deviceName: string; browser?: string; os?: string; deviceType?: string; ipAddress?: string },
  ) {
    const user = await this.users.findByEmail(email);

    if (
      !user ||
      user.disabled ||
      !(await this.users.verifyPassword(user, password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      const temp = await this.jwt.signAsync(
        {
          sub: String(user._id),
          purpose: 'MFA',
        },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '5m',
        },
      );

      return {
        mfaRequired: true,
        mfaToken: temp,
      };
    }

    return this.issueSession(user, meta);
  }

  async verifyMfaToken(token: string) {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid MFA verification');
    }
  }

  async verifyMfa(
    userId: string,
    code: string,
    meta: { deviceName: string; browser?: string; os?: string; deviceType?: string; ipAddress?: string },
  ) {
    const user = await this.users.getMfaSecret(userId);

    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new UnauthorizedException('MFA is not configured');
    }

    const secret = this.crypto.decrypt(user.mfaSecretEncrypted);

    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    return this.issueSession(user, meta);
  }

  async issueSession(
    user: any,
    meta: { deviceName: string; browser?: string; os?: string; deviceType?: string; ipAddress?: string },
  ) {
    await this.users.touchLogin(String(user._id));

    const days = SESSION_CONFIG.REFRESH_TOKEN_TTL_DAYS;

    const { session, refreshToken } = await this.security.createSession(
      String(user._id),
      meta,
      days,
    );

    const accessToken = await this.jwt.signAsync(
      {
        sub: String(user._id),
        sid: String(session._id),
        role: user.role,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_TTL as any,
      },
    );

    // Refresh JWT only carries sub and sid for identity verification; token value is handled in rotation
    const refreshJwt = await this.jwt.signAsync(
      {
        sub: String(user._id),
        sid: String(session._id),
        token: refreshToken,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${days}d` as any,
      },
    );

    const csrfToken = this.generateCsrfToken();

    await this.audit.log({
      action: 'LOGIN_SUCCESS',
      resourceType: 'SESSION',
      resourceId: String(session._id),
      actorId: String(user._id),
      actorName: user.name,
      ipAddress: meta.ipAddress,
      userAgent: meta.browser,
    });

    await this.notifications.create(
      String(user._id),
      'New vault login',
      `A new session was created from ${meta.deviceName}${meta.ipAddress ? ` (${meta.ipAddress})` : ''}.`,
    );

    return {
      accessToken,
      refreshToken: refreshJwt,
      csrfToken,
      mfaRequired: false,
      user: this.safeUser(user),
    };
  }

  async refresh(refreshJwt: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshJwt, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (!payload?.sub || !payload?.sid || !payload?.token) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const days = SESSION_CONFIG.REFRESH_TOKEN_TTL_DAYS;

    // 1.2 Rotate refresh token with reuse detection
    const { session, refreshToken: newRefreshToken } = await this.security.rotateRefreshToken(
      payload.sid,
      payload.token,
      days,
    );

    if (String(session.userId) !== payload.sub) {
      throw new UnauthorizedException('Invalid session owner');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.disabled) {
      throw new UnauthorizedException('Account unavailable');
    }

    const newAccessToken = await this.jwt.signAsync(
      {
        sub: payload.sub,
        sid: payload.sid,
        role: user.role,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_TTL as any,
      },
    );

    const newRefreshJwt = await this.jwt.signAsync(
      {
        sub: payload.sub,
        sid: payload.sid,
        token: newRefreshToken,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${days}d` as any,
      },
    );

    const csrfToken = this.generateCsrfToken();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshJwt,
      csrfToken,
    };
  }

  async verifyPassword(userId: string, password: string) {
    const isValid = await this.users.verifyPasswordById(userId, password);
    if (!isValid) {
      throw new UnauthorizedException('Incorrect master password');
    }
    return { valid: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    await this.users.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    await this.security.revokeAll(userId);

    const user = await this.users.findById(userId);

    await this.audit.log({
      action: 'PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: userId,
      actorId: userId,
      actorName: user?.name,
    });

    await this.notifications.create(
      userId,
      'Password changed',
      'Your Vaultly password was changed successfully. All active sessions were revoked.',
    );
  }

  getOtpauthUrl(email: string, secret: string) {
    return authenticator.keyuri(
      email,
      'Vaultly',
      secret,
    );
  }

  async setupMfa(userId: string) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = this.getOtpauthUrl(user.email, secret);

    // Store in server-side map for 10 minutes (TTL)
    this.mfaSetupStore.set(userId, {
      secret,
      expiresAt: Date.now() + SESSION_CONFIG.MFA_SETUP_TTL,
    });

    return {
      otpauthUrl,
    };
  }

  async enableMfa(userId: string, code: string) {
    const stored = this.mfaSetupStore.get(userId);
    if (!stored || stored.expiresAt < Date.now()) {
      this.mfaSetupStore.delete(userId);
      throw new UnauthorizedException('MFA setup session expired. Please begin setup again.');
    }

    const { secret } = stored;
    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.users.setMfa(
      userId,
      this.crypto.encrypt(secret),
    );

    this.mfaSetupStore.delete(userId);

    await this.audit.log({
      action: 'MFA_ENABLED',
      resourceType: 'USER',
      resourceId: userId,
      actorId: userId,
    });

    return {
      enabled: true,
    };
  }

  getCookieOptions() {
    const isProduction =
      this.config.get<string>('NODE_ENV', 'development') === 'production';

    const secure =
      this.config.get<boolean>('COOKIE_SECURE', isProduction);

    const sameSite = this.config.get<
      'strict' | 'lax' | 'none'
    >('COOKIE_SAME_SITE', 'lax');

    const domain =
      this.config.get<string>('COOKIE_DOMAIN') || undefined;

    return {
      httpOnly: true,
      secure,
      sameSite,
      ...(domain ? { domain } : {}),
    };
  }

  safeUser(user: any) {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}