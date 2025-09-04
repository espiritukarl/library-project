import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import BookCard from '../../components/books/BookCard'
import { Search, Filter } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

type Result = { title: string; authors: string[]; firstPublishYear?: number; isbn?: string; openLibraryId?: string; coverUrl?: string }

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // sync URL -> state
  useEffect(() => {
    const qp = searchParams.get('q') || ''
    setQ(qp)
  }, [searchParams])

  useEffect(() => {
    const ctrl = new AbortController()
    const run = async () => {
      const term = q.trim()
      if (!term || term.length < 3) { setResults([]); setError(''); return }
      setLoading(true); setError('')
      try {
        const data = await api.get(`/books/search?q=${encodeURIComponent(term)}`)
        setResults(data.results)
      } catch (e: any) {
        setError(e?.data?.error || 'Search failed')
      } finally { setLoading(false) }
    }
    const t = setTimeout(run, 400)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Discover Books</h1>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              value={q} 
              onChange={(e) => { const v = e.target.value; setQ(v); setSearchParams(v ? { q: v } : {}) }} 
              placeholder="Search for books, authors, or genres..." 
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
            />
          </div>
          <button className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Searching...</span>
        </div>
      )}

      {!loading && !error && results.length === 0 && q.trim() && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">No books found</p>
          <p className="text-sm text-gray-400">Try searching with different keywords</p>
        </div>
      )}

      {!loading && !error && q.trim() === '' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">Start discovering</p>
          <p className="text-sm text-gray-400">Search for books to add to your library</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {results.length} results for "{q}"
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((r, idx) => (
              <BookCard key={idx} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
