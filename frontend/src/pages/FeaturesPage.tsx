import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Wallet,
  Tag,
  Package,
  Receipt,
  Laptop,
  Cloud,
  Bell,
  BarChart3,
  Settings,
  ArrowRight,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ProcurementCategoriesSection from '../components/common/ProcurementCategoriesSection'

const features = [
  {
    slug: 'purchase-requests',
    icon: FileText,
    title: 'Purchase Requests',
    desc: 'Create & track purchase requests with custom approval fields.',
    bg: '#DBEAFE',
    color: '#2563EB',
  },
  {
    slug: 'approvals-workflow',
    icon: CheckCircle2,
    title: 'Approvals',
    desc: 'Dynamic multi-level approval workflows with audit trail.',
    bg: '#DCFCE7',
    color: '#16A34A',
  },
  {
    slug: 'budget-spend-control',
    icon: Wallet,
    title: 'Budget Management',
    desc: 'Track budgets, commitments & available spend.',
    bg: '#FFEDD5',
    color: '#D97706',
  },
  {
    slug: 'vendor-management',
    icon: Tag,
    title: 'Vendor Management',
    desc: 'Manage vendors, RFQs, quotations in one place.',
    bg: '#EDE9FE',
    color: '#7C3AED',
  },
  {
    slug: 'purchase-orders',
    icon: Package,
    title: 'Purchase Orders',
    desc: 'Track POs end-to-end with real-time status.',
    bg: '#FCE7F3',
    color: '#DB2777',
  },
  {
    slug: 'complete-lifecycle',
    icon: Receipt,
    title: 'Invoice & Matching',
    desc: 'PO + receipt + invoice three-way matching made easy.',
    bg: '#CCFBF1',
    color: '#0D9488',
  },
  {
    slug: 'it-assets',
    icon: Laptop,
    title: 'IT Assets',
    desc: 'Track hardware lifecycle, assignments & audit trail.',
    bg: '#DBEAFE',
    color: '#2563EB',
  },
  {
    slug: 'saas-cloud',
    icon: Cloud,
    title: 'SaaS & Cloud',
    desc: 'Manage software licences, subscriptions & cloud spend.',
    bg: '#DCFCE7',
    color: '#16A34A',
  },
  {
    slug: 'notifications',
    icon: Bell,
    title: 'Notifications',
    desc: 'Approval, renewal & system alerts in real time.',
    bg: '#EDE9FE',
    color: '#7C3AED',
  },
  {
    slug: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Spend, usage & procurement reports at a glance.',
    bg: '#FFEDD5',
    color: '#D97706',
  },
]

export default function FeaturesPage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ══════════════════════════════════════
            FEATURES HEADER
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#EFF6FF' }}
          className="py-16 md:py-20 text-center"
          aria-labelledby="features-heading"
        >
          <div className="max-w-3xl mx-auto px-6">
            <div className="eyebrow mx-auto w-fit">Key features</div>
            <h1
              id="features-heading"
              className="font-bold text-[#0F172A] mb-4"
              style={{ fontSize: 'clamp(26px, 4vw, 36px)', letterSpacing: '-0.02em' }}
            >
              Everything You Need in One Platform
            </h1>
            <p
              style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.7 }}
            >
              Powerful features to simplify procurement, improve control and drive efficiency across your IT organisation.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURE CARDS GRID
        ══════════════════════════════════════ */}
        <section className="bg-white py-16" aria-label="Feature grid">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* First 9 regular cards */}
              {features.slice(0, 9).map(({ slug, icon: Icon, title, desc, bg, color }) => (
                <div
                  key={slug}
                  id={slug}
                  className="feature-card block bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={20} color={color} strokeWidth={2} />
                    </div>
                  </div>
                  <h2
                    className="font-bold mb-2 group-hover:text-blue-600 transition-colors"
                    style={{ fontSize: '16px', color: '#0F172A' }}
                  >
                    {title}
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}

              {/* 10th card: Analytics */}
              {(() => {
                const f10 = features[9]
                const AnalyticsIcon = f10.icon
                return (
                  <div
                    key={f10.slug}
                    id={f10.slug}
                    className="feature-card block bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: f10.bg }}
                      >
                        <AnalyticsIcon size={20} color={f10.color} strokeWidth={2} />
                      </div>
                    </div>
                    <h2
                      className="font-bold mb-2 group-hover:text-blue-600 transition-colors"
                      style={{ fontSize: '16px', color: '#0F172A' }}
                    >
                      {f10.title}
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{f10.desc}</p>
                  </div>
                )
              })()}

              {/* 11th special card: spans full row on large screen, dark navy */}
              <div
                className="feature-card block sm:col-span-2 lg:col-span-2 rounded-2xl p-8 hover:border-blue-500 hover:shadow-xl transition-all text-left group"
                style={{ backgroundColor: '#0F172A' }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(37,99,235,0.25)' }}
                  >
                    <Settings size={28} color="#60A5FA" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2
                        className="font-bold text-white mb-2 group-hover:text-blue-400 transition-colors"
                        style={{ fontSize: '18px', letterSpacing: '-0.02em' }}
                      >
                        All Modules Work Together
                      </h2>
                    </div>
                    <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
                      All modules work together for a seamless procurement experience — from the first purchase request to final payment reconciliation.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            PROCUREMENT CATEGORIES SECTION
        ══════════════════════════════════════ */}
        <ProcurementCategoriesSection />
      </main>

      <Footer />
    </>
  )
}
