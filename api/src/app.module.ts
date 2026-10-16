import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegistrationModule } from './registration/registration.module';
import { SessionsModule } from './sessions/sessions.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: process.env.NODE_ENV !== 'test',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'passwordHash',
            'code',
            'token',
            'refreshToken',
            'accessToken',
            'turnstileToken',
          ],
          remove: true,
        },
      },
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    TelegramModule,
    RegistrationModule,
    SessionsModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
