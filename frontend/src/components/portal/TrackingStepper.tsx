import React, { useState, useMemo } from 'react'
import { Check, Clock, AlertCircle, User, ChevronDown } from 'lucide-react'
import {
  WorkflowType,
  SOFTWARE_STAGES,
  HARDWARE_STAGES,
  getWorkflowProgression,
} from '../../utils/workflowUtils'

export const STEP_NAMES = HARDWARE_STAGES

export interface StepHistoryItem {
  stageNumber: number
  stageName: string
  actor: string
  action: string
  timestamp: string
  note?: string
}

export interface TrackingStepperProps {
  currentStage?: number // 0-based
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed' | string
  currentlyWith?: string
  lastUpdated?: string
  history?: StepHistoryItem[]
  category?: string
  title?: string
  workflowType?: WorkflowType
  flowType?: 'A' | 'B'
  financeStatus?: string
  paymentStatus?: string
}

export const isFlowBCategory = (cat?: string): boolean => {
  if (!cat) return false
  const c = cat.toLowerCase()
  return c.includes('software') || c.includes('saas') || c.includes('license') || c.includes('cloud') || c.includes('subscription')
}

export const TrackingStepper: React.FC<TrackingStepperProps> = ({
  currentStage,
  status,
  currentlyWith,
  lastUpdated = '2026-09-11',
  history,
  category,
  title,
  workflowType: explicitWorkflowType,
  financeStatus,
  paymentStatus,
}) => {
  const [showHistory, setShowHistory] = useState(false)

  // Compute progression based on category, status, and workflow rules
  const progression = useMemo(() => {
    const res = getWorkflowProgression({
      status,
      financeStatus,
      category,
      title,
      paymentStatus,
      currentStage,
    })
    if (explicitWorkflowType && explicitWorkflowType !== res.workflowType) {
      // If caller explicitly overrode workflow type
      const stgs = explicitWorkflowType === 'SOFTWARE' ? SOFTWARE_STAGES : HARDWARE_STAGES
      return {
        ...res,
        workflowType: explicitWorkflowType,
        stages: stgs,
        totalStages: stgs.length,
        currentStageIndex: Math.min(res.currentStageIndex, stgs.length - 1),
      }
    }
    return res
  }, [status, financeStatus, category, title, paymentStatus, currentStage, explicitWorkflowType])

  const effectiveCurrentlyWith = currentlyWith || progression.currentlyWith
  const effectiveStageIdx = progression.currentStageIndex
  const stages = progression.stages

  // Default history if not explicitly provided
  const effectiveHistory: StepHistoryItem[] = useMemo(() => {
    if (history && history.length > 0) return history

    const isSoftware = progression.workflowType === 'SOFTWARE'
    const items: StepHistoryItem[] = [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Team Lead Alex',
        action: 'Request Submitted',
        timestamp: lastUpdated ? `${lastUpdated} 09:30 AM` : '2026-09-11 09:30 AM',
        note: 'Initial procurement request submitted for approval.',
      },
    ]

    if (effectiveStageIdx >= 1) {
      items.push({
        stageNumber: 2,
        stageName: 'Manager Approval',
        actor: 'Sarah Manager',
        action: effectiveStageIdx === 1 ? 'Under Review' : 'Approved by Manager',
        timestamp: lastUpdated ? `${lastUpdated} 11:15 AM` : '2026-09-11 11:15 AM',
        note:
          effectiveStageIdx === 1
            ? 'Request is currently undergoing manager budget and justification verification.'
            : 'Manager approved and routed to next approval stage.',
      })
    }

    if (effectiveStageIdx >= 2) {
      items.push({
        stageNumber: 3,
        stageName: 'Finance Approval',
        actor: 'Mark Finance',
        action: effectiveStageIdx === 2 ? 'In Review' : 'Budget Approved',
        timestamp: lastUpdated ? `${lastUpdated} 02:45 PM` : '2026-09-11 02:45 PM',
        note: 'Department allocation checked against Q3 Capex threshold.',
      })
    }

    if (effectiveStageIdx >= 3) {
      items.push({
        stageNumber: 4,
        stageName: 'Admin Approval',
        actor: 'Priyanka Sharma (Admin)',
        action: effectiveStageIdx === 3 ? 'Under Admin Review' : 'Approved by Executive Authority',
        timestamp: lastUpdated ? `${lastUpdated} 04:30 PM` : '2026-09-11 04:30 PM',
        note: 'Executive procurement governance and compliance sign-off.',
      })
    }

    if (isSoftware) {
      // Software direct-to-payment
      if (effectiveStageIdx >= 4) {
        items.push({
          stageNumber: 5,
          stageName: 'Verification and Order Complete',
          actor: 'System Automation & IT',
          action: 'Provisioning Completed & Verified',
          timestamp: lastUpdated ? `${lastUpdated} 05:15 PM` : '2026-09-11 05:15 PM',
          note: 'Software credentials and access successfully delivered and verified.',
        })
      }
      if (effectiveStageIdx >= 5 || progression.isCompleted) {
        items.push({
          stageNumber: 6,
          stageName: 'Payment',
          actor: 'Treasury & Accounts',
          action: progression.isCompleted ? 'Payment Disbursed & Settled' : 'Awaiting Payment Processing',
          timestamp: lastUpdated ? `${lastUpdated} 05:30 PM` : '2026-09-11 05:30 PM',
          note: 'Direct digital license/SaaS payout execution.',
        })
      }
    } else {
      // Hardware supply chain steps
      if (effectiveStageIdx >= 4) {
        items.push({
          stageNumber: 5,
          stageName: 'RFQ Sent',
          actor: 'Procurement Sourcing Team',
          action: 'RFQs Dispatched to Vendors',
          timestamp: `${lastUpdated} 09:00 AM`,
          note: 'Request for Quotations dispatched to verified vendors.',
        })
      }
      if (effectiveStageIdx >= 5) {
        items.push({
          stageNumber: 6,
          stageName: 'Vendor Quotes Received',
          actor: 'Vendor Sourcing Desk',
          action: 'Quotations Evaluated',
          timestamp: `${lastUpdated} 01:20 PM`,
          note: 'Bids received and commercial comparison completed.',
        })
      }
      if (effectiveStageIdx >= 6) {
        items.push({
          stageNumber: 7,
          stageName: 'Delivery',
          actor: 'Dock & Receiving',
          action: 'Physical Delivery Verified',
          timestamp: `${lastUpdated} 03:00 PM`,
          note: 'Goods received on-site and inspected.',
        })
      }
      if (effectiveStageIdx >= 7) {
        items.push({
          stageNumber: 8,
          stageName: 'Invoice',
          actor: 'Accounts Payable',
          action: 'Invoice Reconciled',
          timestamp: `${lastUpdated} 10:30 AM`,
          note: 'Vendor tax invoice matched with delivery receipt and order record.',
        })
      }
      if (effectiveStageIdx >= 8) {
        items.push({
          stageNumber: 9,
          stageName: 'Verification and Order Complete',
          actor: 'Procurement Audit & Operations',
          action: 'Two-Way Verification Certified',
          timestamp: `${lastUpdated} 02:00 PM`,
          note: 'Goods Receipt and Invoice verification completed and approved for payment release.',
        })
      }
      if (effectiveStageIdx >= 9 || progression.isCompleted) {
        items.push({
          stageNumber: 10,
          stageName: 'Payment',
          actor: 'Treasury & Finance',
          action: progression.isCompleted ? 'Payment Processed & Released' : 'Disbursement Scheduled',
          timestamp: `${lastUpdated} 04:45 PM`,
          note: 'Procurement payment disbursed to awarded supplier to settle order fulfillment.',
        })
      }
    }

    return items
  }, [history, effectiveStageIdx, lastUpdated, progression.workflowType, progression.isCompleted])

  return (
    <div className="w-full space-y-3">
      {/* 👤 Currently with Pill Banner */}
      {effectiveCurrentlyWith && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-gray-700">
          <User size={15} className="text-blue-600 flex-shrink-0" />
          <span className="text-gray-500">Currently with:</span>
          <span className="font-bold text-gray-900">{effectiveCurrentlyWith}</span>
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {progression.workflowType === 'SOFTWARE' ? 'Software / Digital Workflow' : 'Hardware Workflow'}
          </span>
        </div>
      )}

      {/* Main Stepper Card */}
      <div className="w-full bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">
            Request Progress Tracking
          </h3>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
              progression.isCompleted
                ? 'bg-green-100 text-green-800'
                : progression.isRejected
                ? 'bg-red-100 text-red-800'
                : progression.isReturned
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {progression.statusBadge}
          </span>
        </div>

        {/* Stepper Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-4">
          <div
            className={`flex items-center justify-between relative px-2 ${
              progression.workflowType === 'SOFTWARE' ? 'min-w-[620px]' : 'min-w-[920px]'
            }`}
          >
            {stages.map((name, idx) => {
              const isDone =
                idx < effectiveStageIdx ||
                (idx === effectiveStageIdx && progression.isCompleted)
              const isCurrent = idx === effectiveStageIdx && !progression.isCompleted
              const isRejected = isCurrent && progression.isRejected
              const isReturned = isCurrent && progression.isReturned

              return (
                <React.Fragment key={name}>
                  {/* Step Node */}
                  <div className="flex flex-col items-center z-10 group relative min-w-[75px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                        isDone
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isRejected
                          ? 'bg-red-600 text-white ring-4 ring-red-100'
                          : isReturned
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 ring-offset-1'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {isDone ? (
                        <Check size={18} strokeWidth={2.8} />
                      ) : isRejected ? (
                        <AlertCircle size={18} />
                      ) : isReturned ? (
                        <Clock size={18} />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-medium text-center mt-2.5 max-w-[85px] leading-tight ${
                        isCurrent
                          ? 'text-blue-600 font-bold'
                          : isDone
                          ? 'text-gray-700 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {name}
                    </span>
                  </div>

                  {/* Connector line between steps */}
                  {idx < stages.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 transition-all duration-300 -mt-5 ${
                        idx < effectiveStageIdx ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Footer: View History Toggle & Last Updated */}
        <div className="pt-4 mt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}
            />
            <span>View full history ({effectiveHistory.length} steps)</span>
          </button>

          <span className="text-gray-400 text-xs">
            Last updated: {lastUpdated}
          </span>
        </div>

        {/* Expandable History Timeline */}
        {showHistory && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
            <div className="space-y-3">
              {effectiveHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {h.stageNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-gray-900">{h.stageName}</span>
                      <span className="text-[11px] text-gray-400 font-medium">{h.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-500">By:</span>
                      <span className="font-semibold text-gray-700">{h.actor}</span>
                      <span className="text-gray-300">•</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {h.action}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-gray-600 text-[11px] mt-1.5 bg-white p-2 rounded-lg border border-gray-100">
                        {h.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
