import type { FastifyRequest } from 'fastify';
import { getClientIp } from '../utils/get-client-ip';

export function requestClientIp(
  req: FastifyRequest,
  trustedProxies: string[],
): string {
  return getClientIp({
    remoteAddress: req.socket.remoteAddress,
    forwardedFor: req.headers['x-forwarded-for'],
    trustedProxies,
  });
}
