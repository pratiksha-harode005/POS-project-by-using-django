import React from 'react'
import { Check, Clock, AlertCircle } from 'lucide-react'

export const STEP_NAMES = [
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

interface TrackingStepperProps {
  currentStage: number // 0 to 9
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed'
}

export const TrackingStepper: React.FC<TrackingStepperProps> = ({ currentStage, status }) => {
  return (
    <div className="w-full bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Request Progress Tracking
        </h3>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            status === 'Completed'
              ? 'bg-green-100 text-green-800'
              : status === 'Rejected'
              ? 'bg-red-100 text-red-800'
              : status === 'Returned'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {status} (Stage {currentStage + 1}/10)
        </span>
      </div>

      {/* Stepper horizontal scrolling wrapper */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-center min-w-[900px] justify-between relative px-2">
          {STEP_NAMES.map((name, idx) => {
            const isDone = idx < currentStage || (idx === currentStage && status === 'Completed')
            const isCurrent = idx === currentStage && status !== 'Completed'
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
                    className={`text-[11px] font-medium text-center mt-2 max-w-[80px] leading-tight ${
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
                {idx < STEP_NAMES.length - 1 && (
                  <div
                    className={`flex-1 h-1 transition-all duration-300 -mt-5 ${
                      idx < currentStage ? 'bg-blue-600' : 'bg-gray-200'
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
