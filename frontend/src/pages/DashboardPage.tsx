import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts'
import { Shield, MessageSquare, AlertTriangle, Clock } from 'lucide-react'
import { getAuditEvents, getAuditStats } from '../api/audit'
import type { AuditEvent, AuditStats } from '../types'


// ─── Couleurs graphiques ──────────────────────────────────
const COLORS = ['#4318FF', '#00AEEF', '#05CD99', '#FFB547', '#EE5D50']

// ─── Composant carte stat ─────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  bg: string
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#111C44] rounded-[20px] p-5 shadow-[0px_18px_40px_rgba(112,144,176,0.12)]">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <p className="text-[#A3AED0] text-xs font-medium mb-1">{label}</p>
      <p className="font-heading font-bold text-2xl text-[#2B3674] dark:text-white">{value}</p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
  const fetchData = async () => {
    try {
      const [statsData, eventsData] = await Promise.all([
        getAuditStats(),
        getAuditEvents(page, 10)
      ])
      setStats(statsData)
      setEvents(eventsData)
      setHasMore(eventsData.length === 10)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [page])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#4318FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Données pour le PieChart
  const pieData = stats?.events_by_type
    ? Object.entries(stats.events_by_type).map(([name, value]) => ({
        name: t(`events.${name}`),
        value
      }))
    : []

  // Données pour le BarChart (simulées par jour si pas de données)
  const barData = events.slice(0, 7).map((e, i) => ({
    name: `J-${i + 1}`,
    PII: e.pii_count,
    Latence: e.latency_ms,
  }))

  return (
    <div className="p-6 bg-[#F4F7FE] dark:bg-[#0B1437] min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl text-[#2B3674] dark:text-white">
          {t('dashboard.title')}
        </h1>
        <p className="text-[#A3AED0] text-sm mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={<MessageSquare size={20} />}
          label={t('dashboard.total_messages')}
          value={stats?.total_events || 0}
          color="text-[#4318FF]"
          bg="bg-[#EEF2FF]"
        />
        <StatCard
          icon={<Shield size={20} />}
          label={t('dashboard.pii_detected')}
          value={stats?.total_pii_detected || 0}
          color="text-[#FFB547]"
          bg="bg-[#FFF3E0]"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label={t('dashboard.blocked')}
          value={stats?.total_blocked || 0}
          color="text-[#EE5D50]"
          bg="bg-[#FFF5F5]"
        />
        <StatCard
          icon={<Clock size={20} />}
          label={t('dashboard.avg_latency')}
          value={`${Math.round(stats?.avg_latency_ms || 0)}ms`}
          color="text-[#05CD99]"
          bg="bg-[#E6FAF5]"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">

        {/* BarChart */}
        <div className="bg-white dark:bg-[#111C44] rounded-[20px] p-5 shadow-[0px_18px_40px_rgba(112,144,176,0.12)]">
          <h3 className="font-heading font-bold text-[#2B3674] dark:text-white mb-4">
            {t('dashboard.chart_pii')}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" />
              <XAxis dataKey="name" tick={{ fill: '#A3AED0', fontSize: 12 }} />
              <YAxis tick={{ fill: '#A3AED0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0px 18px 40px rgba(112,144,176,0.12)'
                }}
              />
              <Bar dataKey="PII" fill="#4318FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PieChart */}
        <div className="bg-white dark:bg-[#111C44] rounded-[20px] p-5 shadow-[0px_18px_40px_rgba(112,144,176,0.12)]">
          <h3 className="font-heading font-bold text-[#2B3674] dark:text-white mb-4">
            {t('dashboard.chart_types')}
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0px 18px 40px rgba(112,144,176,0.12)'
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: '#A3AED0', fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[#A3AED0] text-sm">
              {t('dashboard.no_data')}
            </div>
          )}
        </div>
      </div>

      {/* Tableau événements */}
      <div className="bg-white dark:bg-[#111C44] rounded-[20px] shadow-[0px_18px_40px_rgba(112,144,176,0.12)] overflow-hidden">
        <div className="p-5 border-b border-[#F4F7FE] dark:border-[#1E2A3A]">
          <h3 className="font-heading font-bold text-[#2B3674] dark:text-white">
            {t('dashboard.table_title')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F4F7FE] dark:border-[#1E2A3A]">
                {['table_type', 'table_severity', 'table_pii', 'table_latency', 'table_blocked', 'table_date'].map(key => (
                  <th key={key} className="px-5 py-3 text-left text-[10px] font-bold text-[#A3AED0] uppercase tracking-wider">
                    {t(`dashboard.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#A3AED0] text-sm">
                    {t('dashboard.no_data')}
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="border-b border-[#F4F7FE] dark:border-[#1E2A3A] hover:bg-[#F4F7FE] dark:hover:bg-[#1E2A3A] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        event.event_type === 'PROMPT_INJECTION' ? 'bg-[#FFF5F5] text-[#EE5D50]' :
                        event.event_type === 'PII_DETECTED' ? 'bg-[#FFF3E0] text-[#FFB547]' :
                        event.event_type === 'TOXIC_OUTPUT' ? 'bg-[#FFF5F5] text-[#EE5D50]' :
                        'bg-[#E6FAF5] text-[#05CD99]'
                      }`}>
                        {t(`events.${event.event_type}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${
                        event.severity === 'critical' ? 'text-[#EE5D50]' :
                        event.severity === 'high' ? 'text-[#FFB547]' :
                        event.severity === 'medium' ? 'text-[#00AEEF]' :
                        'text-[#05CD99]'
                      }`}>
                        {t(`severity.${event.severity}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#2B3674] dark:text-white font-medium">
                      {event.pii_count}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#A3AED0]">
                      {event.latency_ms}ms
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold ${
                        event.blocked ? 'text-[#EE5D50]' : 'text-[#05CD99]'
                      }`}>
                        {event.blocked ? '✕' : '✓'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[#A3AED0]">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-[#F4F7FE] dark:border-[#1E2A3A]">
        <p className="text-xs text-[#A3AED0]">
          Page {page}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="
              px-4 py-2 rounded-xl text-xs font-semibold
              bg-[#F4F7FE] dark:bg-[#1E2A3A]
              text-[#2B3674] dark:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#4318FF] hover:text-white transition-all
            "
          >
            ← Précédent
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className="
              px-4 py-2 rounded-xl text-xs font-semibold
              bg-[#F4F7FE] dark:bg-[#1E2A3A]
              text-[#2B3674] dark:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#4318FF] hover:text-white transition-all
            "
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
} 