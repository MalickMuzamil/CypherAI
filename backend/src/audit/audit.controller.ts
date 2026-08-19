import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';
import { Role } from '../users/schemas/user.schema';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    const global = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    return this.audit.list(global ? undefined : user.id);
  }
}