import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTeamLeadRequests, renewRequestApi, upgradeRequestApi } from '../../api/teamleadApi'
import { triggerGlobalDataSync } from '../../utils/syncUtils'
import {
  RefreshCw,
  Zap,
  Search,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  Layers,
  ExternalLink,
  Filter,
  History,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RenewalEligibility {
  available: boolean
  reason: string
  subscription_end_date?: string | null
  renewal_eligible_date?: string
  active_request_id?: string
  history?: Array<{ id: number; request_id: string; operation: string; status: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">No Date</span>
  if (days < 0) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Expired {Math.abs(days)}d ago</span>
  if (days <= 7) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">Expires in {days}d ⚠</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Expires in {days}d</span>
  return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{days}d remaining</span>
}

function OperationBadge({ op }: { op: string }) {
  const cls =
    op === 'ORIGINAL' ? 'bg-blue-100 text-blue-800' :
    op === 'RENEWAL' ? 'bg-emerald-100 text-emerald-800' :
    op === 'UPGRADE' ? 'bg-purple-100 text-purple-800' :
    'bg-gray-100 text-gray-600'
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${cls}`}>{op}</span>
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function RenewalsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'eligible' | 'expiring' | 'active' | 'completed'>('all')
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const [actionLoading, setActionLoading] = useState<string | number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await getTeamLeadRequests()
      const arr = Array.isArray(data) ? data : data.results || []
      const software = arr.filter((r: any) =>
        r.category === 'Software & SaaS' ||
        r.category === 'Cloud & Infrastructure' ||
        r.software_name ||
        (r.title || '').toLowerCase().includes('software') ||
        (r.title || '').toLowerCase().includes('saas') ||
        (r.title || '').toLowerCase().includes('license')
      )
      setRequests(software)
    } catch {
      showToast('Failed to load subscriptions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const processed = useMemo(() => requests.map(r => {
    const pj = r.payment_justification_detail
    const endDate = pj?.end_date || r.renewal_eligibility?.subscription_end_date || null
    const days = daysUntil(endDate)
    return { ...r, _endDate: endDate, _days: days, _re: r.renewal_eligibility as RenewalEligibility | undefined }
  }), [requests])

  const filtered = useMemo(() => {
    let res = processed
    if (search.trim()) {
      const q = search.toLowerCase()
      res = res.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.software_name?.toLowerCase().includes(q) ||
        (r.request_id || r.id || '').toString().toLowerCase().includes(q) ||
        (r.vendor || '').toLowerCase().includes(q)
      )
    }
    const st = (r: any) => (r.raw_status || r.status || '').toUpperCase()
    const isCompleted = (r: any) => ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'].includes(st(r))
    if (filterStatus === 'eligible') res = res.filter(r => r._re?.available)
    else if (filterStatus === 'expiring') res = res.filter(r => r._days !== null && r._days <= 30 && r._days >= 0)
    else if (filterStatus === 'active') res = res.filter(r => !isCompleted(r))
    else if (filterStatus === 'completed') res = res.filter(r => isCompleted(r))
    return res
  }, [processed, search, filterStatus])

  const stats = useMemo(() => ({
    total: processed.length,
    eligible: processed.filter(r => r._re?.available).length,
    expiringSoon: processed.filter(r => r._days !== null && r._days <= 30 && r._days >= 0).length,
    active: processed.filter(r => !['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'].includes((r.raw_status || r.status || '').toUpperCase())).length,
  }), [processed])

  const handleRenew = async (req: any) => {
    if (!window.confirm(`Create a Renewal request for "${req.title}"?\n\nA draft will be created. Go to My Requests → Edit & Submit to fill in the new quote and push it through approval.`)) return
    setActionLoading(req.id)
    try {
      const newReq = await renewRequestApi(req.id)
      await fetchData()
      triggerGlobalDataSync()
      showToast(`✅ Renewal request ${newReq.request_id} created! Go to My Requests to complete it.`)
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to create renewal request.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpgrade = async (req: any) => {
    if (!window.confirm(`Create an Upgrade request for "${req.title}"?\n\nA draft will be created. Go to My Requests → Edit & Submit to fill in the upgrade details.`)) return
    setActionLoading(req.id)
    try {
      const newReq = await upgradeRequestApi(req.id)
      await fetchData()
      triggerGlobalDataSync()
      showToast(`✅ Upgrade request ${newReq.request_id} created! Go to My Requests to complete it.`)
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to create upgrade request.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'eligible', label: 'Eligible Now' },
    { key: 'expiring', label: 'Expiring Soon' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[999] max-w-sm px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-start gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <RefreshCw size={20} className="text-white" />
            </div>
            Renewals & Upgrades
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">Manage your Software & SaaS subscription lifecycle — renew, upgrade and track history.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm">
          <RotateCcw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Subscriptions', value: stats.total, Icon: Package, grad: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
          { label: 'Eligible to Renew', value: stats.eligible, Icon: CheckCircle2, grad: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
          { label: 'Expiring ≤30 Days', value: stats.expiringSoon, Icon: AlertTriangle, grad: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
          { label: 'Active / In-Progress', value: stats.active, Icon: Layers, grad: 'from-purple-500 to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-center gap-4 shadow-sm`}>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <s.Icon size={19} className="text-white" />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${s.text}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Search by name, software, vendor, request ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} className="text-gray-400 flex-shrink-0 mr-1" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${filterStatus === f.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Loading subscriptions…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <RefreshCw size={44} className="mx-auto mb-4 text-gray-300" />
          <h3 className="font-bold text-gray-700 text-lg">No subscriptions found</h3>
          <p className="text-sm text-gray-400 mt-1.5 max-w-sm mx-auto">Create a Software & SaaS request, complete the full workflow (payment + justification + acknowledgement), and it will appear here for renewal management.</p>
          <button onClick={() => navigate('/portal/team_lead/create-request')} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md">
            <ExternalLink size={15} /> Create New Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req: any) => {
            const pj = req.payment_justification_detail
            const re: RenewalEligibility | undefined = req._re
            const days = req._days as number | null
            const isExpanded = expandedId === req.id
            const isActioning = actionLoading === req.id
            const rawSt = (req.raw_status || req.status || '').toUpperCase()
            const isCompleted = ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'].includes(rawSt)

            const borderClass = re?.available
              ? 'border-emerald-200 ring-1 ring-emerald-100'
              : days !== null && days <= 30 && days >= 0
              ? 'border-amber-200 ring-1 ring-amber-100'
              : 'border-gray-200'

            const avatarGrad = re?.available ? 'from-emerald-500 to-teal-600'
              : days !== null && days <= 30 ? 'from-amber-500 to-orange-600'
              : 'from-blue-500 to-indigo-600'

            const displayName = pj?.software_name || req.software_name || req.title || 'Unknown'

            return (
              <div key={req.id} className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 ${borderClass}`}>

                {/* ── Card Header ── */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-extrabold text-lg shadow-md bg-gradient-to-br ${avatarGrad}`}>
                    {displayName[0]?.toUpperCase() || 'S'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{displayName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pj?.plan_edition || req.subcategory || req.category}
                          {(pj?.vendor_name || req.vendor || req.preferred_vendor) && ` · ${pj?.vendor_name || req.vendor || req.preferred_vendor}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge days={days} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {isCompleted ? 'Completed' : req.status}
                        </span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold text-[10px]">{req.request_id || req.id}</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> Start: {fmtDate(pj?.start_date)}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        End: <span className={days !== null && days <= 30 ? 'font-bold text-amber-700 ml-0.5' : 'font-medium ml-0.5'}>{fmtDate(pj?.end_date || re?.subscription_end_date)}</span>
                      </span>
                      {pj?.subscription_type && <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-semibold">{pj.subscription_type}</span>}
                      {pj?.users_licenses && <span>👥 {pj.users_licenses}</span>}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-1"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* ── Eligibility Action Banner ── */}
                {re && (
                  <div className={`mx-5 mb-4 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${re.available ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-start gap-2 flex-1">
                      {re.available
                        ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        : <Info size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      }
                      <p className={`text-xs font-semibold leading-snug ${re.available ? 'text-emerald-800' : 'text-gray-600'}`}>
                        {re.available ? '✨ Eligible — Click to renew or upgrade this subscription.' : re.reason}
                        {re.active_request_id && <span className="ml-1 font-bold text-blue-600"> (Active: {re.active_request_id})</span>}
                        {!re.available && re.renewal_eligible_date && <span className="ml-1 text-gray-500"> Eligible from {fmtDate(re.renewal_eligible_date)}</span>}
                      </p>
                    </div>

                    {re.available && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          disabled={isActioning}
                          onClick={() => handleRenew(req)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          {isActioning ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCw size={13} />}
                          Renew Subscription
                        </button>
                        <button
                          disabled={isActioning}
                          onClick={() => handleUpgrade(req)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          {isActioning ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap size={13} />}
                          Upgrade
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Expanded Panel ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 mx-5 mb-5 pt-5 space-y-5 animate-fadeIn">

                    {/* Financial Details */}
                    {pj && (
                      <section>
                        <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-widest mb-2">Financial Details</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Purchase Amount', value: pj.actual_purchase_amount ? `₹${Number(pj.actual_purchase_amount).toLocaleString('en-IN')}` : '—' },
                            { label: 'Final Payable', value: pj.final_payable_amount ? `₹${Number(pj.final_payable_amount).toLocaleString('en-IN')}` : '—' },
                            { label: 'Purchase Type', value: pj.purchase_type || '—' },
                            { label: 'Subscription Cycle', value: pj.subscription_type || '—' },
                          ].map(f => (
                            <div key={f.label} className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                              <span className="text-[10px] uppercase text-gray-400 font-semibold block mb-0.5">{f.label}</span>
                              <span className="font-bold text-gray-900 text-sm">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Lifecycle History */}
                    {re?.history && re.history.length > 0 && (
                      <section>
                        <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-1.5">
                          <History size={12} /> Subscription Lifecycle History
                        </h4>
                        <div className="relative pl-8">
                          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-300 via-emerald-300 to-gray-200" />
                          <div className="space-y-2.5">
                            {re.history.map((h, idx) => {
                              const isCurrent = h.request_id === (req.request_id || req.id?.toString())
                              const isLatest = idx === re.history!.length - 1
                              const dotClass = isCurrent ? 'bg-blue-600 ring-2 ring-blue-200'
                                : h.operation === 'RENEWAL' ? 'bg-emerald-500 ring-2 ring-emerald-100'
                                : h.operation === 'UPGRADE' ? 'bg-purple-500 ring-2 ring-purple-100'
                                : 'bg-gray-400'
                              return (
                                <div key={h.id} className="relative">
                                  <div className={`absolute -left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${dotClass}`} />
                                  <div className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${isCurrent ? 'border-blue-200 bg-blue-50/70' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex items-center gap-2">
                                      <OperationBadge op={h.operation} />
                                      <span className="font-bold text-gray-800 font-mono text-[11px]">{h.request_id}</span>
                                      {isCurrent && <span className="text-blue-600 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">◀ Viewing This</span>}
                                      {isLatest && !isCurrent && <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">Latest</span>}
                                    </div>
                                    <span className="text-gray-500 font-medium">{h.status}</span>
                                  </div>
                                </div>
                              )
                            })}
                            {/* Future slot hint */}
                            {re.available && (
                              <div className="relative opacity-60">
                                <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-dashed border-emerald-400 bg-white" />
                                <div className="flex items-center gap-2 bg-emerald-50 border border-dashed border-emerald-300 p-3 rounded-xl text-xs text-emerald-700 font-semibold">
                                  Next renewal / upgrade will appear here once initiated.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Footer link */}
                    <div className="flex justify-end pt-1">
                      <button onClick={() => navigate('/portal/team_lead/my-requests')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        View in My Requests <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* How it works */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1.5">
          <p className="font-bold text-sm">How Renewal & Upgrade Works</p>
          <p>1. Click <strong>Renew</strong> or <strong>Upgrade</strong> — a new linked draft request is created (e.g. <code className="bg-blue-100 px-1 rounded">REQ-XXXX-R1</code>).</p>
          <p>2. Go to <strong>My Requests</strong> → find the new draft → <strong>Edit & Submit</strong> to enter the updated quote, amount, and justification.</p>
          <p>3. The request flows through the standard <strong>Manager → Finance</strong> approval pipeline — same as any new request.</p>
          <p>4. The original request is permanently preserved. All renewals and upgrades are linked and visible in the Lifecycle History above.</p>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  )
}

