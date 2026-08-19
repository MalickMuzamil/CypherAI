import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CredentialShare,
  CredentialShareSchema,
} from './schemas/credential-share.schema';
import {
  Credential,
  CredentialSchema,
} from '../credentials/schemas/credential.schema';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { UsersModule } from '../users/users.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CredentialShare.name, schema: CredentialShareSchema },
      { name: Credential.name, schema: CredentialSchema },
    ]),
    UsersModule,
    CryptoModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [SharesService],
  controllers: [SharesController],
  exports: [SharesService],
})
export class SharesModule {}
