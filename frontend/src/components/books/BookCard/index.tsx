import { api } from '../../../services/api'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
// icons removed; not used currently

type Props = { result: { title: string; authors: string[]; isbn?: string; openLibraryId?: string; coverUrl?: string }, alreadyAdded?: boolean }

type AddState = 'idle' | 'adding' | 'added' | 'error'

export default function BookCard({ result, alreadyAdded = false }: Props) {
  const [addState, setAddState] = useState<AddState>('idle')
  const [showForm, setShowForm] = useState(false)
  const [selStatus, setSelStatus] = useState<'BOOKMARKED' | 'READING' | 'COMPLETED'>('BOOKMARKED')
  const [page, setPage] = useState<string>('')
  const [err, setErr] = useState<string>('')
  const [toast, setToast] = useState<string>('')
  const [isAdded, setIsAdded] = useState<boolean>(alreadyAdded)
  // keep in sync if parent updates alreadyAdded (e.g., after loading library)
  useEffect(() => { if (addState === 'idle') setIsAdded(alreadyAdded) }, [alreadyAdded])
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
        // Remove script/style and disallowed elements by unwrapping
        if (el.nodeType === 1) {
          if (!allowed.has(el.tagName)) {
            const parent = el.parentNode
            if (parent) {
              while (el.firstChild) parent.insertBefore(el.firstChild, el)
              parent.removeChild(el)
              return
            }
          } else {
            // Strip all attributes except href on <a>
            for (const attr of Array.from(el.attributes)) {
              if (el.tagName === 'A' && attr.name.toLowerCase() === 'href') continue
              el.removeAttribute(attr.name)
            }
            if (el.tagName === 'A') {
              const href = el.getAttribute('href') || ''
              // block javascript: and data: URIs
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

  const add = async () => {
    try {
      setErr('')
      setAddState('adding')
      const created = await api.post('/books', { openLibraryId: result.openLibraryId, title: result.title, isbn: result.isbn, coverUrl: result.coverUrl })
      const body: any = { bookId: created.book.id, status: selStatus }
      if (page !== '' && !isNaN(Number(page))) body.currentPage = Number(page)
      // Requires auth; ProtectedRoute ensures user exists
      await api.post('/user/books', body)
      setAddState('added')
      setShowForm(false)
      setIsAdded(true)
      // Notify Home to refresh reading progress when relevant
      if (selStatus === 'READING') {
        window.dispatchEvent(new CustomEvent('user:books-updated', { detail: { reason: 'added', status: selStatus } }))
      }
      // Show success toast
      const toastMessage = selStatus === 'BOOKMARKED' ? `Bookmarked ${result.title}` : `${result.title} added to library`
      setToast(toastMessage)
      setTimeout(() => setToast(''), 2500)
    } catch (e: any) {
      setAddState('error')
      setErr(e?.data?.error || e?.message || 'Failed to add')
    }
  }

  return (
    <div className="group cursor-pointer" onClick={async () => {
      if (showForm) return;
      setShowForm(true)
      if (!details && result.openLibraryId) {
        try {
          setDetailsLoading(true)
          const d = await api.get(`/books/work/${encodeURIComponent(result.openLibraryId)}`)
          setDetails(d.details || null)
        } catch {
          setDetails(null)
        } finally { setDetailsLoading(false) }
      }
    }}>
      <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-4 mb-3 aspect-[3/4] flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 group-hover:scale-105">
        {result.coverUrl ? (
          <img 
            src={result.coverUrl} 
            alt={result.title} 
            className="w-full h-full object-contain rounded shadow-sm"
          />
        ) : (
          <div className="w-full h-full bg-white dark:bg-gray-800 rounded shadow-sm flex items-center justify-center">
            <span className="text-xs text-gray-400 text-center px-2">{result.title}</span>
          </div>
        )}
        {isAdded && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-green-600/90 text-white px-2 py-1 text-[10px] shadow-sm">
            <Check size={12} /> Added
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">
          {result.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {result.authors?.join(', ') || 'Unknown Author'}
        </p>
      </div>

      {showForm && addState !== 'added' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-[40rem] max-w-[95vw] rounded-md border border-gray-200 bg-white p-6 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-6">
              <div className="w-28 h-40 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                {result.coverUrl ? (
                  <img src={result.coverUrl} alt={result.title} className="w-full h-full object-contain" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1">{result.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{result.authors?.join(', ') || 'Unknown Author'}{details?.firstPublishYear ? ` • ${details.firstPublishYear}` : ''}{typeof details?.pageCount === 'number' ? ` • ${details.pageCount} pages` : ''}</p>
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
            {err && <div className="mb-2 text-xs text-red-600 dark:text-red-400">{String(err)}</div>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={(e) => { e.stopPropagation(); setShowForm(false) }} className="rounded border border-gray-200 px-2 py-1 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={add} disabled={addState==='adding'} className="rounded bg-gray-900 px-3 py-1 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">
                {addState==='adding' ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div className="fixed bottom-4 right-4 z-50">
          <div className="rounded-md bg-gray-900 text-white px-3 py-2 text-sm shadow-lg dark:bg-white dark:text-gray-900">
            {toast}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
