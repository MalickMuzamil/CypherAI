import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
@Module({ imports: [UsersModule, AuditModule], controllers: [AdminController] })
export class AdminModule {}