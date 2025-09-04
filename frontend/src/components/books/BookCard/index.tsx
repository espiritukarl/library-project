import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { useState } from 'react'

type Props = { result: { title: string; authors: string[]; isbn?: string; openLibraryId?: string; coverUrl?: string } }

export default function BookCard({ result }: Props) {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle'|'adding'|'added'|'error'>('idle')

  const add = async () => {
    try {
      setStatus('adding')
      const created = await api.post('/books', { openLibraryId: result.openLibraryId, title: result.title, isbn: result.isbn, coverUrl: result.coverUrl })
      if (user) {
        await api.post('/user/books', { bookId: created.book.id })
      }
      setStatus('added')
    } catch {
      setStatus('error')
    }
  }

  const img = result.coverUrl || '/vite.svg'
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <img src={img} alt={result.title} className="h-48 w-full object-cover" />
      <div className="p-3">
        <p className="truncate text-sm font-medium">{result.title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{result.authors?.join(', ')}</p>
      </div>
      <div className="p-3 pt-0">
        <button onClick={add} disabled={status==='adding' || status==='added'} className="inline-flex rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
          {status==='added' ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  )
}
