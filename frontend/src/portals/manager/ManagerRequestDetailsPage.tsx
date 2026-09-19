import React from 'react'
import { useParams } from 'react-router-dom'
import { TrackingStepper, isFlowBCategory } from '../../components/portal/TrackingStepper'
import { VendorRecommendationPanel } from '../../components/portal/VendorRecommendationPanel'
import { useProcurement } from '../../context/ProcurementContext'
import { FileText, User, Calendar, Building, IndianRupee, Tag, CheckCircle, Package, Download } from 'lucide-react'
import { getStoredDeliveryDocs } from '../vendor/VendorPortalPages'

export const ManagerRequestDetailsPage: React.FC = () => {
  const { requestId } = useParams<{ requestId?: string }>()
  const { requests, assignVendorToRequest, sendRFQToMultipleVendors } = useProcurement()

  const req = requests.find((r) => r.id === requestId) || requests[0]

  if (!req) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No purchase request found.
      </div>
    )
  }

  const formattedCost = `RS {req.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Details & Stepper Tracking</h1>
        <p className="text-xs text-gray-500">Comprehensive procurement request lifecycle & approval trail.</p>
      </div>

      {/* Horizontal Stepper (10-Stage Flow A or 7-Stage Flow B based on Category) */}
      <TrackingStepper currentStage={req.currentStage} status={req.status} category={req.category} />

      {/* Flow A Linked Delivery Documents Panel (Visible at Stage 6+ Delivery/Invoice/Payment for Flow A) */}
      {!isFlowBCategory(req.category, req.flowType) && req.currentStage >= 6 && (() => {
        const poRef = req.poRef || `PO-VNDHW001-10`
        const deliveryDocs = getStoredDeliveryDocs(req.id) || getStoredDeliveryDocs(poRef) || {
          poRef,
          challanDocName: `Delivery_Challan_${req.id}.pdf`,
          invoiceDocName: `Commercial_Invoice_${req.id}.pdf`,
          warrantyDocName: `OEM_Warranty_Card_${req.id}.pdf`,
          deliveryDate: '2026-09-20',
          status: 'Delivered & Docs Attached',
        }

        const handleDownloadDeliveryFile = (docName: string) => {
          const content = `================================================================
KSS PROCUREMENT OS - VENDOR SHIPMENT SIGN-OFF DOCUMENT
================================================================
Document Name: ${docName}
Request ID: ${req.id}
PO Reference: ${poRef}
Category: ${req.category} / ${req.subcategory}
Vendor: ${req.preferredVendor || 'Dell Technologies'}
Delivery Status: ${deliveryDocs.status}
Verification Date: ${deliveryDocs.deliveryDate || '2026-09-20'}

DESCRIPTION & VERIFICATION CLAUSES:
- Official vendor dispatch sign-off document.
- Verified physical goods delivery subject to 3-way matching.
- Included in automated Audit & Compliance log.
================================================================
Certified Procurement Document - KSS Procurement OS
================================================================
`
          const isDocx = docName.toLowerCase().endsWith('.docx')
          const mimeType = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
          const blob = new Blob([content], { type: mimeType })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = docName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }

        return (
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3 text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
              <h4 className="font-bold text-purple-950 flex items-center gap-2 text-xs">
                <Package size={16} className="text-purple-700" />
                Linked Delivery Documents (Vendor Shipment Sign-off)
              </h4>
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-300">
                Flow A Goods Sign-off ({poRef})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Delivery Challan */}
              <div className="p-3.5 bg-white rounded-xl border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">📜 Delivery Challan</span>
                  <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.challanDocName}>
                    {deliveryDocs.challanDocName}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">✓ Dispatch Proof Attached</span>
                </div>
                <button
                  onClick={() => handleDownloadDeliveryFile(deliveryDocs.challanDocName)}
                  className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                >
                  <Download size={12} /> Download Challan
                </button>
              </div>

              {/* Invoice */}
              <div className="p-3.5 bg-white rounded-xl border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">🧾 Commercial Invoice</span>
                  <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.invoiceDocName}>
                    {deliveryDocs.invoiceDocName}
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">Linked to PO Match</span>
                </div>
                <button
                  onClick={() => handleDownloadDeliveryFile(deliveryDocs.invoiceDocName)}
                  className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                >
                  <Download size={12} /> Download Invoice
                </button>
              </div>

              {/* Warranty Card */}
              <div className="p-3.5 bg-white rounded-xl border border-purple-200 flex flex-col justify-between space-y-2 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">🛡️ Warranty Certificate</span>
                  <span className="font-bold text-gray-900 truncate block mt-1" title={deliveryDocs.warrantyDocName || 'Warranty_Card.pdf'}>
                    {deliveryDocs.warrantyDocName || 'Warranty_Certificate_HW.pdf'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">OEM Hardware Warranty</span>
                </div>
                <button
                  onClick={() => handleDownloadDeliveryFile(deliveryDocs.warrantyDocName || 'Warranty_Certificate_HW.pdf')}
                  className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200 flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
                >
                  <Download size={12} /> Download Warranty
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* AI Vendor Recommendation Panel for Stage 3-5 (Vendor Selection Stage) */}
      {req.flowType === 'A' && (
        <VendorRecommendationPanel
          request={req}
          onConfirmVendor={(vId, vName, notes) => assignVendorToRequest(req.id, vId, vName, notes)}
          onSendRFQ={(rId) => sendRFQToMultipleVendors(rId)}
        />
      )}

      {/* Request Details Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {req.id}
              </span>
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full">
                Flow {req.flowType}: {req.flowType === 'A' ? 'Vendor-Paid Procurement' : 'Direct TL Fund Release'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-2">{req.title}</h2>
          </div>
          <span className="text-lg font-black text-gray-900">{formattedCost}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <span className="text-gray-500 font-semibold block">Category</span>
            <span className="font-bold text-gray-900">{req.category} / {req.subcategory}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Department</span>
            <span className="font-bold text-gray-900">{req.department}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Priority</span>
            <span className="font-bold text-red-600">{req.priority}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Required By</span>
            <span className="font-bold text-gray-900">{req.requiredBy}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-gray-800">Description</h4>
            <p className="text-gray-600 mt-0.5">{req.description}</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-800">Business Justification</h4>
            <p className="text-gray-600 mt-0.5">{req.justification}</p>
          </div>
          {req.preferredVendor && (
            <div>
              <h4 className="font-bold text-gray-800">Assigned Vendor</h4>
              <p className="text-emerald-700 font-bold mt-0.5">{req.preferredVendor}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

