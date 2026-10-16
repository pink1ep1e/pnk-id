import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
    }),
    { bufferLogs: true },
  );

  const config = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalPipes(new ZodValidationPipe());

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cookie);

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.listen(config.port, '0.0.0.0');
  logger.log(`pnk-id-api listening on ${config.port}`);
}

void bootstrap();
