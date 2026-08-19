import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CredentialsModule } from './credentials/credentials.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { BreachModule } from './breach/breach.module';
import { PasskeysModule } from './passkeys/passkeys.module';
import { SharesModule } from './shares/shares.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    CredentialsModule,
    AuditModule,
    AdminModule,
    NotificationsModule,
    SecurityModule,
    UsersModule,
    HealthModule,
    BreachModule,
    PasskeysModule,
    SharesModule,
    JwtModule.register({}),
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }