import { Link } from 'react-router-dom'
import { X, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react'

export interface CardDetailItem {
  title: string
  subtitle?: string
  icon: any
  bg?: string
  color?: string
  description: string
  capabilities: string[]
  benefits?: string[]
}

interface CardDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: CardDetailItem | null
}

export default function CardDetailModal({ isOpen, onClose, item }: CardDetailModalProps) {
  if (!isOpen || !item) return null

  const Icon = item.icon
  const bgStyle = item.bg || '#DBEAFE'
  const colorStyle = item.color || '#2563EB'

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 space-y-6 relative overflow-hidden text-slate-900">

        {/* Top Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: bgStyle.startsWith('#') ? bgStyle : undefined,
              }}
            >
              <Icon
                size={26}
                color={colorStyle.startsWith('#') ? colorStyle : undefined}
                strokeWidth={2.2}
              />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mb-1 font-mono">
                {item.subtitle || 'Feature Module'}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {item.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Overview Paragraph */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            {item.description}
          </p>
        </div>

        {/* Key Capabilities Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Key Capabilities & Features
          </h4>
          <div className="grid gap-2.5">
            {item.capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-100 shadow-2xs hover:border-blue-200 transition-colors"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.2} />
                <span className="text-xs text-slate-700 font-semibold leading-normal">
                  {cap}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section (if provided) */}
        {item.benefits && item.benefits.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Value & Organizational Impact
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {item.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <Link
            to="/login"
            onClick={onClose}
            className="btn-primary text-xs py-2.5 px-5 rounded-xl flex items-center gap-2"
          >
            Explore in Portal <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  )
}
