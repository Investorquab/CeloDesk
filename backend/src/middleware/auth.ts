import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  merchantId?: string;
}

/**
 * Verifies the Authorization: Bearer <token> header (issued by
 * POST /api/auth/wallet) and attaches req.merchantId.
 *
 * NOT YET APPLIED to any route — adding it here first so it exists and
 * is testable, without breaking the golden path Claude 2 already built
 * against (which currently passes merchantId directly, per the
 * documented stopgap in CLAUDE_2_FRONTEND.md/INTEGRATION.md). Wire this
 * into invoice-mutating routes once Claude 2/3 are ready to switch over
 * — coordinate the cutover, don't flip it unannounced (see
 * INTEGRATION.md's rule on this).
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
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}
