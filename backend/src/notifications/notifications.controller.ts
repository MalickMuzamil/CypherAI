import { Controller, Get, Param, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() list(@CurrentUser() user: RequestUser) { return this.service.list(user.id); }
  @Post(':id/read') read(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.markRead(user.id, id); }
}