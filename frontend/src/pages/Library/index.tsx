import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import ProtectedRoute from '../../components/common/ProtectedRoute'
import { Plus, Minus } from 'lucide-react'
import { createPortal } from 'react-dom'

type Item = {
  id: string;
  status: 'WANT_TO_READ'|'READING'|'COMPLETED'|'BOOKMARKED';
  currentPage?: number|null;
  dateAdded?: string;
  dateStarted?: string|null;
  dateCompleted?: string|null;
  book: { id: string; title: string; coverUrl?: string|null; pageCount?: number|null };
}

export default function Library() {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<string>('')
  const [sort, setSort] = useState<string>('added_desc')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [detailsId, setDetailsId] = useState<string| null>(null)
  const [details, setDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [toast, setToast] = useState('')

  const fmt = (d?: string|null) => {
    if (!d) return null
    try { return new Date(d).toLocaleDateString() } catch { return null }
  }

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

  const load = async () => {
    setLoading(true)
    try {
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : ''
      const data = await api.get(`/user/books${qs}`)
      setItems(data.items)
    } finally {
      setLoading(false)
    }
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
      setToast('Status updated')
      setTimeout(() => setToast(''), 2000)
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
      setToast('Progress updated')
      setTimeout(() => setToast(''), 2000)
    } catch (e) {
      setItems(prev)
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setPending((p) => ({ ...p, [id]: false }))
    }
  }

  const openDetails = async (bookId: string) => {
    setDetailsId(bookId)
    setDetails(null)
    try {
      setDetailsLoading(true)
      const d = await api.get(`/books/${encodeURIComponent(bookId)}/details`)
      setDetails(d.details || null)
    } catch {
      setDetails(null)
    } finally { setDetailsLoading(false) }
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h1 className="flex-1 text-2xl font-semibold">My Library</h1>
          <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="READING">Reading</option>
            <option value="COMPLETED">Completed</option>
            <option value="BOOKMARKED">Bookmarked</option>
          </select>
          <select className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="added_desc">Added (newest)</option>
            <option value="started_desc">Started (newest)</option>
            <option value="completed_desc">Completed (newest)</option>
            <option value="title_asc">Title (A–Z)</option>
          </select>
        </div>
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
            {(() => {
              const ts = (d?: string|null) => (d ? new Date(d).getTime() : -Infinity)
              const list = [...items]
              list.sort((a, b) => {
                switch (sort) {
                  case 'started_desc':
                    return (ts(b.dateStarted) - ts(a.dateStarted)) || (ts(b.dateAdded) - ts(a.dateAdded))
                  case 'completed_desc':
                    return (ts(b.dateCompleted) - ts(a.dateCompleted)) || (ts(b.dateAdded) - ts(a.dateAdded))
                  case 'title_asc':
                    return a.book.title.localeCompare(b.book.title, undefined, { sensitivity: 'base' })
                  case 'added_desc':
                  default:
                    return ts(b.dateAdded) - ts(a.dateAdded)
                }
              })
              return list
            })().map((it) => (
              <div key={it.id} className="group cursor-pointer min-w-0" onClick={() => openDetails(it.book.id)}>
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-3 mb-2 aspect-[3/4] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-200">
                  {it.book.coverUrl ? (
                    <img 
                      src={it.book.coverUrl} 
                      alt={it.book.title} 
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
                          parent.innerHTML = `<div class="w-full h-full bg-white dark:bg-gray-800 rounded shadow-sm flex items-center justify-center"><span class="text-xs text-gray-400 text-center px-2">${it.book.title}</span></div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded shadow-sm flex items-center justify-center">
                      <span className="text-xs text-gray-400 text-center px-2">{it.book.title}</span>
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
                  {it.book.title}
                </h3>
                {(() => {
                  const added = fmt(it.dateAdded)
                  const started = fmt(it.dateStarted)
                  const completed = fmt(it.dateCompleted)
                  let label: string | null = null
                  if (it.status === 'COMPLETED' && completed) label = `Completed: ${completed}`
                  else if (it.status === 'READING' && started) label = `Started: ${started}`
                  else if (added) label = `Added: ${added}`
                  return label ? (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{label}</div>
                  ) : null
                })()}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <select 
                    className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-0 p-0" 
                    value={it.status} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(it.id, e.target.value as any)}
                  >
                    <option value="READING">Reading</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BOOKMARKED">Bookmarked</option>
                  </select>
                </div>
                {(it.status === 'READING') && (
                  <div className="mt-1">
                    {(() => { const total = it.book.pageCount || 0; if (!total) return null; const curr = it.currentPage || 0; const pct = Math.min(100, Math.max(0, Math.round((curr/total)*100))); return (
                      <>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{curr}/{total} • {pct}%</div>
                      </>
                    ) })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="rounded-md bg-gray-900 text-white px-3 py-2 text-sm shadow-lg dark:bg-white dark:text-gray-900">
            {toast}
          </div>
        </div>
      )}
      {detailsId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailsId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 w-[40rem] max-w-[95vw] rounded-md border border-gray-200 bg-white p-6 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-6">
              <div className="w-32 h-44 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                {details?.coverUrl && (<img src={details.coverUrl} alt={details?.title} className="w-full h-full object-contain" />)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1">{details?.title || 'Book'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{(details?.authors || []).join(', ') || 'Unknown Author'}{details?.firstPublishYear ? ` • ${details.firstPublishYear}` : ''}{typeof details?.pageCount === 'number' ? ` • ${details.pageCount} pages` : ''}</p>
                {(() => { const activeItem = items.find(it => it.book.id === detailsId); if (!activeItem) return null; const added = fmt(activeItem.dateAdded); const started = fmt(activeItem.dateStarted); const completed = fmt(activeItem.dateCompleted); return (
                  <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 space-x-3">
                    {added && <span>Added: {added}</span>}
                    {started && <span>Started: {started}</span>}
                    {completed && <span>Completed: {completed}</span>}
                  </div>
                ) })()}
                {detailsLoading ? (
                  <div className="skeleton-shimmer h-20 rounded" />
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
            {(() => { const activeItem = items.find(it => it.book.id === detailsId); return activeItem ? (
              <div className="mt-6 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Status</label>
                  <select className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800" value={activeItem.status} onChange={(e) => updateStatus(activeItem.id, e.target.value as any)}>
                    <option value="READING">Reading</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BOOKMARKED">Bookmarked</option>
                  </select>
                </div>
                {activeItem.status === 'READING' && (details?.pageCount || activeItem.book.pageCount) && (
                  <div>
                    <div className="mb-1 text-xs text-gray-500">Reading Progress</div>
                    <div className="flex items-center gap-3 text-sm">
                      <button 
                        disabled={!!pending[activeItem.id]}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                        onClick={() => updateProgress(activeItem.id, Math.max(0, (activeItem.currentPage || 0) - 1))}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-gray-700 dark:text-gray-300">
                        {activeItem.currentPage || 0}/{details?.pageCount || activeItem.book.pageCount}
                      </span>
                      <button 
                        disabled={!!pending[activeItem.id]}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                        onClick={() => updateProgress(activeItem.id, (activeItem.currentPage || 0) + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {(() => { const total = (details?.pageCount || activeItem.book.pageCount || 0) as number; const curr = (activeItem.currentPage || 0) as number; const pct = total ? Math.min(100, Math.max(0, Math.round((curr/total)*100))) : 0; return (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pct}% complete</div>
                      </div>
                    ) })()}
                  </div>
                )}
              </div>
            ) : null })()}
          </div>
        </div>,
        document.body
      )}
    </ProtectedRoute>
  )
}
