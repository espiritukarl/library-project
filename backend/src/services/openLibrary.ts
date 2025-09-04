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

// Optional: Fetch trending subjects/categories from OpenLibrary (best-effort)
const subjectsCache = new SimpleCache<any>(10 * 60 * 1000);
export async function getTrendingSubjects() {
  const key = 'trending_subjects';
  const cached = subjectsCache.get(key);
  if (cached) return cached;
  // Using a heuristic endpoint; OpenLibrary doesn't have a single "trending" API.
  // We'll use a static list or a lightweight fetch of popular subjects.
  const subjects = [
    'fiction', 'fantasy', 'science_fiction', 'romance', 'mystery', 'history', 'biography', 'children'
  ];
  subjectsCache.set(key, subjects);
  return subjects;
}

// Get trending subjects from OpenLibrary
export async function getTrendingSubjects() {
  // Return formatted categories with display names
  return [
    { name: 'Popular', query: 'fiction', active: true },
    { name: 'Mystery', query: 'mystery', active: false },
    { name: 'Romance', query: 'romance', active: false },
    { name: 'Sci-Fi', query: 'science fiction', active: false },
    { name: 'Fantasy', query: 'fantasy', active: false },
    { name: 'Biography', query: 'biography', active: false },
  ];
}

// Get trending authors from popular books
export async function getTrendingAuthors() {
  const key = 'trending_authors';
  const cached = detailsCache.get(key);
  if (cached) return cached;

  try {
    // Fetch top popular books from OpenLibrary
    const url = 'https://openlibrary.org/search.json?q=popular&limit=50&sort=rating';
    const res = await fetch(url);
    if (!res.ok) throw new Error('OpenLibrary trending authors failed');
    
    const data = await res.json();
    
    // Extract and count authors
    const authorCounts = new Map<string, number>();
    
    (data.docs || []).forEach((book: any) => {
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

    // Shuffle the array to randomize display order
    const shuffled = sortedAuthors.sort(() => Math.random() - 0.5);
    
    // Take 5 random authors and format with avatars
    const trendingAuthors = shuffled.slice(0, 5).map((name) => ({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    }));

    detailsCache.set(key, trendingAuthors);
    return trendingAuthors;
  } catch (error) {
    console.error('Failed to fetch trending authors:', error);
    
    // Fallback to some well-known authors
    const fallbackAuthors = [
      'Stephen King', 'Agatha Christie', 'J.K. Rowling', 'George Orwell', 'Jane Austen'
    ].map(name => ({
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    }));
    
    return fallbackAuthors;
  }
}
