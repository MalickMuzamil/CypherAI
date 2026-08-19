import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SharesService } from './shares.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { CreateShareDto } from './dto/create-share.dto';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  private meta(req: Request) {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShareDto,
    @Req() req: Request,
  ) {
    return this.sharesService.create(
      user.id,
      user.email,
      user.name,
      dto,
      this.meta(req),
    );
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.sharesService.list(user.id, user.email);
  }

  @Post(':id/accept')
  accept(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.sharesService.accept(user.id, user.email, id, this.meta(req));
  }

  @Post(':id/decline')
  decline(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.sharesService.decline(user.id, user.email, id, this.meta(req));
  }

  @Delete(':id/revoke')
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.sharesService.revoke(user.id, id, this.meta(req));
  }

  @Get(':id/reveal')
  reveal(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.sharesService.revealSharedPassword(
      user.id,
      user.email,
      id,
      this.meta(req),
    );
  }
}
