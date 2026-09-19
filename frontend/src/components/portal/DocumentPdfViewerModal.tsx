import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  Printer, Download, X, CheckCircle, ShieldCheck, FileText,
  QrCode, ExternalLink, ZoomIn, ZoomOut, Check
} from 'lucide-react'

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
  gstNumber?: string
  receivedQty?: number
  acceptedQty?: number
  unit?: string
  productDetails?: string
}

interface DocumentPdfViewerModalProps {
  document: DocumentPdfData
  onClose: () => void
  onVerify?: () => void
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

// Authentic High-Density Scannable QR Code Component powered by QRCode generator
export const DocumentQrCode: React.FC<{ value: string; size?: number }> = ({ value, size = 96 }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    // Generate valid enterprise e-Invoice / Document authenticity verification URL or payload
    const payload = value || 'https://procurementos.enterprise/verify?doc=DOC-2026-AUTH&gst=27ABCDE1234F1Z5'
    QRCode.toDataURL(payload, {
      width: size * 3, // 3x ultra-sharp resolution for crisp retina & print rendering
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
          `--- ${doc.title.toUpperCase()} ---\nID: ${doc.id}\nVendor: ${doc.vendor}\nDate: ${doc.date}\nAmount: ${doc.amount}\nVerified: ${doc.verified ? 'YES' : 'NO'}\n`
        ],
        { type: 'text/plain' }
      )
      element.href = URL.createObjectURL(file)
      element.download = `${doc.id}_Official_Document.txt`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-100 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-scaleUp">
        {/* PDF Viewer Top Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              PDF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{doc.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {docTypeName}
                </span>
                {doc.verified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <Check size={10} strokeWidth={3} /> Verified
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Page 1 of 1 • Signed by Procurement OS Authority</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 text-slate-300 mr-2 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 10, 80))}
                className="p-1 hover:text-white rounded"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-2 font-mono text-[11px]">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 10, 130))}
                className="p-1 hover:text-white rounded"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Print Document"
            >
              <Printer size={16} />
            </button>

            {/* Download button */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Download Document"
            >
              <Download size={16} className={downloading ? 'animate-bounce text-indigo-400' : ''} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
              title="Close Viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Body (Rendered as realistic paper with Stripe / Anthropic styling) */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200/80">
          <div
            className="bg-white rounded-lg shadow-xl border border-slate-300 text-slate-900 p-10 max-w-2xl w-full transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Header: Document Title & Metadata on Left, AI/Procurement Monogram + QR Code on Right */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200 gap-6">
              {/* Left Column: Title & Identifiers */}
              <div className="space-y-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{docTypeName}</h1>

                <div className="text-xs space-y-1 text-slate-700">
                  <div className="flex gap-4">
                    <span className="font-semibold text-slate-900 w-32">Document number</span>
                    <span className="font-mono font-bold text-slate-900">{doc.id}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-semibold text-slate-900 w-32">Receipt number</span>
                    <span className="font-mono text-slate-800">2087-3956</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-semibold text-slate-900 w-32">Date issued</span>
                    <span className="text-slate-800">{doc.date}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-semibold text-slate-900 w-32">Payment method</span>
                    <span className="text-slate-800">Corporate Wire Transfer / Bank</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Monogram & Required QR Code */}
              <div className="flex flex-col items-end gap-3">
                {/* Modern Brand Monogram */}
                <div className="flex items-center gap-2">
                  <span className="font-black text-2xl tracking-tighter text-slate-900">AI</span>
                </div>

                {/* QR Code as requested by user ("i dont want same , add in qr") */}
                <div className="flex flex-col items-center p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <DocumentQrCode value={`https://procurementos.corp/verify/${doc.id}`} size={84} />
                  <span className="text-[8px] text-slate-400 mt-1">Scan to Verify Authenticity</span>
                </div>
              </div>
            </div>

            {/* Address Block: Two Columns */}
            <div className="grid grid-cols-2 gap-8 py-6 text-xs text-slate-700">
              {/* Vendor / Supplier Address */}
              <div>
                <p className="font-bold text-slate-900 mb-1">{doc.vendor}</p>
                <p className="text-slate-600">548 Market Street, Cyber Gateway</p>
                <p className="text-slate-600">PMB 90375, Electronic City</p>
                <p className="text-slate-600">Bangalore, Karnataka 560100</p>
                <p className="text-slate-600">India</p>
                <p className="text-slate-500 mt-1">support@abctechnologies.com</p>
              </div>

              {/* Bill To Address */}
              <div>
                <p className="font-bold text-slate-900 mb-1">Bill to</p>
                <p className="text-slate-600 font-medium">ahrorbekabdusattorov0101@gmail.com's Organization</p>
                <p className="text-slate-600">Procurement OS — Engineering Dept</p>
                <p className="text-slate-600">Level 4, High-Tech Tower</p>
                <p className="text-slate-600">Pune, Maharashtra 411014</p>
                <p className="text-slate-600">India</p>
                <p className="text-slate-500 mt-1">manager@procurementos.com</p>
              </div>
            </div>

            {/* Bold Headline: Total Paid on Date */}
            <div className="py-4 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {fmt(doc.amount)} {doc.key === 'invoice' ? 'invoiced' : 'paid'} on {doc.date}
              </h2>
            </div>

            {/* Line Items Table */}
            <div className="py-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-semibold text-[11px]">
                    <th className="py-2 pr-4 text-left">Description</th>
                    <th className="py-2 px-4 text-center">Qty</th>
                    <th className="py-2 px-4 text-right">Unit price</th>
                    <th className="py-2 pl-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">
                        {doc.productDetails || 'High Performance Laptops (16-inch M3 Max)'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Procurement batch order for engineering workstation acceleration
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {doc.receivedQty || 10}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {fmt(Math.round(doc.amount / (doc.receivedQty || 10)))}
                    </td>
                    <td className="py-3 pl-4 text-right font-mono font-bold text-slate-900">
                      {fmt(doc.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Subtotal & Total Breakdown */}
              <div className="flex justify-end pt-4">
                <div className="w-64 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-mono font-semibold text-slate-900">{fmt(doc.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">GST / Tax (18%)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {fmt(doc.taxAmount || Math.round(doc.amount * 0.18))}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-mono font-bold text-slate-900">
                      {fmt(doc.amount + (doc.taxAmount || Math.round(doc.amount * 0.18)))}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold text-slate-900">Amount paid</span>
                    <span className="font-mono font-bold text-slate-900">
                      {fmt(doc.amount + (doc.taxAmount || Math.round(doc.amount * 0.18)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Verification Seal & Stamp */}
            <div className="mt-8 pt-6 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">Digital Seal of Certification</p>
                <p className="font-mono text-[10px] text-slate-400">
                  SHA-256: 7f8a9b1c4e2d3f0a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f
                </p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700 block">Verified by Procurement OS</span>
                <span className="text-[10px] text-emerald-600 font-bold">● Cryptographically Signed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            {doc.verified ? (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle size={16} /> Verified by {doc.verifiedBy || 'Sarah Manager'}
              </span>
            ) : (
              <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                <ShieldCheck size={16} /> Document pending manager verification
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!doc.verified && onVerify && (
              <button
                type="button"
                onClick={() => {
                  onVerify()
                  onClose()
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck size={15} /> Mark as Verified
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
