import React from 'react'
import { Check, Clock, AlertCircle } from 'lucide-react'

export const FLOW_A_STEPS = [
  'Create Request',
  'Manager Approval',
  'Finance Approval',
  'Admin Approval',
  'RFQ Sent',
  'Vendor Quotes Received',
  'Product Order',
  'Delivery',
  'Invoice',
  'Payment',
]

export const FLOW_B_STEPS = [
  'Create Request',
  'Manager Approval',
  'Finance Approval',
  'Admin Approval',
  'Funds Released',
  'Purchased by Team Lead',
  'Receipt Submitted',
]

export const FLOW_B_CATEGORIES = new Set([
  'Software & SaaS',
  'Cloud & Infrastructure',
  'SaaS & Cloud',
  'Training & Certifications',
  'Subscriptions',
])

export const isFlowBCategory = (category?: string, flowType?: 'A' | 'B') => {
  if (flowType === 'B') return true
  if (flowType === 'A') return false
  if (category && FLOW_B_CATEGORIES.has(category)) return true
  return false
}

interface TrackingStepperProps {
  currentStage: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed'
  category?: string
  flowType?: 'A' | 'B'
}

export const TrackingStepper: React.FC<TrackingStepperProps> = ({
  currentStage,
  status,
  category,
  flowType,
}) => {
  const isFlowB = isFlowBCategory(category, flowType)
  const steps = isFlowB ? FLOW_B_STEPS : FLOW_A_STEPS
  const totalStages = steps.length

  // Safety clamp for currentStage index
  const stageIndex = Math.min(Math.max(0, currentStage), totalStages - 1)

  return (
    <div className="w-full bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Request Progress Tracking
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-gray-50 text-gray-600">
            {isFlowB ? '7-Stage Flow B (Service / SaaS)' : '10-Stage Flow A (Physical Goods)'}
          </span>
        </div>

        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            status === 'Completed'
              ? 'bg-green-100 text-green-800'
              : status === 'Rejected'
              ? 'bg-red-100 text-red-800'
              : status === 'Returned'
              ? 'bg-amber-100 text-amber-800'
              : status === 'Draft'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {status} (Stage {stageIndex + 1}/{totalStages})
        </span>
      </div>

      {/* Stepper horizontal scrolling wrapper */}
      <div className="overflow-x-auto pb-4">
        <div className={`flex items-center justify-between relative px-2 ${isFlowB ? 'min-w-[700px]' : 'min-w-[900px]'}`}>
          {steps.map((name, idx) => {
            const isDone = idx < stageIndex || (idx === stageIndex && status === 'Completed')
            const isCurrent = idx === stageIndex && status !== 'Completed'
            const isRejected = isCurrent && status === 'Rejected'
            const isReturned = isCurrent && status === 'Returned'

            return (
              <React.Fragment key={name}>
                {/* Step Node */}
                <div className="flex flex-col items-center z-10 group relative min-w-[70px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
                      isDone
                        ? 'bg-blue-600 text-white shadow-md'
                        : isRejected
                        ? 'bg-red-600 text-white ring-4 ring-red-100'
                        : isReturned
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                        : isCurrent
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100 animate-pulse'
                        : 'bg-gray-100 text-gray-400 border border-gray-300'
                    }`}
                  >
                    {isDone ? (
                      <Check size={18} strokeWidth={2.5} />
                    ) : isRejected ? (
                      <AlertCircle size={18} />
                    ) : isReturned ? (
                      <Clock size={18} />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-medium text-center mt-2 max-w-[85px] leading-tight ${
                      isCurrent
                        ? 'text-blue-600 font-bold'
                        : isDone
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                  >
                    {name}
                  </span>
                </div>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 transition-all duration-300 -mt-5 ${
                      idx < stageIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
