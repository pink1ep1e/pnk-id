import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { requestClientIp } from '../common/http/request-ip';
import { AppConfigService } from '../config/config.service';
import { ChangePasswordDto, UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('v1/me')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  getMe(@Req() req: FastifyRequest) {
    return this.users.getMe(req.authUser!.userId);
  }

  @Patch()
  updateMe(@Req() req: FastifyRequest, @Body() body: UpdateMeDto) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.users.updateMe(req.authUser!.userId, body, ip);
  }

  @Post('password')
  @HttpCode(200)
  changePassword(@Req() req: FastifyRequest, @Body() body: ChangePasswordDto) {
    const ip = requestClientIp(req, this.config.trustedProxies);
    return this.users.changePassword(req.authUser!.userId, body, ip);
  }
}
