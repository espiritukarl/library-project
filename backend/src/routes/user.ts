import { ReadingStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/books', async (req, res) => {
  const userId = req.user!.id;
  const status = req.query.status ? String(req.query.status) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;

  const where: any = { userId };
  if (status && Object.keys(ReadingStatus).includes(status)) where.status = status as any;
  if (category) where.book = { categories: { some: { category: { name: { contains: category, mode: 'insensitive' } } } } };

  const items = await prisma.userBook.findMany({
    where,
    include: { book: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ items });
});

const addSchema = z.object({ bookId: z.string().min(1) });
userRouter.post('/books', async (req, res) => {
  const userId = req.user!.id;
  const parse = addSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { bookId } = parse.data;
  // ensure book exists
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const existing = await prisma.userBook.findUnique({ where: { userId_bookId: { userId, bookId } } });
  if (existing) return res.json({ item: existing, created: false });
  const item = await prisma.userBook.create({ data: { userId, bookId } });
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

  const item = await prisma.userBook.update({ where: { id }, data: parse.data });
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
  const [want, reading, completed, total] = await Promise.all([
    prisma.userBook.count({ where: { userId, status: 'WANT_TO_READ' } }),
    prisma.userBook.count({ where: { userId, status: 'READING' } }),
    prisma.userBook.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.userBook.count({ where: { userId } }),
  ]);
  res.json({ total, byStatus: { want, reading, completed } });
});

