import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  merchantId?: string;
}

/**
 * Verifies the Authorization: Bearer <token> header issued by CeloDesk
 * wallet/Telegram authentication and attaches the authenticated merchantId.
 * Protected merchant routes use this middleware so ownership is derived
 * from the signed session rather than a client-supplied merchantId.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = header.slice('Bearer '.length);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
  }
  try {
    const payload = jwt.verify(token, secret) as { merchantId: string };
    req.merchantId = payload.merchantId;
    next();
  } catch {
    return res.status(401).json({ error: 'Your CeloDesk session has expired. Please reconnect your wallet and try again.' });
  }
}
