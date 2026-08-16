import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Area, AreaChart
} from 'recharts'
import { Shield, MessageSquare, AlertTriangle, Clock, Download, RefreshCw } from 'lucide-react'
import { getAuditEvents, getAuditStats } from '../api/audit'
import type { AuditEvent, AuditStats } from '../types'

const COLORS = ['#4318FF', '#00AEEF', '#05CD99', '#FFB547', '#EE5D50']

// ─── Mini stat ────────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[#A3AED0] uppercase tracking-wider">{label}</span>
      <span className={`font-heading font-bold text-lg ${color}`}>{value}</span>
    </div>
  )
}

// ─── Carte stat ───────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: string | number
  color: string; bg: string
}) {
  return (
    <div className="bg-white dark:bg-[#111C44] rounded-2xl p-4 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-[#A3AED0] text-[11px] font-medium">{label}</p>
        <p className="font-heading font-bold text-2xl text-[#2B3674] dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Badge event type ─────────────────────────────────────
function EventBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const styles: Record<string, string> = {
    PROMPT_INJECTION: 'bg-[#FFF5F5] text-[#EE5D50]',
    PII_DETECTED: 'bg-[#FFF3E0] text-[#FFB547]',
    TOXIC_OUTPUT: 'bg-[#FFF5F5] text-[#EE5D50]',
    NORMAL: 'bg-[#E6FAF5] text-[#05CD99]',
  }
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${styles[type] || 'bg-[#EEF2FF] text-[#4318FF]'}`}>
      {t(`events.${type}`)}
    </span>
  )
}

// ─── Badge severity ───────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useTranslation()
  const styles: Record<string, string> = {
    critical: 'text-[#EE5D50]',
    high: 'text-[#FFB547]',
    medium: 'text-[#00AEEF]',
    low: 'text-[#05CD99]',
  }
  return (
    <span className={`text-xs font-bold ${styles[severity] || 'text-[#A3AED0]'}`}>
      {t(`severity.${severity}`)}
    </span>
  )
}

// ─── Page principale ──────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)    // chargement initial
  const [fetching, setFetching] = useState(false) // pagination/filtre
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [isFirst, setIsFirst] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = async () => {
    if (isFirst) {
      setLoading(true)
    } else {
      setFetching(true)
    }

    try {
      const [statsData, eventsData] = await Promise.all([
        getAuditStats(),
        getAuditEvents(page, 10, filter || undefined)
      ])
      setStats(statsData)
      setEvents(eventsData)
      setHasMore(eventsData.length === 10)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setFetching(false)
      setIsFirst(false)
    }
  }

  useEffect(() => { fetchData() }, [page, filter])

  // Export CSV
  const exportCSV = () => {
    const headers = ['ID', 'Session', 'Type', 'Severity', 'PII', 'Latency', 'Blocked', 'Date']
    const rows = events.map(e => [
      e.id, e.session_id, e.event_type, e.severity,
      e.pii_count, e.latency_ms, e.blocked, e.created_at
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Données graphiques
  const pieData = stats?.events_by_type
    ? Object.entries(stats.events_by_type).map(([name, value]) => ({
        name: t(`events.${name}`), value
      }))
    : []

  const barData = events.slice(0, 7).map((e, i) => ({
    name: `E${i + 1}`,
    PII: e.pii_count,
    Latence: Math.round(e.latency_ms / 100),
  }))

  const areaData = events.map((e, i) => ({
    name: `${i + 1}`,
    latence: e.latency_ms,
    pii: e.pii_count * 100,
  }))

  // Spinner initial
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F7FE] dark:bg-[#0B1437]">
        <div className="w-8 h-8 border-4 border-[#4318FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-5 bg-[#F4F7FE] dark:bg-[#0B1437] min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-xl text-[#2B3674] dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-[#A3AED0] text-xs mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsFirst(false); fetchData() }}
            className="p-2 rounded-xl bg-white dark:bg-[#111C44] shadow-sm hover:bg-[#4318FF] hover:text-white text-[#A3AED0] transition-all"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#4318FF] text-white text-xs font-semibold hover:opacity-90 transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={<MessageSquare size={18} />}
          label={t('dashboard.total_messages')}
          value={stats?.total_events || 0}
          color="text-[#4318FF]" bg="bg-[#EEF2FF]"
        />
        <StatCard
          icon={<Shield size={18} />}
          label={t('dashboard.pii_detected')}
          value={stats?.total_pii_detected || 0}
          color="text-[#FFB547]" bg="bg-[#FFF3E0]"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label={t('dashboard.blocked')}
          value={stats?.total_blocked || 0}
          color="text-[#EE5D50]" bg="bg-[#FFF5F5]"
        />
        <StatCard
          icon={<Clock size={18} />}
          label={t('dashboard.avg_latency')}
          value={`${Math.round(stats?.avg_latency_ms || 0)}ms`}
          color="text-[#05CD99]" bg="bg-[#E6FAF5]"
        />
      </div>

      {/* ── Graphiques row 1 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">

        {/* AreaChart — large */}
        <div className="xl:col-span-2 bg-white dark:bg-[#111C44] rounded-2xl p-4 shadow-[0px_18px_40px_rgba(112,144,176,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-sm text-[#2B3674] dark:text-white">
              Latence & PII — tendance
            </h3>
            <div className="flex gap-4">
              <MiniStat label="Moy. latence" value={`${Math.round(stats?.avg_latency_ms || 0)}ms`} color="text-[#4318FF]" />
              <MiniStat label="Total PII" value={stats?.total_pii_detected || 0} color="text-[#FFB547]" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorLatence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4318FF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4318FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPii" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00AEEF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" />
              <XAxis dataKey="name" tick={{ fill: '#A3AED0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#A3AED0', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0px 4px 20px rgba(112,144,176,0.2)' }} />
              <Area type="monotone" dataKey="latence" stroke="#4318FF" strokeWidth={2} fill="url(#colorLatence)" />
              <Area type="monotone" dataKey="pii" stroke="#00AEEF" strokeWidth={2} fill="url(#colorPii)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PieChart — compact */}
        <div className="bg-white dark:bg-[#111C44] rounded-2xl p-4 shadow-[0px_18px_40px_rgba(112,144,176,0.12)]">
          <h3 className="font-heading font-bold text-sm text-[#2B3674] dark:text-white mb-3">
            {t('dashboard.chart_types')}
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[11px] text-[#A3AED0]">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#2B3674] dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-[#A3AED0] text-xs">
              {t('dashboard.no_data')}
            </div>
          )}
        </div>
      </div>

      {/* ── BarChart ── */}
      <div className="bg-white dark:bg-[#111C44] rounded-2xl p-4 shadow-[0px_18px_40px_rgba(112,144,176,0.12)] mb-5">
        <h3 className="font-heading font-bold text-sm text-[#2B3674] dark:text-white mb-4">
          {t('dashboard.chart_pii')}
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#A3AED0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#A3AED0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0px 4px 20px rgba(112,144,176,0.2)' }} />
            <Bar dataKey="PII" fill="#4318FF" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Latence" fill="#00AEEF" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tableau ── */}
      <div className="bg-white dark:bg-[#111C44] rounded-2xl shadow-[0px_18px_40px_rgba(112,144,176,0.12)] overflow-hidden">

        {/* Header tableau */}
        <div className="p-4 border-b border-[#F4F7FE] dark:border-[#1E2A3A] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-sm text-[#2B3674] dark:text-white">
              {t('dashboard.table_title')}
            </h3>
            {fetching && (
              <div className="w-3 h-3 border-2 border-[#4318FF] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            {['', 'NORMAL', 'PII_DETECTED', 'PROMPT_INJECTION', 'TOXIC_OUTPUT'].map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                  filter === f
                    ? 'bg-[#4318FF] text-white'
                    : 'bg-[#F4F7FE] dark:bg-[#1E2A3A] text-[#A3AED0] hover:text-[#4318FF]'
                }`}
              >
                {f === '' ? 'Tous' : t(`events.${f}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F4F7FE] dark:border-[#1E2A3A]">
                {['table_type', 'table_severity', 'table_pii', 'table_latency', 'table_blocked', 'table_date'].map(key => (
                  <th key={key} className="px-4 py-3 text-left text-[10px] font-bold text-[#A3AED0] uppercase tracking-wider">
                    {t(`dashboard.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#A3AED0] text-xs">
                    {t('dashboard.no_data')}
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="border-b border-[#F4F7FE] dark:border-[#1E2A3A] hover:bg-[#F4F7FE] dark:hover:bg-[#1E2A3A] transition-colors">
                    <td className="px-4 py-3"><EventBadge type={event.event_type} /></td>
                    <td className="px-4 py-3"><SeverityBadge severity={event.severity} /></td>
                    <td className="px-4 py-3 text-sm font-bold text-[#2B3674] dark:text-white">{event.pii_count}</td>
                    <td className="px-4 py-3 text-xs text-[#A3AED0]">{event.latency_ms}ms</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${event.blocked ? 'text-[#EE5D50]' : 'text-[#05CD99]'}`}>
                        {event.blocked ? '✕' : '✓'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A3AED0]">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#F4F7FE] dark:border-[#1E2A3A]">
          <p className="text-xs text-[#A3AED0]">Page {page}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || fetching}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F7FE] dark:bg-[#1E2A3A] text-[#2B3674] dark:text-white disabled:opacity-40 hover:bg-[#4318FF] hover:text-white transition-all"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || fetching}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F7FE] dark:bg-[#1E2A3A] text-[#2B3674] dark:text-white disabled:opacity-40 hover:bg-[#4318FF] hover:text-white transition-all"
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}