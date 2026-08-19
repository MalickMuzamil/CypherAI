import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CredentialsService } from './credentials.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly service: CredentialsService) {}

  private meta(req: Request) {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    return this.service.list(user.id, search);
  }

  @Get('health')
  getHealth(@CurrentUser() user: RequestUser) {
    return this.service.getHealth(user.id);
  }

  @Post('generate-password')
  generate(@Body() body: { length?: number }) {
    return this.service.generate(body);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCredentialDto,
    @Req() req: Request,
  ) {
    return this.service.create(user.id, dto, this.meta(req));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
    @Req() req: Request,
  ) {
    return this.service.update(user.id, id, dto, this.meta(req));
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.remove(user.id, id, this.meta(req));
  }

  @Post(':id/reveal')
  reveal(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.reveal(user.id, id, this.meta(req));
  }

  @Get(':id/history')
  listHistory(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.listHistory(user.id, id);
  }

  @Get(':id/history/:version')
  getHistoryVersion(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.service.getHistoryVersion(user.id, id, parseInt(version, 10));
  }

  @Post(':id/history/:version/restore')
  restoreHistoryVersion(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: Request,
  ) {
    return this.service.restoreHistoryVersion(
      user.id,
      id,
      parseInt(version, 10),
      this.meta(req),
    );
  }

  @Post(':id/history/:version/reveal-password')
  revealHistoryPassword(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('version') version: string,
    @Req() req: Request,
  ) {
    return this.service.revealHistoryPassword(
      user.id,
      id,
      parseInt(version, 10),
      this.meta(req),
    );
  }
}