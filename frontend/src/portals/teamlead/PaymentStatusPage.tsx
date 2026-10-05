import React, { useState, useMemo, useEffect } from 'react'
import { CreditCard, Eye, AlertTriangle, Search, Filter } from 'lucide-react'
import { useProcurement, PaymentRecord } from '../../context/ProcurementContext'
import { UnifiedReceiptModal } from '../../components/portal/UnifiedReceiptModal'

export const PaymentStatusPage: React.FC = () => {
  const { payments, isPaymentsLoading, paymentsError } = useProcurement()

  const [selectedViewReceipt, setSelectedViewReceipt] = useState<PaymentRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  // Helper to format INR currency
  const formatINR = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'Not available'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Filter receipts and sort by the actual payment/receipt date, never the due date.
  const filteredAndSortedPayments = useMemo(() => {
    // Only include software/SaaS payments, exclude hardware
    let result = payments.filter((p: any) => {
      // It's software if flowType is 'B', or category has software/saas/cloud/license/subscription, or software_name exists
      const isSoft = (
        p.flowType === 'B' ||
        (p as any).purchaseRequestDetail?.flow_type === 'B' ||
        (p as any).purchaseRequestDetail?.request_operation === 'RENEWAL' ||
        (p as any).purchaseRequestDetail?.request_operation === 'UPGRADE' ||
        (p.category || '').toLowerCase().includes('software') ||
        (p.category || '').toLowerCase().includes('saas') ||
        (p.category || '').toLowerCase().includes('cloud') ||
        (p.category || '').toLowerCase().includes('license') ||
        (p.category || '').toLowerCase().includes('subscription') ||
        Boolean(p.purchaseRequestDetail?.software_name) ||
        Boolean(p.purchaseRequestDetail?.title?.toLowerCase().includes('software')) ||
        Boolean(p.receiptDetails?.itemName?.toLowerCase().includes('software')) ||
        Boolean(p.receiptDetails?.itemName?.toLowerCase().includes('saas'))
      )
      return isSoft
    })

    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase()
      result = result.filter(p => {
        const pr = p.purchaseRequestDetail || {}
        const extra = pr.extra_fields || pr.extraFields || {}
        const pj = pr.payment_justification_detail || extra.payment_justification || {}
        const swName = String(pj.software_name || pr.software_name || p.title || '').toLowerCase()
        const reqId = String(p.requestId || pr.request_id || pr.id || '').toLowerCase()
        const pId = String(p.id || '').toLowerCase()
        const rcpId = String(extra.software_receipt_id || extra.receipt_no || p.receiptDetails?.fileName || '').toLowerCase()
        return swName.includes(q) || reqId.includes(q) || pId.includes(q) || rcpId.includes(q)
      })
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(p => (p.status || '').toUpperCase() === statusFilter.toUpperCase())
    }

    const paymentTimestamp = (payment: PaymentRecord): number => {
      const pr = payment.purchaseRequestDetail || {}
      const extra = pr.extra_fields || pr.extraFields || {}
      const pj = pr.payment_justification_detail || extra.payment_justification || {}
      const candidates = [
        payment.payment_date,
        extra.receipt_generated_at,
        pj.payment_date,
        pr.confirmed_at,
        (payment as any).created_at,
        pr.created_at,
      ]
      for (const candidate of candidates) {
        if (!candidate) continue
        const time = new Date(candidate).getTime()
        if (Number.isFinite(time)) return time
      }
      return 0
    }
    result.sort((a, b) => {
      const delta = paymentTimestamp(b) - paymentTimestamp(a)
      if (delta !== 0) return sortOrder === 'NEWEST' ? delta : -delta
      return sortOrder === 'NEWEST'
        ? String(b.id).localeCompare(String(a.id))
        : String(a.id).localeCompare(String(b.id))
    })

    return result
  }, [payments, debouncedSearchQuery, statusFilter, sortOrder])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="text-purple-600" /> Software / SaaS Payment Receipts
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            View real Software/SaaS payment receipts and digital disbursement proofs.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs">
          Total Receipts: {payments.length} Records
        </div>
      </div>

      {/* Error View */}
      {paymentsError ? (
        <div className="bg-red-50 rounded-2xl p-10 text-center border border-red-200">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-red-900 mb-1">Error Loading Payment Receipts</h3>
          <p className="text-sm text-red-700">{paymentsError}</p>
        </div>
      ) : (
        <>
          {/* Controls: Search and Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Software Name or Request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-slate-400" size={15} />
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Paid">Paid / Verified</option>
                <option value="Processing">Processing</option>
                <option value="Awaiting Receipt">Awaiting Receipt</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="receipt-sort-order" className="text-xs font-bold text-slate-500">Sort:</label>
              <select
                id="receipt-sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'NEWEST' | 'OLDEST')}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
              </select>
            </div>
          </div>

          {/* Empty State */}
          {filteredAndSortedPayments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 mt-4 shadow-2xs">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-purple-500" size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No Software/SaaS payment receipts found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are currently no real payment receipt records matching your criteria.
              </p>
            </div>
          ) : (
            /* Payment Cards Grid: One receipt = One Card */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndSortedPayments.map((p) => {
                const pr = p.purchaseRequestDetail || {}
                const extra = pr.extra_fields || pr.extraFields || {}
                const pj = pr.payment_justification_detail || extra.payment_justification || {}
                
                // Card Display Fields strictly limited to real PostgreSQL fields:
                const softwareName = pj.software_name || pr.software_name || pr.title || p.receiptDetails?.itemName || p.title || 'Software Requisition'
                const requestId = p.requestId || pr.request_id || pr.id || 'Not available'
                const paymentAmount = formatINR(p.amount > 0 ? p.amount : null)
                const paymentStatus = p.status || pr.payment_status || 'Paid'
                const paymentDate = p.payment_date?.split('T')[0] || extra.receipt_generated_at?.split('T')[0] || pj.payment_date?.split('T')[0] || pr.confirmed_at?.split('T')[0] || (p as any).created_at?.split('T')[0] || pr.created_at?.split('T')[0] || 'Not available'

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-purple-300"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-md border border-purple-200/80 font-mono">
                          {requestId}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          paymentStatus === 'Paid' || paymentStatus === 'Verified' || paymentStatus === 'SUCCESS' || paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {paymentStatus}
                        </span>
                      </div>

                      {/* Software / SaaS Name */}
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-950 transition-colors line-clamp-1 mb-3">
                        {softwareName}
                      </h3>

                      {/* Key Details */}
                      <div className="space-y-2 text-xs py-2 border-t border-b border-slate-100 my-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Payment Amount:</span>
                          <span className="font-extrabold text-slate-900 text-sm text-emerald-700">{paymentAmount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Payment Date:</span>
                          <span className="font-bold text-slate-700">{paymentDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* View Receipt Action Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => setSelectedViewReceipt(p)}
                        className="w-full py-2.5 px-4 bg-[#11052C] hover:bg-[#2B0E4E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye size={15} /> View Receipt
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* View Receipt Modal displaying all 5 detailed receipt sections */}
      {selectedViewReceipt && (
        <UnifiedReceiptModal
          payment={selectedViewReceipt}
          onClose={() => setSelectedViewReceipt(null)}
          onDownload={() => window.print()}
        />
      )}
    </div>
  )
}
