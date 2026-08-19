import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { UsersService } from '../users/users.service';
import { SecurityService } from '../security/security.service';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} from '../common/constants';
import { SESSION_CONFIG } from '../common/session.config';
import { parseUserAgent } from '../common/utils/device';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MfaDto } from './dto/mfa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly security: SecurityService,
  ) {}

  private cookieOptions(maxAge: number, httpOnly = true) {
    return {
      ...this.auth.getCookieOptions(),
      httpOnly,
      path: '/',
      maxAge,
    };
  }

  private meta(req: Request) {
    const rawDevice = req.headers['x-device-name']?.toString();
    const ua = req.headers['user-agent'];
    const info = parseUserAgent(ua, rawDevice);
    return {
      deviceName: info.deviceName,
      browser: info.browser,
      os: info.os,
      deviceType: info.deviceType,
      ipAddress: req.ip,
    };
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(
      dto.name,
      dto.email,
      dto.password,
    );
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      this.meta(req),
    );

    if (result.mfaRequired === true && 'mfaToken' in result) {
      res.cookie(
        'vaultly_mfa',
        result.mfaToken,
        this.cookieOptions(SESSION_CONFIG.MFA_CHALLENGE_TTL),
      );

      return {
        mfaRequired: true,
      };
    }

    if ('accessToken' in result && 'refreshToken' in result) {
      this.setSessionCookies(
        res,
        result.accessToken,
        result.refreshToken,
        result.csrfToken,
      );

      return {
        mfaRequired: false,
        user: result.user,
        csrfToken: result.csrfToken,
      };
    }
  }

  @Public()
  @Post('mfa/verify')
  async verifyMfa(
    @Body() dto: MfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.vaultly_mfa;

    if (!token) {
      throw new UnauthorizedException('MFA verification session expired');
    }

    let jwt;
    try {
      jwt = await this.auth.verifyMfaToken(token);
    } catch {
      throw new UnauthorizedException('MFA verification session expired');
    }

    if (jwt?.purpose !== 'MFA') {
      throw new UnauthorizedException('MFA verification session expired');
    }

    const result = await this.auth.verifyMfa(
      jwt.sub,
      dto.code,
      this.meta(req),
    );

    this.setSessionCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken,
    );

    res.clearCookie('vaultly_mfa', this.cookieOptions(0));

    return {
      user: result.user,
      csrfToken: result.csrfToken,
    };
  }

  @Post('mfa/setup')
  async setupMfa(
    @CurrentUser() user: RequestUser,
  ) {
    const foundUser = await this.users.findById(user.id);
    if (!foundUser) {
      throw new UnauthorizedException();
    }

    const setup = await this.auth.setupMfa(user.id);
    return {
      otpauthUrl: setup.otpauthUrl,
    };
  }

  @Post('mfa/enable')
  async enableMfa(
    @CurrentUser() user: RequestUser,
    @Body() dto: MfaDto,
  ) {
    return this.auth.enableMfa(user.id, dto.code);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh = req.cookies?.[REFRESH_COOKIE];

    if (!refresh) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.auth.refresh(refresh);

    this.setSessionCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken,
    );

    return {
      ok: true,
      csrfToken: result.csrfToken,
    };
  }

  @Post('verify-password')
  async verifyPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyPasswordDto,
  ) {
    return this.auth.verifyPassword(user.id, dto.password);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );

    // Clear existing session cookies
    res.clearCookie(ACCESS_COOKIE, this.cookieOptions(0));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(0));
    res.clearCookie(CSRF_COOKIE, this.cookieOptions(0, false));

    return {
      ok: true,
      message: 'Password updated successfully. Please log in with your new password.',
    };
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.security.revoke(
      user.id,
      user.sessionId,
    );

    res.clearCookie(ACCESS_COOKIE, this.cookieOptions(0));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(0));
    res.clearCookie(CSRF_COOKIE, this.cookieOptions(0, false));

    return {
      ok: true,
    };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const found = await this.users.findById(user.id);

    if (!found) {
      throw new UnauthorizedException();
    }

    return this.auth.safeUser(found);
  }

  public setSessionCookies(
    res: Response,
    access: string,
    refresh: string,
    csrfToken?: string,
  ) {
    res.cookie(
      ACCESS_COOKIE,
      access,
      this.cookieOptions(SESSION_CONFIG.ACCESS_COOKIE_MAX_AGE, true),
    );

    res.cookie(
      REFRESH_COOKIE,
      refresh,
      this.cookieOptions(SESSION_CONFIG.REFRESH_COOKIE_MAX_AGE, true),
    );

    if (csrfToken) {
      // CSRF cookie must be readable by frontend JS to set X-CSRF-Token header
      res.cookie(
        CSRF_COOKIE,
        csrfToken,
        this.cookieOptions(SESSION_CONFIG.CSRF_COOKIE_MAX_AGE, false),
      );
    }
  }
}