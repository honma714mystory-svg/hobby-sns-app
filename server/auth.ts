import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import './firebaseAdmin';

export interface AuthedRequest extends Request {
  uid?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です。ログインしてください。' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    console.error('Auth verification failed:', err);
    res.status(401).json({ error: '認証トークンが無効です。再度ログインしてください。' });
  }
}
