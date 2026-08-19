import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Passkey, PasskeySchema } from './schemas/passkey.schema';
import {
  WebAuthnChallenge,
  WebAuthnChallengeSchema,
} from './schemas/webauthn-challenge.schema';
import { PasskeysService } from './passkeys.service';
import { PasskeysController } from './passkeys.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Passkey.name, schema: PasskeySchema },
      { name: WebAuthnChallenge.name, schema: WebAuthnChallengeSchema },
    ]),
    UsersModule,
    AuthModule,
    AuditModule,
  ],
  providers: [PasskeysService],
  controllers: [PasskeysController],
  exports: [PasskeysService],
})
export class PasskeysModule {}
