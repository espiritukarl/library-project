import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts'

type MonthlyCompleted = { label: string; count: number }
type MonthlyPages = { label: string; pages: number }
type Goal = { id: string; year: number; month?: number | null; targetBooks?: number | null; targetPages?: number | null }

export default function Analytics() {
  const [stats, setStats] = useState<{ monthlyCompleted: MonthlyCompleted[]; monthlyPages: MonthlyPages[]; byStatus: any; total: number } | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalForm, setGoalForm] = useState<{ year: number; month: number | '' ; targetBooks: number | '' ; targetPages: number | '' }>({ year: new Date().getFullYear(), month: new Date().getMonth()+1, targetBooks: 12, targetPages: '' })
  const [error, setError] = useState('')

  const load = async () => {
    const s = await api.get('/user/stats')
    setStats(s)
    const g = await api.get('/user/goals')
    setGoals(g.goals)
  }
  useEffect(() => { load() }, [])

  const currentGoal = goals.find(g => g.year === new Date().getFullYear() && (g.month ?? new Date().getMonth()+1) === new Date().getMonth()+1)

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/user/goals', {
        year: goalForm.year,
        month: goalForm.month === '' ? null : goalForm.month,
        targetBooks: goalForm.targetBooks === '' ? null : goalForm.targetBooks,
        targetPages: goalForm.targetPages === '' ? null : goalForm.targetPages,
      })
      await load()
    } catch (err: any) {
      setError(err?.data?.error || 'Failed to save goal')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reading Analytics</h1>

      {stats && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-2 font-medium">Books Completed (last 12 months)</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={stats.monthlyCompleted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-2 font-medium">Pages Read (last 12 months)</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={stats.monthlyPages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="pages" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-2 font-medium">Goals</h2>
        {currentGoal ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Current goal: {currentGoal.month ? `${currentGoal.year}-${String(currentGoal.month).padStart(2,'0')}` : currentGoal.year} — Books: {currentGoal.targetBooks ?? '-'} Pages: {currentGoal.targetPages ?? '-'}</p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">No current goal set</p>
        )}

        <form onSubmit={handleCreateGoal} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <input className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" type="number" value={goalForm.year} onChange={(e) => setGoalForm({ ...goalForm, year: parseInt(e.target.value || '0', 10) })} placeholder="Year" />
          <select className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" value={goalForm.month} onChange={(e) => setGoalForm({ ...goalForm, month: e.target.value ? parseInt(e.target.value, 10) : '' })}>
            <option value="">Yearly</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" type="number" value={goalForm.targetBooks} onChange={(e) => setGoalForm({ ...goalForm, targetBooks: e.target.value ? parseInt(e.target.value, 10) : '' })} placeholder="Target books" />
          <input className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800" type="number" value={goalForm.targetPages} onChange={(e) => setGoalForm({ ...goalForm, targetPages: e.target.value ? parseInt(e.target.value, 10) : '' })} placeholder="Target pages" />
          <button className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">Save Goal</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium">All Goals</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span>{g.month ? `${g.year}-${String(g.month).padStart(2,'0')}` : g.year}</span>
                  <span>Books: {g.targetBooks ?? '-'}</span>
                  <span>Pages: {g.targetPages ?? '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
