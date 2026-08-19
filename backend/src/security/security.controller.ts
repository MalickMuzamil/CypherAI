import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { SecurityService } from './security.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';

@Controller('auth/sessions')
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.security.list(user.id, user.sessionId);
  }

  @Post('revoke-others')
  revokeOthers(@CurrentUser() user: RequestUser) {
    return this.security.revokeOthers(user.id, user.sessionId);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.security.revoke(user.id, id);
  }
}