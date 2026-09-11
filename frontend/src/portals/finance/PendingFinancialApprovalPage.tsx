import React, { useState } from 'react'
import { ActionModal, ModalActionType } from '../../components/portal/ActionModal'
import { CheckCircle, XCircle, ArrowUpRight, RotateCcw } from 'lucide-react'

interface FinanceRequest {
  id: string
  title: string
  teamLead: string
  department: string
  category: string
  estCost: string
  escalationReason?: string
  date: string
}

export const PendingFinancialApprovalPage: React.FC = () => {
  const [requests, setRequests] = useState<FinanceRequest[]>([
    {
      id: 'REQ-DEMO-002',
      title: 'Cloud Infrastructure Yearly Renewal',
      teamLead: 'Alex Developer',
      department: 'IT & Infrastructure',
      category: 'SaaS & Cloud',
      estCost: '$60,000.00',
      escalationReason: 'Exceeds manager approval budget',
      date: '2026-09-10',
    },
  ])

  const [activeReq, setActiveReq] = useState<FinanceRequest | null>(null)
  const [modalAction, setModalAction] = useState<ModalActionType | null>(null)

  const openAction = (req: FinanceRequest, act: ModalActionType) => {
    setActiveReq(req)
    setModalAction(act)
  }

  const handleConfirm = (data: { action: ModalActionType; reason?: string; notes?: string }) => {
    if (!activeReq) return
    setRequests((prev) => prev.filter((r) => r.id !== activeReq.id))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Financial Approvals</h1>
        <p className="text-xs text-gray-500">
          Queue awaiting Finance decision. Approve, Reject (requires reason dropdown), or Recommend to Admin (requires reason dropdown).
        </p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500 text-xs">
            <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
            No pending financial approvals in queue!
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {req.id}
                  </span>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    Escalated by Manager
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-900">{req.title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Department: <span className="font-semibold text-gray-800">{req.department}</span> • Category:{' '}
                  <span className="font-semibold text-gray-800">{req.category}</span>
                </p>
                {req.escalationReason && (
                  <p className="text-xs text-purple-700 font-medium mt-1">
                    Manager Note: "{req.escalationReason}"
                  </p>
                )}
                <p className="text-sm font-extrabold text-gray-900 mt-2">Cost: {req.estCost}</p>
              </div>

              {/* 3 Explicit Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAction(req, 'APPROVE')}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all"
                >
                  <CheckCircle size={15} /> Approve
                </button>

                <button
                  onClick={() => openAction(req, 'REJECT')}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all"
                >
                  <XCircle size={15} /> Reject
                </button>

                <button
                  onClick={() => openAction(req, 'RECOMMEND')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all"
                >
                  <ArrowUpRight size={15} /> Recommend to Admin
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ActionModal
        isOpen={!!modalAction}
        actionType={modalAction}
        requestId={activeReq?.id || ''}
        requestTitle={activeReq?.title || ''}
        onClose={() => setModalAction(null)}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
