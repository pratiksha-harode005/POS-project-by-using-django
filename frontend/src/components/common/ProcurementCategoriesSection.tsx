import React from 'react'
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
} from 'lucide-react'

export const procurementCategories = [
  {
    slug: 'it-hardware',
    icon: Laptop,
    title: 'IT Hardware',
    desc: 'Laptops, desktops, servers, monitors & peripheral equipment.',
    badge: 'Hardware',
    iconBg: 'bg-blue-50/90',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100/60',
  },
  {
    slug: 'software-saas',
    icon: Code,
    title: 'Software & SaaS',
    desc: 'Enterprise software licences, SaaS tools & cloud applications.',
    badge: 'Software',
    iconBg: 'bg-emerald-50/90',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100/60',
  },
  {
    slug: 'cloud-infrastructure',
    icon: Cloud,
    title: 'Cloud & Infrastructure',
    desc: 'Cloud servers, hosting, storage & cloud infrastructure services.',
    badge: 'Cloud',
    iconBg: 'bg-amber-50/90',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-100/60',
  },
  {
    slug: 'cybersecurity',
    icon: ShieldCheck,
    title: 'Cybersecurity',
    desc: 'Security software, firewalls, endpoint protection & audit tools.',
    badge: 'Security',
    iconBg: 'bg-purple-50/90',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100/60',
  },
  {
    slug: 'it-services',
    icon: Headphones,
    title: 'IT Services',
    desc: 'Managed IT services, technical consulting & support contracts.',
    badge: 'Services',
    iconBg: 'bg-teal-50/90',
    iconColor: 'text-teal-600',
    borderColor: 'border-teal-100/60',
  },
  {
    slug: 'office-accessories',
    icon: Box,
    title: 'Office Accessories',
    desc: 'Office supplies, ergonomic accessories, stationery & essentials.',
    badge: 'Supplies',
    iconBg: 'bg-rose-50/90',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-100/60',
  },
  {
    slug: 'office-technology',
    icon: Tv,
    title: 'Office Technology',
    desc: 'Displays, smart conference equipment, projectors & AV gear.',
    badge: 'AV & Tech',
    iconBg: 'bg-blue-50/90',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100/60',
  },
  {
    slug: 'networking-telecom',
    icon: Network,
    title: 'Networking & Telecom',
    desc: 'Routers, switches, cabling, VoIP systems & internet services.',
    badge: 'Telecom',
    iconBg: 'bg-emerald-50/90',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100/60',
  },
  {
    slug: 'training-certifications',
    icon: GraduationCap,
    title: 'Training & Certifications',
    desc: 'Professional IT courses, technical certifications & team upskilling.',
    badge: 'Learning',
    iconBg: 'bg-purple-50/90',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100/60',
  },
]

export default function ProcurementCategoriesSection() {
  return (
    <section className="py-16 md:py-24 bg-[#F8FAFC] border-t border-[#E2E8F0] relative overflow-hidden" aria-label="Procurement Categories">
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <div className="eyebrow mx-auto w-fit mb-3">Procurement Scope</div>
        <h2
          className="font-bold text-[#0F172A] mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 34px)', letterSpacing: '-0.02em' }}
        >
          Procurement Categories
        </h2>
        <p className="text-[#64748B] max-w-xl mx-auto mb-12" style={{ fontSize: '16px', lineHeight: 1.6 }}>
          Streamline purchase requests, approvals, vendor quotes, and purchase orders across all key technology categories.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {procurementCategories.map((cat) => {
            const Icon = cat.icon
            return (
              <div
                key={cat.title}
                id={cat.slug}
                className="feature-card relative bg-white border border-[#E2E8F0] rounded-2xl p-6 transition-all duration-300 hover:border-blue-200/80 hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Header row: Light subtle Icon & Category Tag Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${cat.iconBg} ${cat.iconColor} border ${cat.borderColor} flex items-center justify-center shrink-0`}>
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-500 font-mono">
                      {cat.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-bold text-[#0F172A] mb-2"
                    style={{ fontSize: '16px', letterSpacing: '-0.01em' }}
                  >
                    {cat.title}
                  </h3>

                  {/* Description */}
                  <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>
                    {cat.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
