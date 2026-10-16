import { Controller, Get } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('.well-known')
export class JwksController {
  constructor(private readonly tokens: TokenService) {}

  @Get('jwks.json')
  jwks() {
    return this.tokens.jwks();
  }
}
