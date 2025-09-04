import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useThemeMode } from './contexts/ThemeContext'
import './App.css'
import { Menu, Home, Search, Library, Bookmark, Settings, HelpCircle, Sun, Moon, Bell, User, BarChart3 } from 'lucide-react'

const nav = [
  { text: 'Home', icon: Home, to: '/' },
  { text: 'Discover', icon: Search, to: '/discover' },
  { text: 'Bookmarks', icon: Bookmark, to: '/bookmarks' },
  { text: 'Analytics', icon: BarChart3, to: '/analytics' },
  { text: 'Settings', icon: Settings, to: '/settings' },
  { text: 'Help', icon: HelpCircle, to: '/help' },
]

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mode, toggle } = useThemeMode()
  const navigate = useNavigate()
  const location = useLocation()

  const DrawerList = () => (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Library className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold">E-Book</span>
        </div>
      </div>
      <div className="flex-1 px-4">
        {nav.map((n) => {
          const Icon = n.icon
          const active = location.pathname === n.to
          return (
            <button
              key={n.text}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 mb-1 text-sm font-medium transition-all ${
                active 
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-10">
        <DrawerList />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <DrawerList />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col h-full">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <button 
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white" 
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={toggle}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                <Bell size={18} />
              </button>
              <button className="p-1.5 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors">
                <User size={16} className="text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
