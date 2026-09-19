import React, { useState } from 'react'
import {
  Sparkles,
  CheckCircle,
  Award,
  Star,
  Users,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Building,
  Check,
  Info,
} from 'lucide-react'
import { MASTER_VENDORS, VendorRecord } from '../../portals/vendor/VendorPortalPages'
import { PurchaseRequest } from '../../context/ProcurementContext'
import { isFlowBCategory } from './TrackingStepper'

interface VendorRecommendationPanelProps {
  request: PurchaseRequest
  onConfirmVendor: (vendorId: string, vendorName: string, notes?: string) => void
  onSendRFQ: (requestId: string) => void
}

export function rankVendorsForCategory(category: string): Array<VendorRecord & { rankScore: number; onTimeRate: string; reasoning: string }> {
  // Flow B categories do not use vendor bidding or vendor POs
  if (isFlowBCategory(category)) {
    return []
  }

  // Find active Flow A vendors matching category
  let matches = MASTER_VENDORS.filter(
    (v: VendorRecord) => v.category.toLowerCase() === category.toLowerCase() && v.status === 'Active'
  )

  // Fallback to active Flow A vendors only if no direct match for custom category
  if (matches.length === 0) {
    matches = MASTER_VENDORS.filter((v: VendorRecord) => v.status === 'Active').slice(0, 3)
  }

  // Calculate weighted rank score per vendor
  const ranked = matches.map((v: VendorRecord, idx: number) => {
    const perfNum = parseFloat(v.score) || 90.0
    // Deterministic delivery rate and price score derived from vendor ID seed
    const seed = v.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    const onTimeNum = 92.0 + (seed % 7.5)
    const priceNum = 90.0 + ((seed * 3) % 9.0)

    const rankScore = Number(((perfNum * 0.5) + (onTimeNum * 0.3) + (priceNum * 0.2)).toFixed(1))
    const onTimeRate = `${onTimeNum.toFixed(1)}%`

    let reasoning = ''
    if (idx === 0) {
      reasoning = `⭐ Top Ranked Choice: ${v.score} Performance Score · ${onTimeRate} On-Time Delivery Rate · Pre-negotiated Tier 1 Contract`
    } else if (idx === 1) {
      reasoning = `Runner-up: ${v.score} Performance Score · ${onTimeRate} On-Time Delivery Rate`
    } else {
      reasoning = `Qualified Vendor: ${v.score} Performance Score`
    }

    return {
      ...v,
      rankScore,
      onTimeRate,
      reasoning,
    }
  })

  return ranked.sort((a: { rankScore: number }, b: { rankScore: number }) => b.rankScore - a.rankScore)
}

export const VendorRecommendationPanel: React.FC<VendorRecommendationPanelProps> = ({
  request,
  onConfirmVendor,
  onSendRFQ,
}) => {
  const isFlowB = request.flowType === 'B' || isFlowBCategory(request.category)

  if (isFlowB) {
    return (
      <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-5 text-xs text-purple-950 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-purple-950">
          <ShieldCheck size={18} className="text-purple-600" /> Direct Fund Release Request (Flow B Category)
        </div>
        <p className="text-purple-800 leading-snug">
          Category <strong>{request.category}</strong> is a designated Flow B (no-vendor) category. This request routes directly to Team Lead Fund Release upon approval, bypassing vendor selection, RFQs, and Purchase Orders.
        </p>
      </div>
    )
  }

  const rankedVendors = rankVendorsForCategory(request.category)
  const topVendor = rankedVendors[0]

  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedAltId, setSelectedAltId] = useState<string>(topVendor?.id || '')
  const [confirming, setConfirming] = useState(false)

  if (!topVendor) return null

  const selectedVendor = rankedVendors.find((v) => v.id === selectedAltId) || topVendor

  const handleConfirm = (vId: string, vName: string) => {
    setConfirming(true)
    setTimeout(() => {
      onConfirmVendor(vId, vName, `Confirmed via AI Vendor Recommendation Panel (${vId})`)
      setConfirming(false)
    }, 400)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                AI AUTOMATED RANKING ENGINE
              </span>
              <span className="text-[10px] font-bold bg-blue-950/50 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                Category: {request.category}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-1">
              Vendor Assignment & Recommendation
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-blue-200 font-semibold block">Available Category Vendors</span>
          <span className="text-lg font-black text-white">{rankedVendors.length} Eligible</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-5">
        {/* Top Recommendation Highlight Card */}
        <div className="p-5 rounded-2xl bg-blue-50/60 border-2 border-blue-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                <Star size={12} className="fill-white" /> #1 RECOMMENDED VENDOR
              </span>
              <span className="text-xs font-bold text-gray-500">{topVendor.id}</span>
            </div>
            <span className="text-xs font-black text-blue-900 bg-blue-100/90 px-2.5 py-1 rounded-lg border border-blue-200">
              Rank Score: {topVendor.rankScore} / 100
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-lg font-black text-gray-900">{topVendor.name}</h4>
              <p className="text-gray-600 text-xs mt-0.5">
                Contact: <strong className="text-gray-800">{topVendor.contactPerson}</strong> ({topVendor.email})
              </p>
              <div className="mt-3 p-3 bg-white/90 rounded-xl border border-blue-200/80 text-blue-950 font-medium text-xs leading-snug shadow-xs">
                {topVendor.reasoning}
              </div>
            </div>

            {/* Score Breakdown Metrics */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 space-y-2 text-xs flex flex-col justify-center">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-gray-500 font-semibold">Performance Score</span>
                <strong className="text-blue-700 font-extrabold">{topVendor.score}</strong>
              </div>
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-gray-500 font-semibold">On-Time Delivery</span>
                <strong className="text-indigo-700 font-extrabold">{topVendor.onTimeRate}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Risk Rating</span>
                <strong className="text-green-700 font-extrabold">{topVendor.risk} Risk</strong>
              </div>
            </div>
          </div>

          {/* Primary One-Click Action */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="text-gray-500 text-[11px]">
              Assigned PO amount: <strong className="text-gray-900 font-bold">RS {request.estimatedCost.toLocaleString()}</strong>
            </div>

            <button
              disabled={confirming}
              onClick={() => handleConfirm(topVendor.id, topVendor.name)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle size={16} /> Confirm Recommended Vendor
            </button>
          </div>
        </div>

        {/* Alternative Vendors Accordion */}
        {rankedVendors.length > 1 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
            <button
              onClick={() => setShowAlternatives((v) => !v)}
              className="w-full px-4 py-3 bg-white flex items-center justify-between text-xs font-bold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                Choose Different Vendor ({rankedVendors.length - 1} Alternatives Available)
              </span>
              {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAlternatives && (
              <div className="p-4 space-y-3 border-t border-gray-200">
                <p className="text-gray-500 text-[11px]">
                  Manually select any other vendor registered under <strong>{request.category}</strong>:
                </p>

                <div className="space-y-2">
                  {rankedVendors.slice(1).map((v, idx) => (
                    <div
                      key={v.id}
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                        selectedAltId === v.id
                          ? 'bg-blue-50/80 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded text-[10px]">
                            #{idx + 2} Choice
                          </span>
                          <span className="font-bold text-gray-900">{v.name}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({v.id})</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Score: <strong className="text-gray-800">{v.score}</strong> • On-Time:{' '}
                          <strong className="text-gray-800">{v.onTimeRate}</strong> • Contact: {v.contactPerson}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAltId(v.id)
                          handleConfirm(v.id, v.name)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check size={14} /> Assign {v.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback Option: Send RFQ to Multiple */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h5 className="font-bold text-blue-950 flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-blue-600" /> Need Real Competitive Quotations?
            </h5>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Fall back to the multi-vendor RFQ bidding & quotation comparison workflow if custom pricing is required.
            </p>
          </div>
          <button
            onClick={() => onSendRFQ(request.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Send RFQ to Multiple <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
