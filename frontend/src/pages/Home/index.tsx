import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

type Category = {
  name: string
  query: string
  active: boolean
}

type Book = {
  id: string
  title: string
  author: string[]
  cover?: string
  openLibraryId?: string
}

type TrendingAuthor = {
  name: string
  avatar: string
}

type ReadingProgressItem = {
  id: string
  title: string
  page: number
  totalPages: number
  progress: number
}

export default function Home() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('Popular')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [bookCache, setBookCache] = useState<Map<string, Book[]>>(new Map())
  const [readingProgress, setReadingProgress] = useState<ReadingProgressItem[]>([])
  const [progressLoading, setProgressLoading] = useState(true)
  const [trendingAuthors, setTrendingAuthors] = useState<TrendingAuthor[]>([])
  const [authorsLoading, setAuthorsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selStatus, setSelStatus] = useState<'BOOKMARKED' | 'READING' | 'COMPLETED'>('BOOKMARKED')
  const [page, setPage] = useState<string>('')
  const [selected, setSelected] = useState<Book | null>(null)
  const [toast, setToast] = useState('')
  const [details, setDetails] = useState<{ description?: string; firstPublishYear?: number; pageCount?: number } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  const sanitizeHtml = (html: string) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const allowed = new Set(['P','I','EM','B','STRONG','A','UL','OL','LI','BR'])
      const walk = (node: Node) => {
        const el = node as HTMLElement
        if (el.nodeType === 1) {
          if (!allowed.has(el.tagName)) {
            const parent = el.parentNode
            if (parent) {
              while (el.firstChild) parent.insertBefore(el.firstChild, el)
              parent.removeChild(el)
              return
            }
          } else {
            for (const attr of Array.from(el.attributes)) {
              if (el.tagName === 'A' && attr.name.toLowerCase() === 'href') continue
              el.removeAttribute(attr.name)
            }
            if (el.tagName === 'A') {
              const href = el.getAttribute('href') || ''
              if (/^\s*(javascript:|data:)/i.test(href)) {
                el.removeAttribute('href')
              } else {
                el.setAttribute('target', '_blank')
                el.setAttribute('rel', 'noopener noreferrer')
              }
            }
          }
        }
        for (const child of Array.from(node.childNodes)) walk(child)
      }
      for (const child of Array.from(doc.body.childNodes)) walk(child)
      return doc.body.innerHTML
    } catch {
      return ''
    }
  }

  // Add-to-library handled via BookCard on Discover; Home displays grid only

  useEffect(() => {
    const fetchBooks = async () => {
      const activeQuery = categories.find(cat => cat.name === activeCategory)?.query || 'popular'
      
      // Check cache first
      if (bookCache.has(activeCategory)) {
        setBooks(bookCache.get(activeCategory) || [])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const response = await api.get(`/books/search?q=${encodeURIComponent(activeQuery)}`)
        
        const booksData = response.results.map((book: any) => ({
          id: book.openLibraryId || Math.random().toString(),
          title: book.title,
          author: book.authors || ['Unknown Author'],
          cover: book.coverUrl,
          openLibraryId: book.openLibraryId
        }))
        
        const limitedBooks = booksData.slice(0, 16) // Show 16 books max
        setBooks(limitedBooks)
        
        // Cache the results
        setBookCache(prev => new Map(prev.set(activeCategory, limitedBooks)))
      } catch (error) {
        console.error('Failed to fetch books:', error)
        setBooks([])
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [activeCategory, categories])

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const response = await api.get('/books/categories')
        setCategories(response.categories)
        // Clear cache so Popular uses the correct query if it was pre-fetched
        setBookCache(new Map())
        // Set first category as active if no active category is set
        if (response.categories.length > 0 && !activeCategory) {
          setActiveCategory(response.categories[0].name)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        // Fallback to default categories
        setCategories([
          { name: 'Popular', query: 'popular', active: true },
          { name: 'Mystery', query: 'mystery', active: false },
          { name: 'Romance', query: 'romance', active: false },
          { name: 'Sci-Fi', query: 'science fiction', active: false },
        ])
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Fetch reading progress for authenticated users
  const loadReadingProgress = async () => {
    if (!user) {
      setProgressLoading(false)
      return
    }
    try {
      setProgressLoading(true)
      const response = await api.get('/user/books?status=READING')
      const progressData = response.items
        .filter((item: any) => item.currentPage && item.book.pageCount)
        .slice(0, 3)
        .map((item: any) => ({
          id: item.id,
          title: item.book.title,
          page: item.currentPage,
          totalPages: item.book.pageCount,
          progress: Math.round((item.currentPage / item.book.pageCount) * 100)
        }))
      setReadingProgress(progressData)
    } catch (error) {
      console.error('Failed to fetch reading progress:', error)
      setReadingProgress([])
    } finally {
      setProgressLoading(false)
    }
  }

  useEffect(() => { loadReadingProgress() }, [user])

  // Listen for updates (e.g., when a book is added to READING from Discover)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      if (!detail || detail.status !== 'READING') return
      loadReadingProgress()
    }
    window.addEventListener('user:books-updated', handler as EventListener)
    return () => window.removeEventListener('user:books-updated', handler as EventListener)
  }, [])

  // Fetch trending authors
  useEffect(() => {
    const fetchTrendingAuthors = async (refresh = false) => {
      try {
        setAuthorsLoading(true)
        const endpoint = refresh ? '/books/trending-authors?refresh=true' : '/books/trending-authors'
        const response = await api.get(endpoint)
        setTrendingAuthors(response.authors)
      } catch (error) {
        console.error('Failed to fetch trending authors:', error)
        // Fallback to some popular authors if API fails
        setTrendingAuthors([
          { name: 'Stephen King', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stephen King' },
          { name: 'Agatha Christie', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agatha Christie' },
          { name: 'J.K. Rowling', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=J.K. Rowling' },
          { name: 'George Orwell', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George Orwell' },
          { name: 'Jane Austen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane Austen' },
        ])
      } finally {
        setAuthorsLoading(false)
      }
    }

    // Use cached trending authors; backend already caches results
    fetchTrendingAuthors(false)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Category Tabs */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
              {categoriesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-8 w-20 rounded-md"></div>
                ))
              ) : (
                categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setActiveCategory(category.name)}
                    disabled={loading}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
                      activeCategory === category.name
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Books Grid */}
          <div className="flex-1 overflow-auto mb-4 scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 max-w-full">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="min-w-0">
                    <div className="skeleton-shimmer rounded-lg aspect-[3/4] mb-2"></div>
                    <div className="skeleton-shimmer h-4 rounded mb-1"></div>
                    <div className="skeleton-shimmer h-3 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 max-w-full">
                {books.map((book) => (
                  <div key={book.id} className="group cursor-pointer min-w-0" onClick={async () => { 
                    setSelected(book); setShowForm(true);
                    setDetails(null);
                    if (book.openLibraryId) {
                      try {
                        setDetailsLoading(true);
                        const d = await api.get(`/books/work/${encodeURIComponent(book.openLibraryId)}`)
                        setDetails(d.details || null)
                      } catch {
                        setDetails(null)
                      } finally { setDetailsLoading(false) }
                    }
                  }}>
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-3 mb-2 aspect-[3/4] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-200">
                      {book.cover ? (
                        <img 
                          src={book.cover} 
                          alt={book.title} 
                          loading="lazy"
                          className="w-full h-full object-contain rounded shadow-sm transition-opacity duration-300"
                          style={{ backgroundColor: '#f3f4f6' }}
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.opacity = '1';
                          }}
                          onError={(e) => {
                            // Fallback to text display if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full bg-white dark:bg-gray-800 rounded shadow-sm flex items-center justify-center"><span class="text-xs text-gray-400 text-center px-2">${book.title}</span></div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-white dark:bg-gray-800 rounded shadow-sm flex items-center justify-center">
                          <span className="text-xs text-gray-400 text-center px-2">{book.title}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {Array.isArray(book.author) ? book.author.join(', ') : book.author}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reading Progress Section */}
          {user && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm flex-shrink-0">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Continue Reading</h2>
              {progressLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-10 skeleton-shimmer rounded flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="skeleton-shimmer h-4 rounded w-3/4"></div>
                        <div className="skeleton-shimmer h-2 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : readingProgress.length > 0 ? (
                <div className="space-y-4">
                  {readingProgress.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-8 h-10 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0"></div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1">{item.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{item.page} page</span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                          <span>{item.progress}% complete</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No books in progress</div>
                  <p className="text-xs text-gray-500">Start reading a book to see your progress here</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-72 space-y-4 flex-shrink-0">
          {/* Trending Authors */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trending Authors</h2>
            <div className="space-y-4">
              {authorsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton-shimmer rounded-full flex-shrink-0"></div>
                    <div className="skeleton-shimmer h-4 w-24 rounded"></div>
                  </div>
                ))
              ) : (
                trendingAuthors.map((author, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <img 
                      src={author.avatar} 
                      alt={author.name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{author.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
      {showForm && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-[40rem] max-w-[95vw] rounded-md border border-gray-200 bg-white p-6 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-6">
              <div className="w-28 h-40 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                {selected.cover ? (
                  <img src={selected.cover} alt={selected.title} className="w-full h-full object-contain" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1">{selected.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{Array.isArray(selected.author) ? selected.author.join(', ') : selected.author}{details?.firstPublishYear ? ` • ${details.firstPublishYear}` : ''}{typeof details?.pageCount === 'number' ? ` • ${details.pageCount} pages` : ''}</p>
                {detailsLoading ? (
                  <div className="skeleton-shimmer h-16 rounded" />
                ) : details?.description ? (
                  <>
                    <div
                      className={descExpanded ? 'text-sm text-gray-800 dark:text-gray-200 max-h-40 overflow-auto pr-1' : 'text-sm text-gray-800 dark:text-gray-200 line-clamp-6'}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(details.description) }}
                    />
                    <button className="mt-1 text-xs text-blue-600 hover:underline" onClick={() => setDescExpanded((x) => !x)}>
                      {descExpanded ? 'Show less' : 'Read more'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No description available.</p>
                )}
              </div>
            </div>
            <h3 className="mt-6 mb-2 text-base font-medium">Add to Library</h3>
            <div className="mb-2">
              <label className="mb-1 block text-xs text-gray-500">Status</label>
              <select value={selStatus} onChange={(e) => setSelStatus(e.target.value as any)} className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                <option value="COMPLETED">Completed</option>
                <option value="READING">Reading</option>
                <option value="BOOKMARKED">Bookmarked</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-500">Current Page</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={typeof details?.pageCount === 'number' ? details.pageCount : undefined} value={page} onChange={(e) => setPage(e.target.value)} className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800" />
                {typeof details?.pageCount === 'number' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{(page !== '' ? Math.max(0, Number(page)) : 0)}/{details.pageCount}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={(e) => { e.stopPropagation(); setShowForm(false) }} className="rounded border border-gray-200 px-2 py-1 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={async () => {
                try {
                  const created = await api.post('/books', { openLibraryId: selected.openLibraryId, title: selected.title, coverUrl: selected.cover })
                  const body: any = { bookId: created.book.id, status: selStatus }
                  if (page !== '' && !isNaN(Number(page))) body.currentPage = Number(page)
                  await api.post('/user/books', body)
                  if (selStatus === 'READING') {
                    window.dispatchEvent(new CustomEvent('user:books-updated', { detail: { reason: 'added', status: selStatus } }))
                  }
                  const toastMessage = selStatus === 'BOOKMARKED' ? `Bookmarked ${selected.title}` : `${selected.title} added to library`
                  setToast(toastMessage)
                  setTimeout(() => setToast(''), 2500)
                } catch (e) {
                  console.error(e)
                } finally {
                  setShowForm(false); setSelected(null); setPage(''); setSelStatus('BOOKMARKED')
                }
              }} className="rounded bg-gray-900 px-3 py-1 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">Add</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="rounded-md bg-gray-900 text-white px-3 py-2 text-sm shadow-lg dark:bg-white dark:text-gray-900">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
