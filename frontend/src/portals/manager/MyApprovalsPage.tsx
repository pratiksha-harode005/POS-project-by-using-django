import React, { useState, useEffect, useMemo } from 'react'
import { CheckCircle, XCircle, ArrowUpRight, Search, Filter } from 'lucide-react'
import { useManagerData } from '../../context/ManagerDataContext'
import { ActionModal, ModalActionType } from '../../components/portal/ActionModal'
import { RequestTypeFilter } from '../../components/portal/RequestTypeFilter'
import { isSoftwareRequest, isHardwareRequest, sortRequestsNewestFirst } from '../../utils/workflowUtils'
import type { ProcurementRequest } from '../../context/ManagerDataContext'
import { formatDate } from '../../utils/formatDate'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

const statusBadge: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  recommended_to_finance: 'bg-blue-100 text-blue-800',
}

export const MyApprovalsPage: React.FC = () => {
  const { myApprovals, refreshData, rejectRequest, recommendToFinance } = useManagerData()

  useEffect(() => {
    refreshData?.()
  }, [refreshData])

  const [search, setSearch] = useState('')
  const [requestType, setRequestType] = useState<'all' | 'software' | 'hardware'>('all')
  const [activeReq, setActiveReq] = useState<ProcurementRequest | null>(null)
  const [modalAction, setModalAction] = useState<ModalActionType | null>(null)

  const softwareCount = useMemo(() => myApprovals.filter(r => isSoftwareRequest(r)).length, [myApprovals])
  const hardwareCount = useMemo(() => myApprovals.filter(r => isHardwareRequest(r)).length, [myApprovals])

  const filtered = useMemo(() => {
    const matching = myApprovals.filter(r => {
      const matchesSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase())
      const matchesType = requestType === 'all'
        ? true
        : requestType === 'software'
        ? isSoftwareRequest(r)
        : isHardwareRequest(r)
      return matchesSearch && matchesType
    })
    return sortRequestsNewestFirst(matching)
  }, [myApprovals, search, requestType])

  const handleConfirm = (data: { action: ModalActionType; reason?: string; notes?: string }) => {
    if (!activeReq) return
    if (data.action === 'REJECT') rejectRequest(activeReq.id, data.reason || '', data.notes)
    else if (data.action === 'RECOMMEND') recommendToFinance(activeReq.id, data.reason || '')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="text-green-500" size={24} /> My Approvals
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {myApprovals.length} request{myApprovals.length !== 1 ? 's' : ''} approved by you.
        </p>
      </div>

      {/* Request Type Segmented Filter */}
      <div className="flex items-center justify-between">
        <RequestTypeFilter
          value={requestType}
          onChange={setRequestType}
          totalCount={myApprovals.length}
          softwareCount={softwareCount}
          hardwareCount={hardwareCount}
        />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search approvals…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-200" />
            <p className="font-semibold text-gray-600">No approvals found</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 font-bold uppercase tracking-wide text-[10px]">
                <th className="text-left px-4 py-3">Request ID</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Requester</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Approved Date</th>
                <th className="text-left px-4 py-3">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-600">{r.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[200px]"><div className="truncate">{r.title}</div></td>
                  <td className="px-4 py-3 text-gray-600">{r.requester}</td>
                  <td className="px-4 py-3 text-gray-600">{r.department}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmt(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {r.status === 'approved' ? '✓ Approved' : r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.approvedDate || r.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.approvalLevel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionModal isOpen={!!modalAction} actionType={modalAction} requestId={activeReq?.id || ''} requestTitle={activeReq?.title || ''} onClose={() => setModalAction(null)} onConfirm={handleConfirm} />
    </div>
  )
}
