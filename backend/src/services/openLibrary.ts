import { SimpleCache } from './cache';

const searchCache = new SimpleCache<any>(60 * 1000);
const detailsCache = new SimpleCache<any>(5 * 60 * 1000);

export async function searchOpenLibrary(query: string, limit = 20) {
  const key = `${query}:${limit}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OpenLibrary search failed');
  const data = await res.json();
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
}

export async function getOpenLibraryWork(olid: string) {
  const key = `work:${olid}`;
  const cached = detailsCache.get(key);
  if (cached) return cached;
  const url = `https://openlibrary.org/works/${encodeURIComponent(olid)}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OpenLibrary details failed');
  const data = await res.json();
  detailsCache.set(key, data);
  return data;
}

export function coverUrlFromId(coverId?: number, size: 'S' | 'M' | 'L' = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : undefined;
}

