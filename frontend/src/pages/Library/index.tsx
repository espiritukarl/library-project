import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import ProtectedRoute from '../../components/common/ProtectedRoute'
import { Plus, Minus } from 'lucide-react'

type Item = { id: string; status: 'WANT_TO_READ'|'READING'|'COMPLETED'; currentPage?: number|null; book: { id: string; title: string; coverUrl?: string|null; pageCount?: number|null } }

export default function Library() {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<string>('')
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const load = async () => {
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : ''
    const data = await api.get(`/user/books${qs}`)
    setItems(data.items)
  }
  useEffect(() => { load() }, [filter])

  const updateStatus = async (id: string, status: Item['status']) => {
    const prev = items
    setItems((list) => {
      const updated = list.map((it) => (it.id === id ? { ...it, status } : it))
      if (filter) {
        return updated.filter((it) => (it.id === id ? status === (filter as any) : it.status === (filter as any)))
      }
      return updated
    })
    try {
      await api.put(`/user/books/${id}`, { status })
    } catch (e) {
      // revert on error
      setItems(prev)
      // optional: surface error
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }
  const updateProgress = async (id: string, page: number) => {
    // optimistic update
    const prev = items
    setItems((list) => list.map((it) => (it.id === id ? { ...it, currentPage: Math.max(0, page) } : it)))
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await api.put(`/user/books/${id}/progress`, { currentPage: Math.max(0, page) })
    } catch (e) {
      setItems(prev)
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setPending((p) => ({ ...p, [id]: false }))
    }
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h1 className="flex-1 text-2xl font-semibold">My Library</h1>
          <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="READING">Reading</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="truncate text-sm font-medium" title={it.book.title}>{it.book.title}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" value={it.status} onChange={(e) => updateStatus(it.id, e.target.value as any)}>
                  <option value="WANT_TO_READ">Want to Read</option>
                  <option value="READING">Reading</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <div className="flex items-center gap-2">
                  <button disabled={!!pending[it.id]} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => updateProgress(it.id, Math.max(0, (it.currentPage || 0) - 1))}><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm">{it.currentPage || 0}</span>
                  <button disabled={!!pending[it.id]} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => updateProgress(it.id, (it.currentPage || 0) + 1)}><Plus size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  )
}
