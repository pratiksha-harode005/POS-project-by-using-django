import React, { useState, useMemo } from 'react'
import {
  ArrowLeft, Plus, FileText, Upload, Calendar, ChevronDown, Check,
  AlertTriangle, RefreshCw, Box, ShieldCheck, CheckCircle2, Clock,
  Truck, ArrowLeftRight, HelpCircle, X, Send, Eye, Paperclip, CheckCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useManagerData } from '../../context/ManagerDataContext'
import { formatDate } from '../../utils/formatDate'

interface RecentComplaint {
  id: string
  product: string
  type: string
  status: 'Under Review' | 'Open' | 'Resolved' | 'In Progress' | 'Closed'
  date: string
  defectiveQty?: number
  exchangeRequested?: boolean
}


const COMMON_COMPLAINT_TYPES = [
  'Damaged Product',
  'Defective Product',
  'Wrong Product',
  'Missing Parts',
  'Quantity Mismatch',
  'Quality Issue',
  'Other',
]

const SAMPLE_PRODUCTS = [
  { name: 'Dell Latitude 5440 Laptop', sku: 'SKU-DELL-LAT54', vendor: 'Dell Technologies Enterprise' },
  { name: 'Apple MacBook Pro 14"', sku: 'SKU-APPL-MBP14', vendor: 'Apple India Enterprise' },
  { name: 'Samsung 27" 4K UHD Monitor', sku: 'SKU-SAMS-M274K', vendor: 'Samsung Display Systems' },
  { name: 'Logitech MX Master 3S Mouse', sku: 'SKU-LOGI-MXM3S', vendor: 'Logitech Peripheral Corp' },
  { name: 'Keychron Mechanical Keyboard', sku: 'SKU-KEYC-K8PRO', vendor: 'Keychron Tech' },
  { name: 'Cisco 24-Port Gigabit Switch', sku: 'SKU-CISC-SG350', vendor: 'Cisco Enterprise Networks' },
]

export const RaiseComplaintPage: React.FC = () => {
  const navigate = useNavigate()

  // Form states
  const [productName, setProductName] = useState('')
  const [productId, setProductId] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [grnNumber, setGrnNumber] = useState('')
  const [vendor, setVendor] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')

  const [complaintType, setComplaintType] = useState('Defective Product')
  const [issueDescription, setIssueDescription] = useState('')
  const [defectiveQuantity, setDefectiveQuantity] = useState('')
  const [severity, setSeverity] = useState('Medium')
  const [discoveryDate, setDiscoveryDate] = useState(new Date().toISOString().split('T')[0])

  // Defective Pieces Exchange Section States
  const [exchangeType, setExchangeType] = useState('1-to-1 Unit Swap (Direct Defective Piece Replacement)')
  const [defectClassification, setDefectClassification] = useState('DOA (Dead on Arrival) - Zero Power')
  const [exchangeUnits, setExchangeUnits] = useState('')
  const [defectiveSerials, setDefectiveSerials] = useState('')
  const [pickupMethod, setPickupMethod] = useState('Vendor Field Engineer On-site Pickup')
  const [replacementSla, setReplacementSla] = useState('Immediate Express (24–48 Hours Advance Dispatch)')
  const [reverseContact, setReverseContact] = useState('')
  const [gatePassReq, setGatePassReq] = useState(false)

  // Attachments
  const [docsChecklist, setDocsChecklist] = useState({
    invoice: false,
    grn: false,
    deliveryChallan: false,
    other: false,
  })
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  // Resolution
  const [resolutionType, setResolutionType] = useState('Defective Pieces Exchange & Immediate Replacement')

  const { complaints, addComplaint } = useManagerData()

  // Synced with shared context (visible across Manager and Finance)
  const recentComplaints = useMemo<RecentComplaint[]>(() => {
    return complaints.map((c) => ({
      id: c.id,
      product: c.productName.split(' ')[0] || 'Equipment',
      type: c.complaintType.replace(' Product', ''),
      status: (c.status === 'Submitted' ? 'Under Review' : c.status) as any,
      date: c.createdDate,
      defectiveQty: c.defectiveQuantity,
      exchangeRequested: c.resolutionRequested.includes('Exchange') || c.resolutionRequested.includes('Replacement'),
    }))
  }, [complaints])

  const [showAllComplaintsModal, setShowAllComplaintsModal] = useState(false)
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false)
  const [activeStep, setActiveStep] = useState(1) // 1 to 5
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Handle product selection to autofill SKU and Vendor
  const handleProductSelect = (name: string) => {
    setProductName(name)
    const matched = SAMPLE_PRODUCTS.find((p) => p.name === name)
    if (matched) {
      setProductId(matched.sku)
      setVendor(matched.vendor)
      setPoNumber('PO-2026-0891')
      setGrnNumber('GRN-2214')
      setSerialNumber('SN-DL-849200-SERIES')
      setDeliveryDate('2026-09-08')
    }
  }

  // Handle pill click in "Common Complaint Types"
  const handlePillClick = (type: string) => {
    setComplaintType(type)
    showToast(`Selected complaint category: "${type}"`, 'info')
  }

  // Reset form for New Complaint
  const handleNewComplaint = () => {
    setProductName('')
    setProductId('')
    setSerialNumber('')
    setPoNumber('')
    setGrnNumber('')
    setVendor('')
    setDeliveryDate('')
    setComplaintType('Defective Product')
    setIssueDescription('')
    setDefectiveQuantity('1')
    setExchangeUnits('1')
    setDefectiveSerials('')
    showToast('Complaint form cleared for new entry', 'info')
  }

  // Save Draft
  const handleSaveDraft = () => {
    showToast('Complaint draft saved securely to local cache.', 'success')
  }

  // Submit Complaint
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!productName && !productId) {
      showToast('Please select or specify a product first.', 'info')
      return
    }

    addComplaint({
      productName: productName || 'Selected Equipment',
      productId: productId || 'SKU-GEN-001',
      serialNumber: serialNumber || defectiveSerials.split(',')[0] || 'SN-UNKNOWN',
      poNumber: poNumber || 'PO-2026-0891',
      grnNumber: grnNumber || 'GRN-2214',
      vendor: vendor || 'Enterprise Vendor',
      deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      complaintType,
      defectiveQuantity: parseInt(defectiveQuantity) || 1,
      severity: (severity as any) || 'High',
      issueDescription: issueDescription || 'Defective piece reported for 1-to-1 exchange.',
      resolutionRequested: resolutionType,
      createdBy: 'Sarah Manager',
    })

    setActiveStep(2) // Move process to "Under Review"
    showToast(`Complaint submitted! Exchange order initiated with vendor and synchronized with Finance Portal.`, 'success')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Clock size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Raise Complaint</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Report defective, damaged or incorrect products and track the resolution.
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAllComplaintsModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            View All Complaints
          </button>
          <button
            type="button"
            onClick={handleNewComplaint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus size={16} /> New Complaint
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprehensive Form (7-8 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
          {/* Section 1: Product Information */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <Box size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">1. Product Information</h2>
                <p className="text-[11px] text-slate-400">Specify the PO item and vendor delivery details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productName}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="">Select product</option>
                  {SAMPLE_PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product ID / SKU */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product ID / SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter product ID"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="Enter serial number"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* PO Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PO Number
                </label>
                <input
                  type="text"
                  placeholder="Enter PO number"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* GRN Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GRN Number
                </label>
                <input
                  type="text"
                  placeholder="Enter GRN number"
                  value={grnNumber}
                  onChange={(e) => setGrnNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Vendor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  <option value="">Select vendor</option>
                  <option value="Dell Technologies Enterprise">Dell Technologies Enterprise</option>
                  <option value="Apple India Enterprise">Apple India Enterprise</option>
                  <option value="Samsung Display Systems">Samsung Display Systems</option>
                  <option value="Logitech Peripheral Corp">Logitech Peripheral Corp</option>
                  <option value="Keychron Tech">Keychron Tech</option>
                  <option value="Cisco Enterprise Networks">Cisco Enterprise Networks</option>
                </select>
              </div>

              {/* Delivery Date */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Delivery Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Complaint Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Complaint Details</h2>
                <p className="text-[11px] text-slate-400">Describe the anomaly, defect symptoms and impacted units</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Complaint Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Complaint Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="">Select complaint type</option>
                    {COMMON_COMPLAINT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Severity <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="Low">Low (Cosmetic/minor documentation)</option>
                    <option value="Medium">Medium (Partial performance issue)</option>
                    <option value="High">High (Hardware failure / non-operational)</option>
                    <option value="Critical">Critical (Immediate blocker / DOA)</option>
                  </select>
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Issue Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Defective Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Defective Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    value={defectiveQuantity}
                    onChange={(e) => {
                      setDefectiveQuantity(e.target.value)
                      setExchangeUnits(e.target.value)
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                {/* When was the issue discovered? */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    When was the issue discovered? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={discoveryDate}
                    onChange={(e) => setDiscoveryDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* USER REQUESTED SECTION: Defective Pieces Complaint Exchange & Replacement */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border-2 border-blue-200/80 p-6 shadow-xs relative overflow-hidden">
            {/* Top banner accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400" />

            <div className="flex items-start justify-between gap-4 mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <ArrowLeftRight size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      3. Defective Pieces Complaint & Exchange
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Replacement Protocol
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Arrange 1-to-1 replacement swap, defective unit pickup, and return gate-pass verification
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                <RefreshCw size={13} className="animate-spin text-blue-500" style={{ animationDuration: '8s' }} />
                <span>Active Exchange SLA</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Row 1: Exchange Action & Defect Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Exchange / Replacement Action <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={exchangeType}
                    onChange={(e) => setExchangeType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="1-to-1 Unit Swap (Direct Defective Piece Replacement)">
                      1-to-1 Unit Swap (Direct Defective Piece Replacement)
                    </option>
                    <option value="Advance Replacement (Vendor dispatches before pickup)">
                      Advance Replacement (Vendor dispatches before pickup)
                    </option>
                    <option value="Component / Sub-Assembly Exchange (Screen/Motherboard)">
                      Component / Sub-Assembly Exchange (Screen/Motherboard)
                    </option>
                    <option value="Complete Batch Return & Re-issuance">
                      Complete Batch Return & Re-issuance
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Defect Diagnostic Classification <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={defectClassification}
                    onChange={(e) => setDefectClassification(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="DOA (Dead on Arrival) - Zero Power">
                      DOA (Dead on Arrival) - Zero Power
                    </option>
                    <option value="Display / Screen Crack / Dead Pixels">
                      Display / Screen Crack / Dead Pixels
                    </option>
                    <option value="Thermal Malfunction / Frequent Shutdown">
                      Thermal Malfunction / Frequent Shutdown
                    </option>
                    <option value="Damaged Chassis / Factory Scratch / B-Grade">
                      Damaged Chassis / Factory Scratch / B-Grade
                    </option>
                    <option value="Specification Mismatch / Incorrect Model Sent">
                      Specification Mismatch / Incorrect Model Sent
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 2: Defective Pieces Quantities & Serial Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Defective Pieces to Exchange <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={exchangeUnits}
                      onChange={(e) => setExchangeUnits(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                      Units
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Defective Units Serial Numbers (Handover Verification)
                  </label>
                  <input
                    type="text"
                    value={defectiveSerials}
                    onChange={(e) => setDefectiveSerials(e.target.value)}
                    placeholder="e.g. SN-001, SN-002, SN-003"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Logistics & SLA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Reverse Pickup Handover Method
                  </label>
                  <select
                    value={pickupMethod}
                    onChange={(e) => setPickupMethod(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Vendor Field Engineer On-site Pickup">
                      Vendor Field Engineer On-site Pickup
                    </option>
                    <option value="Warehouse Reverse Courier (Bluedart/FedEx)">
                      Warehouse Reverse Courier (Bluedart/FedEx)
                    </option>
                    <option value="Company Logistics Freight Drop-off">
                      Company Logistics Freight Drop-off
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Replacement Dispatch Priority SLA
                  </label>
                  <select
                    value={replacementSla}
                    onChange={(e) => setReplacementSla(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Immediate Express (24–48 Hours Advance Dispatch)">
                      Immediate Express (24–48 Hours Advance Dispatch)
                    </option>
                    <option value="Standard Inspection (3–5 Business Days upon Pickup)">
                      Standard Inspection (3–5 Business Days upon Pickup)
                    </option>
                    <option value="Next Scheduled Bulk Cycle">
                      Next Scheduled Bulk Cycle
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 4: Reverse Logistics Contact & Gate Pass */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warehouse Reverse Logistics Contact Person
                  </label>
                  <input
                    type="text"
                    value={reverseContact}
                    onChange={(e) => setReverseContact(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-4 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={gatePassReq}
                      onChange={(e) => setGatePassReq(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Issue Return Gate Pass (GP-2026-EX)</span>
                  </label>
                </div>
              </div>

              {/* Informational SLA Guarantee callout */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <span>
                    Vendor SLA agreement guarantees zero restocking fee for validated defective hardware exchanges.
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-blue-200">
                  REF: EXCH-POL-2026
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Attach Evidence */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <Upload size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">4. Attach Evidence</h2>
                <p className="text-[11px] text-slate-400">Upload photos of defective pieces, invoice or GRN documents</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              {/* Drag & Drop File Box */}
              <div className="sm:col-span-7">
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-6 text-center bg-slate-50/50 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Drag & drop files here, or <span className="text-blue-600 hover:underline">click to upload</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports images, PDF, docs (Max 10MB each)
                  </p>
                </div>

                {/* Uploaded files chips */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uploadedFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                      >
                        <Paperclip size={12} className="text-slate-400" />
                        {f}
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-500 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Checklist */}
              <div className="sm:col-span-5 bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  Upload Documents <span className="text-slate-400 font-normal">(Optional)</span>
                </span>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsChecklist.invoice}
                      onChange={(e) => setDocsChecklist({ ...docsChecklist, invoice: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Invoice</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsChecklist.grn}
                      onChange={(e) => setDocsChecklist({ ...docsChecklist, grn: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>GRN</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsChecklist.deliveryChallan}
                      onChange={(e) => setDocsChecklist({ ...docsChecklist, deliveryChallan: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Delivery Challan</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docsChecklist.other}
                      onChange={(e) => setDocsChecklist({ ...docsChecklist, other: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Other Documents</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Resolution Requested */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <CheckCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">5. Resolution Requested</h2>
                <p className="text-[11px] text-slate-400">Choose desired outcome to route to vendor accounts team</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Resolution Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                <option value="Defective Pieces Exchange & Immediate Replacement">
                  Defective Pieces Exchange & Immediate Replacement
                </option>
                <option value="Credit Note / Full Refund">
                  Credit Note / Full Refund
                </option>
                <option value="Repair / On-site Warranty Service">
                  Repair / On-site Warranty Service
                </option>
                <option value="Partial Discount & Keep Goods">
                  Partial Discount & Keep Goods
                </option>
              </select>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors"
              >
                Save Draft
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                <Send size={15} /> Submit Complaint
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Cards (4-5 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Common Complaint Types */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-xs">
              <HelpCircle size={15} className="text-blue-600" />
              <span>Common Complaint Types</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_COMPLAINT_TYPES.map((type) => {
                const isSelected = complaintType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handlePillClick(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card 2: Recent Complaints */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <FileText size={15} className="text-blue-600" />
                <span>Recent Complaints</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllComplaintsModal(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100 text-[11px]">
                    <th className="pb-2 font-semibold">Complaint ID</th>
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {recentComplaints.slice(0, 5).map((c) => {
                    let statusColor = 'bg-slate-100 text-slate-700'
                    if (c.status === 'Under Review') statusColor = 'bg-amber-50 text-amber-700 border border-amber-200'
                    if (c.status === 'Open') statusColor = 'bg-rose-50 text-rose-700 border border-rose-200'
                    if (c.status === 'Resolved') statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    if (c.status === 'In Progress') statusColor = 'bg-blue-50 text-blue-700 border border-blue-200'

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-blue-600">{c.id}</td>
                        <td className="py-2.5 text-slate-700 font-medium">{c.product}</td>
                        <td className="py-2.5 text-slate-500">{c.type}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${statusColor}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 text-right">{formatDate(c.date)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Complaint Process Stepper */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-100 text-slate-900 font-bold text-xs">
              <Clock size={15} className="text-blue-600" />
              <span>Complaint Process</span>
            </div>

            {/* Stepper Flow */}
            <div className="relative flex items-center justify-between py-2">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />

              {[
                { name: 'Submitted', step: 1 },
                { name: 'Under Review', step: 2 },
                { name: 'Vendor Notified', step: 3 },
                { name: 'Action Taken', step: 4 },
                { name: 'Resolved', step: 5 },
              ].map((s) => {
                const isPassed = activeStep >= s.step
                return (
                  <div key={s.step} className="flex flex-col items-center relative z-10">
                    <button
                      type="button"
                      onClick={() => setActiveStep(s.step)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                        isPassed
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                      title={s.name}
                    >
                      {isPassed ? <Check size={12} strokeWidth={3} /> : s.step}
                    </button>
                    <span className="text-[9px] font-semibold text-slate-500 mt-1.5 text-center whitespace-nowrap">
                      {s.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card 4: Need to return the product? Callout */}
          <div className="bg-blue-50/70 rounded-2xl border border-blue-200/80 p-5 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <HelpCircle size={16} />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-blue-950 mb-1">Need to return the product?</h3>
                <p className="text-slate-600 leading-relaxed text-[11px] mb-2.5">
                  Once the complaint is resolved, you can initiate the return process from the action menu.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLearnMoreModal(true)}
                  className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition-colors text-[11px]"
                >
                  Learn More &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: View All Complaints */}
      {showAllComplaintsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">All Registered Complaints & Exchanges</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllComplaintsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100 text-[11px]">
                    <th className="pb-2 font-semibold">Complaint ID</th>
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold">Exchange</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-mono font-bold text-blue-600">{c.id}</td>
                      <td className="py-3 font-medium text-slate-800">{c.product}</td>
                      <td className="py-3 text-slate-600">{c.type}</td>
                      <td className="py-3">
                        {c.exchangeRequested ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-100">
                            <ArrowLeftRight size={11} /> 1-to-1 Swap
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No exchange</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-700">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-right">{formatDate(c.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllComplaintsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Learn More Return Process */}
      {showLearnMoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Defective Product Return & Exchange Policy</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLearnMoreModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>1. 1-to-1 Replacement Guarantee:</strong> All approved complaints involving defective hardware qualify for immediate replacement dispatch under enterprise SLA agreements.
              </p>
              <p>
                <strong>2. Reverse Gate Pass:</strong> Security gate passes (`RGP-2026-EX`) are automatically generated to authorize removal of defective company assets from premises.
              </p>
              <p>
                <strong>3. Courier & Reverse Tracking:</strong> The vendor field engineer or reverse courier will cross-verify serial numbers against the complaint manifest before signing off.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLearnMoreModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
