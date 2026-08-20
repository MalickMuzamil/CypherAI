import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

let app: INestApplication | undefined;

async function createApp(): Promise<INestApplication> {
  if (app) {
    return app;
  }

  app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  // Trust reverse proxy (ALB / Nginx / Cloudflare)
  const trustProxy = config.get<string>('TRUST_PROXY', '1');

  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', trustProxy);

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
  });

  app.use(
    rateLimit({
      windowMs: config.get<number>(
        'RATE_LIMIT_WINDOW_MS',
        900000,
      ),
      max: config.get<number>(
        'RATE_LIMIT_MAX',
        2000,
      ),
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) =>
        req.method === 'OPTIONS' ||
        req.path === '/api/health',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
}

/**
 * Vercel Serverless Function
 */
export default async function handler(
  req: any,
  res: any,
) {
  const nestApp = await createApp();

  const expressApp =
    nestApp.getHttpAdapter().getInstance();

  return expressApp(req, res);
}

/**
 * Local development / normal Node server
 */
if (!process.env.VERCEL) {
  createApp().then(async (nestApp) => {
    const config = nestApp.get(ConfigService);

    const port = config.get<number>(
      'PORT',
      4000,
    );

    await nestApp.listen(port);

    console.log(
      `Backend running on port ${port}`,
    );
  });
}