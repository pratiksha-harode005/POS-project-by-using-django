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
    bg: '#DBEAFE',
    color: '#2563EB',
    badge: 'Hardware',
  },
  {
    slug: 'software-saas',
    icon: Code,
    title: 'Software & SaaS',
    desc: 'Enterprise software licences, SaaS tools & cloud applications.',
    bg: '#DCFCE7',
    color: '#16A34A',
    badge: 'Software',
  },
  {
    slug: 'cloud-infrastructure',
    icon: Cloud,
    title: 'Cloud & Infrastructure',
    desc: 'Cloud servers, hosting, storage & cloud infrastructure services.',
    bg: '#FFEDD5',
    color: '#D97706',
    badge: 'Cloud',
  },
  {
    slug: 'cybersecurity',
    icon: ShieldCheck,
    title: 'Cybersecurity',
    desc: 'Security software, firewalls, endpoint protection & audit tools.',
    bg: '#EDE9FE',
    color: '#7C3AED',
    badge: 'Security',
  },
  {
    slug: 'it-services',
    icon: Headphones,
    title: 'IT Services',
    desc: 'Managed IT services, technical consulting & support contracts.',
    bg: '#CCFBF1',
    color: '#0D9488',
    badge: 'Services',
  },
  {
    slug: 'office-accessories',
    icon: Box,
    title: 'Office Accessories',
    desc: 'Office supplies, ergonomic accessories, stationery & essentials.',
    bg: '#FCE7F3',
    color: '#DB2777',
    badge: 'Supplies',
  },
  {
    slug: 'office-technology',
    icon: Tv,
    title: 'Office Technology',
    desc: 'Displays, smart conference equipment, projectors & AV gear.',
    bg: '#DBEAFE',
    color: '#2563EB',
    badge: 'AV & Tech',
  },
  {
    slug: 'networking-telecom',
    icon: Network,
    title: 'Networking & Telecom',
    desc: 'Routers, switches, cabling, VoIP systems & internet services.',
    bg: '#DCFCE7',
    color: '#16A34A',
    badge: 'Telecom',
  },
  {
    slug: 'training-certifications',
    icon: GraduationCap,
    title: 'Training & Certifications',
    desc: 'Professional IT courses, technical certifications & team upskilling.',
    bg: '#EDE9FE',
    color: '#7C3AED',
    badge: 'Learning',
  },
]

export default function ProcurementCategoriesSection() {
  return (
    <section className="py-16 md:py-24 bg-[#F8FAFC] border-t border-[#E5E7EB] relative overflow-hidden" aria-label="Procurement Categories">
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
          {procurementCategories.map((cat, index) => {
            const Icon = cat.icon
            return (
              <div
                key={cat.title}
                className="group relative bg-white border border-[#E5E7EB] rounded-2xl p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 flex flex-col justify-between overflow-hidden"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Top accent colored bar on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: cat.color }}
                />

                <div>
                  {/* Header row: Icon & Tag Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 shadow-xs"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <Icon size={22} color={cat.color} strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-300 font-mono">
                      {cat.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-bold mb-2 transition-colors duration-200 group-hover:text-blue-600"
                    style={{ fontSize: '17px', color: '#0F172A', letterSpacing: '-0.01em' }}
                  >
                    {cat.title}
                  </h3>

                  {/* Description */}
                  <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{cat.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
