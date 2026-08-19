import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BreachResult, BreachResultSchema } from './schemas/breach-result.schema';
import { Credential, CredentialSchema } from '../credentials/schemas/credential.schema';
import { BreachService } from './breach.service';
import { BreachController } from './breach.controller';
import { CryptoModule } from '../crypto/crypto.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BreachResult.name, schema: BreachResultSchema },
      { name: Credential.name, schema: CredentialSchema },
    ]),
    CryptoModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [BreachService],
  controllers: [BreachController],
  exports: [BreachService],
})
export class BreachModule {}
