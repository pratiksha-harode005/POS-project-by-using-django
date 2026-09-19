import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, Search, Calendar, Filter, Eye,
  ArrowUpRight, Clock, CreditCard, FileText
} from 'lucide-react'
import { useFinanceData } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export const FinanceApprovedRejectedPage: React.FC = () => {
  const navigate = useNavigate()
  const { approvedFinanceRequests, rejectedFinanceRequests, financeAuditHistory } = useFinanceData()
  const [activeTab, setActiveTab] = useState<'approved' | 'rejected'>('approved')
  const [search, setSearch] = useState('')

  // Approved records matching search
  const filteredApproved = useMemo(() => {
    return approvedFinanceRequests.filter((r) => {
      return (
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.financeApprovedBy || '').toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [approvedFinanceRequests, search])

  // Rejected records matching search
  const filteredRejected = useMemo(() => {
    return rejectedFinanceRequests.filter((r) => {
      return (
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.rejectionReason || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.rejectedBy || '').toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [rejectedFinanceRequests, search])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              AUDIT ARCHIVE
            </span>
            <span className="text-xs text-slate-400 font-medium">Historical Financial Decisions</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Approved & Rejected Decisions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete audit trail of authorized expenditures and disapproved procurement requisitions with recorded reasons.
          </p>
        </div>

        <button
          onClick={() => navigate('/portal/finance/pending-approvals')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all w-fit"
        >
          View Pending Queue
        </button>
      </div>

      {/* Tabs & Search Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-4 pt-3 pb-3 sm:pb-0 gap-3 bg-slate-50/50">
          {/* Two Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('approved')
                setSearch('')
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'approved'
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-lg'
              }`}
            >
              <CheckCircle size={15} className="text-emerald-600" />
              Approved Records ({approvedFinanceRequests.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('rejected')
                setSearch('')
              }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'rejected'
                  ? 'border-rose-600 text-rose-800 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-lg'
              }`}
            >
              <XCircle size={15} className="text-rose-600" />
              Rejected Records ({rejectedFinanceRequests.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 pb-2 sm:pb-0">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder={`Search ${activeTab} records...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Tab 1: Approved Records Table */}
        {activeTab === 'approved' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Request ID</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Approved By</th>
                  <th className="p-4">Approval Date</th>
                  <th className="p-4">Finance Comment</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredApproved.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 text-xs">
                      <CheckCircle size={32} className="mx-auto mb-2 text-slate-300" />
                      No approved records found.
                    </td>
                  </tr>
                ) : (
                  filteredApproved.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-indigo-600 whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="p-4 font-bold text-slate-900 max-w-xs truncate">
                        {r.title}
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {fmt(r.amount)}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-700">
                        {r.financeApprovedBy || 'Mark Finance Officer'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {r.financeApprovedDate || r.approvedDate || '2026-09-10'}
                      </td>
                      <td className="p-4 max-w-sm text-slate-600 truncate" title={r.financeComment || 'Within departmental threshold'}>
                        {r.financeComment || 'Within Q3 Capex threshold. Approved for PO generation.'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.paymentStatus === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/portal/finance/request-details?id=${r.id}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Rejected Records Table */}
        {activeTab === 'rejected' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Request ID</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Rejected By</th>
                  <th className="p-4">Rejection Reason</th>
                  <th className="p-4">Rejected Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredRejected.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 text-xs">
                      <XCircle size={32} className="mx-auto mb-2 text-slate-300" />
                      No rejected records found.
                    </td>
                  </tr>
                ) : (
                  filteredRejected.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-rose-600 whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="p-4 font-bold text-slate-900 max-w-xs truncate">
                        {r.title}
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {fmt(r.amount)}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-700">
                        {r.rejectedBy || 'Finance Audit Team'}
                      </td>
                      <td className="p-4 max-w-sm text-rose-800 font-medium truncate" title={r.rejectionReason}>
                        {r.rejectionReason || 'Non-essential expenditure exceeding policy threshold'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {r.rejectedDate || '2026-08-30'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Rejected
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/portal/finance/request-details?id=${r.id}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
