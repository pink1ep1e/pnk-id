import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async isRedirectAllowed(
    slug: string | undefined,
    redirectUri: string | undefined,
  ): Promise<boolean> {
    if (!slug && !redirectUri) {
      return true;
    }
    if (!slug || !redirectUri) {
      return false;
    }

    const service = await this.prisma.service.findFirst({
      where: { slug, active: true },
    });
    if (!service) {
      return false;
    }

    let allowed: string[] = [];
    try {
      const parsed: unknown = JSON.parse(service.allowedRedirectUris);
      if (Array.isArray(parsed)) {
        allowed = parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      return false;
    }

    return allowed.includes(redirectUri);
  }
}
