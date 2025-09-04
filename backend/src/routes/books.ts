import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { prisma } from '../db/client';
import { coverUrlFromId, getOpenLibraryWork, searchOpenLibrary, getTrendingSubjects, getTrendingAuthors, getWorkDetails } from '../services/openLibrary';
import { requireAuth } from '../middleware/auth';

export const booksRouter = Router();

const limiter = rateLimit({ windowMs: 60_000, limit: 60 });
booksRouter.use(limiter);

// Public endpoints (no auth required)
// Get trending categories/subjects
booksRouter.get('/categories', async (req, res) => {
  try {
    const categories = await getTrendingSubjects();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get trending authors
booksRouter.get('/trending-authors', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const authors = await getTrendingAuthors(forceRefresh);
    res.json({ authors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending authors' });
  }
});

booksRouter.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required' });
  const results = await searchOpenLibrary(q, 20);
  const mapped = results.map((r: any) => ({
    title: r.title,
    authors: r.authorNames,
    firstPublishYear: r.firstPublishYear,
    isbn: r.isbn,
    openLibraryId: r.openLibraryId,
    coverUrl: coverUrlFromId(r.coverId),
  }));
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ results: mapped });
});

// Get OpenLibrary work details by OLID (public)
booksRouter.get('/work/:olid', async (req, res) => {
  try {
    const olid = String(req.params.olid);
    const details = await getWorkDetails(olid);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ details });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work details' });
  }
});

// Protected endpoints (auth required)
booksRouter.use(requireAuth);

booksRouter.get('/:id', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json({ book });
});

// Get enriched details for a book by its DB id (auth required)
booksRouter.get('/:id/details', async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) return res.status(404).json({ error: 'Not found' });
  let details: any = {
    title: book.title,
    description: book.description,
    firstPublishYear: book.publishDate ? book.publishDate.getFullYear() : undefined,
    coverUrl: book.coverUrl,
    authors: [],
    pageCount: book.pageCount ?? undefined,
  };
  if (book.openLibraryId) {
    try {
      const d = await getWorkDetails(book.openLibraryId);
      details = { ...details, ...d };
    } catch {
      // ignore; fall back to stored details
    }
  }
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ details });
});

const addSchema = z.object({
  openLibraryId: z.string().optional(),
  title: z.string().optional(),
  isbn: z.string().optional(),
  coverUrl: z.string().url().optional(),
  description: z.string().optional(),
  publishDate: z.string().optional(),
  pageCount: z.number().int().optional(),
});

booksRouter.post('/', async (req, res) => {
  const parse = addSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;

  // If openLibraryId provided, attempt to enrich details
  let enriched: Partial<typeof data> = {};
  if (data.openLibraryId) {
    try {
      const work = await getOpenLibraryWork(data.openLibraryId);
      enriched = {
        title: work.title || data.title,
        description:
          typeof work.description === 'string'
            ? work.description
            : work.description?.value || data.description,
      };
    } catch {
      // ignore enrichment failure
    }
  }

  const payload = {
    openLibraryId: data.openLibraryId || null,
    title: (enriched.title || data.title || 'Untitled').slice(0, 512),
    isbn: data.isbn || null,
    coverUrl: data.coverUrl || null,
    description: (enriched.description || data.description) || null,
    publishDate: data.publishDate ? new Date(data.publishDate) : null,
    pageCount: data.pageCount ?? null,
  } as const;

  // Avoid null-equality pitfalls: check unique fields individually
  const byOlid = payload.openLibraryId
    ? await prisma.book.findUnique({ where: { openLibraryId: payload.openLibraryId } })
    : null;
  const byIsbn = !byOlid && payload.isbn
    ? await prisma.book.findUnique({ where: { isbn: payload.isbn } })
    : null;
  const existing = byOlid || byIsbn;
  if (existing) return res.json({ book: existing, created: false });

  const book = await prisma.book.create({ data: payload as any });
  res.status(201).json({ book, created: true });
});
