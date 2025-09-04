import { SimpleCache } from './cache';

const searchCache = new SimpleCache<any>(60 * 1000);
const detailsCache = new SimpleCache<any>(5 * 60 * 1000);

export async function searchOpenLibrary(query: string, limit = 20) {
  const key = `${query}:${limit}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;

  const controller = new AbortController();
  // Keep backend timeout lower than frontend client timeout to avoid client aborts
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PersonalLibrary/1.0 (https://localhost)' },
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('OpenLibrary search failed:', res.status, res.statusText);
      return [];
    }
    const data: any = await res.json();
    const mapped = (data.docs || []).map((d: any) => ({
      title: d.title,
      authorNames: d.author_name || [],
      firstPublishYear: d.first_publish_year,
      coverId: d.cover_i,
      isbn: d.isbn?.[0],
      openLibraryId: d.key?.replace('/works/', ''),
    }));
    searchCache.set(key, mapped);
    return mapped;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('OpenLibrary search error:', (e as any)?.message || e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getOpenLibraryWork(olid: string) {
  const key = `work:${olid}`;
  const cached = detailsCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org/works/${encodeURIComponent(olid)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': 'PersonalLibrary/1.0 (https://localhost)' },
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error('OpenLibrary details failed');
  const data: any = await res.json();
  detailsCache.set(key, data);
  return data;
}

export function coverUrlFromId(coverId?: number, size: 'S' | 'M' | 'L' = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : undefined;
}

async function getAuthorName(authorKey: string): Promise<string | undefined> {
  const key = `author:${authorKey}`;
  const cached = detailsCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org${authorKey}.json`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PersonalLibrary/1.0 (https://localhost)' },
    });
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const data: any = await res.json();
    const name = (data as any)?.name as string | undefined;
    if (name) detailsCache.set(key, name);
    return name;
  } catch {
    return undefined;
  }
}

async function getWorkEditionPageCount(olid: string): Promise<number | undefined> {
  const key = `work_pages:${olid}`;
  const cached = detailsCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org/works/${encodeURIComponent(olid)}/editions.json?limit=1`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PersonalLibrary/1.0 (https://localhost)' },
    });
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const data: any = await res.json();
    const entry = ((data as any)?.entries || [])[0];
    const pages = entry?.number_of_pages as number | undefined;
    if (pages) detailsCache.set(key, pages);
    return pages;
  } catch {
    return undefined;
  }
}

export async function getWorkDetails(olid: string) {
  const work = await getOpenLibraryWork(olid);
  const title = work?.title as string | undefined;
  const desc = typeof work?.description === 'string' ? work.description : work?.description?.value;
  const firstPublish =
    (work?.first_publish_date as string | undefined) ||
    (work?.created?.value as string | undefined);
  const firstPublishYear = firstPublish ? parseInt(firstPublish.slice(0, 4), 10) : undefined;
  const coverId = Array.isArray(work?.covers) ? work.covers[0] : undefined;
  const coverUrl = coverUrlFromId(coverId);
  const authorKeys: string[] = Array.isArray(work?.authors)
    ? work.authors.map((a: any) => a?.author?.key).filter(Boolean)
    : [];
  const authorNames: string[] = [];
  for (const key of authorKeys.slice(0, 3)) {
    const name = await getAuthorName(key);
    if (name) authorNames.push(name);
  }
  const pageCount = await getWorkEditionPageCount(olid);
  return { title, description: desc, firstPublishYear, coverUrl, authors: authorNames, pageCount };
}

// Subject slugs for internal use
const subjectSlugsCache = new SimpleCache<any>(10 * 60 * 1000);
export async function getSubjectSlugs() {
  const key = 'subject_slugs';
  const cached = subjectSlugsCache.get(key);
  if (cached) return cached;
  const subjects = [
    'fiction',
    'fantasy',
    'science fiction',
    'romance',
    'mystery',
    'history',
    'biography',
    'children',
  ];
  subjectSlugsCache.set(key, subjects);
  return subjects;
}

// Categories for UI (display names + queries)
export async function getTrendingSubjects() {
  // Return formatted categories with display names
  return [
    { name: 'Popular', query: 'popular', active: true },
    { name: 'Mystery', query: 'mystery', active: false },
    { name: 'Romance', query: 'romance', active: false },
    { name: 'Sci-Fi', query: 'science fiction', active: false },
    { name: 'Fantasy', query: 'fantasy', active: false },
    { name: 'Biography', query: 'biography', active: false },
  ];
}

// Get trending authors from popular books
export async function getTrendingAuthors(forceRefresh = false) {
  const key = 'trending_authors';

  // If force refresh, clear the cache first
  if (forceRefresh) {
    detailsCache.delete(key);
  }

  const cached = detailsCache.get(key);
  if (cached) {
    // Randomize and format cached authors for each request
    const shuffled = [...cached].sort(() => Math.random() - 0.5);
    const trendingAuthors = shuffled.slice(0, 5).map((name) => ({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    }));
    return trendingAuthors;
  }

  try {
    // Fetch popular books from OpenLibrary based on popular subject
    const subjects = await getSubjectSlugs();
    const subject = subjects[Math.floor(Math.random() * subjects.length)] || 'fiction';
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(subject)}&limit=50`;

    // Add a timeout so the UI isn't blocked indefinitely
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PersonalLibrary/1.0 (https://localhost)' },
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('OpenLibrary API failed with status:', res.status, res.statusText);
      throw new Error(`OpenLibrary API failed: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    console.log('OpenLibrary response received, docs count:', (data as any).docs?.length);

    // Extract and count authors
    const authorCounts = new Map<string, number>();

    ((data as any).docs || []).forEach((book: any) => {
      if (book.author_name) {
        book.author_name.forEach((author: string) => {
          if (author && author.trim()) {
            const cleanAuthor = author.trim();
            authorCounts.set(cleanAuthor, (authorCounts.get(cleanAuthor) || 0) + 1);
          }
        });
      }
    });

    // Sort authors by frequency and take top authors
    const sortedAuthors = Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);

    // Cache the raw sorted authors list (without randomization)
    detailsCache.set(key, sortedAuthors);

    // Randomize and format for each request
    const shuffled = [...sortedAuthors].sort(() => Math.random() - 0.5);
    const trendingAuthors = shuffled.slice(0, 5).map((name) => ({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    }));

    return trendingAuthors;
  } catch (error) {
    // Only log non-AbortError errors to reduce noise
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Failed to fetch trending authors:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
    }

    // Fallback to some well-known authors
    const fallbackAuthorNames = [
      'Stephen King',
      'Agatha Christie',
      'J.K. Rowling',
      'George Orwell',
      'Jane Austen',
      'William Shakespeare',
      'Charles Dickens',
      'Ernest Hemingway',
      'Mark Twain',
      'Harper Lee',
    ];

    // Randomize fallback authors too
    const shuffledFallback = [...fallbackAuthorNames].sort(() => Math.random() - 0.5);
    const fallbackAuthors = shuffledFallback.slice(0, 5).map((name) => ({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    }));

    return fallbackAuthors;
  }
}
