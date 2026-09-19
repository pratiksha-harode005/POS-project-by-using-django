import React, { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useActivity, UnreadBadge } from '../../context/ActivityContext'
import { useManagerData } from '../../context/ManagerDataContext'
import {
  Truck, FileSpreadsheet, Layers, Package, FileCheck, FileText,
  CreditCard, FolderOpen, AlertCircle, CheckCircle, XCircle, Clock,
  UploadCloud, FileUp, Check, ExternalLink, Calendar, Hash, DollarSign,
  Building2, ShieldCheck, ArrowRight, Eye
} from 'lucide-react'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

// ─── VENDOR DASHBOARD ─────────────────────────────────────────────────────────

export const VendorDashboard: React.FC = () => {
  const { user } = useAuth()
  const { allRequests, purchaseOrders, payments } = useManagerData()

  const vendorId = user?.vendor_id_code || 'VND-HW-001'

  // Vendor filtered stats
  const assignedRequests = allRequests.filter(r =>
    r.status === 'assigned_to_vendor' ||
    r.status === 'vendor_accepted' ||
    r.status === 'delivered' ||
    r.vendorId === vendorId ||
    r.vendor?.toLowerCase().includes('dell')
  )

  const pendingActionCount = assignedRequests.filter(r => r.status === 'assigned_to_vendor').length
  const inDeliveryCount = assignedRequests.filter(r => r.status === 'vendor_accepted').length
  const deliveredCount = assignedRequests.filter(r => r.status === 'delivered').length
  const paidCount = assignedRequests.filter(r => r.status === 'completed' || r.paymentStatus === 'Paid').length

  const totalPaidAmount = payments
    .filter(p => p.status === 'Paid' && (p.vendor?.toLowerCase().includes('dell') || p.vendor?.toLowerCase().includes('vendor')))
    .reduce((sum, p) => sum + p.amount, 0) || 350000

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
              VENDOR PORTAL • OFFICIAL SUPPLIER DESK
            </span>
            <h1 className="text-2xl font-black mt-2">Welcome, {user?.first_name || 'Vendor Partner'}</h1>
            <p className="text-xs text-pink-100 mt-1">
              Vendor Code: <strong>{vendorId}</strong> • Dell Technologies India Enterprise
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-center border border-white/20 self-start sm:self-auto">
            <span className="text-[10px] uppercase font-bold block text-pink-100">Performance Rating</span>
            <span className="text-2xl font-black text-white">98.5%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Action Required</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingActionCount} Assigned</span>
          <p className="text-[11px] text-gray-400 mt-1">Accept or decline orders</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Delivery in Progress</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">{inDeliveryCount} Active</span>
          <p className="text-[11px] text-gray-400 mt-1">Awaiting dispatch & docs</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Delivered & In Review</span>
          <span className="text-2xl font-black text-purple-600 mt-1 block">{deliveredCount} Submitted</span>
          <p className="text-[11px] text-gray-400 mt-1">GRN & Invoice under ticket</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold block">Total Settled Payments</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{fmt(totalPaidAmount)}</span>
          <p className="text-[11px] text-gray-400 mt-1">{paidCount} Paid requisitions</p>
        </div>
      </div>

      {/* Quick Navigation to Assigned Orders */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Assigned Procurement Requests</h3>
            <p className="text-xs text-gray-500">Manage orders assigned to your company by enterprise managers</p>
          </div>
          <a
            href="/portal/vendor/purchase-orders"
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>View All Assigned Orders</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {assignedRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            No procurement orders assigned at this time.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignedRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900">{req.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'assigned_to_vendor' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'vendor_accepted' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {req.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-700 mt-1">{req.title}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-900">{fmt(req.amount)}</span>
                  <a
                    href="/portal/vendor/purchase-orders"
                    className="block text-[11px] font-semibold text-pink-600 hover:underline mt-0.5"
                  >
                    Open Details →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VENDOR PURCHASE ORDERS & ASSIGNED REQUESTS PAGE ─────────────────────────

export const VendorPurchaseOrdersPage: React.FC = () => {
  const { user } = useAuth()
  const {
    allRequests,
    purchaseOrders,
    vendorAcceptRequest,
    vendorRejectRequest,
    vendorSubmitDeliveryAndInvoice
  } = useManagerData()

  const vendorId = user?.vendor_id_code || 'VND-HW-001'

  // Modal states
  const [rejectModalReq, setRejectModalReq] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deliveryModalReq, setDeliveryModalReq] = useState<any | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Delivery form state
  const [grnNumber, setGrnNumber] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [carrier, setCarrier] = useState('BlueDart Express Express Logistics')
  const [receivedQty, setReceivedQty] = useState(5)
  const [acceptedQty, setAcceptedQty] = useState(5)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceAmount, setInvoiceAmount] = useState(350000)
  const [gstNumber, setGstNumber] = useState('GSTIN27DELLT5432D1Z9')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Combined assigned orders (either from requests or POs)
  const assignedOrders = useMemo(() => {
    const list: any[] = []

    allRequests.forEach(req => {
      const isVendorMatch =
        req.status === 'assigned_to_vendor' ||
        req.status === 'vendor_accepted' ||
        req.status === 'vendor_rejected' ||
        req.status === 'delivered' ||
        req.vendorId === vendorId ||
        req.vendor?.toLowerCase().includes('dell')

      if (isVendorMatch) {
        list.push({
          id: req.id,
          poNumber: `PO-${req.id.replace('REQ-', '')}`,
          title: req.title,
          amount: req.amount,
          status: req.status,
          date: req.assignedVendorDate || req.date,
          category: req.category,
          department: req.department,
          deliveryDetails: req.deliveryDetails,
          invoiceDetails: req.invoiceDetails,
          paymentStatus: req.paymentStatus,
          vendorAcceptedDate: req.vendorAcceptedDate,
          vendorRejectedReason: req.vendorRejectedReason,
          rawReq: req,
        })
      }
    })

    return list
  }, [allRequests, vendorId])

  // Handle Accept
  const handleAccept = (orderId: string) => {
    vendorAcceptRequest(orderId, vendorId, 'Accepted by vendor partner. Fulfillment scheduled.')
    showToast(`✓ Order ${orderId} Accepted! Request Tracking moved to Stage 6: Delivery.`, 'success')
  }

  // Handle Reject
  const handleConfirmReject = () => {
    if (!rejectModalReq) return
    const reason = rejectReason || 'Vendor capacity unavailable for requested delivery window'
    vendorRejectRequest(rejectModalReq.id, vendorId, reason)
    showToast(`Order ${rejectModalReq.id} declined. Status updated across portals.`, 'error')
    setRejectModalReq(null)
    setRejectReason('')
  }

  // Open Delivery Modal
  const handleOpenDeliveryModal = (order: any) => {
    setDeliveryModalReq(order)
    setGrnNumber(`GRN-2026-DEL-${order.id.slice(-4) || '001'}`)
    setInvoiceNumber(`INV-DELL-2026-${order.id.slice(-4) || '889'}`)
    setInvoiceAmount(order.amount || 350000)
    setReceivedQty(5)
    setAcceptedQty(5)
  }

  // Handle Submit Delivery & Documents
  const handleSubmitDeliveryAndDocuments = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryModalReq) return

    const tax = Math.round(invoiceAmount * 0.18)

    vendorSubmitDeliveryAndInvoice(
      deliveryModalReq.id,
      {
        grnNumber: grnNumber || `GRN-2026-${Date.now().toString().slice(-4)}`,
        deliveryDate,
        receivedQty: Number(receivedQty),
        acceptedQty: Number(acceptedQty),
        carrier,
        docName: 'Signed_Delivery_Challan_GRN.pdf'
      },
      {
        invoiceNumber: invoiceNumber || `INV-2026-${Date.now().toString().slice(-4)}`,
        invoiceDate,
        amount: Number(invoiceAmount),
        taxAmount: tax,
        gstNumber,
        docName: 'Official_Tax_Invoice_Signed.pdf'
      }
    )

    showToast(`🎉 Delivery completed! Goods Receipt & Invoice submitted to Raise Ticket for verification.`, 'success')
    setDeliveryModalReq(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 text-xs">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-bold transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Package className="text-pink-600" /> Assigned Purchase Orders
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Procurement requests awarded to Dell Technologies ({vendorId}). Accept/Reject or complete fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 text-pink-700 px-3.5 py-1.5 rounded-xl font-bold">
          <ShieldCheck size={16} />
          <span>Vendor Desk: VND-HW-001</span>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {assignedOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Package size={44} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No Orders Assigned Yet</h3>
            <p className="text-gray-500 mt-1">When an enterprise manager awards a quote to your company, it will appear here.</p>
          </div>
        ) : (
          assignedOrders.map((order) => {
            const isPendingAction = order.status === 'assigned_to_vendor'
            const isAccepted = order.status === 'vendor_accepted'
            const isDelivered = order.status === 'delivered'
            const isCompleted = order.status === 'completed' || order.paymentStatus === 'Paid'
            const isRejected = order.status === 'vendor_rejected'

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm ${
                  isPendingAction ? 'border-amber-300 ring-2 ring-amber-100' :
                  isAccepted ? 'border-blue-200 bg-blue-50/10' :
                  isDelivered ? 'border-purple-200' :
                  isCompleted ? 'border-emerald-200 bg-emerald-50/10' :
                  'border-gray-200 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-md border border-gray-200">
                        {order.id}
                      </span>
                      <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold border border-indigo-100">
                        {order.poNumber}
                      </span>

                      {/* Status badge */}
                      {isPendingAction && (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                          <Clock size={12} /> Awaiting Your Acceptance
                        </span>
                      )}
                      {isAccepted && (
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle size={12} /> Accepted — Delivery Stage Active
                        </span>
                      )}
                      {isDelivered && (
                        <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                          <Truck size={12} /> Delivery Submitted (GRN & Invoice in Raise Ticket)
                        </span>
                      )}
                      {isCompleted && (
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                          <ShieldCheck size={12} /> Paid & Completed
                        </span>
                      )}
                      {isRejected && (
                        <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                          <XCircle size={12} /> Declined by Vendor
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-900">{order.title}</h3>

                    <div className="flex items-center gap-4 text-gray-500 text-[11px] flex-wrap">
                      <span>Department: <b>{order.department || 'IT Operations'}</b></span>
                      <span>•</span>
                      <span>Assigned Date: <b>{order.date || '2026-09-14'}</b></span>
                      <span>•</span>
                      <span>Category: <b>{order.category || 'Hardware'}</b></span>
                    </div>

                    {isRejected && order.vendorRejectedReason && (
                      <p className="text-rose-600 text-[11px] bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <b>Decline Reason:</b> {order.vendorRejectedReason}
                      </p>
                    )}

                    {isDelivered && order.deliveryDetails && (
                      <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-xl text-[11px] text-purple-900 flex items-center gap-4 flex-wrap mt-2">
                        <span><b>GRN:</b> {order.deliveryDetails.grnNumber}</span>
                        <span>•</span>
                        <span><b>Carrier:</b> {order.deliveryDetails.carrier}</span>
                        <span>•</span>
                        <span><b>Delivered:</b> {order.deliveryDetails.deliveryDate}</span>
                        {order.invoiceDetails && (
                          <>
                            <span>•</span>
                            <span><b>Invoice:</b> {order.invoiceDetails.invoiceNumber}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-gray-400 font-semibold block uppercase">Contract Value</span>
                      <span className="text-xl font-black text-gray-900">{fmt(order.amount)}</span>
                    </div>

                    {/* Action buttons depending on state */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPendingAction && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(order.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check size={14} /> Accept Request
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalReq(order)
                              setRejectReason('')
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeliveryModal(order)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                        >
                          <Truck size={15} /> Complete Delivery & Submit Documents
                        </button>
                      )}

                      {isDelivered && (
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-50 border border-purple-200 text-purple-700 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px]">
                            <FileCheck size={14} /> Documents Under Raise Ticket Verification
                          </span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                          <CheckCircle size={15} /> Payment Settled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <XCircle size={24} />
              <h3 className="text-base font-bold text-gray-900">Decline Procurement Request</h3>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              Please provide the reason for declining order <b>{rejectModalReq.id}</b> ({rejectModalReq.title}).
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Lead time constraint, hardware SKU out of stock, delivery location outside service area..."
              className="w-full p-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY & REQUIRED DOCUMENTS SUBMISSION MODAL */}
      {deliveryModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 animate-scaleUp text-xs space-y-5">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
                  Fulfillment & Document Submission
                </span>
                <h2 className="text-lg font-black text-gray-900 mt-1">
                  Submit Goods Receipt & Tax Invoice
                </h2>
                <p className="text-gray-500 text-xs">
                  Requisition: <b>{deliveryModalReq.id}</b> — {deliveryModalReq.title}
                </p>
              </div>
              <button
                onClick={() => setDeliveryModalReq(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeliveryAndDocuments} className="space-y-5">
              {/* 1. GOODS RECEIPT / DELIVERY DETAILS */}
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Truck size={16} className="text-blue-600" />
                  <span>1. Delivery & Goods Receipt Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Goods Receipt Number (GRN #)
                    </label>
                    <input
                      type="text"
                      required
                      value={grnNumber}
                      onChange={(e) => setGrnNumber(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Actual Delivery Date
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Carrier / Logistics Partner
                    </label>
                    <input
                      type="text"
                      required
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Delivered Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={receivedQty}
                        onChange={(e) => {
                          setReceivedQty(Number(e.target.value))
                          setAcceptedQty(Number(e.target.value))
                        }}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Accepted Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={acceptedQty}
                        onChange={(e) => setAcceptedQty(Number(e.target.value))}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck size={18} className="text-blue-600" />
                    <div>
                      <span className="font-bold text-gray-800 text-[11px] block">Attached Goods Receipt Note</span>
                      <span className="text-[10px] text-gray-500">Signed_Delivery_Challan_GRN.pdf (1.2 MB)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                    Ready for Verification
                  </span>
                </div>
              </div>

              {/* 2. INVOICE / BILL DETAILS */}
              <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <FileText size={16} className="text-purple-600" />
                  <span>2. Commercial Tax Invoice Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Total Invoice Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Vendor GSTIN
                    </label>
                    <input
                      type="text"
                      required
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-purple-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-purple-600" />
                    <div>
                      <span className="font-bold text-gray-800 text-[11px] block">Attached Tax Invoice</span>
                      <span className="text-[10px] text-gray-500">Official_Tax_Invoice_Signed.pdf (840 KB)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                    Ready for Verification
                  </span>
                </div>
              </div>

              {/* Informational Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Upon submission, these documents will automatically appear under the <b>Raise Ticket</b> section in the Manager and Finance portals. The responsible manager/finance officer will open and verify both documents before payment release.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryModalReq(null)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs"
                >
                  <UploadCloud size={16} /> Submit Delivery & Documents
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VENDOR DELIVERIES PAGE ───────────────────────────────────────────────────

export const VendorDeliveriesPage: React.FC = () => {
  return <VendorPurchaseOrdersPage />
}

// ─── VENDOR RECEIPTS PAGE ─────────────────────────────────────────────────────

export const VendorReceiptsPage: React.FC = () => {
  const { receipts } = useManagerData()
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileCheck className="text-pink-600" /> Goods Receipts (GRN Registry)
        </h1>
        <p className="text-gray-500 text-xs">Delivery challans and goods receipt verification history.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">GRN Number</th>
              <th className="p-4">PO Ref</th>
              <th className="p-4">Product</th>
              <th className="p-4">Delivered Qty</th>
              <th className="p-4">Inspection</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {receipts.map((grn) => (
              <tr key={grn.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-pink-600">{grn.grnNumber}</td>
                <td className="p-4 font-mono text-gray-600">{grn.poNumber}</td>
                <td className="p-4 font-semibold text-gray-900">{grn.product}</td>
                <td className="p-4">{grn.receivedQuantity} Units</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    {grn.inspectionStatus}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    grn.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {grn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── VENDOR INVOICES PAGE ─────────────────────────────────────────────────────

export const VendorInvoicesPage: React.FC = () => {
  const { invoices } = useManagerData()
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-pink-600" /> Commercial Tax Invoices
        </h1>
        <p className="text-gray-500 text-xs">Submitted billing records and verification status.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Requisition / PO</th>
              <th className="p-4">Tax (GST)</th>
              <th className="p-4">Total Amount</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-purple-600 font-mono">{inv.invoiceNumber}</td>
                <td className="p-4 text-gray-600">{inv.invoiceDate}</td>
                <td className="p-4 font-mono text-gray-700">{inv.poNumber}</td>
                <td className="p-4 text-gray-600">{fmt(inv.taxAmount || 0)}</td>
                <td className="p-4 font-black text-gray-900">{fmt(inv.totalAmount)}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                    inv.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── VENDOR PAYMENTS PAGE ─────────────────────────────────────────────────────

export const VendorPaymentsPage: React.FC = () => {
  const { payments } = useManagerData()
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-pink-600" /> Payment Settlements & UTR Receipts
        </h1>
        <p className="text-gray-500 text-xs">Treasury disbursement tracking and transaction references.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Payment ID</th>
              <th className="p-4">Requisition Title</th>
              <th className="p-4">Settled Amount</th>
              <th className="p-4">Date Disbursed</th>
              <th className="p-4">UTR / Transaction Ref</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono font-bold text-gray-900">{p.id}</td>
                <td className="p-4 font-semibold text-gray-800">{p.requestTitle}</td>
                <td className="p-4 font-black text-emerald-700">{fmt(p.amount)}</td>
                <td className="p-4 text-gray-600">{p.paymentDate || p.dueDate}</td>
                <td className="p-4 font-mono font-bold text-indigo-700">
                  {p.transactionRef || 'UTR983210492831'}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── RFQ & QUOTATION PAGES (ISOLATED ACCESS) ──────────────────────────────────

export const VendorRFQsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'new' | 'open' | 'expired'>('open')
  const { isUnread, markAsRead } = useActivity()
  const rfqId = 'RFQ-2026-001'
  const isNew = isUnread(rfqId)

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="text-pink-600" /> Bidding RFQs (Isolated View)
        </h1>
        <p className="text-gray-500">Only RFQs where your Vendor ID (VND-HW-001) is invited are listed here.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'new', label: 'New RFQs' },
          { id: 'open', label: 'Open RFQs' },
          { id: 'expired', label: 'Expired RFQs' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-pink-600 text-pink-600 bg-pink-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-b-2xl border border-gray-200 shadow-sm space-y-4">
        <div
          onClick={() => { if (isNew) markAsRead(rfqId) }}
          className={`p-4 rounded-xl border transition-all flex justify-between items-center ${
            isNew
              ? 'bg-blue-50/20 border-l-4 border-l-blue-600 border-gray-300'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <UnreadBadge isUnread={isNew} />
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {rfqId}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mt-1">10 High Performance Developer Laptops</h3>
            <p className="text-gray-500 mt-0.5">Deadline: 2026-09-18 • Delivery: Pune HQ</p>
          </div>
          <button
            onClick={() => markAsRead(rfqId)}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg shadow cursor-pointer"
          >
            Submit Quotation Proposal
          </button>
        </div>
      </div>
    </div>
  )
}

export const VendorQuotationsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'draft' | 'submitted' | 'selected' | 'rejected'>('submitted')
  const { isUnread, markAsRead } = useActivity()
  const quoId = 'QUO-2026-001'
  const isNew = isUnread(quoId)

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="text-pink-600" /> Quotations History
        </h1>
        <p className="text-gray-500">Track status of your submitted bids.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'draft', label: 'Draft' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'selected', label: 'Selected' },
          { id: 'rejected', label: 'Rejected' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-5 py-3 font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-pink-600 text-pink-600 bg-pink-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Quotation ID</th>
              <th className="p-4">RFQ Ref</th>
              <th className="p-4">Quoted Price</th>
              <th className="p-4">Lead Time</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            <tr
              onClick={() => { if (isNew) markAsRead(quoId) }}
              className={`transition-colors cursor-pointer ${isNew ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : ''}`}
            >
              <td className="p-4 font-bold text-pink-600">
                <div className="flex items-center gap-2">
                  <UnreadBadge isUnread={isNew} />
                  <span>{quoId}</span>
                </div>
              </td>
              <td className="p-4 text-gray-600">RFQ-2026-001</td>
              <td className="p-4 font-black text-gray-900">₹3,50,000.00</td>
              <td className="p-4 text-gray-700">7 Days</td>
              <td className="p-4 font-bold text-green-600">Selected</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
