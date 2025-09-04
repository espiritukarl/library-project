import { compare,hash } from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(50).optional(),
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password, username } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({ data: { email, username, passwordHash } });
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });
  res.status(201).json({ user: { id: user.id, email: user.email, username: user.username }, accessToken, refreshToken });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });
  res.json({ user: { id: user.id, email: user.email, username: user.username }, accessToken, refreshToken });
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

authRouter.post('/refresh', async (req, res) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const payload = verifyRefreshToken(parse.data.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id, email: user.email });
    res.json({ accessToken, refreshToken });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

authRouter.get('/profile', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, username: true, createdAt: true } });
  res.json({ user });
});

