/**
 * Example helpers for Next.js (App Router) services verifying pnk ID access tokens.
 *
 * npm i jose
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const JWKS_URL =
  process.env.PNK_ID_JWKS_URL ??
  'https://id.pnkmail.ru/.well-known/jwks.json';
const ISSUER = process.env.PNK_ID_ISSUER ?? 'https://id.pnkmail.ru';

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export type PnkIdAccess = {
  userId: string;
  svc?: string;
  payload: JWTPayload;
};

export async function verifyPnkIdAccessToken(
  authorizationHeader: string | null | undefined,
): Promise<PnkIdAccess> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('unauthorized');
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    algorithms: ['EdDSA'],
  });
  if (!payload.sub) {
    throw new Error('unauthorized');
  }
  return {
    userId: payload.sub,
    svc: typeof payload.svc === 'string' ? payload.svc : undefined,
    payload,
  };
}

/**
 * Example route handler:
 *
 * export async function GET(req: Request) {
 *   const auth = await verifyPnkIdAccessToken(req.headers.get('authorization'));
 *   // const mailbox = await db.mailbox.findFirst({ where: { pnkIdUserId: auth.userId } })
 *   return Response.json({ userId: auth.userId });
 * }
 */
