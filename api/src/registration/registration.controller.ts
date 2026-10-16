import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppConfigService } from '../config/config.service';
import { requestClientIp } from '../common/http/request-ip';
import {
  RegisterResendDto,
  RegisterStartDto,
  RegisterVerifyDto,
} from './registration.dto';
import { RegistrationService } from './registration.service';

@Controller('v1/register')
export class RegistrationController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly config: AppConfigService,
  ) {}

  @Post('start')
  @HttpCode(200)
  async start(@Body() body: RegisterStartDto, @Req() req: FastifyRequest) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    const data = await this.registration.start(
      body,
      ip,
      req.headers['user-agent'],
    );
    return { ok: true, data };
  }

  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body() body: RegisterVerifyDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.registration.verify(body, ip, req.headers['user-agent'], reply);
  }

  @Post('resend-code')
  @HttpCode(200)
  async resend(@Body() body: RegisterResendDto, @Req() req: FastifyRequest) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.registration.resend(body, ip, req.headers['user-agent']);
  }
}
