import { useAuth } from '../../contexts/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <div className="space-y-2">
        <p>User: {user ? user.username : 'Not logged in'}</p>
        {user && (
          <button className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={logout}>Logout</button>
        )}
      </div>
    </div>
  )
}
