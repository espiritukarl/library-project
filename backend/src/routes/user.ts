import { ReadingStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';

export const userRouter = Router();
userRouter.use(requireAuth);
// Prevent caching on user-specific endpoints
userRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

userRouter.get('/books', async (req, res) => {
  const userId = req.user!.id;
  const status = req.query.status ? String(req.query.status) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;

  const where: any = { userId };
  const statusValues = Object.values(ReadingStatus) as string[];
  if (status && statusValues.includes(status)) where.status = status as any;
  if (category) where.book = { categories: { some: { category: { name: { contains: category, mode: 'insensitive' } } } } };

  const items = await prisma.userBook.findMany({
    where,
    include: { book: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ items });
});

const addSchema = z.object({
  bookId: z.string().min(1),
  status: z.nativeEnum(ReadingStatus).optional(),
  currentPage: z.number().int().min(0).optional(),
});
userRouter.post('/books', async (req, res) => {
  const userId = req.user!.id;
  const parse = addSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { bookId, status, currentPage } = parse.data;
  // ensure book exists
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const existing = await prisma.userBook.findUnique({ where: { userId_bookId: { userId, bookId } } });
  if (existing) return res.json({ item: existing, created: false });
  const data: any = { userId, bookId };
  if (typeof currentPage === 'number') data.currentPage = currentPage;
  if (status) {
    data.status = status;
    if (status === 'READING') data.dateStarted = new Date();
    if (status === 'COMPLETED') data.dateCompleted = new Date();
  }
  const item = await prisma.userBook.create({ data });
  res.status(201).json({ item, created: true });
});

const updateSchema = z.object({
  status: z.nativeEnum(ReadingStatus).optional(),
  currentPage: z.number().int().min(0).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  review: z.string().nullable().optional(),
});
userRouter.put('/books/:id', async (req, res) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const existing = await prisma.userBook.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' });

  const data: any = { ...parse.data };
  if (parse.data.status && parse.data.status !== existing.status) {
    if (parse.data.status === 'READING' && !existing.dateStarted) {
      data.dateStarted = new Date();
    }
    if (parse.data.status === 'COMPLETED' && !existing.dateCompleted) {
      data.dateCompleted = new Date();
    }
  }

  const item = await prisma.userBook.update({ where: { id }, data });
  res.json({ item });
});

userRouter.delete('/books/:id', async (req, res) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const existing = await prisma.userBook.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' });
  await prisma.userBook.delete({ where: { id } });
  res.status(204).send();
});

const progressSchema = z.object({ currentPage: z.number().int().min(0), note: z.string().optional() });
userRouter.put('/books/:id/progress', async (req, res) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const parse = progressSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.userBook.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' });
  const { currentPage, note } = parse.data;
  const progress = await prisma.readingProgress.create({ data: { userBookId: id, page: currentPage, note } });
  const item = await prisma.userBook.update({ where: { id }, data: { currentPage } });
  res.json({ progress, item });
});

userRouter.get('/stats', async (req, res) => {
  const userId = req.user!.id;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [want, reading, completed, total, completedBooks, progress] = await Promise.all([
    prisma.userBook.count({ where: { userId, status: 'WANT_TO_READ' } }),
    prisma.userBook.count({ where: { userId, status: 'READING' } }),
    prisma.userBook.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.userBook.count({ where: { userId } }),
    prisma.userBook.findMany({ where: { userId, status: 'COMPLETED', dateCompleted: { gte: start } }, select: { dateCompleted: true } }),
    prisma.readingProgress.findMany({
      where: { userBook: { userId }, createdAt: { gte: start } },
      select: { userBookId: true, page: true, createdAt: true },
      orderBy: [{ userBookId: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const monthlyCompleted: { label: string; count: number }[] = months.map((m) => ({ label: m.label, count: 0 }));
  for (const b of completedBooks) {
    if (!b.dateCompleted) continue;
    const y = b.dateCompleted.getFullYear();
    const m = b.dateCompleted.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const entry = monthlyCompleted.find((x) => x.label === key);
    if (entry) entry.count += 1;
  }

  const monthlyPages: { label: string; pages: number }[] = months.map((m) => ({ label: m.label, pages: 0 }));
  for (let i = 0; i < progress.length; i++) {
    const curr = progress[i];
    const prev = i > 0 && progress[i - 1].userBookId === curr.userBookId ? progress[i - 1] : null;
    const delta = prev ? curr.page - prev.page : 0;
    const pages = delta > 0 ? delta : 0;
    const y = curr.createdAt.getFullYear();
    const m = curr.createdAt.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const entry = monthlyPages.find((x) => x.label === key);
    if (entry) entry.pages += pages;
  }

  const recentProgress = await prisma.readingProgress.findMany({
    where: { userBook: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, page: true, createdAt: true, userBook: { select: { id: true, book: { select: { id: true, title: true } } } } },
  });

  res.json({
    total,
    byStatus: { want, reading, completed },
    monthlyCompleted,
    monthlyPages,
    recentProgress: recentProgress.map((p) => ({ id: p.id, page: p.page, createdAt: p.createdAt, userBookId: p.userBook.id, book: p.userBook.book })),
  });
});

// Goals CRUD
userRouter.get('/goals', async (req, res) => {
  const userId = req.user!.id;
  const goals = await prisma.readingGoal.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  res.json({ goals });
});

const upsertGoalSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12).optional().nullable(),
  targetBooks: z.number().int().min(1).max(1000).optional().nullable(),
  targetPages: z.number().int().min(1).max(100000).optional().nullable(),
});
userRouter.post('/goals', async (req, res) => {
  const userId = req.user!.id;
  const parse = upsertGoalSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { year, month = null, targetBooks = null, targetPages = null } = parse.data;
  const goal = await prisma.readingGoal.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, targetBooks, targetPages },
    update: { targetBooks, targetPages },
  });
  res.status(201).json({ goal });
});

userRouter.put('/goals/:id', async (req, res) => {
  const userId = req.user!.id;
  const parse = upsertGoalSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.readingGoal.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' });
  const goal = await prisma.readingGoal.update({ where: { id: existing.id }, data: parse.data });
  res.json({ goal });
});

userRouter.delete('/goals/:id', async (req, res) => {
  const userId = req.user!.id;
  const existing = await prisma.readingGoal.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' });
  await prisma.readingGoal.delete({ where: { id: existing.id } });
  res.status(204).send();
});
