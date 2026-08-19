import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Credential, CredentialSchema } from './schemas/credential.schema';
import {
  CredentialHistory,
  CredentialHistorySchema,
} from './schemas/credential-history.schema';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { AuditModule } from '../audit/audit.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Credential.name, schema: CredentialSchema },
      { name: CredentialHistory.name, schema: CredentialHistorySchema },
    ]),
    AuditModule,
    CryptoModule,
  ],
  providers: [CredentialsService],
  controllers: [CredentialsController],
  exports: [CredentialsService],
})
export class CredentialsModule {}