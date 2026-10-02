import React, { useState, useMemo, useEffect } from 'react'
import { ArrowUpRight, CheckCircle, Search, Filter, Layers, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useManagerData } from '../../context/ManagerDataContext'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, getWorkflowProgression, sortRequestsNewestFirst } from '../../utils/workflowUtils'

const fmt = (v: number | string | undefined | null) => {
  const num = Number(v) || 0
  return `₹${num.toLocaleString('en-IN')}`
}

export const RecommendedToFinancePage: React.FC = () => {
  const navigate = useNavigate()
  const { recommendedToFinance, allRequests, refreshData } = useManagerData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')

  // Base list of all recommended items across lifecycle
  const baseList = useMemo(() => {
    const list = [...recommendedToFinance]
    allRequests.forEach(r => {
      const rawSt = ((r as any).raw_status || r.status || '').toUpperCase()
      const hasHistoryRec = (r.history || []).some(h => (h.action || '').toUpperCase().includes('RECOMMEND'))
      const isRecommended =
        r.status === 'recommended_to_finance' ||
        rawSt === 'RECOMMENDED_TO_FINANCE' ||
        r.status === 'finance_review' ||
        rawSt === 'FINANCE_REVIEW' ||
        rawSt === 'FINANCE_APPROVED' ||
        rawSt === 'PAYMENT_APPROVED' ||
        rawSt === 'PAYMENT_PROCESSED' ||
        rawSt === 'PAYMENT_JUSTIFICATION_SUBMITTED' ||
        rawSt === 'PAYMENT_JUSTIFIED' ||
        Boolean(r.recommendationReason) ||
        Boolean((r as any).extra_fields?.recommendation_reason) ||
        hasHistoryRec

      if (isRecommended && !list.some(item => item.id === r.id)) {
        list.push(r)
      }
    })
    return list
  }, [recommendedToFinance, allRequests])

  // Segmented filter counts
  const softwareCount = useMemo(() => baseList.filter(r => isSoftwareRequest(r)).length, [baseList])
  const hardwareCount = useMemo(() => baseList.filter(r => isHardwareRequest(r)).length, [baseList])

  // Merge with allRequests and filter & sort strictly newest first
  const items = useMemo(() => {
    const matching = baseList.filter(item => {
      const matchSearch =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
        ((item as any).software_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.requester || (item as any).requesterName || '').toLowerCase().includes(search.toLowerCase())
      if (!matchSearch) return false

      if (statusFilter !== 'All') {
        const rawSt = ((item as any).raw_status || item.status || '').toUpperCase()
        if (statusFilter === 'Finance Review' && !['RECOMMENDED_TO_FINANCE', 'FINANCE_REVIEW', 'FINANCE_RESEARCH'].includes(rawSt)) return false
        if (statusFilter === 'Payment Approved' && !['FINANCE_APPROVED', 'PAYMENT_APPROVED'].includes(rawSt)) return false
        if (statusFilter === 'Completed' && rawSt !== 'COMPLETED') return false
      }

      const matchesType = requestType === 'all'
        ? true
        : requestType === 'software'
        ? isSoftwareRequest(item)
        : isHardwareRequest(item)

      return matchesType
    })
    return sortRequestsNewestFirst(matching)
  }, [baseList, search, statusFilter, requestType])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpRight className="text-purple-600" size={26} /> Recommended to Higher Authority
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Persistent audit trail of software & procurement requests recommended to Higher Authority (Finance / Executive).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search Request ID, Software, Team Lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl shadow-2xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs font-medium text-gray-700"
          >
            <option value="All">All Stages</option>
            <option value="Finance Review">Finance Review</option>
            <option value="Payment Approved">Payment Approved</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={setRequestType}
          totalCount={baseList.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-blue-200" />
            <p className="font-semibold text-gray-600">No requests recommended to Finance yet</p>
            <p className="text-xs text-gray-400 mt-1">Requests recommended by Manager will remain permanently listed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">1. Request ID</th>
                  <th className="p-3.5">2. Software / SaaS</th>
                  <th className="p-3.5">3. Team Lead</th>
                  <th className="p-3.5">4. Requirement</th>
                  <th className="p-3.5">5. Recommended Date</th>
                  <th className="p-3.5">6. Finance Status</th>
                  <th className="p-3.5 text-right">7. Est. Amount</th>
                  <th className="p-3.5 text-right">8. Approved Amount</th>
                  <th className="p-3.5">9. Payment Status</th>
                  <th className="p-3.5">10. Workflow Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {items.map(r => {
                  const rawSt = ((r as any).raw_status || r.status || '').toUpperCase()
                  const softwareName = (r as any).software_name || r.title || 'Software / SaaS'
                  const teamLead = r.requester || (r as any).requesterName || 'Team Lead'
                  const requirement = (r as any).business_requirement || r.justification || r.description || 'Software requirement'
                  const recDate = r.recommendedDate || (r as any).date || '2026-09-25'
                  const financeStatus = (r as any).finance_status || r.financeStatus || (rawSt === 'RECOMMENDED_TO_FINANCE' || rawSt === 'FINANCE_REVIEW' ? 'Under Review' : rawSt.includes('APPROVED') ? 'Payment Approved' : 'Completed')
                  const estAmount = (r as any).estimatedCost || (r as any).estimated_cost || r.amount || 0
                  const appAmount = (r as any).finance_approved_amount || (r as any).approved_amount || (rawSt.includes('APPROVED') || rawSt === 'COMPLETED' ? r.amount : null)
                  const paymentStatus = (r as any).payment_status || ((rawSt === 'COMPLETED' || rawSt === 'PAYMENT_JUSTIFIED') ? 'Paid' : rawSt === 'PAYMENT_PROCESSED' ? 'Processed' : 'Pending')

                  const prog = getWorkflowProgression({
                    status: r.status,
                    financeStatus: r.financeStatus,
                    category: r.category,
                    title: r.title,
                    paymentStatus: r.paymentStatus,
                    currentStage: r.currentStage,
                    history: r.history,
                  })

                  return (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* 1. Request ID */}
                      <td className="p-3.5 font-bold font-mono text-blue-600">
                        {r.id}
                      </td>

                      {/* 2. Software / SaaS */}
                      <td className="p-3.5 font-semibold text-gray-900 max-w-[180px]">
                        <div className="truncate" title={softwareName}>{softwareName}</div>
                        <span className="text-[10px] text-gray-400 block">{r.category || 'Software & SaaS'}</span>
                      </td>

                      {/* 3. Team Lead */}
                      <td className="p-3.5 text-gray-700 whitespace-nowrap">
                        <span className="font-semibold">{teamLead}</span>
                      </td>

                      {/* 4. Requirement */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="truncate text-gray-600" title={requirement}>
                          {requirement}
                        </div>
                      </td>

                      {/* 5. Recommended Date */}
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">
                        {recDate}
                      </td>

                      {/* 6. Finance Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          rawSt === 'PAYMENT_APPROVED' || rawSt === 'FINANCE_APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : rawSt === 'COMPLETED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {financeStatus}
                        </span>
                      </td>

                      {/* 7. Estimated Amount */}
                      <td className="p-3.5 text-right font-bold text-gray-900 whitespace-nowrap">
                        {fmt(estAmount)}
                      </td>

                      {/* 8. Approved Amount */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {appAmount ? (
                          <span className="font-bold text-emerald-700">{fmt(appAmount)}</span>
                        ) : (
                          <span className="text-gray-400 font-semibold">—</span>
                        )}
                      </td>

                      {/* 9. Payment Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          paymentStatus === 'Paid' || paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : paymentStatus === 'Processed'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {paymentStatus}
                        </span>
                      </td>

                      {/* 10. Current Workflow Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {prog.currentStageName}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/manager/request-details?id=${r.id}`)}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="View Request Details"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

