import React, { useState, useMemo } from 'react'
import {
  Package, Box, FileText, Eye, ShieldCheck, Clock, Check, Send,
  ArrowLeft, ChevronDown, ChevronUp, Layers, CheckCircle2,
  AlertCircle, Sparkles, Filter, Search, CheckSquare, CreditCard,
  ArrowRight
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFinanceData, TicketProduct } from '../../context/ManagerDataContext'
import { useAuth } from '../../context/AuthContext'
import { DocumentPdfViewerModal } from '../../components/portal/DocumentPdfViewerModal'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

type DocType = 'productOrder' | 'goodsReceipt' | 'invoice'

const STEPS = ['View Receipts', 'Verify Documents', 'Review Summary', 'Submit Ticket']

export const FinanceRaiseTicketPage: React.FC = () => {
  const { tickets, verifyDocument, submitTicket, submitProductTicket, makePayment, allRequests } = useFinanceData()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlTicketId = searchParams.get('id')
  const [selectedTicketId, setSelectedTicketId] = useState<string>(urlTicketId || (tickets[0]?.id ?? ''))
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')

  const [step, setStep] = useState(0)
  const [viewModalDoc, setViewModalDoc] = useState<{
    docType: DocType
    product: TicketProduct
  } | null>(null)
  const [confirmSubmitProduct, setConfirmSubmitProduct] = useState<TicketProduct | null>(null)
  const [paymentResult, setPaymentResult] = useState<{ utrRef: string; amount: number; date: string; vendor: string; reqTitle?: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Active ticket
  const ticket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || tickets[0]
  }, [tickets, selectedTicketId])

  // Filtered products within active ticket
  const filteredProducts = useMemo(() => {
    if (!ticket || !ticket.products) return []
    return ticket.products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.vendor.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.productOrder.id.toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [ticket, productSearch])

  // Calculate overall ticket statistics
  const totalProducts = ticket?.products?.length || 0
  const verifiedProductsCount = ticket?.products?.filter(p =>
    p.goodsReceipt.verified && p.invoice.verified
  ).length || 0
  const submittedProductsCount = ticket?.products?.filter(p => p.submitted).length || 0

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
    const verifier = user ? `${user.first_name} ${user.last_name}` : 'Mark Finance Officer'
    verifyDocument(ticket.id, productId, docType, verifier)
    showToast(`✓ Document verified successfully in database`)
    if (step === 0) setStep(1)
  }

  const handleSubmitProduct = (product: TicketProduct) => {
    const all2Verified = product.goodsReceipt.verified && product.invoice.verified
    if (!all2Verified) {
      showToast('Both documents (Goods Receipt, Invoice) must be verified before submission.', 'error')
      return
    }
    const submitter = user ? `${user.first_name} ${user.last_name}` : 'Mark Finance Officer'
    if (submitProductTicket) {
      submitProductTicket(ticket.id, product.id, submitter)
    } else {
      submitTicket(ticket.id, submitter, product.id)
    }
    setConfirmSubmitProduct(null)
    setStep(3)
    showToast(`🎉 Verified for ${product.name}! Queued for payment disbursement.`)
  }

  const handleMakePayment = (product?: TicketProduct) => {
    const amount = product ? product.totalAmount : ticket.requestAmount
    const vendor = product?.vendor || ticket.products?.[0]?.vendor || 'Dell Technologies India'
    const res = makePayment(ticket.requestId, ticket.id, {
      amount,
      paymentMethod: 'NEFT / RTGS Corporate Treasury',
      productId: product?.id
    })
    setPaymentResult({
      ...res,
      vendor: res.vendor || vendor,
      reqTitle: product ? `${ticket.requestTitle} — ${product.name}` : ticket.requestTitle
    })
    setConfirmSubmitProduct(null)
    showToast(`💳 Payment Disbursed: ₹${amount.toLocaleString('en-IN')}! UTR: ${res.utrRef}`, 'success')
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

      {/* TICKET / TEST SCENARIO SELECTOR (1 Product, 3 Products, 10+ Products) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Layers size={16} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Select Requisition / Ticket</h3>
              <p className="text-[11px] text-gray-500">Test multi-product requests (1 product, 3 products, or 10+ products)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {tickets.map((t) => {
              const prodCount = t.products?.length || 1
              const isSelected = t.id === ticket.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicketId(t.id)
                    setSearchParams({ id: t.id })
                    setExpandedProductId(null)
                    setStep(0)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>{t.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {prodCount} {prodCount === 1 ? 'Product' : 'Products'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

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
                  { label: 'Received Date', value: product.goodsReceipt.receivedDate || product.productOrder?.date || '2026-09-12' },
                  { label: 'Vendor', value: product.goodsReceipt.vendor || product.vendor },
                  { label: 'Total Quantity', value: `${product.goodsReceipt.acceptedQty || product.quantity} ${product.goodsReceipt.unit || product.unit}` },
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
                  { label: 'Invoice Date', value: product.invoice.date || product.invoice.invoiceDate || product.productOrder?.date || '2026-09-10' },
                  { label: 'Vendor', value: product.invoice.vendor || product.vendor },
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
                                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
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
                                    className="flex items-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    <ShieldCheck size={13} /> Verify
                                  </button>
                                )}

                                {doc.verified ? (
                                  <span className="flex items-center gap-1 text-green-600 bg-green-50 border border-green-100 font-bold text-[10px] px-2.5 py-1.5 rounded-lg">
                                    <Check size={11} /> Verified
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-gray-400 bg-gray-50 border border-gray-200 font-semibold text-[10px] px-2.5 py-1.5 rounded-lg">
                                    <Clock size={11} /> Pending
                                  </span>
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
                            onClick={() => handleMakePayment(product)}
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
                onClick={() => handleMakePayment(confirmSubmitProduct)}
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
                className="px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                : viewModalDoc.product.invoice.date || viewModalDoc.product.invoice.invoiceDate || viewModalDoc.product.productOrder?.date) || '2026-09-10',
            amount: viewModalDoc.product.totalAmount,
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
            taxAmount: viewModalDoc.product.invoice.taxAmount,
            gstNumber: viewModalDoc.product.invoice.gstNumber,
            receivedQty: viewModalDoc.product.goodsReceipt.receivedQty || viewModalDoc.product.quantity,
            acceptedQty: viewModalDoc.product.goodsReceipt.acceptedQty || viewModalDoc.product.quantity,
            unit: viewModalDoc.product.goodsReceipt.unit || viewModalDoc.product.unit,
            productDetails: viewModalDoc.product.name,
          }}
          onClose={() => setViewModalDoc(null)}
          onVerify={() => {
            handleVerify(viewModalDoc.product.id, viewModalDoc.docType)
            setViewModalDoc(null)
          }}
        />
      )}

      {/* ─── PAYMENT SUCCESSFUL POPUP CONFIRMATION MODAL ─── */}
      {paymentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleUp text-center">
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
                <span className="text-gray-500 font-medium">Transaction ID / UTR</span>
                <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {paymentResult.utrRef}
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
                to="/portal/finance/approvals"
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Approvals Timeline</span>
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setPaymentResult(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-xl text-xs transition-all"
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
