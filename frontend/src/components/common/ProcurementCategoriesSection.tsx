import React from 'react'
import { Link } from 'react-router-dom'
import {
  Laptop,
  Code,
  Cloud,
  ShieldCheck,
  Headphones,
  Box,
  Tv,
  Network,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'

export const procurementCategories = [
  {
    slug: 'it-hardware',
    icon: Laptop,
    title: 'IT Hardware',
    desc: 'Laptops, desktops, servers, monitors & peripheral equipment.',
    badge: 'Hardware',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
  },
  {
    slug: 'software-saas',
    icon: Code,
    title: 'Software & SaaS',
    desc: 'Enterprise software licences, SaaS tools & cloud applications.',
    badge: 'Software',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  {
    slug: 'cloud-infrastructure',
    icon: Cloud,
    title: 'Cloud & Infrastructure',
    desc: 'Cloud servers, hosting, storage & cloud infrastructure services.',
    badge: 'Cloud',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-100',
  },
  {
    slug: 'cybersecurity',
    icon: ShieldCheck,
    title: 'Cybersecurity',
    desc: 'Security software, firewalls, endpoint protection & audit tools.',
    badge: 'Security',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100',
  },
  {
    slug: 'it-services',
    icon: Headphones,
    title: 'IT Services',
    desc: 'Managed IT services, technical consulting & support contracts.',
    badge: 'Services',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    borderColor: 'border-teal-100',
  },
  {
    slug: 'office-accessories',
    icon: Box,
    title: 'Office Accessories',
    desc: 'Office supplies, ergonomic accessories, stationery & essentials.',
    badge: 'Supplies',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-100',
  },
  {
    slug: 'office-technology',
    icon: Tv,
    title: 'Office Technology',
    desc: 'Displays, smart conference equipment, projectors & AV gear.',
    badge: 'AV & Tech',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
  },
  {
    slug: 'networking-telecom',
    icon: Network,
    title: 'Networking & Telecom',
    desc: 'Routers, switches, cabling, VoIP systems & internet services.',
    badge: 'Telecom',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  {
    slug: 'training-certifications',
    icon: GraduationCap,
    title: 'Training & Certifications',
    desc: 'Professional IT courses, technical certifications & team upskilling.',
    badge: 'Learning',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100',
  },
]

interface ProcurementCategoriesSectionProps {
  onSelectCategory?: (category: typeof procurementCategories[0]) => void
}

export default function ProcurementCategoriesSection({ onSelectCategory }: ProcurementCategoriesSectionProps = {}) {
  return (
    <section id="procurement-categories" className="py-16 md:py-22 bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9]/50 to-[#FFFFFF] border-t border-slate-200/80 relative overflow-hidden scroll-mt-16" aria-label="Procurement Categories">
      {/* Subtle Background Light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-radial from-blue-500/5 via-indigo-500/2 to-transparent blur-3xl" />
      </div>

      <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 text-center relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <span>Procurement Scope</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight mb-3"
          >
            Procurement Categories
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Streamline purchase requests, approvals, vendor quotes, and purchase orders across all key technology categories.
          </p>
        </div>

        {/* 9 Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {procurementCategories.map((cat) => {
            const Icon = cat.icon
            return (
              <div
                key={cat.title}
                id={cat.slug}
                onClick={() => onSelectCategory?.(cat)}
                className="group relative bg-white/95 backdrop-blur-xs border border-slate-200/90 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_16px_32px_-10px_rgba(37,99,235,0.12)] hover:-translate-y-1 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
              >
                {/* Top Accent Gradient Border Line (reveals on hover) */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  {/* Header row: Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${cat.iconBg} ${cat.iconColor} border ${cat.borderColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-600 font-mono border border-slate-200/60">
                      {cat.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors mb-2 tracking-tight"
                  >
                    {cat.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-4">
                    {cat.desc}
                  </p>
                </div>

                {/* Footer Link */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                  <span>Explore category</span>
                  <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
