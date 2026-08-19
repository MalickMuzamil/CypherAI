import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { Role } from './users/schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const users = app.get(UsersService);
  const email = config.getOrThrow<string>('SUPERADMIN_EMAIL');
  const existing = await users.findByEmail(email);
  if (!existing) {
    await users.create(
      config.get<string>('SUPERADMIN_NAME', 'Super Admin'),
      email,
      config.getOrThrow<string>('SUPERADMIN_PASSWORD'),
      Role.SUPER_ADMIN,
    );
    console.log(`Created super admin: ${email}`);
  } else {
    console.log(`Super admin already exists: ${email}`);
  }
  await app.close();
}
seed();