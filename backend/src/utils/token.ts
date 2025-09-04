import * as jwt from 'jsonwebtoken';

// Align with jsonwebtoken v9 typings
const accessSecret = (process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret') as jwt.Secret;
const refreshSecret = (process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret') as jwt.Secret;
const accessTtl = (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
const refreshTtl = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export type JwtPayload = {
  sub: string;
  username?: string;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, accessSecret, { expiresIn: accessTtl });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshTtl });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}
