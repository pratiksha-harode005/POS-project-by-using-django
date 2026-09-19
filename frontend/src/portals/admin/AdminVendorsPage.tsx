import React, { useState, useEffect } from 'react'
import { PlusCircle, Truck, ShieldCheck, Award, FileText, AlertTriangle, FolderOpen, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { MASTER_VENDORS } from '../vendor/VendorPortalPages'
import {
  getScopedVendorData,
  getDocStatusOverrides,
  setDocStatusOverride,
} from '../vendor/VendorPortalPages'
import { isFlowBCategory } from '../../components/portal/TrackingStepper'

// ─── Helper: compute effective doc status (Admin override wins) ───────────────
function resolveDocStatus(doc: any, overrides: Record<string, string>): string {
  return overrides[doc.id] ?? doc.status
}

// ─── Admin Vendor Documents Tab ───────────────────────────────────────────────
const AdminVendorDocsTab: React.FC = () => {
  const [selectedVendorId, setSelectedVendorId] = useState(MASTER_VENDORS[0].id)
  const [docs, setDocs] = useState<any[]>([])
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [toastMsg, setToastMsg] = useState('')

  // Load docs + overrides whenever selected vendor changes
  useEffect(() => {
    const { documents } = getScopedVendorData(selectedVendorId)
    const ov = getDocStatusOverrides(selectedVendorId)
    setDocs(documents)
    setOverrides(ov)
  }, [selectedVendorId])

  const handleStatusChange = (docId: string, newStatus: string) => {
    setDocStatusOverride(selectedVendorId, docId, newStatus)
    setOverrides((prev) => ({ ...prev, [docId]: newStatus }))
    setToastMsg(`Status updated to "${newStatus}" for document ${docId}`)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const handleRefresh = () => {
    const { documents } = getScopedVendorData(selectedVendorId)
    const ov = getDocStatusOverrides(selectedVendorId)
    setDocs(documents)
    setOverrides(ov)
    setToastMsg('Document list refreshed.')
    setTimeout(() => setToastMsg(''), 2000)
  }

  const selectedVendor = MASTER_VENDORS.find((v) => v.id === selectedVendorId)

  const statusBadge = (status: string) => {
    const cfg: Record<string, string> = {
      Verified:       'bg-green-100 text-green-800 border-green-200',
      Pending:        'bg-yellow-50 text-yellow-800 border-yellow-200',
      Rejected:       'bg-red-100 text-red-800 border-red-200',
      'Expiring Soon':'bg-amber-100 text-amber-800 border-amber-200',
    }
    const cls = cfg[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
    const icon =
      status === 'Verified'  ? <CheckCircle size={11} className="inline mr-1" /> :
      status === 'Rejected'  ? <XCircle     size={11} className="inline mr-1" /> :
      status === 'Pending'   ? <Clock       size={11} className="inline mr-1" /> : null
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cls}`}>
        {icon}{status === 'Pending' ? 'Pending Review' : status}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen size={18} className="text-blue-600" /> Vendor Documents
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review and verify compliance documents uploaded by vendors. Only Admins can mark documents as Verified.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={14} className="text-blue-600" /> {toastMsg}
        </div>
      )}

      {/* Vendor selector */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <label className="text-xs font-bold text-gray-700 shrink-0">Select Vendor:</label>
        <select
          value={selectedVendorId}
          onChange={(e) => setSelectedVendorId(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {MASTER_VENDORS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id} — {v.name} ({v.category})
            </option>
          ))}
        </select>
        {selectedVendor && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Admin notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldCheck size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Admin-only control:</strong> Use the Status dropdown to Verify or Reject documents. Status changes are reflected immediately on the Vendor's Documents page.
          Vendors can upload but cannot self-mark documents as Verified.
        </span>
      </div>

      {/* Document table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
            <tr>
              <th className="p-4">Document Ref</th>
              <th className="p-4">Document Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Uploaded</th>
              <th className="p-4">Expiry</th>
              <th className="p-4">Current Status</th>
              <th className="p-4">Change Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {docs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                  No documents found for this vendor.
                </td>
              </tr>
            ) : (
              docs.map((doc) => {
                const effectiveStatus = resolveDocStatus(doc, overrides)
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-blue-600">{doc.id}</td>
                    <td className="p-4 font-bold text-gray-900 max-w-xs">
                      <span className="block truncate" title={doc.name}>{doc.name}</span>
                    </td>
                    <td className="p-4 text-gray-600 font-semibold">{doc.category}</td>
                    <td className="p-4 text-gray-600">{doc.uploadedDate}</td>
                    <td className="p-4 text-gray-600">{doc.expiryDate}</td>
                    <td className="p-4">{statusBadge(effectiveStatus)}</td>
                    <td className="p-4">
                      <select
                        value={effectiveStatus}
                        onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                        className={`p-1.5 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
                          effectiveStatus === 'Verified' ? 'border-green-300 bg-green-50 text-green-800' :
                          effectiveStatus === 'Rejected' ? 'border-red-300 bg-red-50 text-red-800' :
                          'border-yellow-300 bg-yellow-50 text-yellow-800'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Verified">Verified</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Admin Vendors Page ──────────────────────────────────────────────────
export const AdminVendorsPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'list' | 'approval' | 'risk' | 'performance' | 'docs'>('list')
  const [showAddModal, setShowAddModal] = useState(false)
  const [vendors, setVendors] = useState(MASTER_VENDORS)

  const [newVendor, setNewVendor] = useState({ name: '', category: 'IT Hardware', contactPerson: '', email: '' })

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault()
    const isFlowB = isFlowBCategory(newVendor.category)
    const newId = `VND-${newVendor.category.substring(0, 2).toUpperCase()}-00${vendors.length + 1}`
    setVendors([
      ...vendors,
      {
        id: newId,
        name: newVendor.name,
        category: newVendor.category,
        risk: 'Low',
        score: '90.0%',
        status: isFlowB ? 'Flow B Excluded (Direct Fund Release)' : 'Active',
        contactPerson: newVendor.contactPerson || 'Account Rep',
        email: newVendor.email || 'contact@vendor.com',
        phone: '+1 800-555-0199',
        openRfqsCount: 0,
        activePosCount: 0,
        totalDisbursed: 0,
      },
    ])
    setShowAddModal(false)
    setNewVendor({ name: '', category: 'IT Hardware', contactPerson: '', email: '' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-blue-600" /> Vendor Management
          </h1>
          <p className="text-xs text-gray-500">Manage vendor master database, risk ratings, performance scores &amp; onboarding.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-2"
        >
          <PlusCircle size={16} /> Add Vendor
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3 text-xs text-purple-950 shadow-xs">
        <AlertTriangle size={18} className="text-purple-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-purple-950">Flow B Category Notice (Software &amp; SaaS / Cloud &amp; Infrastructure)</h4>
          <p className="text-purple-800 mt-0.5 leading-relaxed">
            Software &amp; SaaS and Cloud &amp; Infrastructure are designated Flow B categories. Requests in these categories route directly to Team Lead Fund Release and are excluded from vendor RFQs, PO generation, and vendor auto-recommendation. Vendors under these categories are flagged below.
          </p>
        </div>
      </div>

      {/* 5 Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2">
        {[
          { id: 'list',        label: `Vendor List (${vendors.length})` },
          { id: 'approval',    label: 'Vendor Approval' },
          { id: 'risk',        label: 'Vendor Risk' },
          { id: 'performance', label: 'Vendor Performance' },
          { id: 'docs',        label: 'Vendor Documents' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              subTab === t.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {subTab === 'docs' ? (
        <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden">
          <AdminVendorDocsTab />
        </div>
      ) : (
        /* Vendor list table — shown for list / approval / risk / performance */
        <div className="bg-white rounded-b-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
          {(subTab === 'list' || subTab === 'approval' || subTab === 'risk' || subTab === 'performance') && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase">
                <tr>
                  <th className="p-4">Unique Vendor ID</th>
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Risk Rating</th>
                  <th className="p-4">Performance Score</th>
                  <th className="p-4">Status &amp; Flow Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {vendors.map((v) => {
                  const isFlowB = isFlowBCategory(v.category) || v.status.includes('Flow B')
                  return (
                    <tr key={v.id} className={isFlowB ? 'bg-purple-50/30' : 'hover:bg-gray-50'}>
                      <td className="p-4 font-bold text-blue-600">{v.id}</td>
                      <td className="p-4 font-bold text-gray-900">{v.name}</td>
                      <td className="p-4 text-gray-600">
                        <span className="font-semibold">{v.category}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 font-bold rounded text-[10px]">{v.risk}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-900">{v.score}</td>
                      <td className="p-4 font-bold">
                        {isFlowB ? (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-extrabold rounded-full text-[10px] border border-purple-200">
                            ⚠️ Flow B Excluded (Direct Fund Release)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-green-100 text-green-800 font-bold rounded-full text-[10px]">
                            Active (Flow A)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-gray-900 mb-4">Add New Vendor &amp; Assign Unique ID</h2>
            <form onSubmit={handleAddVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Vendor Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Systems"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category *</label>
                <select
                  value={newVendor.category}
                  onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 font-medium"
                >
                  <option value="IT Hardware">IT Hardware</option>
                  <option value="SaaS &amp; Cloud">SaaS &amp; Cloud</option>
                  <option value="Office Accessories">Office Accessories</option>
                  <option value="Office Technology">Office Technology</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={newVendor.contactPerson}
                  onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-semibold text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow">
                  Create Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
