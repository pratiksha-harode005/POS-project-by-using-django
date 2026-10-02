import React, { useState, useMemo, useEffect } from 'react'
import {
  Package, Box, FileText, Eye, ShieldCheck, Clock, Check, Send,
  ArrowLeft, ChevronDown, ChevronUp, Layers, CheckCircle2,
  AlertCircle, Sparkles, Filter, Search, CheckSquare, CreditCard,
  ArrowRight, Smartphone, Banknote, X, Building2
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFinanceData, TicketProduct, isFinanceRelevantRequest } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { DocumentPdfViewerModal } from '../../components/portal/DocumentPdfViewerModal'
import { markVendorInvoiceVerified, markVendorDeliveryVerified } from '../vendor/VendorPortalPages'
import { verifyDocumentApi } from '../../api/managerApi'
import { formatDate } from '../../utils/formatDate'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

type DocType = 'productOrder' | 'goodsReceipt' | 'invoice'
export type PaymentMethodKey = 'ONLINE_BANK_TRANSFER' | 'UPI' | 'CASH' | 'CARD'

export const CASH_WARN_LIMIT = 10000
export const CASH_MAX_LIMIT = 200000

const STEPS = ['View Receipts', 'Verify Documents', 'Review Summary', 'Submit Ticket']

export const FinanceRaiseTicketPage: React.FC = () => {
  const { tickets, verifyDocument, submitTicket, submitProductTicket, makePayment, financeRequests } = useFinanceData()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Strictly filter tickets so only Finance-eligible, manager-forwarded, non-rejected requests appear
  const financeTickets = useMemo(() => {
    const list = tickets.filter(t => {
      if (!t.requestId && !t.id) return false
      const normTicketReq = (t.requestId || t.id || '').replace(/^(REQ-|PO-|TCK-|TKT-|RFQ-)/i, '').trim().toUpperCase()
      const req = financeRequests.find(r => {
        if (!r.id) return false
        if (r.id === t.requestId || r.id === t.id) return true
        const normReq = r.id.replace(/^(REQ-|PO-|TCK-|TKT-|RFQ-)/i, '').trim().toUpperCase()
        return normReq === normTicketReq
      })
      if (req) {
        return isFinanceRelevantRequest(req) && req.status !== 'rejected'
      }
      return false
    })
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.createdDate || (a as any).created_at || 0).getTime()
      const timeB = new Date(b.createdAt || b.createdDate || (b as any).created_at || 0).getTime()
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeB - timeA
      const numA = parseInt((a.requestId || a.id || '').replace(/\D/g, ''), 10) || 0
      const numB = parseInt((b.requestId || b.id || '').replace(/\D/g, ''), 10) || 0
      if (numA !== numB) return numB - numA
      return (b.id || '').localeCompare(a.id || '')
    })
  }, [tickets, financeRequests])

  const urlTicketId = searchParams.get('id')
  const [selectedTicketId, setSelectedTicketId] = useState<string>(urlTicketId || (financeTickets[0]?.id ?? ''))
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [ticketSearch, setTicketSearch] = useState('')
  const [isSelectorExpanded, setIsSelectorExpanded] = useState(true)

  const filteredTicketList = useMemo(() => {
    const q = ticketSearch.toLowerCase().trim()
    const baseList = !q ? financeTickets : financeTickets.filter(t =>
      String(t.id || '').toLowerCase().includes(q) ||
      String(t.requestId || '').toLowerCase().includes(q) ||
      String(t.requestTitle || '').toLowerCase().includes(q) ||
      String(t.department || '').toLowerCase().includes(q) ||
      (t.products && t.products.some(p =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.vendor || '').toLowerCase().includes(q)
      ))
    )
    return [...baseList].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.createdDate || (a as any).created_at || 0).getTime()
      const timeB = new Date(b.createdAt || b.createdDate || (b as any).created_at || 0).getTime()
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeB - timeA
      const numA = parseInt((a.requestId || a.id || '').replace(/\D/g, ''), 10) || 0
      const numB = parseInt((b.requestId || b.id || '').replace(/\D/g, ''), 10) || 0
      if (numA !== numB) return numB - numA
      return (b.id || '').localeCompare(a.id || '')
    })
  }, [financeTickets, ticketSearch])

  useEffect(() => {
    if (financeTickets.length > 0 && (!selectedTicketId || !financeTickets.some(t => t.id === selectedTicketId))) {
      const match = urlTicketId && financeTickets.find(t =>
        t.id === urlTicketId ||
        t.requestId === urlTicketId ||
        t.productOrder?.id === urlTicketId ||
        t.products?.some(p => p.productOrder?.id === urlTicketId)
      )
      setSelectedTicketId(match ? match.id : financeTickets[0].id)
    }
  }, [financeTickets, urlTicketId])

  const [step, setStep] = useState(0)
  const [viewModalDoc, setViewModalDoc] = useState<{
    docType: DocType
    product: TicketProduct
  } | null>(null)
  const [confirmSubmitProduct, setConfirmSubmitProduct] = useState<TicketProduct | null>(null)
  const [paymentModalProduct, setPaymentModalProduct] = useState<TicketProduct | null>(null)
  const [paymentForm, setPaymentForm] = useState<{
    method: PaymentMethodKey
    utrNumber: string
    upiId: string
    upiTxnId: string
    cashPaidTo: string
    cashReceivedBy: string
    cashVoucherNo: string
    cardLast4: string
    cardApprovalCode: string
    notes: string
  }>({
    method: 'ONLINE_BANK_TRANSFER',
    utrNumber: '',
    upiId: '',
    upiTxnId: '',
    cashPaidTo: '',
    cashReceivedBy: '',
    cashVoucherNo: '',
    cardLast4: '',
    cardApprovalCode: '',
    notes: ''
  })
  const [paymentResult, setPaymentResult] = useState<{
    utrRef: string
    referenceNumber?: string
    paymentMethod?: string
    amount: number
    date: string
    vendor: string
    reqTitle?: string
    notes?: string
    details?: any
  } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Confirm Payment Modal state
  const [confirmPaymentProduct, setConfirmPaymentProduct] = useState<TicketProduct | null>(null)
  const [payMethod, setPayMethod] = useState<'bank' | 'upi' | 'cash' | 'card'>('bank')
  const [utrRef, setUtrRef] = useState('')
  const [settlementNote, setSettlementNote] = useState('')
  const [utrError, setUtrError] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Active ticket
  const ticket = useMemo(() => {
    return financeTickets.find(t =>
      t.id === selectedTicketId ||
      t.requestId === selectedTicketId ||
      t.productOrder?.id === selectedTicketId ||
      t.products?.some(p => p.productOrder?.id === selectedTicketId)
    ) || financeTickets[0]
  }, [financeTickets, selectedTicketId])

  useEffect(() => {
    if (ticket) {
      const allSubmittedOrPaid = ticket.submitted || (ticket.products && ticket.products.length > 0 && ticket.products.every(p => p.submitted || p.paymentSettled))
      if (allSubmittedOrPaid) {
        setStep(3)
      } else if (ticket.products && ticket.products.length > 0 && ticket.products.every(p => p.goodsReceipt?.verified && p.invoice?.verified)) {
        setStep(2)
      } else if (ticket.products && ticket.products.some(p => p.goodsReceipt?.verified || p.invoice?.verified)) {
        setStep(1)
      } else {
        setStep(0)
      }
    }
  }, [ticket])

  // Filtered products within active ticket
  const filteredProducts = useMemo(() => {
    if (!ticket || !ticket.products) return []
    const q = (productSearch || '').toLowerCase().trim()
    if (!q) return ticket.products
    return ticket.products.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.vendor || '').toLowerCase().includes(q) ||
      String(p.id || '').toLowerCase().includes(q) ||
      String(p.productOrder?.id || '').toLowerCase().includes(q)
    )
  }, [ticket, productSearch])

  // Calculate overall ticket statistics
  const totalProducts = ticket?.products?.length || 0
  const verifiedProductsCount = ticket?.products?.filter(p =>
    p.goodsReceipt.verified && p.invoice.verified
  ).length || 0
  const submittedProductsCount = ticket?.products?.filter(p => p.submitted).length || 0

  // Form validation memos
  const isUtrValid = useMemo(() => {
    return /^[A-Z0-9]{12}$/i.test(paymentForm.utrNumber.trim())
  }, [paymentForm.utrNumber])

  const isUpiValid = useMemo(() => {
    if (!paymentForm.upiId.trim()) return false
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(paymentForm.upiId.trim())
  }, [paymentForm.upiId])

  const isUpiTxnValid = useMemo(() => {
    return /^\d{12}$/.test(paymentForm.upiTxnId.trim())
  }, [paymentForm.upiTxnId])

  const isCardLast4Valid = useMemo(() => {
    return /^\d{4}$/.test(paymentForm.cardLast4.trim())
  }, [paymentForm.cardLast4])

  const isCardApprovalValid = useMemo(() => {
    return /^[A-Z0-9]{3,10}$/i.test(paymentForm.cardApprovalCode.trim())
  }, [paymentForm.cardApprovalCode])

  const isPaymentFormValid = useMemo(() => {
    if (!paymentModalProduct) return false
    const amt = paymentModalProduct.totalAmount || 0

    switch (paymentForm.method) {
      case 'ONLINE_BANK_TRANSFER':
        return isUtrValid
      case 'UPI':
        return isUpiValid && isUpiTxnValid
      case 'CASH':
        if (amt >= CASH_MAX_LIMIT) return false
        return (
          paymentForm.cashPaidTo.trim().length > 0 &&
          paymentForm.cashReceivedBy.trim().length > 0 &&
          paymentForm.cashVoucherNo.trim().length > 0
        )
      case 'CARD':
        return isCardLast4Valid && isCardApprovalValid
      default:
        return false
    }
  }, [paymentModalProduct, paymentForm, isUtrValid, isUpiValid, isUpiTxnValid, isCardLast4Valid, isCardApprovalValid])

  if (!ticket) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <ShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-base font-bold text-gray-800">No Tickets Available</h2>
          <p className="text-xs text-gray-500 mt-1">No requests with matching document tickets found.</p>
        </div>
      </div>
    )
  }

  const handleToggleProduct = (productId: string) => {
    setExpandedProductId(prev => prev === productId ? null : productId)
  }

  const handleVerify = (productId: string, docType: DocType) => {
    const verifier = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'
    verifyDocument(ticket.id, productId, docType, verifier)

    // Resolve the actual backend document ID for the specific docType
    const product = ticket.products?.find(p => p.id === productId)
    let documentId: string
    if (docType === 'goodsReceipt') {
      documentId = product?.goodsReceipt?.id || ticket.goodsReceipt?.id || ''
    } else if (docType === 'invoice') {
      documentId = product?.invoice?.id || ticket.invoice?.id || ''
    } else {
      documentId = product?.productOrder?.id || ticket.productOrder?.id || ticket.requestId || ticket.id
    }

    if (documentId) {
      verifyDocumentApi(documentId, docType, verifier, productId)
        .then(() => {
          window.dispatchEvent(new Event('kss_backend_updated'))
        })
        .catch(e => console.error('API verify error:', e))
    }

    // Sync verification strictly by document type
    if (docType === 'goodsReceipt') {
      markVendorDeliveryVerified(documentId || product?.goodsReceipt?.id || ticket.goodsReceipt?.id || '', verifier)
    } else if (docType === 'invoice') {
      markVendorInvoiceVerified(documentId || product?.invoice?.id || ticket.invoice?.id || '', verifier)
    }

    const docName = docType === 'goodsReceipt' ? 'Goods Receipt' : docType === 'invoice' ? 'Invoice' : 'Document'
    showToast(`✓ ${docName} verified successfully`)
    if (step === 0) setStep(1)
  }

  const handleSubmitProduct = (product: TicketProduct) => {
    const all2Verified = product.goodsReceipt.verified && product.invoice.verified
    if (!all2Verified) {
      showToast('Both documents (Goods Receipt, Invoice) must be verified before submission.', 'error')
      return
    }
    const submitter = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Finance Officer'
    if (submitProductTicket) {
      submitProductTicket(ticket.id, product.id, submitter)
    } else {
      submitTicket(ticket.id, submitter, product.id)
    }
    setConfirmSubmitProduct(null)
    setStep(3)
    showToast(`🎉 Verified for ${product.name}! Queued for payment disbursement.`)
  }

  // Opens the Confirm Payment modal (no instant dispatch)
  const handleMakePayment = (product?: TicketProduct) => {
    setConfirmPaymentProduct(product || null)
    setPayMethod('bank')
    setUtrRef('')
    setSettlementNote('')
    setUtrError('')
    setConfirmSubmitProduct(null)
  }
  const handleOpenPaymentModal = handleMakePayment

  // Validate UTR / reference and dispatch payment
  const handleConfirmAndPay = () => {
    if (payMethod === 'bank') {
      if (!utrRef.trim() || utrRef.trim().length < 6 || utrRef.trim().length > 22) {
        setUtrError('Enter a valid 6–22 character UTR / NEFT / RTGS reference.')
        return
      }
    } else if (payMethod === 'upi') {
      if (!utrRef.trim() || utrRef.trim().length < 6) {
        setUtrError('Enter a valid UPI Transaction / Reference ID (min 6 chars).')
        return
      }
    }
    setUtrError('')
    const product = confirmPaymentProduct || undefined
    const amount = product ? product.totalAmount : ticket.requestAmount
    const vendor = product?.vendor || ticket.products?.[0]?.vendor || 'Vendor Partner'
    const methodLabel = payMethod === 'bank' ? 'NEFT / RTGS / IMPS' : payMethod === 'upi' ? 'UPI Instant Transfer' : payMethod === 'cash' ? 'Cash / Petty Cash' : 'Corporate Card'
    const res = makePayment(ticket.requestId, ticket.id, {
      amount,
      paymentMethod: methodLabel,
      productId: product?.id
    })

    setPaymentResult({
      ...res,
      utrRef: utrRef.trim() || res.utrRef,
      vendor: res.vendor || vendor,
      reqTitle: product ? `${ticket.requestTitle} — ${product.name}` : ticket.requestTitle,
      notes: settlementNote.trim() || undefined,
      amount: amount,
      date: res.date
    })
    setConfirmPaymentProduct(null)
    showToast(`💳 Payment Disbursed: ₹${amount.toLocaleString('en-IN')}! UTR: ${utrRef.trim() || res.utrRef}`, 'success')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-xs font-bold transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── SELECT REQUISITION / TICKET SELECTOR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        {/* Header & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Layers size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Select Requisition / Ticket</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {financeTickets.length} {financeTickets.length === 1 ? 'Requisition' : 'Requisitions'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Choose an eligible procurement request to verify goods receipts, tax invoices, and authorize treasury settlements
                </p>
              </div>
            </div>

            {/* Search Input & Collapse Button */}
            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Request ID, Ticket, Title..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {ticketSearch && (
                  <button
                    onClick={() => setTicketSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSelectorExpanded(!isSelectorExpanded)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title={isSelectorExpanded ? 'Collapse Selector' : 'Expand Selector'}
              >
                {isSelectorExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Requisition / Ticket Cards Grid */}
        {isSelectorExpanded && (
          <div className="p-4 sm:p-5">
            {filteredTicketList.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Search size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No requisitions match "{ticketSearch}"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try searching by Request ID, Title, or Ticket ID</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {filteredTicketList.map((t) => {
                  const isSelected = t.id === ticket.id
                  const prodCount = t.products?.length || 1
                  const isPaid = t.products?.every(p => p.paymentSettled)
                  const allVerified = t.products && t.products.length > 0 && t.products.every(p => p.goodsReceipt?.verified && p.invoice?.verified)
                  const anyVerified = t.products && t.products.some(p => p.goodsReceipt?.verified || p.invoice?.verified)

                  let statusText = 'Pending Verification'
                  let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200'
                  if (isPaid) {
                    statusText = 'Settled & Paid'
                    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  } else if (t.submitted) {
                    statusText = 'Submitted'
                    statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200'
                  } else if (allVerified) {
                    statusText = 'Ready to Submit'
                    statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200'
                  } else if (anyVerified) {
                    statusText = 'In Verification'
                    statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
                  }

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicketId(t.id)
                        setSearchParams({ id: t.id })
                        setExpandedProductId(null)
                        setStep(0)
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Top Row: Request ID & Status Badge */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              {t.requestId}
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {t.id}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                            {statusText}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors" title={t.requestTitle}>
                          {t.requestTitle}
                        </h4>
                      </div>

                      {/* Bottom Row: Product Count, Dept, Amount */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Package size={12} className="text-slate-400" />
                            {prodCount} {prodCount === 1 ? 'Product' : 'Products'}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-600">{t.department || 'IT'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{fmt(t.requestAmount)}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── EMPTY STATE OR ACTIVE TICKET WORKFLOW ── */}
      {!ticket ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Package size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Forwarded Requisitions Pending Finance Action</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Only requisitions approved and forwarded by Managers to Finance will appear here for document verification (3-way matching) and payment disbursement.
          </p>
        </div>
      ) : (
        <>
          {/* Back Link + Header + Ticket Summary Chip */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                to="/portal/finance/purchase-requests"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 mb-2 transition-colors font-medium"
              >
                <ArrowLeft size={14} /> Back to Purchase Requests
              </Link>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Raise Ticket (Document Verification)</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                  Finance Treasury Protocol
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                One request can contain multiple products. Expand any product to verify its documents (Goods Receipt, Invoice) independently.
              </p>
            </div>

        {/* Ticket ID + Amount chip */}
        <div className="flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex">
          <div className="bg-indigo-600 text-white px-3.5 py-3 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div className="px-4 py-2 text-xs">
            <div className="flex gap-6">
              <div>
                <p className="text-gray-400 font-medium text-[10px]">Ticket ID</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{ticket.id}</p>
              </div>
              <div className="border-l border-gray-200 pl-6">
                <p className="text-gray-400 font-medium text-[10px]">Request Amount</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{fmt(ticket.requestAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator (4 Steps: View Receipts, Verify Documents, Review Summary, Submit Ticket) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    i < step
                      ? 'bg-indigo-600 text-white'
                      : i === step
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    i === step
                      ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5'
                      : i < step
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    i < step ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Requisition Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {ticket.requestId}
              </span>
              <span className="text-xs text-gray-500 font-medium">Requisition Details</span>
            </div>
            <h2 className="text-base font-bold text-gray-900">{ticket.requestTitle}</h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Products</span>
              <span className="font-bold text-gray-900 text-sm">{totalProducts} Items</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Ready to Submit</span>
              <span className="font-bold text-emerald-600 text-sm">{verifiedProductsCount} / {totalProducts}</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Submitted</span>
              <span className="font-bold text-indigo-600 text-sm">{submittedProductsCount} / {totalProducts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-PRODUCT EXPANDABLE ACCORDION LIST */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table / List Header with Search */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Products in this Requisition ({totalProducts})</h2>
            <p className="text-[11px] text-gray-500">
              Click on a product or Expand to review its individual Goods Receipt and Invoice.
            </p>
          </div>

          {totalProducts > 2 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search products in this request..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Product Table Header Row */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Quantity</div>
          <div className="col-span-3">Vendor</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Product Accordion Items */}
        <div className="divide-y divide-gray-200">
          {filteredProducts.map((product) => {
            const isExpanded = expandedProductId === product.id
            const verifiedDocs = [
              product.goodsReceipt.verified,
              product.invoice.verified
            ].filter(Boolean).length

            const all2Verified = verifiedDocs === 2
            const unverifiedCount = 2 - verifiedDocs

            const productDocs = [
              {
                key: 'goodsReceipt' as DocType,
                icon: Box,
                iconColor: 'text-green-600',
                iconBg: 'bg-green-50',
                borderColor: 'border-green-200',
                title: 'Goods Receipt',
                subtitle: product.goodsReceipt.id,
                description: 'Details of received goods against the purchase order.',
                verified: product.goodsReceipt.verified,
                verifiedBy: product.goodsReceipt.verifiedBy,
                verifiedAt: product.goodsReceipt.verifiedAt,
                fields: [
                  { label: 'Received Date', value: product.goodsReceipt.receivedDate || product.productOrder?.date || new Date().toISOString().split('T')[0] },
                  { label: 'Vendor', value: product.goodsReceipt.vendor || product.vendor },
                  { label: 'Accepted / Received Qty', value: `${product.goodsReceipt.acceptedQty || product.quantity} / ${product.goodsReceipt.receivedQty || product.quantity} ${product.goodsReceipt.unit || product.unit}` },
                ],
              },
              {
                key: 'invoice' as DocType,
                icon: FileText,
                iconColor: 'text-purple-600',
                iconBg: 'bg-purple-50',
                borderColor: 'border-purple-200',
                title: 'Invoice',
                subtitle: product.invoice.id,
                description: 'Vendor invoice for the delivered goods and services.',
                verified: product.invoice.verified,
                verifiedBy: product.invoice.verifiedBy,
                verifiedAt: product.invoice.verifiedAt,
                fields: [
                  { label: 'Invoice Date', value: product.invoice.date || product.invoice.invoiceDate || product.productOrder?.date || new Date().toISOString().split('T')[0] },
                  { label: 'Vendor', value: product.invoice.vendor || product.vendor },
                  { label: 'Billed Quantity', value: `${product.quantity} ${product.unit} @ ${fmt(Math.round((product.totalAmount || 0) / (product.quantity || 1)))}/Unit` },
                  { label: 'Total Amount', value: fmt(product.invoice.amount || product.invoice.invoiceAmount || product.totalAmount) },
                ],
              },
            ]

            return (
              <div key={product.id} className="transition-all">
                {/* Product Summary Row (Product | Quantity | Vendor | Status | Action) */}
                <div
                  onClick={() => handleToggleProduct(product.id)}
                  className={`p-4 sm:px-5 sm:py-4 flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center cursor-pointer transition-colors ${
                    isExpanded
                      ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600'
                      : 'hover:bg-gray-50/80 bg-white'
                  }`}
                >
                  {/* Product Column */}
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                        {product.id}
                      </span>
                      {product.category && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-[11px] text-gray-500 font-semibold">{fmt(product.totalAmount)}</p>
                  </div>

                  {/* Quantity Column */}
                  <div className="col-span-2 text-xs">
                    <span className="sm:hidden text-gray-400 text-[10px] font-medium block">Quantity: </span>
                    <span className="font-bold text-gray-800">{product.quantity} {product.unit}</span>
                  </div>

                  {/* Vendor Column */}
                  <div className="col-span-3 text-xs truncate">
                    <span className="sm:hidden text-gray-400 text-[10px] font-medium block">Vendor: </span>
                    <span className="font-semibold text-gray-700">{product.vendor}</span>
                  </div>

                  {/* Status Column */}
                  <div className="col-span-2">
                    <span className="sm:hidden text-gray-400 text-[10px] font-medium block mb-1">Status: </span>
                    {product.submitted ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Check size={11} /> Submitted
                      </span>
                    ) : all2Verified ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckSquare size={11} /> Ready to Submit
                      </span>
                    ) : verifiedDocs > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Clock size={11} /> {verifiedDocs}/2 Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </div>

                  {/* Action Column */}
                  <div className="col-span-1 text-right flex sm:justify-end items-center gap-1 w-full sm:w-auto">
                    <button
                      type="button"
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        isExpanded
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide' : 'View'}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED ACCORDION VIEW: DISPLAY ONLY FOR THIS SELECTED PRODUCT */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-b border-gray-200 p-5 space-y-5 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <span>2 Receipts / Documents for</span>
                          <span className="text-indigo-600">{product.name}</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          GRN: <b className="text-gray-700">{product.goodsReceipt.id}</b> • Invoice: <b className="text-gray-700">{product.invoice.id}</b>
                        </p>
                      </div>

                      <div className="text-[11px] text-gray-500 font-semibold bg-white border border-gray-200 px-3 py-1 rounded-lg">
                        Product Value: <b className="text-gray-900">{fmt(product.totalAmount)}</b>
                      </div>
                    </div>

                    {/* 3 Document Cards (Product Order, Goods Receipt, Invoice) */}
                    <div className="space-y-3.5">
                      {productDocs.map(doc => {
                        const Icon = doc.icon
                        return (
                          <div
                            key={doc.key}
                            className={`border rounded-xl p-4 transition-all bg-white shadow-2xs ${
                              doc.verified ? 'border-green-300 bg-green-50/20' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-4">
                              {/* Icon + Title */}
                              <div
                                className={`w-11 h-11 rounded-xl ${doc.iconBg} border ${doc.borderColor} flex items-center justify-center flex-shrink-0`}
                              >
                                <Icon size={20} className={doc.iconColor} />
                              </div>

                              <div className="flex-1 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h5 className="text-xs font-bold text-gray-900">{doc.title}</h5>
                                </div>
                                <p className="text-[11px] text-gray-500 font-medium">{doc.subtitle}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5 max-w-sm line-clamp-1">{doc.description}</p>
                              </div>

                              {/* Document Fields */}
                              <div className="flex gap-6 text-xs flex-wrap">
                                {doc.fields.map(f => (
                                  <div key={f.label}>
                                    <p className="text-gray-400 text-[10px] font-medium">{f.label}</p>
                                    <p className="font-bold text-gray-900 mt-0.5 text-xs">{f.value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Document Actions [View] [Verify] and Status */}
                              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => setViewModalDoc({ docType: doc.key, product })}
                                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  <Eye size={13} /> View
                                </button>

                                {doc.verified ? (
                                  <span className="flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-200 font-bold text-xs px-3 py-1.5 rounded-lg">
                                    <Check size={13} /> Verified
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleVerify(product.id, doc.key)}
                                    className="flex items-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                  >
                                    <ShieldCheck size={13} /> Verify
                                  </button>
                                )}
                              </div>
                            </div>

                            {doc.verified && doc.verifiedBy && (
                              <div className="mt-2.5 pt-2.5 border-t border-green-100 text-[10px] text-green-700 flex items-center justify-between">
                                <span>✓ Verified by <b>{doc.verifiedBy}</b></span>
                                <span>{doc.verifiedAt ? new Date(doc.verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Independent Product Submission Status Bar */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${all2Verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {product.name} Verification Status
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {all2Verified
                              ? 'Both documents (Goods Receipt and Invoice) verified. You can now submit this product for treasury payment disbursement.'
                              : `Goods Receipt = ${product.goodsReceipt.verified ? 'Verified' : 'Pending'}, Invoice = ${product.invoice.verified ? 'Verified' : 'Pending'}`}
                          </p>
                        </div>
                      </div>

                      {/* Product Actions: Once both documents verified, show Make Payment */}
                      {product.submitted || product.paymentSettled ? (
                        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold">
                          <CheckCircle2 size={14} /> Payment Settled (Paid)
                        </div>
                      ) : all2Verified ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(product)}
                            className="flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-100 animate-pulse"
                          >
                            <CreditCard size={15} />
                            Make Payment ({fmt(product.totalAmount)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSubmitProduct(product)}
                            className="flex items-center gap-1.5 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                          >
                            <Send size={13} />
                            Submit Verification
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                        >
                          <CreditCard size={14} />
                          Make Payment (Verify {unverifiedCount} More Doc{unverifiedCount !== 1 ? 's' : ''})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Modal before Final Product Submission */}
      {confirmSubmitProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Authorize Treasury Disbursement</h3>
                <p className="text-xs text-gray-500">Release verified supplier payment</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Product:</span>
                <span className="font-bold text-gray-900">{confirmSubmitProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GRN Number:</span>
                <span className="font-bold text-gray-900">{confirmSubmitProduct.goodsReceipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number:</span>
                <span className="font-bold text-gray-900">{confirmSubmitProduct.invoice.id}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700 font-bold">Authorized Amount:</span>
                <span className="font-bold text-emerald-700 text-sm">{fmt(confirmSubmitProduct.totalAmount)}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mb-5">
              Goods Receipt and Invoice have passed verification. Click <b>Make Payment</b> to disburse the funds and settle the requisition immediately.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPaymentModal(confirmSubmitProduct)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard size={14} /> Make Payment
              </button>
              <button
                type="button"
                onClick={() => handleSubmitProduct(confirmSubmitProduct)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={14} /> Submit Audit
              </button>
              <button
                type="button"
                onClick={() => setConfirmSubmitProduct(null)}
                className="px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM PAYMENT MODAL ─── */}
      {confirmPaymentProduct !== null && confirmPaymentProduct && (() => {
          const cpProduct = confirmPaymentProduct
          const payable = cpProduct.totalAmount
          const invoiceNo = cpProduct.invoice?.id || '—'
          const grnRef = cpProduct.goodsReceipt?.id || '—'
          const itemName = cpProduct.name
          const vendorName = cpProduct.vendor

          const PAY_METHODS = [
            { id: 'bank' as const, label: 'Bank Tran...', sub: 'NEFT / RTGS /...', icon: <Building2 size={18} /> },
            { id: 'upi' as const, label: 'UPI', sub: 'Instant Transfer', icon: <Smartphone size={18} /> },
            { id: 'cash' as const, label: 'Cash on H...', sub: 'Petty Cash / V...', icon: <Banknote size={18} /> },
            { id: 'card' as const, label: 'Card', sub: 'Corporate Card', icon: <CreditCard size={18} /> },
          ]

          const needsRef = payMethod === 'bank' || payMethod === 'upi'
          const refLabel = payMethod === 'bank' ? 'UTR / Bank Reference Number' : 'UPI Transaction Reference'
          const refPlaceholder = payMethod === 'bank'
            ? 'e.g., UTR202610010091 (16 or 22 chars)'
            : 'e.g., UPI12345678901234'
          const refHint = payMethod === 'bank'
            ? 'Enter the 6–22 character alphanumeric reference provided by NEFT/RTGS/IMPS gateway (Max 22).'
            : 'Enter the UPI Transaction ID / Reference from your payment app.'

          const canPay = !needsRef || (utrRef.trim().length >= 6 && utrRef.trim().length <= 22)

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-scaleUp">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                      <CreditCard size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-tight">Confirm Payment</h3>
                      <p className="text-[11px] text-gray-500">Select payment method &amp; enter transaction reference</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmPaymentProduct(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 pb-6 space-y-5">
                  {/* Vendor + Amount Info Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Vendor:</span>
                        <span className="font-black text-slate-900 text-base">{vendorName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Payable Amount:</span>
                        <span className="font-black text-emerald-600 text-xl">{fmt(payable)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Item / Product:</span>
                        <span className="text-xs font-semibold text-slate-700 leading-tight">{itemName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Invoice No:</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">{invoiceNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">GRN Ref:</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">{grnRef}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Select Payment Method <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {PAY_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setPayMethod(m.id); setUtrRef(''); setUtrError('') }}
                          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 text-center transition-all ${
                            payMethod === m.id
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          <span className={payMethod === m.id ? 'text-white' : 'text-slate-500'}>{m.icon}</span>
                          <span className="text-[11px] font-bold leading-tight">{m.label}</span>
                          <span className={`text-[9px] leading-tight ${payMethod === m.id ? 'text-indigo-100' : 'text-slate-400'}`}>{m.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UTR / Reference Field */}
                  {needsRef && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          {refLabel} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">{utrRef.length}/22 Characters</span>
                      </div>
                      <input
                        type="text"
                        maxLength={22}
                        value={utrRef}
                        onChange={(e) => { setUtrRef(e.target.value.replace(/[^A-Za-z0-9]/g, '')); setUtrError('') }}
                        placeholder={refPlaceholder}
                        className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 transition-all ${
                          utrError
                            ? 'border-red-400 focus:ring-red-200 bg-red-50'
                            : 'border-slate-200 focus:ring-indigo-200 focus:border-indigo-400 bg-slate-50'
                        }`}
                      />
                      {utrError ? (
                        <p className="text-[10px] text-red-600 flex items-center gap-1">
                          <AlertCircle size={10} /> {utrError}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck size={10} className="text-slate-400" /> {refHint}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Settlement Notes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Settlement Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">{settlementNote.length}/250</span>
                    </div>
                    <textarea
                      maxLength={250}
                      rows={2}
                      value={settlementNote}
                      onChange={(e) => setSettlementNote(e.target.value)}
                      placeholder="e.g., Verified against physical invoice &amp; delivery docket"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition-all"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmPaymentProduct(null)}
                      className="px-5 py-2.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAndPay}
                      disabled={!canPay}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl shadow transition-all ${
                        canPay
                          ? 'bg-slate-800 hover:bg-slate-900 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CreditCard size={14} />
                      Confirm &amp; Pay ({fmt(payable)})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* Document View Modal with Authentic Scannable QR Code */}
      {viewModalDoc && (
        <DocumentPdfViewerModal
          document={{
            key: viewModalDoc.docType,
            id:
              viewModalDoc.docType === 'goodsReceipt'
                ? viewModalDoc.product.goodsReceipt.id
                : viewModalDoc.product.invoice.id,
            title:
              viewModalDoc.docType === 'goodsReceipt'
                ? 'Goods Receipt Note (GRN)'
                : 'Commercial Tax Invoice',
            subtitle: viewModalDoc.product.name,
            vendor: viewModalDoc.product.vendor,
            date:
              (viewModalDoc.docType === 'goodsReceipt'
                ? viewModalDoc.product.goodsReceipt.receivedDate || viewModalDoc.product.productOrder?.date
                : viewModalDoc.product.invoice.date || viewModalDoc.product.invoice.invoiceDate || viewModalDoc.product.productOrder?.date) || new Date().toISOString().split('T')[0],
            amount: viewModalDoc.product.totalAmount,
            totalAmount: viewModalDoc.product.totalAmount,
            baseAmount: (viewModalDoc.docType === 'goodsReceipt' ? viewModalDoc.product.goodsReceipt?.baseAmount : viewModalDoc.product.invoice?.baseAmount) ?? viewModalDoc.product.baseAmount,
            gstPercent: (viewModalDoc.docType === 'goodsReceipt' ? viewModalDoc.product.goodsReceipt?.gstPercent : viewModalDoc.product.invoice?.gstPercent) ?? viewModalDoc.product.gstPercent,
            taxAmount: (viewModalDoc.docType === 'goodsReceipt' ? viewModalDoc.product.goodsReceipt?.taxAmount : viewModalDoc.product.invoice?.taxAmount) ?? viewModalDoc.product.taxAmount,
            verified:
              viewModalDoc.docType === 'goodsReceipt'
                ? viewModalDoc.product.goodsReceipt.verified
                : viewModalDoc.product.invoice.verified,
            verifiedBy:
              viewModalDoc.docType === 'goodsReceipt'
                ? viewModalDoc.product.goodsReceipt.verifiedBy
                : viewModalDoc.product.invoice.verifiedBy,
            verifiedAt:
              viewModalDoc.docType === 'goodsReceipt'
                ? viewModalDoc.product.goodsReceipt.verifiedAt
                : viewModalDoc.product.invoice.verifiedAt,
            gstNumber: viewModalDoc.product.invoice.gstNumber || '27AAACK1092F1Z9',
            receivedQty: viewModalDoc.product.goodsReceipt.receivedQty || viewModalDoc.product.quantity,
            acceptedQty: viewModalDoc.product.goodsReceipt.acceptedQty || viewModalDoc.product.quantity,
            unit: viewModalDoc.product.goodsReceipt.unit || viewModalDoc.product.unit,
            productDetails: viewModalDoc.product.name,
            requestId: ticket.requestId || viewModalDoc.product.productOrder?.id || ticket.id,
            poRef: viewModalDoc.product.productOrder?.id || ticket.productOrder?.id || ticket.requestId || ticket.id,
            category: viewModalDoc.product.category || (ticket as any).category || 'IT Hardware',
            grnDocNumber: (viewModalDoc.docType === 'goodsReceipt' ? viewModalDoc.product.goodsReceipt.grnDocNumber : undefined) || (viewModalDoc.docType === 'goodsReceipt' ? (viewModalDoc.product.goodsReceipt.id.startsWith('DOC-') ? viewModalDoc.product.goodsReceipt.id : `DOC-${viewModalDoc.product.goodsReceipt.id}`) : viewModalDoc.product.invoice.id),
            warrantyDuration: viewModalDoc.product.goodsReceipt.warrantyDuration || viewModalDoc.product.warrantyDuration || '36 Months (On-site)',
            warrantyType: viewModalDoc.product.goodsReceipt.warrantyType || viewModalDoc.product.warrantyType || 'On-site',
            freeServiceCount: viewModalDoc.product.goodsReceipt.freeServiceCount || viewModalDoc.product.freeServiceCount || '3 Services',
            installationType: viewModalDoc.product.goodsReceipt.installationType || viewModalDoc.product.installationType || 'Free',
            techSupportDuration: viewModalDoc.product.goodsReceipt.techSupportDuration || viewModalDoc.product.techSupportDuration || '24/7 Dedicated Support',
            replacementPolicy: viewModalDoc.product.goodsReceipt.replacementPolicy || viewModalDoc.product.replacementPolicy || 'Standard SLA',
            accessoriesIncluded: viewModalDoc.product.goodsReceipt.accessoriesIncluded || viewModalDoc.product.accessoriesIncluded || 'Standard OEM Accessories & Documentation',
            leadTime: viewModalDoc.product.goodsReceipt.leadTime || viewModalDoc.product.leadTime || '7 Days',
            expectedDeliveryDate: viewModalDoc.product.goodsReceipt.expectedDeliveryDate || viewModalDoc.product.goodsReceipt.receivedDate || viewModalDoc.product.expectedDeliveryDate || '2026-09-10',
            notes: viewModalDoc.product.goodsReceipt.notes || viewModalDoc.product.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.',
          }}
          onClose={() => setViewModalDoc(null)}
          onVerify={() => {
            handleVerify(viewModalDoc.product.id, viewModalDoc.docType)
            const verifier = user ? `${user.first_name} ${user.last_name}` : 'Mark Finance Officer'
            const now = new Date().toISOString()
            setViewModalDoc(prev => prev ? {
              ...prev,
              product: {
                ...prev.product,
                [viewModalDoc.docType]: {
                  ...prev.product[viewModalDoc.docType],
                  verified: true,
                  verifiedBy: verifier,
                  verifiedAt: now
                }
              }
            } : null)
          }}
        />
      )}
      </>
      )}

      {/* ─── PAYMENT SUCCESSFUL POPUP CONFIRMATION MODAL ─── */}
      {paymentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-scaleUp text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Payment Successful
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Disbursement processed successfully via corporate treasury settlement.
            </p>

            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 my-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                <span className="text-gray-500 font-medium">Payment Method</span>
                <span className="font-bold text-gray-900 text-xs">
                  {paymentResult.paymentMethod || '—'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                <span className="text-gray-500 font-medium">Reference / Transaction Ref</span>
                <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {paymentResult.referenceNumber || paymentResult.utrRef || '—'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                <span className="text-gray-500 font-medium">Paid Amount</span>
                <span className="font-black text-emerald-700 text-base">
                  {fmt(paymentResult.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                <span className="text-gray-500 font-medium">Vendor Name</span>
                <span className="font-bold text-gray-900">
                  {paymentResult.vendor}
                </span>
              </div>

              {paymentResult.reqTitle && (
                <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                  <span className="text-gray-500 font-medium">Product / Requisition</span>
                  <span className="font-semibold text-gray-800 text-right line-clamp-1">
                    {paymentResult.reqTitle}
                  </span>
                </div>
              )}

              {/* Method-specific breakdown */}
              {paymentResult.details && (
                <>
                  {paymentResult.details.methodKey === 'UPI' && paymentResult.details.upiId && (
                    <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                      <span className="text-gray-500 font-medium">UPI VPA</span>
                      <span className="font-mono text-gray-700">{paymentResult.details.upiId}</span>
                    </div>
                  )}
                  {paymentResult.details.methodKey === 'CASH' && (
                    <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                      <span className="text-gray-500 font-medium">Voucher Details</span>
                      <span className="text-gray-700">
                        Voucher: {paymentResult.details.cashVoucherNo} • Handled by: {paymentResult.details.cashReceivedBy}
                      </span>
                    </div>
                  )}
                  {paymentResult.details.methodKey === 'CARD' && (
                    <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                      <span className="text-gray-500 font-medium">Card Approval</span>
                      <span className="font-mono text-gray-700">
                        Ending in {paymentResult.details.cardLast4} (Auth: {paymentResult.details.cardApprovalCode})
                      </span>
                    </div>
                  )}
                </>
              )}

              {paymentResult.notes && (
                <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                  <span className="text-gray-500 font-medium">Remarks / Notes</span>
                  <span className="text-gray-700 italic text-right line-clamp-1">{paymentResult.notes}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-gray-200/70 pb-2">
                <span className="text-gray-500 font-medium">Date & Time</span>
                <span className="font-semibold text-gray-800">
                  {paymentResult.date}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Payment Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Check size={12} /> Paid & Settled (100% Completed)
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 text-left mb-5 flex items-start gap-2">
              <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p>
                Request tracking timeline automatically updated to <b>100% Completed / Paid</b> across all portals. Full reconciliation dossier archived.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/portal/finance/history"
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Approvals Timeline</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setPaymentResult(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
