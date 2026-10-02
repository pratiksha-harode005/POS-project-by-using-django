import React, { useState, useMemo, useEffect } from 'react'
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
  requestId?: string
  currentStage?: number // 0-based
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed' | string
  currentlyWith?: string
  lastUpdated?: string
  history?: StepHistoryItem[]
  /** Raw backend approval_steps array — used to detect which portals actually participated */
  approval_steps?: any[]
  category?: string
  title?: string
  workflowType?: WorkflowType
  flowType?: 'A' | 'B'
  financeStatus?: string
  paymentStatus?: string
  rfqId?: string
  poNumber?: string
  grnNumber?: string
  invoiceNumber?: string
  isVerified?: boolean
  documentsVerified?: boolean
  grn_status?: string
  invoice_status?: string
  is_invoice_verified?: boolean
}

export const isFlowBCategory = (cat?: string): boolean => {
  if (!cat) return false
  const c = cat.toLowerCase()
  return c.includes('software') || c.includes('saas') || c.includes('license') || c.includes('cloud') || c.includes('subscription')
}

export const TrackingStepper: React.FC<TrackingStepperProps> = ({
  requestId,
  currentStage,
  status,
  currentlyWith,
  lastUpdated = '2026-09-11',
  history,
  approval_steps,
  category,
  title,
  workflowType: explicitWorkflowType,
  financeStatus,
  paymentStatus,
  rfqId,
  poNumber,
  grnNumber,
  invoiceNumber,
  isVerified,
  documentsVerified,
  grn_status,
  invoice_status,
  is_invoice_verified,
}) => {
  const [showHistory, setShowHistory] = useState(false)
  const [tick, setTick] = useState(0)

  // Real-time live update listener
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1)
    window.addEventListener('kss_backend_updated', handleUpdate)
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 3000)
    return () => {
      window.removeEventListener('kss_backend_updated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  // Compute progression based on actual approval path and workflow artifacts
  const progression = useMemo(() => {
    const res = getWorkflowProgression({
      status,
      financeStatus,
      category,
      title,
      paymentStatus,
      currentStage,
      history,
      approval_steps,
      workflowTypeOverride: explicitWorkflowType,
      rfqId,
      poNumber,
      grnNumber,
      invoiceNumber,
      isVerified,
      documentsVerified,
      grn_status,
      invoice_status,
      is_invoice_verified,
    })
    return res
  }, [status, financeStatus, category, title, paymentStatus, currentStage, explicitWorkflowType, history, approval_steps, rfqId, poNumber, grnNumber, invoiceNumber, isVerified, documentsVerified, grn_status, invoice_status, is_invoice_verified, tick])

  const effectiveCurrentlyWith = currentlyWith || progression.currentlyWith
  const effectiveStageIdx = progression.currentStageIndex
  const stages = progression.stages

  // Dynamic history based strictly on active progression stages
  const effectiveHistory: StepHistoryItem[] = useMemo(() => {
    if (history && history.length > 0) {
      return history.map((h: any, i: number) => ({
        stageNumber: i + 1,
        stageName: h.stageName || h.action || `Stage ${i + 1}`,
        actor: h.actorName || h.actorRole || h.actor || 'Authorized Officer',
        action: h.action || h.decision || 'Action Taken',
        timestamp: h.date || h.timestamp || lastUpdated,
        note: h.remark || h.notes || h.note || '',
      }))
    }

    const items: StepHistoryItem[] = []
    stages.forEach((stageName, idx) => {
      if (idx <= effectiveStageIdx) {
        let actor = 'Requester'
        let action = 'Completed'
        let note = ''

        switch (stageName) {
          case 'Create Request':
            actor = 'Team Lead (Requester)'
            action = 'Request Created & Submitted'
            note = 'Requisition details initialized and routed for approval.'
            break
          case 'Manager Approval':
            actor = 'Sarah Manager'
            action = idx === effectiveStageIdx ? 'Under Review' : 'Approved by Department Manager'
            note = 'Manager review and budget verification.'
            break
          case 'Finance Approval':
            actor = 'Mark Finance Officer'
            action = idx === effectiveStageIdx ? 'Under Finance Review' : 'Approved by Finance'
            note = 'Budget allocation & Capex threshold compliance.'
            break
          case 'Admin Approval':
            actor = 'Priyanka Sharma (Admin)'
            action = idx === effectiveStageIdx ? 'Under Admin Review' : 'Approved by Executive Authority'
            note = 'Executive procurement governance sign-off.'
            break
          case 'RFQ Sent':
            actor = 'Procurement Sourcing Desk'
            action = idx === effectiveStageIdx ? 'RFQs Dispatched' : 'RFQs Sent to Vendors'
            note = 'Request for Quotations dispatched to verified suppliers.'
            break
          case 'Vendor Quotes Received':
            actor = 'Vendor Sourcing Desk'
            action = idx === effectiveStageIdx ? 'Evaluating Quotations' : 'Quotes Evaluated & Shortlisted'
            note = 'Bids received and commercial comparison analyzed.'
            break
          case 'Product Order':
            actor = 'Selected Vendor / Sourcing Desk'
            action = idx === effectiveStageIdx ? 'Order Placed & Dispatched' : 'Purchase Order Issued'
            note = 'Purchase Order dispatched to awarded vendor.'
            break
          case 'Delivery':
            actor = 'Selected Vendor / Dock'
            action = idx === effectiveStageIdx ? 'Delivery in Progress' : 'Physical Delivery Verified'
            note = 'Goods received on-site and inspection sign-off completed.'
            break
          case 'Verification and Order Complete':
            actor = 'Procurement Audit & Operations'
            action = idx === effectiveStageIdx ? 'Audit Verification' : 'Three-Way Match Certified'
            note = 'Goods Receipt and Invoice verification certified.'
            break
          case 'Payment':
            actor = 'Treasury & Finance'
            action = progression.isCompleted ? 'Payment Processed & Settled' : 'Payment Disbursement Scheduled'
            note = 'Final settlement release.'
            break
          default:
            actor = 'Procurement Authority'
            action = 'Step Processed'
            note = ''
        }

        items.push({
          stageNumber: idx + 1,
          stageName,
          actor,
          action,
          timestamp: lastUpdated ? `${lastUpdated} 09:30 AM` : '2026-09-24 09:30 AM',
          note,
        })
      }
    })

    return items
  }, [history, effectiveStageIdx, lastUpdated, stages, progression.isCompleted])

  return (
    <div className="w-full space-y-3">
      {/* 👤 Currently with Pill Banner */}
      {effectiveCurrentlyWith && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <User size={15} className="text-blue-600 flex-shrink-0" />
            <span className="text-gray-500">Currently with:</span>
            <span className="font-bold text-gray-900">{effectiveCurrentlyWith}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workflow Sync
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {progression.workflowType === 'SOFTWARE' ? 'Software / Digital (6 Stages)' : 'Hardware Workflow (10 Stages)'}
            </span>
          </div>
        </div>
      )}

      {/* Main Stepper Card */}
      <div className="w-full bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-wider uppercase flex items-center gap-1.5">
            Request Progress Tracking
          </h3>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${
              progression.isCompleted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : progression.isRejected
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : progression.isReturned
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}
          >
            {progression.statusBadge}
          </span>
        </div>

        {/* Stepper Container: Responsive horizontal fit with smooth overflow for extra narrow screens */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2 scroll-smooth">
          <div
            className={`flex items-center justify-between relative w-full ${
              progression.workflowType === 'SOFTWARE' ? 'min-w-[540px]' : 'min-w-[700px] lg:min-w-0'
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
                  <div className="flex flex-col items-center z-10 group relative flex-1 min-w-0 max-w-[85px] sm:max-w-[95px]">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all duration-200 ${
                        isDone
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                          : isRejected
                          ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                          : isReturned
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 ring-offset-1 shadow-md'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {isDone ? (
                        <Check size={16} strokeWidth={2.8} />
                      ) : isRejected ? (
                        <AlertCircle size={16} />
                      ) : isReturned ? (
                        <Clock size={16} />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <span
                      className={`text-[9.5px] sm:text-[10.5px] font-semibold text-center mt-2 w-full leading-tight break-words px-0.5 ${
                        isCurrent
                          ? 'text-blue-600 font-extrabold'
                          : isDone
                          ? 'text-gray-800 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {name}
                    </span>
                  </div>

                  {/* Connector line between steps */}
                  {idx < stages.length - 1 && (
                    <div
                      className={`flex-1 min-w-[4px] sm:min-w-[8px] h-0.5 transition-all duration-300 -mt-6 sm:-mt-5 ${
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
        <div className="pt-4 mt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none cursor-pointer"
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
