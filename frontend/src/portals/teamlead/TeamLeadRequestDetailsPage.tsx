import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { useProcurement } from '../../context/ProcurementContext'
import { formatDate } from '../../utils/formatDate'

export const TeamLeadRequestDetailsPage: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { requests } = useProcurement()
  const requestId = params.get('id') || ''
  const request = requests.find((item) => String(item.id) === requestId || String(item.dbId) === requestId)

  if (!request) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <FileText className="mx-auto text-slate-400 mb-3" size={28} />
        <h1 className="text-lg font-bold text-slate-900">Request not found</h1>
        <p className="text-sm text-slate-500 mt-1">The request may not be available in your Team Lead account.</p>
        <button onClick={() => navigate('/portal/team_lead/my-requests')} className="mt-4 text-sm font-semibold text-blue-600">View my requests</button>
      </div>
    )
  }

  const fields = [
    ['Request ID', request.id], ['Status', request.status], ['Category', request.category],
    ['Subcategory', request.subcategory], ['Quantity', String(request.quantity)],
    ['Estimated cost', `₹${Number(request.estimatedCost || 0).toLocaleString('en-IN')}`],
    ['Department', request.department], ['Required by', formatDate(request.requiredBy)],
    ['Priority', request.priority], ['Preferred vendor', request.preferredVendor || '—'],
    ['Delivery location', request.deliveryLocation], ['Submitted', formatDate(request.createdAt || request.date)],
  ]

  return (
    <main className="space-y-5">
      <button onClick={() => navigate('/portal/team_lead/my-requests')} className="flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} /> My Requests</button>
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div><p className="font-mono text-xs text-blue-600">{request.id}</p><h1 className="text-xl font-bold text-slate-900 mt-1">{request.title}</h1></div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{request.status}</span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-5">
          {fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="text-sm font-semibold text-slate-900 mt-1">{value || '—'}</dd></div>)}
        </dl>
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div><h2 className="text-sm font-bold text-slate-900">Description</h2><p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{request.description || '—'}</p></div>
          <div><h2 className="text-sm font-bold text-slate-900">Business justification</h2><p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{request.justification || '—'}</p></div>
        </div>
      </section>
    </main>
  )
}
