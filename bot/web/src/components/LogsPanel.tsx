// Панель логов админки
import React from 'react'
import authFetch from '../utils/authFetch'

interface Log { _id: string; message: string; level: string; createdAt: string }

export default function LogsPanel() {
  const [logs, setLogs] = React.useState<Log[]>([])
  React.useEffect(() => {
    authFetch('/api/v1/logs')
      .then(r => (r.ok ? r.json() : []))
      .then(setLogs)
  }, [])
  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Логи</h2>
      <ul className="divide-y divide-gray-200">
        {logs.map(l => (
          <li key={l._id} className="py-2">
            [{new Date(l.createdAt).toLocaleString()}] {l.level}: {l.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
