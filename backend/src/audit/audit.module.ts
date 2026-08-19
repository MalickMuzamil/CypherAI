import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditEvent, AuditSchema } from './schemas/audit.schema';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
@Module({
  imports: [MongooseModule.forFeature([{ name: AuditEvent.name, schema: AuditSchema }])],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}