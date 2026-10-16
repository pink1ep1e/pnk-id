import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { SessionsService } from './sessions.service';

@Controller('v1/sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(@Req() req: FastifyRequest) {
    return this.sessions.list(req.authUser!.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  revoke(@Req() req: FastifyRequest, @Param('id') id: string) {
    return this.sessions.revoke(req.authUser!.userId, id);
  }
}
