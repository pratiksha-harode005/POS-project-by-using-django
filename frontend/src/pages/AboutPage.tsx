import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Lock,
  Building2,
  Award,
  HeartHandshake,
  Coins,
  BarChart3,
  Layers,
  Globe2,
  User,
  ShoppingCart,
  FileCheck2,
  Check,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

/* ─── Core Values List ─── */
const coreValues = [
  {
    icon: Zap,
    title: 'Frictionless Velocity',
    desc: 'Eliminating multi-week procurement delays through automated routing matrices, instant digital purchase orders, and real-time stakeholder alerts.',
    color: '#2563EB',
    bg: '#DBEAFE',
    tag: 'Efficiency',
  },
  {
    icon: ShieldCheck,
    title: 'Fiscal Governance & Audit Readiness',
    desc: 'Enforcing organizational spend thresholds, automated 3-way matching between POs, delivery receipts, and vendor invoices with immutable audit logging.',
    color: '#16A34A',
    bg: '#DCFCE7',
    tag: 'Compliance',
  },
  {
    icon: Coins,
    title: 'Spend Intelligence & Savings',
    desc: 'Empowering IT finance leaders with side-by-side quotation comparison matrices and historical pricing insights to maximize every purchasing budget.',
    color: '#D97706',
    bg: '#FEF3C7',
    tag: 'Optimization',
  },
  {
    icon: HeartHandshake,
    title: 'Transparent Vendor Synergy',
    desc: 'Fostering direct, transparent partnerships between enterprise purchasing teams and verified hardware/software suppliers.',
    color: '#7C3AED',
    bg: '#EDE9FE',
    tag: 'Partnerships',
  },
  {
    icon: Lock,
    title: 'Zero-Trust Data Protection',
    desc: 'Securing sensitive commercial agreements, financial records, and employee hardware allocations with role-based access control and TLS 1.3 encryption.',
    color: '#DB2777',
    bg: '#FCE7F3',
    tag: 'Security',
  },
  {
    icon: Layers,
    title: 'Modular & Cloud Scalable',
    desc: 'Built on a high-availability cloud infrastructure engineered to scale seamlessly from fast-growing startups to multi-branch global tech organizations.',
    color: '#0D9488',
    bg: '#CCFBF1',
    tag: 'Scalability',
  },
]

/* ─── Transformation Comparison Points ─── */
const transformationPoints = [
  {
    legacy: 'Manual paper forms, offline spreadsheets & lost email threads',
    modern: '1-click requisitions with automated department approval hierarchy',
  },
  {
    legacy: 'Rogue departmental purchases & unallocated duplicate SaaS seats',
    modern: 'Real-time department budget validation & 90-day subscription renewal alerts',
  },
  {
    legacy: 'Invoice discrepancies causing payment delays & vendor friction',
    modern: 'Automated 3-way matching between PO, GRN, and verified vendor invoices',
  },
  {
    legacy: 'Blind spending with zero category breakdown or forecasting',
    modern: 'Centralized live dashboard with real-time spend analytics & audit export',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION (Clean, Modern SaaS Hero with Ambient Soft Glow)
           ══════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden bg-gradient-to-b from-[#F0F7FE] via-[#F8FAFC] to-[#FFFFFF] py-12 sm:py-16 lg:py-20 select-none border-b border-blue-50/80"
          aria-labelledby="about-hero-heading"
        >
          {/* Subtle Ambient Background Mesh & Atmospheric Illumination */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute top-10 left-1/4 w-[500px] h-[350px] bg-blue-200/30 rounded-full blur-3xl transform-gpu" />
            <div className="absolute top-20 right-10 w-[450px] h-[400px] bg-indigo-200/25 rounded-full blur-3xl transform-gpu" />
          </div>

          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
              
              {/* Left Column: Mission Story & Typography (Shifted to RHS for optimal balance) */}
              <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start text-left z-10 lg:pl-10 xl:pl-16 2xl:pl-20">
                {/* Eyebrow Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/90 text-blue-700 text-xs font-semibold mb-5 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                  </span>
                  <span className="tracking-wide">About Procurement OS</span>
                </div>

                {/* H1 Main Heading */}
                <h1
                  id="about-hero-heading"
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-[44px] xl:text-[48px] font-black tracking-tight text-[#0F172A] leading-[1.18] sm:leading-[1.15] mb-5 w-full max-w-[540px]"
                >
                  <span className="block text-slate-900">Smarter Procurement.</span>
                  <span className="block mt-1 sm:mt-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent pb-1">
                    Built for IT Teams.
                  </span>
                </h1>

                {/* Subtitle Descriptions */}
                <p className="text-slate-600 text-sm sm:text-base lg:text-[16px] leading-relaxed max-w-[520px] mb-4 font-normal">
                  Procurement OS is a centralized enterprise platform engineered for IT organizations to manage purchasing, multi-tier approvals, certified vendors, department budgets, and invoice reconciliation in one unified workspace.
                </p>

                <p className="text-slate-600 text-sm sm:text-base lg:text-[16px] leading-relaxed max-w-[520px] mb-7 font-normal">
                  We built Procurement OS to eliminate the chaos of scattered spreadsheets, delayed approvals, and untracked SaaS renewals — giving finance and engineering leaders complete fiscal clarity and control.
                </p>

                {/* Action CTA Button */}
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/features"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-full inline-flex items-center gap-2.5 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Layers size={16} strokeWidth={2.2} />
                    <span>Explore Features</span>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </Link>
                </div>
              </div>

              {/* Right Column: High-Fidelity Enterprise Architecture Card (Arranged & Centered) */}
              <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center lg:justify-start xl:justify-start w-full lg:pr-6 xl:pr-10">
                <div className="relative w-full max-w-[520px] xl:max-w-[540px]">
                  {/* Ambient blur ring */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-blue-500/20 rounded-3xl blur-xl" />

                  {/* Main Visual Glass Card */}
                  <div className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(37,99,235,0.09)] hover:shadow-[0_24px_60px_rgba(37,99,235,0.13)] transition-all duration-300 space-y-4">
                    
                    {/* Top Header Row of Card */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                          <ShoppingCart size={17} strokeWidth={2.4} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 leading-tight">Procurement OS Ecosystem</div>
                          <div className="text-[11px] text-slate-500">Connected Enterprise Stack</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        99.99% Operational
                      </span>
                    </div>

                    {/* Step 1: Requisition to Approval */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <Zap size={19} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Multi-Tier Approval Matrix</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Team Lead → Finance → Admin Thresholds</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 shrink-0">
                        75% Faster
                      </span>
                    </div>

                    {/* Step 2: 3-Way Match & Compliance */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <ShieldCheck size={19} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Automated 3-Way Match</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">PO #PO-2026-045 matched with GRN & Invoice</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shrink-0">
                        100% Match
                      </span>
                    </div>

                    {/* Step 3: Real-Time Spend Intelligence */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <BarChart3 size={19} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Spend Analytics & Intelligence</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Side-by-side vendor quotation comparison</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 shrink-0">
                        ₹ 4.2M YTD
                      </span>
                    </div>

                    {/* Bottom Trust Stamp */}
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Lock size={13} className="text-slate-400" />
                        AES-256 Bit Encryption
                      </span>
                      <span className="font-semibold text-slate-600">Enterprise Cloud Ready</span>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════
            IMPACT METRICS STRIP (4 Distinct Icon Columns)
           ══════════════════════════════════════════════════════════════ */}
        <section className="border-y border-slate-100 bg-white/95 py-6 sm:py-8 select-none relative z-10" aria-label="Key Performance Indicators">
          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-slate-100 items-center justify-center">
              
              {/* Stat 1: Spend Managed */}
              <div className="flex items-center justify-start lg:justify-center gap-4 py-2 px-4 sm:px-6 lg:px-4 xl:px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#E0F2FE] text-[#0284C7] shadow-xs">
                  <ShoppingCart size={22} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">₹24M+</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Spend Managed</span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">Across 10,000+ purchase orders</span>
                </div>
              </div>

              {/* Stat 2: Cycle Time */}
              <div className="flex items-center justify-start lg:justify-center gap-4 py-2 px-4 sm:px-6 lg:px-4 xl:px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#FFEDD5] text-[#EA580C] shadow-xs">
                  <Zap size={22} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight leading-none">75% Faster</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Cycle Time</span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">From request submission to PO dispatch</span>
                </div>
              </div>

              {/* Stat 3: 3-Way Match */}
              <div className="flex items-center justify-start lg:justify-center gap-4 py-2 px-4 sm:px-6 lg:px-4 xl:px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#DCFCE7] text-[#16A34A] shadow-xs">
                  <ShieldCheck size={22} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">100%</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">3-Way Match</span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">Zero audit discrepancies & rogue spend</span>
                </div>
              </div>

              {/* Stat 4: Uptime SLA */}
              <div className="flex items-center justify-start lg:justify-center gap-4 py-2 px-4 sm:px-6 lg:px-4 xl:px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#F3E8FF] text-[#9333EA] shadow-xs">
                  <BarChart3 size={22} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight leading-none">99.99%</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Uptime SLA</span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">Enterprise-grade cloud infrastructure</span>
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════
            CORE VALUES SECTION (6 Balanced Cards Grid)
           ══════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-18 bg-[#F8FAFC]" aria-labelledby="core-values-heading">
          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
            
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-600 text-xs font-semibold tracking-wider uppercase mb-3 shadow-2xs">
                <Award size={12} className="text-blue-600" />
                <span>Our Core Principles</span>
              </div>
              <h2
                id="core-values-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3"
              >
                Built on Principles of <span className="text-blue-600">Integrity & Speed</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Every feature in Procurement OS is engineered around the real procurement and compliance challenges faced by high-growth tech organizations.
              </p>
            </div>

            {/* 6 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreValues.map((val) => {
                const Icon = val.icon
                return (
                  <div
                    key={val.title}
                    className="group bg-white border border-slate-200/80 hover:border-blue-400/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: val.bg }}
                        >
                          <Icon size={22} color={val.color} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
                          {val.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {val.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════
            LEGACY VS MODERN PROCUREMENT TRANSFORMATION
           ══════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-18 bg-white border-t border-slate-200/80" aria-label="Transformation comparison">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-600 text-xs font-semibold tracking-wider uppercase mb-3 shadow-2xs">
                <Sparkles size={12} className="text-blue-600" />
                <span>The Transformation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-3">
                Old Spreadsheets vs. <span className="text-blue-600">Procurement OS</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                See how Procurement OS transforms chaotic legacy workflows into a streamlined digital pipeline.
              </p>
            </div>

            {/* Comparison Table / Cards */}
            <div className="space-y-4">
              {transformationPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="grid md:grid-cols-2 gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors"
                >
                  {/* Legacy Way */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ✕
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">Legacy Way</span>
                      <p className="text-sm text-slate-600 leading-snug">{pt.legacy}</p>
                    </div>
                  </div>

                  {/* Procurement OS Way */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={16} strokeWidth={2.4} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Procurement OS</span>
                      <p className="text-sm font-medium text-slate-900 leading-snug">{pt.modern}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════
            QUOTE & CTA BANNER
           ══════════════════════════════════════════════════════════════ */}
        <section className="py-14 sm:py-18 bg-[#F0F7FE] border-t border-blue-100/80 relative overflow-hidden" aria-label="Call to action">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <blockquote className="mb-8">
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-relaxed tracking-tight">
                "Smarter procurement isn't just about purchasing hardware and software. It's about empowering your teams to build a resilient, audit-proof enterprise."
              </p>
              <footer className="mt-4 text-sm font-semibold text-blue-700">
                — The Procurement OS Engineering Team
              </footer>
            </blockquote>

            <div className="flex flex-wrap justify-center items-center gap-3.5">
              <Link
                to="/login"
                className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm sm:text-base px-7 py-3 rounded-full inline-flex items-center gap-2 shadow-md shadow-blue-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
              <Link
                to="/contact"
                className="bg-white hover:bg-blue-50 text-slate-800 border border-slate-300 font-semibold text-sm sm:text-base px-6 py-3 rounded-full inline-flex items-center gap-2 hover:-translate-y-0.5 transition-all shadow-2xs"
              >
                <span>Contact Sales</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
