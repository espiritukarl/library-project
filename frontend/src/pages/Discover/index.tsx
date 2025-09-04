import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import BookCard from '../../components/books/BookCard'

type Result = { title: string; authors: string[]; firstPublishYear?: number; isbn?: string; openLibraryId?: string; coverUrl?: string }

export default function Discover() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    const run = async () => {
      const term = q.trim()
      if (!term) { setResults([]); setError(''); return }
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
      <h1 className="mb-4 text-2xl font-semibold">Discover</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books..." className="mb-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {loading && <p>Loading...</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {results.map((r, idx) => (
          <BookCard key={idx} result={r} />
        ))}
      </div>
    </div>
  )
}
