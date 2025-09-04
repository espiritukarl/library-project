import { Link as RouterLink } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Welcome</h1>
      <p className="mb-4 text-slate-600 dark:text-slate-300">Search for books, build your library, and track your reading.</p>
      <div className="flex gap-2">
        <RouterLink to="/discover" className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">Discover Books</RouterLink>
        <RouterLink to="/library" className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Go to Library</RouterLink>
      </div>
    </div>
  )
}
