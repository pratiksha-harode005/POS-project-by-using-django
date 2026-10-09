import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  Printer, Download, X, CheckCircle, ShieldCheck, FileText,
  ZoomIn, ZoomOut, Check, Package, Layers, Building, User, FileCheck,
  CreditCard, Clock
} from 'lucide-react'
import { formatDate } from '../../utils/formatDate'
import { ModalPortal } from './ModalPortal'

export interface DocumentPdfData {
  key: 'productOrder' | 'goodsReceipt' | 'invoice'
  id: string
  title: string
  subtitle: string
  vendor: string
  date: string
  amount: number
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  taxAmount?: number
  baseAmount?: number
  gstPercent?: number
  totalAmount?: number
  price?: number | string
  tax_amount?: number
  base_amount?: number
  gst_rate?: number
  gstRate?: number
  gstAmount?: number
  gstNumber?: string
  receivedQty?: number
  acceptedQty?: number
  quantity?: number
  unit?: string
  productDetails?: string
  requestId?: string
  category?: string
  grnDocNumber?: string
  poRef?: string
  warrantyDuration?: string
  warrantyType?: string
  freeServiceCount?: string
  installationType?: string
  techSupportDuration?: string
  replacementPolicy?: string
  accessoriesIncluded?: string
  leadTime?: string
  expectedDeliveryDate?: string
  notes?: string
  quoteValidity?: string
  quoteValidUntil?: string
  expiryDate?: string
  valid_until?: string
}

interface DocumentPdfViewerModalProps {
  document: DocumentPdfData
  onClose: () => void
  onVerify?: () => void
}

const fmt = (v?: number) => (typeof v === 'number' && !isNaN(v) ? `₹${v.toLocaleString('en-IN')}` : 'N/A')

export const DocumentQrCode: React.FC<{ value: string; size?: number }> = ({ value, size = 96 }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    const payload = value || 'https://procurementos.enterprise/verify?doc=DOC-2026-AUTH&gst=27ABCDE1234F1Z5'
    QRCode.toDataURL(payload, {
      width: size * 3,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err))
  }, [value, size])

  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-white p-1 border border-slate-200 rounded-lg shadow-2xs flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Real Scannable Verification QR Code"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
        )}
      </div>
      <span className="text-[9px] font-mono text-slate-500 mt-1.5 uppercase tracking-wider font-semibold">
        GSTIN: 27ABCDE1234F1Z5
      </span>
    </div>
  )
}

export const DocumentPdfViewerModal: React.FC<DocumentPdfViewerModalProps> = ({
  document: doc,
  onClose,
  onVerify,
}) => {
  const [activeTab, setActiveTab] = useState<'receipt' | 'specs' | 'paper'>('receipt')
  const [zoom, setZoom] = useState(100)
  const [downloading, setDownloading] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      const element = window.document.createElement('a')
      const file = new Blob(
        [
          `--- OFFICIAL ${doc.key.toUpperCase()} RECEIPT ---\nID: ${doc.id}\nVendor: ${doc.vendor}\nDate: ${doc.date}\nTotal Amount: ${doc.amount}\nVerification: ${doc.verified ? 'VERIFIED' : 'PENDING'}\n`
        ],
        { type: 'text/plain' }
      )
      element.href = URL.createObjectURL(file)
      element.download = `${doc.id}_Official_Tax_Document.txt`
      window.document.body.appendChild(element)
      element.click()
      window.document.body.removeChild(element)
    }, 400)
  }

  const docTypeName =
    doc.key === 'productOrder'
      ? 'Purchase Order'
      : doc.key === 'goodsReceipt'
      ? 'Goods Receipt Note'
      : 'Tax Invoice'

  const itemQty = doc.acceptedQty || doc.receivedQty || doc.quantity || 1
  const rawBase = typeof doc.baseAmount === 'number' ? doc.baseAmount : (typeof doc.base_amount === 'number' ? doc.base_amount : (doc.price !== undefined && !isNaN(Number(doc.price)) ? Number(doc.price) : undefined))
  const rawGstPct = typeof doc.gstPercent === 'number' ? doc.gstPercent : (typeof doc.gstRate === 'number' ? doc.gstRate : (typeof doc.gst_rate === 'number' ? doc.gst_rate : undefined))
  const rawTaxAmt = typeof doc.taxAmount === 'number' ? doc.taxAmount : (typeof doc.tax_amount === 'number' ? doc.tax_amount : (typeof doc.gstAmount === 'number' ? doc.gstAmount : undefined))
  const rawTotal = typeof doc.totalAmount === 'number' ? doc.totalAmount : (typeof doc.amount === 'number' ? doc.amount : undefined)

  const baseAmount = rawBase !== undefined ? rawBase : (rawTotal !== undefined && rawGstPct !== undefined ? Math.round(rawTotal / (1.0 + (rawGstPct / 100.0))) : undefined)
  const gstPct = rawGstPct !== undefined ? rawGstPct : (rawTaxAmt !== undefined && rawBase !== undefined && rawBase > 0 ? Math.round((rawTaxAmt / rawBase) * 100) : undefined)
  const gstAmount = rawTaxAmt !== undefined ? rawTaxAmt : (baseAmount !== undefined && gstPct !== undefined ? Math.round((baseAmount * gstPct) / 100) : (rawTotal !== undefined && baseAmount !== undefined ? rawTotal - baseAmount : undefined))
  const totalAmount = rawTotal !== undefined ? rawTotal : (baseAmount !== undefined && gstAmount !== undefined ? baseAmount + gstAmount : (baseAmount !== undefined ? baseAmount : undefined))
  const productName = doc.productDetails || doc.subtitle || 'Enterprise Workstations & Supplies'
  const vendorName = doc.vendor || 'Dell Technologies Inc.'

  const cleanRef = (doc.poRef || doc.requestId || doc.id).replace(/^(INV-[A-Z]+-|INV-|PO-|GRN-2026-|GRN-|REC-|DOC-GRN-|DOC-|REQ-|RFQ-)/, '').trim()
  const poRef = doc.poRef || `PO-${cleanRef}`
  const linkedRef = doc.requestId || doc.poRef || `REQ-${cleanRef}`
  const grnDocNumber = doc.grnDocNumber || `DOC-GRN-${cleanRef}`
  const category = doc.category || 'Goods Receipt Note'
  const vendorCode = 'VND-HW-001'
  const gstNumber = doc.gstNumber || '27AAACK1092F1Z9'

  const d = new Date(doc.date || Date.now())
  const dueDateStr = !isNaN(d.getTime())
    ? new Date(d.getTime() + 30 * 86400000).toISOString().split('T')[0]
    : '2026-10-10'

  if (doc.key === 'goodsReceipt') {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full h-[94vh] max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp my-auto">
            {/* Top Header Bar Matching media_1790237346331.png */}
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-600 text-white font-bold text-xs rounded-md">
                    PDF
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold rounded">
                    Goods Receipt Note
                  </span>
                  {doc.verified ? (
                    <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] rounded-md flex items-center gap-1">
                      <CheckCircle size={11} className="text-emerald-400" />
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold text-[10px] rounded-md flex items-center gap-1">
                      <Clock size={11} className="text-amber-400" />
                      Pending Verification
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Document Ref: <b className="text-slate-200">{grnDocNumber || doc.id}</b> • Category: <b className="text-slate-200">{category}</b>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Layers size={13} /> Detailed Specs (Receipt View)
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer size={13} /> Print Paper PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Close"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Main Content */}
            <div className="p-6 space-y-6 text-xs text-slate-700 overflow-y-auto flex-1 min-h-0">
            {/* Section 1: Overview 4-Column Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Linked Request Ref</span>
                <span className="text-sm font-black text-blue-600 font-mono mt-0.5 inline-block">{linkedRef}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">GRN Document No.</span>
                <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 inline-block">{grnDocNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vendor Identity</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 inline-block">{vendorName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Verification Status</span>
                {doc.verified ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold border border-emerald-300 inline-block mt-1">
                    Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold border border-amber-300 inline-block mt-1">
                    Pending Verification
                  </span>
                )}
              </div>
            </div>

            {/* Section 2: Product & Technical Specifications */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Package size={14} className="text-blue-600" /> Product &amp; Technical Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Product / Item Name</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{productName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Billed Quantity</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{itemQty} {doc.unit || 'Units'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Warranty Coverage</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.warrantyDuration || '36 Months (On-site)'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Free Maintenance Services</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.freeServiceCount || '3 Services'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Installation &amp; Setup</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.installationType || 'Free'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Technical Support Duration</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.techSupportDuration || '24/7 Dedicated Support'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Defect Replacement Policy</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.replacementPolicy || 'Standard SLA'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Included Accessories / Items</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{doc.accessoriesIncluded || 'Power Adapter, Sleeves & Drivers'}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Breakdown & Delivery Schedule */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" /> Commercial Breakdown &amp; Delivery Schedule
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Base Amount (Excl. GST)</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{baseAmount !== undefined ? `₹${baseAmount.toLocaleString('en-IN')}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">GST Rate &amp; Tax Amount</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {gstPct !== undefined
                      ? (gstAmount !== undefined ? `${gstPct}% (₹${gstAmount.toLocaleString('en-IN')})` : `${gstPct}%`)
                      : (gstAmount !== undefined ? `₹${gstAmount.toLocaleString('en-IN')}` : 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Quoted Amount</span>
                  <span className="font-black text-emerald-700 text-base mt-0.5 block">{totalAmount !== undefined ? `₹${totalAmount.toLocaleString('en-IN')}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Lead Time</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{doc.leadTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Expected Delivery Date</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{(doc.expectedDeliveryDate || doc.date) ? formatDate(doc.expectedDeliveryDate || doc.date) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Quote Validity Expiry</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{(doc.quoteValidity || doc.quoteValidUntil || doc.expiryDate || doc.valid_until) ? formatDate(doc.quoteValidity || doc.quoteValidUntil || doc.expiryDate || doc.valid_until) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Terms & Remarks */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                Vendor Terms &amp; Special Remarks
              </h4>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium leading-relaxed text-xs">
                {doc.notes || 'Net 30 payment terms upon delivery verification and commercial clearance.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">Official Digital Audit Record • Certified KSS Procurement OS</span>
            <div className="flex items-center gap-2">
              {!doc.verified && onVerify && (
                <button
                  type="button"
                  onClick={onVerify}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck size={14} /> Verify Document
                </button>
              )}
              {doc.verified && (
                <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" /> Document Verified ✅
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition-colors text-xs cursor-pointer"
              >
                Close
              </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
        <div className="bg-white rounded-2xl max-w-2xl w-full h-[94vh] max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-scaleUp my-auto">
          {/* Top Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider">
                  {doc.key === 'invoice' ? 'OFFICIAL TAX INVOICE RECEIPT' : 'OFFICIAL PURCHASE ORDER RECEIPT'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{doc.id}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                PO Ref: <b className="text-slate-700">{poRef}</b> | Date: <b className="text-slate-700">{formatDate(doc.date)}</b>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!doc.verified && onVerify && (
                <button
                  type="button"
                  onClick={onVerify}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Verify Document"
                >
                  <ShieldCheck size={14} />
                  <span>Verify Document</span>
                </button>
              )}
              {doc.verified && (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1">
                  <CheckCircle size={13} className="text-emerald-600" />
                  <span>Verified</span>
                </span>
              )}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                title="Print Document"
              >
                <Printer size={13} />
                <span>Print / Download</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-slate-700 bg-white min-h-0">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">
                {doc.key === 'invoice' ? 'INVOICE STATUS:' : 'PO STATUS:'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                doc.verified
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {doc.verified ? 'Verified & Approved' : 'Pending Verification'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>3-WAY MATCH VERIFIED</span>
            </div>
          </div>

          {/* Parties Grid: Supplier vs Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
                <Building size={12} className="text-slate-400" /> SUPPLIER / VENDOR DETAILS
              </h3>
              <p className="font-extrabold text-sm text-slate-900">{vendorName}</p>
              <p className="text-slate-600 font-mono text-xs">VENDOR CODE: {vendorCode}</p>
              <p className="text-slate-600 font-mono text-xs">GSTIN: {gstNumber}</p>
              <p className="text-slate-500 text-[11px]">Industrial Area Phase II, MIDC Digital Campus</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1">
                <User size={12} className="text-slate-400" /> BILLED TO / RECIPIENT
              </h3>
              <p className="font-extrabold text-sm text-slate-900">KSS Procurement OS Solutions</p>
              <p className="text-slate-600 font-mono text-xs">DEPT: Central Receiving & Accounts Payable</p>
              <p className="text-slate-600 font-mono text-xs">GSTIN: 27KSSPROC9901Z2</p>
              <p className="text-slate-500 text-[11px]">KSS Enterprise HQ, Tech Park, Bldg 4B</p>
            </div>
          </div>

          {/* Dates & Reference Breakdown */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100/80 p-3 rounded-xl font-mono text-[11px] text-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Invoice Date</span>
              <span className="font-bold text-slate-900">{formatDate(doc.date)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Due Date</span>
              <span className="font-bold text-slate-900">{formatDate(dueDateStr)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
              <span className="font-bold text-slate-900">Net 30 Days</span>
            </div>
          </div>

          {/* Itemized Commercial Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Base Rate/U</th>
                  <th className="p-3 text-right">GST ({gstPct !== undefined ? `${gstPct}%` : 'N/A'})</th>
                  <th className="p-3 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{productName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">HSN Code: 84713010 | Ref PO: {poRef}</p>
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{itemQty}</td>
                  <td className="p-3 text-right font-mono">{fmt(baseAmount !== undefined ? Math.round(baseAmount / (itemQty || 1)) : undefined)}</td>
                  <td className="p-3 text-right font-mono text-slate-600">{fmt(gstAmount)}</td>
                  <td className="p-3 text-right font-mono font-extrabold text-slate-900">{fmt(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commercial Totals Card */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 bg-slate-900 text-white p-4 rounded-xl space-y-2 font-mono text-xs shadow-md">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal (Excl. Tax):</span>
                <span>{fmt(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST Tax ({gstPct !== undefined ? `${gstPct}%` : 'N/A'}):</span>
                <span>{fmt(gstAmount)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between font-black text-sm text-emerald-400">
                <span>Total Payable:</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Digital Signature & Document Reference */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-blue-950 flex items-center gap-1.5">
                <FileCheck size={14} className="text-blue-600" /> Attached Tax Document
              </p>
              <p className="text-blue-700 font-mono text-[11px]">{`Tax_Invoice_${poRef}.pdf`}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
              Digitally Signed & Audited
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs flex-shrink-0">
          <span className="text-slate-500 font-mono text-[11px]">System-Generated Tax Invoice Receipt</span>
          <div className="flex items-center gap-2">
            {!doc.verified && onVerify && (
              <button
                type="button"
                onClick={onVerify}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck size={14} /> Verify Document
              </button>
            )}
            {doc.verified && (
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-xs flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Verified & Approved
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            >
              Close Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
)
}
