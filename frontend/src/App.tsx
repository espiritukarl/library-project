import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useThemeMode } from './contexts/ThemeContext'
import './App.css'
import { Menu, Home, Search, Library, Bookmark, Settings, HelpCircle, Sun, Moon } from 'lucide-react'

const nav = [
  { text: 'Home', icon: Home, to: '/' },
  { text: 'Discover', icon: Search, to: '/discover' },
  { text: 'Library', icon: Library, to: '/library' },
  { text: 'Bookmarks', icon: Bookmark, to: '/bookmarks' },
  { text: 'Settings', icon: Settings, to: '/settings' },
  { text: 'Help', icon: HelpCircle, to: '/help' },
]

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mode, toggle } = useThemeMode()
  const navigate = useNavigate()
  const location = useLocation()

  const DrawerList = () => (
    <div className="h-full flex flex-col">
      <div className="h-16" />
      <div className="px-2 py-2 space-y-1">
        {nav.map((n) => {
          const Icon = n.icon
          const active = location.pathname === n.to
          return (
            <button
              key={n.text}
              className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => { navigate(n.to); setMobileOpen(false) }}
            >
              <Icon size={18} />
              <span>{n.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <button className="mr-3 sm:hidden" onClick={() => setMobileOpen((x) => !x)} aria-label="Open Menu">
            <Menu />
          </button>
          <Link to="/" className="text-lg font-semibold">Personal Library</Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{mode === 'light' ? 'Light' : 'Dark'}</span>
            <button onClick={toggle} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="hidden w-60 border-r border-slate-200 pt-16 sm:block dark:border-slate-800">
        <DrawerList />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white p-2 dark:bg-slate-900">
            <DrawerList />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl px-4 pt-20 sm:ml-60">
        <Outlet />
      </main>
    </div>
  )
}
