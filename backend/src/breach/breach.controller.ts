import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { BreachService } from './breach.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';

@Controller('breach')
export class BreachController {
  constructor(private readonly service: BreachService) {}

  private meta(req: Request) {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Get('status')
  getStatus(@CurrentUser() user: RequestUser) {
    return this.service.getStatus(user.id, user.email);
  }

  @Post('check')
  checkBreaches(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.service.checkBreaches(user.id, user.email, this.meta(req));
  }
}
