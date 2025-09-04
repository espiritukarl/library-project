import { useEffect, useState } from 'react'
import { api } from '../../services/api'

type Item = { id: string; book: { id: string; title: string; coverUrl?: string|null } }

export default function Bookmarks() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get('/user/books?status=BOOKMARKED')
      setItems(data.items)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="mb-3 text-2xl font-semibold">Bookmarks</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="skeleton-shimmer rounded-lg aspect-[3/4] mb-2"></div>
              <div className="skeleton-shimmer h-4 rounded mb-1"></div>
              <div className="skeleton-shimmer h-3 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it) => (
            <div key={it.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 aspect-[3/4] overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {it.book.coverUrl ? (
                  <img src={it.book.coverUrl} alt={it.book.title} className="h-full w-full object-contain" />
                ) : (
                  <span className="px-2 text-xs text-slate-400 text-center">{it.book.title}</span>
                )}
              </div>
              <p className="truncate text-sm font-medium" title={it.book.title}>{it.book.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
