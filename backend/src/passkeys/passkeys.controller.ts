import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PasskeysService } from './passkeys.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { parseUserAgent } from '../common/utils/device';
import { AuthService } from '../auth/auth.service';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
} from '../common/constants';
import { SESSION_CONFIG } from '../common/session.config';

@Controller('auth/passkeys')
export class PasskeysController {
  constructor(
    private readonly passkeysService: PasskeysService,
    private readonly authService: AuthService,
  ) {}

  private cookieOptions(maxAge: number, httpOnly = true) {
    return {
      ...this.authService.getCookieOptions(),
      httpOnly,
      path: '/',
      maxAge,
    };
  }

  private setSessionCookies(
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
      res.cookie(
        CSRF_COOKIE,
        csrfToken,
        this.cookieOptions(SESSION_CONFIG.CSRF_COOKIE_MAX_AGE, false),
      );
    }
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

  @Post('register/begin')
  beginRegistration(@CurrentUser() user: RequestUser) {
    return this.passkeysService.beginRegistration(user.id);
  }

  @Post('register/finish')
  finishRegistration(
    @CurrentUser() user: RequestUser,
    @Body() body: { response: any; name?: string },
  ) {
    return this.passkeysService.finishRegistration(
      user.id,
      body.response,
      body.name,
    );
  }

  @Public()
  @Post('check')
  checkPasskey(@Body() body: { email?: string }) {
    return this.passkeysService.checkPasskeyAvailability(body?.email);
  }

  @Public()
  @Post('auth/begin')
  beginAuthentication(@Body() body: { email?: string }) {
    return this.passkeysService.beginAuthentication(body?.email);
  }

  @Public()
  @Post('auth/finish')
  async finishAuthentication(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passkeysService.finishAuthentication(
      body,
      this.meta(req),
    );

    this.setSessionCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken,
    );

    return {
      user: result.user,
      csrfToken: result.csrfToken,
    };
  }

  @Get()
  listPasskeys(@CurrentUser() user: RequestUser) {
    return this.passkeysService.listPasskeys(user.id);
  }

  @Delete(':id')
  revokePasskey(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.passkeysService.revokePasskey(user.id, id);
  }
}
