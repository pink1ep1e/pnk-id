import { Global, Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JwksController } from './jwks.controller';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [ServicesModule],
  controllers: [JwksController, AuthController],
  providers: [TokenService, AuthService, AuthGuard],
  exports: [TokenService, AuthService, AuthGuard],
})
export class AuthModule {}
