import React, { useState, useMemo, useEffect } from 'react'
import { Check, Clock, AlertCircle, User, ChevronDown } from 'lucide-react'
import {
  WorkflowType,
  SOFTWARE_STAGES,
  HARDWARE_STAGES,
  getWorkflowProgression,
} from '../../utils/workflowUtils'

export const STEP_NAMES = HARDWARE_STAGES

const getHistoryFallbackTimestamp = (lastUpdated: string, time: string, rawStatus?: string) => {
  if (lastUpdated) return `${lastUpdated} ${time}`
  return rawStatus ? 'Not available' : `2026-09-11 ${time}`
}

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
  rawStatus?: string
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
  finalApprovalBy?: string
  approvalPath?: string
  timeline?: Array<{
    stage: number
    title: string
    status: 'completed' | 'current' | 'pending'
    role: string
    actor: string
    timestamp: string | null
    comments: string
  }>
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
  rawStatus,
  currentlyWith,
  lastUpdated = '',
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
  finalApprovalBy,
  approvalPath,
  timeline,
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
  const hasBackendTimeline = Boolean(timeline && Array.isArray(timeline) && timeline.length > 0)

  // Compute progression based on category, status, and workflow rules
  const progression = useMemo(() => {
    const res = getWorkflowProgression({
      status,
      raw_status: rawStatus,
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
      timeline,
      finalApprovalBy,
      approvalPath,
    })
    return res
  }, [
    status,
    rawStatus,
    financeStatus,
    category,
    title,
    paymentStatus,
    currentStage,
    explicitWorkflowType,
    history,
    approval_steps,
    rfqId,
    poNumber,
    grnNumber,
    invoiceNumber,
    isVerified,
    documentsVerified,
    grn_status,
    invoice_status,
    is_invoice_verified,
    timeline,
    finalApprovalBy,
    approvalPath,
    tick
  ])

  const effectiveCurrentlyWith = currentlyWith || progression.currentlyWith
  const effectiveStageIdx = hasBackendTimeline
    ? (() => {
        const curIdx = timeline!.findIndex(t => (t.status || '').toLowerCase() === 'current')
        if (curIdx !== -1) return curIdx
        if (timeline!.every(t => (t.status || '').toLowerCase() === 'completed')) return timeline!.length - 1
        return progression.currentStageIndex
      })()
    : progression.currentStageIndex
  const stages = hasBackendTimeline ? timeline!.map(t => t.title) : progression.stages

  // Dynamic history based strictly on active progression stages
  const effectiveHistory: StepHistoryItem[] = useMemo(() => {
    if (hasBackendTimeline && timeline && timeline.length > 0) {
      const recorded = timeline
        .filter(t => t.timestamp || t.comments || (t.status || '').toLowerCase() === 'completed' || (t.status || '').toLowerCase() === 'current')
        .map(t => {
          const st = (t.status || '').toLowerCase()
          return {
            stageNumber: t.stage,
            stageName: t.title,
            actor: t.actor ? `${t.actor} (${t.role})` : t.role,
            action: st === 'completed' ? 'Completed' : st === 'current' ? 'In Progress' : 'Pending',
            timestamp: t.timestamp ? new Date(t.timestamp).toLocaleString() : 'Pending',
            note: t.comments || (st === 'completed' ? `${t.title} successfully completed.` : undefined),
          }
        })
      if (recorded.length > 0) return recorded
    }

    if (history && history.length > 0) return history

    const isSoftware = progression.workflowType === 'SOFTWARE'
    const items: StepHistoryItem[] = [
      {
        stageNumber: 1,
        stageName: 'Create Request',
        actor: 'Team Lead (Requester)',
        action: 'Request Created & Submitted',
        timestamp: getHistoryFallbackTimestamp(lastUpdated, '09:30 AM', rawStatus),
        note: 'Initial procurement request submitted for approval.',
      },
    ]

    if (isSoftware) {
      // Software 6-Stage Workflow History Fallback
      if (effectiveStageIdx >= 1) {
        items.push({
          stageNumber: 2,
          stageName: 'PM Review',
          actor: 'Project Manager — Sarah Manager',
          action: effectiveStageIdx === 1 ? 'Under Review & Pre-Estimation' : 'PM Review Completed',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, '11:15 AM', rawStatus),
          note:
            effectiveStageIdx === 1
              ? 'Request is currently undergoing manager budget and pre-estimation review.'
              : 'PM review and pre-estimation completed.',
        })
      }

      if (effectiveStageIdx >= 2) {
        items.push({
          stageNumber: 3,
          stageName: 'Request Approved',
          actor: 'Sarah Manager (Procurement Manager)',
          action: effectiveStageIdx === 2 ? 'Pending Final Recommendation' : 'Request Approved & Forwarded',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, '01:30 PM', rawStatus),
          note: 'Request approved by PM and recommended to Finance Directorate.',
        })
      }

      if (effectiveStageIdx >= 3) {
        items.push({
          stageNumber: 4,
          stageName: 'Payment Approved',
          actor: 'Mark Finance (Finance Directorate)',
          action: effectiveStageIdx === 3 ? 'Under Financial Audit' : 'Payment Approved',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, '03:00 PM', rawStatus),
          note: 'Commercial budget approved and capital authorized for disbursement.',
        })
      }

      if (effectiveStageIdx >= 4) {
        items.push({
          stageNumber: 5,
          stageName: 'Payment Justified',
          actor: 'Treasury & Bank Clearing',
          action: effectiveStageIdx === 4 ? 'Awaiting Payment Disbursement' : 'Payment Justified & Settled',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, '04:15 PM', rawStatus),
          note: 'Transaction executed and UTR justification recorded.',
        })
      }

      if (effectiveStageIdx >= 5 || progression.isCompleted) {
        items.push({
          stageNumber: 6,
          stageName: 'Request Closed',
          actor: 'Team Lead / Requester',
          action: progression.isCompleted ? 'Request Closed & Verified' : 'Awaiting Receipt Confirmation',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, '05:00 PM', rawStatus),
          note: 'Software credentials received, verified, and procurement request closed.',
        })
      }
    } else {
      // Dynamic hardware supply chain steps fallback
      const hwStageDetails: Record<string, { actor: string; time: string; note: string }> = {
        'Manager Approval': {
          actor: 'Sarah Manager',
          time: '11:15 AM',
          note: 'Manager reviews and approves the procurement request.',
        },
        'Finance Approval': {
          actor: 'Mark Finance',
          time: '02:45 PM',
          note: 'Finance review and budget allocation verification.',
        },
        'Admin Approval': {
          actor: 'Priyanka Sharma (Admin)',
          time: '04:30 PM',
          note: 'Executive procurement governance and compliance sign-off.',
        },
        'RFQ Sent': {
          actor: 'Procurement Sourcing Team',
          time: '09:00 AM',
          note: 'Request for Quotations dispatched to verified vendors.',
        },
        'Vendor Quotes Received': {
          actor: 'Vendor Sourcing Desk',
          time: '01:20 PM',
          note: 'Vendor quotations are collected and evaluated.',
        },
        'Product Order': {
          actor: 'Vendor Partner',
          time: '02:00 PM',
          note: 'The selected quotation proceeds to product ordering.',
        },
        Delivery: {
          actor: 'Logistics & Dock',
          time: '03:00 PM',
          note: 'Ordered goods proceed through delivery and receiving.',
        },
        'Verification and Order Complete': {
          actor: 'Procurement Audit & Operations',
          time: '04:00 PM',
          note: 'Delivery and order documents are verified for payment release.',
        },
        Payment: {
          actor: 'Treasury & Finance',
          time: '04:45 PM',
          note: 'Procurement payment disbursed to supplier to settle order fulfillment.',
        },
        'Payment Completed': {
          actor: 'Treasury & Finance',
          time: '04:45 PM',
          note: 'Procurement payment disbursed to supplier to settle order fulfillment.',
        },
      }

      progression.stages.slice(1).forEach((stageName, offset) => {
        const stageIndex = offset + 1
        if (stageIndex > effectiveStageIdx) return
        const detail = hwStageDetails[stageName] || {
          actor: 'Procurement Operations',
          time: '02:00 PM',
          note: `${stageName} processed.`,
        }
        items.push({
          stageNumber: stageIndex + 1,
          stageName,
          actor: detail.actor,
          action: stageIndex === effectiveStageIdx ? (progression.isCompleted ? 'Completed' : 'In Progress') : 'Completed',
          timestamp: getHistoryFallbackTimestamp(lastUpdated, detail.time, rawStatus),
          note: detail.note,
        })
      })
    }

    return items
  }, [history, hasBackendTimeline, timeline, effectiveStageIdx, lastUpdated, progression.workflowType, progression.isCompleted])

  // Derive active status badge that works with both backend timeline and client progression
  const statusBadge = useMemo(() => {
    if (hasBackendTimeline && timeline && timeline.length > 0) {
      const activeIdx = timeline.findIndex(t => (t.status || '').toLowerCase() === 'current')
      if (activeIdx !== -1) {
        return `${timeline[activeIdx].title} (Stage ${activeIdx + 1}/${timeline.length})`
      }
      if (timeline.every(t => (t.status || '').toLowerCase() === 'completed')) {
        return `${timeline[timeline.length - 1].title} (Stage ${timeline.length}/${timeline.length})`
      }
    }
    return progression.statusBadge
  }, [hasBackendTimeline, timeline, progression.statusBadge])

  const isSoftware = progression.workflowType === 'SOFTWARE'

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
              {progression.workflowType === 'SOFTWARE' ? 'Software / Digital (6 Stages)' : `Hardware Workflow (${stages.length} Stages)`}
            </span>
          </div>
        </div>
      )}

      {/* Main Stepper Card */}
      <div className="w-full bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
            Request Progress Tracking
          </h3>
          <span
            className={`px-3.5 py-1 text-xs font-semibold rounded-full ${
              progression.isRejected
                ? 'bg-red-100 text-red-800'
                : progression.isReturned
                ? 'bg-amber-100 text-amber-800'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {statusBadge}
          </span>
        </div>

        {/* Stepper Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-4 pt-1">
          <div
            style={{
              minWidth: stages.length <= 6 ? '660px' : '960px',
            }}
          >
            {/* ── ROW 1: Circles + Connector Lines ── */}
            {/* All circles sit on a single horizontal axis; connectors are
                absolutely sandwiched at the vertical midpoint of the circles.
                Labels live in ROW 2 and cannot affect this row's geometry. */}
            <div className="relative flex items-center px-2">
              {stages.map((name, idx) => {
                let isDone = false
                let isCurrent = false
                let isRejected = false
                let isReturned = false

                if (hasBackendTimeline && timeline && timeline[idx]) {
                  const t = timeline[idx]
                  const st = (t.status || '').toLowerCase()
                  isDone = st === 'completed'
                  isCurrent = st === 'current'
                  isRejected = isCurrent && (st === 'rejected' || progression.isRejected)
                  isReturned = isCurrent && (st === 'returned' || progression.isReturned)
                } else {
                  isDone =
                    idx < effectiveStageIdx ||
                    (idx === effectiveStageIdx && progression.isCompleted)
                  isCurrent = idx === effectiveStageIdx && !progression.isCompleted
                  isRejected = isCurrent && progression.isRejected
                  isReturned = isCurrent && progression.isReturned
                }

                return (
                  <React.Fragment key={`circle-${name}-${idx}`}>
                    {/* Step Circle — fixed 36×36, perfectly centered in its flex slot */}
                    <div className="flex-none flex items-center justify-center" style={{ width: '36px' }}>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 relative z-10 ${
                          isDone
                            ? 'bg-purple-600 text-white shadow-xs'
                            : isRejected
                            ? 'bg-red-600 text-white ring-4 ring-red-100'
                            : isReturned
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                            : isCurrent
                            ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-sm'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
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
                    </div>

                    {/* Connector line — stretches between adjacent circles */}
                    {idx < stages.length - 1 && (
                      <div className="flex-1 h-[2px] z-0">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isDone ? 'bg-purple-600' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* ── ROW 2: Labels ── */}
            {/* Uses position:absolute + translateX(-50%) so the label is
                always perfectly centered under its circle and never clipped
                by the 36px cell boundary. The row itself has overflow:visible
                and a fixed min-height so every step's label area is identical. */}
            <div
              className="flex items-start px-2 mt-2"
              style={{ overflow: 'visible' }}
            >
              {stages.map((name, idx) => {
                let isDone = false
                let isCurrent = false

                if (hasBackendTimeline && timeline && timeline[idx]) {
                  const st = (timeline[idx].status || '').toLowerCase()
                  isDone = st === 'completed'
                  isCurrent = st === 'current'
                } else {
                  isDone =
                    idx < effectiveStageIdx ||
                    (idx === effectiveStageIdx && progression.isCompleted)
                  isCurrent = idx === effectiveStageIdx && !progression.isCompleted
                }

                return (
                  <React.Fragment key={`label-${name}-${idx}`}>
                    {/* Anchor cell: same width as the circle (36px).
                        position:relative lets the absolute label use it as origin. */}
                    <div
                      className="flex-none"
                      style={{
                        position: 'relative',
                        width: '36px',
                        /* Reserve the tallest possible label height so the row
                           never collapses and every label top edge is identical. */
                        minHeight: '4.5em',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          transform: 'translateX(-50%)',
                          /* Fixed label width — wide enough for longest label
                             without overlapping adjacent labels at 12 steps */
                          width: '72px',
                          textAlign: 'center',
                          fontSize: '0.68rem',
                          lineHeight: '1.25em',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? '#7c3aed' : isDone ? '#1e293b' : '#94a3b8',
                          overflowWrap: 'normal',
                          wordBreak: 'normal',
                          whiteSpace: 'normal',
                          hyphens: 'none',
                        }}
                      >
                        {name}
                      </span>
                    </div>

                    {/* Flex spacer mirrors the connector between circles */}
                    {idx < stages.length - 1 && (
                      <div className="flex-1" style={{ minHeight: '4.5em' }} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer: View History Toggle & Last Updated */}
        <div className="pt-4 mt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none cursor-pointer"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}
            />
            <span>View full history ({effectiveHistory.length} steps)</span>
          </button>

          <span className="text-gray-400 text-xs">
            Last updated: {lastUpdated || 'Not available'}
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
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
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
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
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
