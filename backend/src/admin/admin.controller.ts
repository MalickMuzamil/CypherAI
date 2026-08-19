import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/request-user';

@Controller('admin')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly users: UsersService, private readonly audit: AuditService) {}
  @Get('users') list() { return this.users.list(); }

  @Patch('users/:id/role')
  @Roles(Role.SUPER_ADMIN)
  async role(@Param('id') id: string, @Body('role') role: Role, @CurrentUser() actor: RequestUser) {
    if (!Object.values(Role).includes(role)) throw new BadRequestException('Invalid role');
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('User not found');
    if (target.role === Role.SUPER_ADMIN || String(target._id) === actor.id) {
      throw new BadRequestException('Cannot modify a Super Admin account');
    }
    const result = await this.users.updateRole(id, role);
    await this.audit.log({ action: 'ROLE_CHANGED', resourceType: 'USER', resourceId: id, actorId: actor.id, actorName: actor.name, metadata: { role } });
    return result;
  }

  @Post('users/:id/disable')
  @Roles(Role.SUPER_ADMIN)
  async disable(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('User not found');
    if (target.role === Role.SUPER_ADMIN || String(target._id) === actor.id) {
      throw new BadRequestException('Cannot disable a Super Admin account');
    }
    const result = await this.users.disable(id);
    await this.audit.log({ action: 'USER_DISABLED', resourceType: 'USER', resourceId: id, actorId: actor.id, actorName: actor.name });
    return result;
  }
}