import React from 'react'
import {
  X, PlusCircle, CheckCircle, XCircle, ArrowUpRight, Calendar,
  MapPin, Building, ShieldCheck, Tag, DollarSign, Clock, Package,
  FileText, ChevronDown, Check, Info, Cpu, Layers
} from 'lucide-react'
import type { ProcurementRequest } from '../../context/ManagerDataContext'

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`

export interface RequestDetailsModalProps {
  isOpen: boolean
  request: ProcurementRequest | null
  onClose: () => void
  onApprove?: (req: ProcurementRequest) => void
  onReject?: (req: ProcurementRequest) => void
  onRecommend?: (req: ProcurementRequest) => void
  recommendLabel?: string
  isFinancePortal?: boolean
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  isOpen,
  request,
  onClose,
  onApprove,
  onReject,
  onRecommend,
  recommendLabel = 'Recommend to Higher Authority',
  isFinancePortal = false,
}) => {
  if (!isOpen || !request) return null

  // Derive subcategory
  const getSubcategory = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    if (t.includes('laptop') || t.includes('macbook')) return 'Laptops'
    if (t.includes('server')) return 'Rack Servers'
    if (t.includes('monitor') || t.includes('display')) return 'Monitors'
    if (t.includes('cloud') || t.includes('aws') || t.includes('azure')) return 'Cloud Infrastructure'
    if (t.includes('software') || t.includes('saas') || t.includes('license')) return 'Enterprise Software'
    if (t.includes('chair') || t.includes('furniture') || t.includes('desk')) return 'Office Furniture'
    if (t.includes('steel') || t.includes('raw')) return 'Raw Materials'
    return 'Office Equipment'
  }

  // Derive warranty period
  const getWarranty = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    if (t.includes('cloud') || t.includes('software') || t.includes('renewal')) return '1 Year'
    if (t.includes('macbook') || t.includes('laptop')) return '3 Years'
    if (t.includes('server')) return '5 Years'
    if (t.includes('chair') || t.includes('furniture')) return '5 Years'
    return '1 Year'
  }

  const subcategory = getSubcategory()
  const warranty = getWarranty()

  // Derive quantity from title / amount
  const quantity = request.title.toLowerCase().includes('laptop')
    ? 10
    : request.title.toLowerCase().includes('monitor')
    ? 25
    : request.title.toLowerCase().includes('chair')
    ? 50
    : 1

  // Format required by date
  const requiredByDate = request.date
    ? (() => {
        const d = new Date(request.date)
        d.setDate(d.getDate() + 20)
        return d.toISOString().split('T')[0]
      })()
    : '2026-09-30'

  const deliveryLocation = 'Pune HQ, 4th Floor'
  const preferredVendor = request.vendor || (request.category?.toLowerCase().includes('software') ? 'Amazon Web Services' : 'Dell Technologies')
  const justification = request.justification || `${request.title} is required to maintain business continuity, sprint deliverables, and departmental operational goals.`
  const description = request.description || `${request.title} required by ${request.requester} for ${request.department}. Includes enterprise delivery, compliance certifications, and SLA support.`

  // Product specifications breakdown
  const getProductDetails = () => {
    const t = (request.title + ' ' + (request.category || '')).toLowerCase()
    if (t.includes('laptop') || t.includes('macbook')) {
      return {
        modelName: 'Apple MacBook Pro 14" M3 Pro / Dell Latitude Enterprise Workstation',
        partNumber: 'SKU-HW-LPT-2026-09',
        technicalSpecs: 'Apple M3 Pro / Intel Core i9, 32GB Unified RAM, 1TB NVMe PCIe Gen4 SSD, Liquid Retina XDR Display, 70W Fast Charger.',
        unitPrice: Math.round(request.amount / quantity),
        warrantyTerms: `${warranty} Enterprise AppleCare+ / OEM Onsite Support with 24x7 priority coverage`,
        certifications: 'RoHS, EnergyStar, ISO 27001 Security Compliant',
        deliveryTimeline: '3 to 5 Business Days upon PO Issuance',
      }
    }
    if (t.includes('server')) {
      return {
        modelName: 'Dell PowerEdge R760 2U Rack Server Dual Intel Xeon',
        partNumber: 'SKU-SRV-R760-2026',
        technicalSpecs: '2x Intel Xeon Gold 6430 (64 Cores), 128GB DDR5 ECC Registered RAM, 4x 3.84TB Enterprise NVMe SSD in RAID 10, Dual 1100W Redundant Titanium PSUs.',
        unitPrice: Math.round(request.amount / quantity),
        warrantyTerms: `${warranty} OEM 24x7 Mission-Critical ProSupport with 4-Hour Onsite Response`,
        certifications: 'Tier-4 Datacenter Certified, CE, FCC, UL',
        deliveryTimeline: '7 to 10 Business Days',
      }
    }
    if (t.includes('monitor') || t.includes('display')) {
      return {
        modelName: 'Dell UltraSharp 32" 4K USB-C Hub Monitor (U3223QE)',
        partNumber: 'SKU-MON-U32-2026',
        technicalSpecs: 'IPS Black Technology, 4K UHD 3840x2160 @ 60Hz, 90W USB-C Power Delivery, Built-in KVM Switch & RJ45 Ethernet Port.',
        unitPrice: Math.round(request.amount / quantity),
        warrantyTerms: `${warranty} Advanced Exchange Service & Premium Panel Guarantee`,
        certifications: 'TCO Certified Displays 9.0, EPEAT Gold',
        deliveryTimeline: '2 to 4 Business Days',
      }
    }
    if (t.includes('software') || t.includes('saas') || t.includes('cloud')) {
      return {
        modelName: 'Enterprise SaaS Annual Multi-Seat Production License & Cloud Capacity',
        partNumber: 'SKU-SW-CORP-2026',
        technicalSpecs: 'Dedicated Tenant Deployment, SSO/SAML 2.0 Integration, 99.99% Uptime SLA, Audit Logging, Automated Daily Encrypted Backups.',
        unitPrice: Math.round(request.amount / quantity),
        warrantyTerms: `${warranty} 24x7 Premium Enterprise Technical SLA Support with Dedicated Account Manager`,
        certifications: 'SOC 2 Type II, ISO 27001, GDPR, HIPAA Certified',
        deliveryTimeline: 'Instant Digital Provisioning within 2 Hours of Finance Clearance',
      }
    }
    return {
      modelName: `${request.title} — Commercial Enterprise Specification`,
      partNumber: `SKU-COMM-${request.id}`,
      technicalSpecs: `Commercial grade deployment specifications certified for ${request.department} operational infrastructure.`,
      unitPrice: Math.round(request.amount / quantity),
      warrantyTerms: `${warranty} Comprehensive Enterprise Onsite Warranty & Support`,
      certifications: 'Standard Commercial Standards & Regulatory Clearance',
      deliveryTimeline: '5 to 7 Business Days',
    }
  }

  const product = getProductDetails()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fadeIn">
        {/* Modal Header — Matches Image 1 */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <PlusCircle className="text-blue-600 flex-shrink-0" size={28} />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">Create Purchase Request</h1>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  {request.id}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  request.status === 'pending_approval' || request.financeStatus === 'pending'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : request.status === 'approved' || request.financeStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : request.status === 'recommended_to_admin'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}>
                  {request.financeStatus
                    ? `Finance: ${request.financeStatus.toUpperCase()}`
                    : request.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Fill in request details for approval & procurement workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close Form"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body — Exact 1:1 Layout from Image 1 */}
        <div className="p-8 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {/* 1. Request Title * */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">1. Request Title *</label>
            <input
              type="text"
              readOnly
              value={request.title}
              className="w-full p-2.5 border rounded-lg bg-white border-blue-500 ring-2 ring-blue-500/20 font-bold text-gray-900 outline-none cursor-default shadow-xs"
            />
          </div>

          {/* 2 & 3. Category * & Subcategory * */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">2. Category *</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={request.category}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">3. Subcategory *</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={subcategory}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Category Detail: Warranty Period * (Image 1 Callout Box) */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1.5 shadow-2xs">
            <label className="block font-bold text-blue-900 text-xs">
              Category Detail: Warranty Period *
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={warranty}
                className="w-full p-2.5 border rounded-lg bg-white border-blue-200 font-bold text-blue-950 text-xs outline-none cursor-default"
              />
              <ChevronDown size={15} className="absolute right-3 top-3 text-blue-500" />
            </div>
          </div>

          {/* 4. Description * */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-gray-700">4. Description *</label>
              <span className="text-[10px] text-gray-400 font-mono font-medium">
                {description.length}/500
              </span>
            </div>
            <textarea
              readOnly
              rows={3}
              value={description}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none resize-none cursor-default leading-relaxed"
            />
          </div>

          {/* 5. Quantity *, Estimated Cost (USD/INR) *, 6. Required By (Date) * */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">5. Quantity *</label>
              <input
                type="text"
                readOnly
                value={quantity}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold text-gray-900 outline-none cursor-default"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Estimated Cost (INR) *
              </label>
              <input
                type="text"
                readOnly
                value={fmt(request.amount)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-bold text-gray-900 outline-none cursor-default"
              />
              <span className="text-[10px] text-gray-400 block mt-1">
                Required for physical goods.
              </span>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                6. Required By (Date) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={requiredByDate}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
                <Calendar size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 7. Department * & 8. Preferred Vendor (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">7. Department *</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={request.department}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                8. Preferred Vendor (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={preferredVendor}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 9. Delivery Location * & 10. Priority * */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">9. Delivery Location *</label>
              <input
                type="text"
                readOnly
                value={deliveryLocation}
                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none cursor-default"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">10. Priority *</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={request.priority}
                  className={`w-full p-2.5 border rounded-lg font-bold outline-none cursor-default ${
                    request.priority === 'Critical'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : request.priority === 'High'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : request.priority === 'Medium'
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                />
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 11. Reason / Business Justification * */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-gray-700">
                11. Reason / Business Justification *
              </label>
              <span className="text-[10px] text-gray-400 font-mono font-medium">
                {justification.length}/500
              </span>
            </div>
            <textarea
              readOnly
              rows={3}
              value={justification}
              className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium text-gray-800 outline-none resize-none cursor-default leading-relaxed"
            />
          </div>

          {/* ── Product Technical Details & Specifications Section ── */}
          <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Product Details & Technical Specifications
              </h3>
            </div>

            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Product Item & Model
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{product.modelName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Part / SKU Number
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {product.partNumber}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Technical Specifications & Hardware / SaaS Architecture
                </span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                  {product.technicalSpecs}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Unit Price</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{fmt(product.unitPrice)} / unit</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantity Requested</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{quantity} Units</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Total Requisition Spend</span>
                  <p className="font-black text-emerald-900 text-sm mt-0.5">{fmt(request.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  <ShieldCheck size={14} className="text-blue-600 flex-shrink-0" />
                  <span><strong>Warranty / SLA:</strong> {product.warrantyTerms}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  <span><strong>Compliance:</strong> {product.certifications}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Requester & Submission Metadata Footer Strip */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-700 font-semibold gap-2">
            <span>👤 Requester: <b className="text-slate-950">{request.requester}</b></span>
            <span>📅 Submitted Date: <b className="text-slate-950">{request.date}</b></span>
            <span>🏢 Cost Center: <b className="text-indigo-900">{request.costCenter || `CC-${request.department?.toUpperCase().slice(0, 3)}-2026`}</b></span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Save as Draft / Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(request)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <XCircle size={14} /> Reject
              </button>
            )}
            {onRecommend && (
              <button
                type="button"
                onClick={() => onRecommend(request)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <ArrowUpRight size={14} /> {recommendLabel}
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={() => onApprove(request)}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <CheckCircle size={15} /> Approve Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
