import React, { useState } from 'react'
import { AlertCircle, X, CheckCircle, ArrowUpRight, RotateCcw } from 'lucide-react'

export type ModalActionType = 'APPROVE' | 'REJECT' | 'RECOMMEND' | 'RETURN'

interface ActionModalProps {
  isOpen: boolean
  actionType: ModalActionType | null
  requestId: string
  requestTitle: string
  onClose: () => void
  onConfirm: (data: { action: ModalActionType; reason?: string; notes?: string }) => void
}

const DEFAULT_REJECT_REASONS = [
  'Budget not available',
  'Demand not justified',
  'Duplicate request',
  'Insufficient details provided',
  'Not aligned with department priorities',
]

const DEFAULT_RECOMMEND_REASONS = [
  'Exceeds my approval budget',
  'High-value / strategic purchase',
  'Requires additional financial review',
  'Cross-department budget impact',
  'Needs policy exception',
]

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  actionType,
  requestId,
  requestTitle,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !actionType) return null

  const needsReason = actionType === 'REJECT' || actionType === 'RECOMMEND'
  const reasonsList = actionType === 'REJECT' ? DEFAULT_REJECT_REASONS : DEFAULT_RECOMMEND_REASONS

  const handleConfirm = () => {
    if (needsReason && !selectedReason) {
      setError(`Please select a required reason to confirm ${actionType.toLowerCase()}.`)
      return
    }
    setError('')
    onConfirm({
      action: actionType,
      reason: selectedReason,
      notes,
    })
    setSelectedReason('')
    setNotes('')
    onClose()
  }

  const titleMap: Record<ModalActionType, string> = {
    APPROVE: 'Approve Request',
    REJECT: 'Reject Request',
    RECOMMEND: 'Recommend / Escalate Request',
    RETURN: 'Return Request to Team Lead',
  }

  const iconMap: Record<ModalActionType, React.ReactNode> = {
    APPROVE: <CheckCircle className="text-green-600" size={24} />,
    REJECT: <AlertCircle className="text-red-600" size={24} />,
    RECOMMEND: <ArrowUpRight className="text-blue-600" size={24} />,
    RETURN: <RotateCcw className="text-amber-600" size={24} />,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          {iconMap[actionType]}
          <h2 className="text-lg font-bold text-gray-900">{titleMap[actionType]}</h2>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Target: <span className="font-semibold text-gray-700">{requestId}</span> - {requestTitle}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Reason Dropdown (Required for Reject & Recommend) */}
        {needsReason && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value)
                setError('')
              }}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900"
            >
              <option value="">-- Select a reason --</option>
              {reasonsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notes input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Comments / Justification Notes {actionType === 'RETURN' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              actionType === 'RETURN'
                ? 'Specify required changes or details needed from Team Lead...'
                : 'Optional notes for audit trail...'
            }
            className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-md transition-all ${
              actionType === 'APPROVE'
                ? 'bg-green-600 hover:bg-green-700'
                : actionType === 'REJECT'
                ? 'bg-red-600 hover:bg-red-700'
                : actionType === 'RECOMMEND'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            Confirm {actionType.replace('_', ' ')}
          </button>
        </div>
      </div>
    </div>
  )
}
