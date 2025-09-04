import { compare, hash } from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';

export const authRouter = Router();

// Registration disabled: accounts are provisioned by script
authRouter.post('/register', (_req, res) => {
  return res.status(403).json({ error: 'Registration disabled' });
});

const loginSchema = z.object({ username: z.string().min(3).max(50), password: z.string().min(8) });

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { username, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return res.status(429).json({ error: `Account locked until ${user.lockedUntil.toISOString()}` });
  }

  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const updates: any = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
      updates.failedLoginAttempts = 0;
    }
    await prisma.user.update({ where: { id: user.id }, data: updates });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  const accessToken = signAccessToken({ sub: user.id, username: user.username || undefined });
  const refreshToken = signRefreshToken({ sub: user.id, username: user.username || undefined });
  res.json({ user: { id: user.id, username: user.username }, accessToken, refreshToken });
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

authRouter.post('/refresh', async (req, res) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const payload = verifyRefreshToken(parse.data.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const accessToken = signAccessToken({ sub: user.id, username: user.username || undefined });
    const refreshToken = signRefreshToken({ sub: user.id, username: user.username || undefined });
    res.json({ accessToken, refreshToken });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

authRouter.get('/profile', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, createdAt: true } });
  res.json({ user });
});
