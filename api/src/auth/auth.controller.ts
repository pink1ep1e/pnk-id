import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requestClientIp } from '../common/http/request-ip';
import { AppConfigService } from '../config/config.service';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('v1')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.auth.login(body, ip, req.headers['user-agent'], reply);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.auth.refresh(
      req.headers.cookie,
      ip,
      req.headers['user-agent'],
      reply,
    );
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.auth.logout(req.headers.cookie, reply);
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logoutAll(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.auth.logoutAll(req.authUser!.userId, reply);
  }
}
