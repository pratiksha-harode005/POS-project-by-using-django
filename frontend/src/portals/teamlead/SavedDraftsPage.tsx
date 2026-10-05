import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileEdit, PlusCircle, Search, Trash2, Send, Clock,
  AlertCircle, CheckCircle2, ChevronRight, Calendar,
  DollarSign, ArrowRight, Layers, Tag, Eye, RefreshCw
} from 'lucide-react'
import { useProcurement, PurchaseRequest } from '../../context/ProcurementContext'
import { formatDate } from '../../utils/formatDate'
import { CATEGORIES } from './CreateRequestPage'

export const SavedDraftsPage: React.FC = () => {
  const navigate = useNavigate()
  const { requests, submitDraft, deleteDraft, refreshBackendRequests } = useProcurement()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmSubmitReq, setConfirmSubmitReq] = useState<PurchaseRequest | null>(null)
  const [confirmDeleteReq, setConfirmDeleteReq] = useState<PurchaseRequest | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Filter only drafts
  const drafts = useMemo(() => {
    return requests.filter((r) => r.status === 'Draft' || r.currentStage === 0 || r.raw_status === 'DRAFT')
  }, [requests])

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase()) ||
        (d.subcategory && d.subcategory.toLowerCase().includes(search.toLowerCase()))
      const matchCat = filterCategory === 'All' || d.category === filterCategory
      return matchSearch && matchCat
    })
  }, [drafts, search, filterCategory])

  const totalDraftsCost = useMemo(() => {
    return drafts.reduce((sum, d) => sum + (d.estimatedCost || 0), 0)
  }, [drafts])

  const handleEditDraft = (draft: PurchaseRequest) => {
    navigate('/portal/team_lead/create-request', {
      state: {
        editDraft: draft,
        draftId: draft.id,
      },
    })
  }

  const handleDirectSubmit = async (draft: PurchaseRequest) => {
    setSubmittingId(draft.id)
    setActionError(null)
    try {
      await submitDraft(draft.id, {
        title: draft.title,
        category: draft.category,
        subcategory: draft.subcategory,
        description: draft.description,
        quantity: draft.quantity,
        estimatedCost: draft.estimatedCost,
        requiredBy: draft.requiredBy,
        department: draft.department,
        deliveryLocation: draft.deliveryLocation,
        priority: draft.priority,
        preferredVendor: draft.preferredVendor,
        justification: draft.justification,
        extraFields: draft.extraFields,
      })
      setConfirmSubmitReq(null)
      setActionSuccess(`Draft ${draft.id} successfully submitted to Manager for approval!`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Failed to submit draft.')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleDirectDelete = async (draft: PurchaseRequest) => {
    setDeletingId(draft.id)
    setActionError(null)
    try {
      await deleteDraft(draft.id)
      setConfirmDeleteReq(null)
      setActionSuccess(`Draft ${draft.id} deleted successfully.`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Failed to delete draft.')
    } finally {
      setDeletingId(null)
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Saved Drafts</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              {drafts.length} {drafts.length === 1 ? 'Draft' : 'Drafts'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Work in progress procurement requests. Drafts are private and do not enter the approval workflow until submitted.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/portal/team_lead/create-request')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition-all cursor-pointer"
          >
            <PlusCircle size={15} /> Create New Request
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Drafts</span>
            <span className="text-2xl font-extrabold text-gray-900">{drafts.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileEdit size={20} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search saved drafts by ID, title, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-lg bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="w-48">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-xs font-semibold p-2 border rounded-lg bg-gray-50 border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {(search || filterCategory !== 'All') && (
          <button
            onClick={() => { setSearch(''); setFilterCategory('All') }}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Drafts List */}
      {filteredDrafts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <FileEdit size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              {drafts.length === 0 ? 'No saved drafts found' : 'No drafts match your search'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {drafts.length === 0
                ? 'When you start creating a purchase request and choose "Save as Draft", it will appear here so you can continue editing before submission.'
                : 'Try resetting your search query or category filter to view all saved drafts.'}
            </p>
          </div>
          {drafts.length === 0 && (
            <button
              onClick={() => navigate('/portal/team_lead/create-request')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition-all cursor-pointer"
            >
              <PlusCircle size={15} /> Create Request & Save as Draft
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
            >
              {/* Header Row */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      {draft.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                      DRAFT
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColor(draft.priority)}`}>
                      Priority: {draft.priority}
                    </span>
                    <span className="text-xs text-gray-400">
                      Saved on {formatDate(draft.date || draft.createdAt || '')}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 pt-1">{draft.title || 'Untitled Draft Request'}</h2>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditDraft(draft)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
                    title="Edit draft in Create Request form"
                  >
                    <FileEdit size={14} /> Edit Draft
                  </button>
                  <button
                    onClick={() => setConfirmSubmitReq(draft)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                    title="Submit directly for manager approval"
                  >
                    <Send size={14} /> Submit for Approval
                  </button>
                  <button
                    onClick={() => setConfirmDeleteReq(draft)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete draft"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-gray-400 block">Category</span>
                  <span className="font-bold text-gray-800">{draft.category}</span>
                  {draft.subcategory && (
                    <span className="text-[11px] text-gray-500 block truncate">({draft.subcategory})</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-gray-400 block">Quantity</span>
                  <span className="font-bold text-gray-800">{draft.quantity || 1}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-gray-400 block">Estimated Cost</span>
                  <span className="font-extrabold text-emerald-700">₹{(draft.estimatedCost || 0).toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-gray-400 block">Department</span>
                  <span className="font-semibold text-gray-800">{draft.department || 'IT & Infrastructure'}</span>
                </div>
              </div>

              {/* Description & Justification */}
              {draft.description && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="line-clamp-2">
                    <strong className="text-gray-700">Description:</strong> {draft.description}
                  </p>
                  {draft.justification && (
                    <p className="line-clamp-1 text-gray-500">
                      <strong className="text-gray-600">Justification:</strong> {draft.justification}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Submitting Draft */}
      {confirmSubmitReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Submit Draft for Approval</h3>
                <p className="text-xs text-gray-500">This will advance the request to Manager review.</p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl text-xs space-y-1.5 border border-gray-100">
              <p><strong>Request ID:</strong> <span className="font-mono text-blue-600">{confirmSubmitReq.id}</span></p>
              <p><strong>Title:</strong> {confirmSubmitReq.title}</p>
              <p><strong>Category:</strong> {confirmSubmitReq.category}</p>
              <p><strong>Est. Cost:</strong> ₹{(confirmSubmitReq.estimatedCost || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitReq(null)}
                disabled={submittingId !== null}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDirectSubmit(confirmSubmitReq)}
                disabled={submittingId !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                {submittingId ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Draft */}
      {confirmDeleteReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Saved Draft</h3>
                <p className="text-xs text-gray-500">Are you sure you want to permanently delete this draft?</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/50 rounded-xl text-xs space-y-1 text-red-900 border border-red-100">
              <p><strong>{confirmDeleteReq.id}</strong> — {confirmDeleteReq.title}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteReq(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDirectDelete(confirmDeleteReq)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                {deletingId ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
