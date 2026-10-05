import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Tag,
  Package,
  CreditCard,
  BarChart3,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Coins,
  Cloud,
  Users,
  Lock,
  LayoutGrid,
  ChevronDown,
  ShoppingCart,
  User,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DashboardIllustration from '../components/common/DashboardIllustration'
import ProcurementCategoriesSection from '../components/common/ProcurementCategoriesSection'
import CardDetailModal, { CardDetailItem } from '../components/common/CardDetailModal'

/* ─── 6 "Why Choose Procurement OS" Premium Cards ─── */
const whyChooseCards = [
  {
    id: 'faster-procurement',
    title: 'Faster Procurement',
    tagline: 'End-to-End Automation',
    desc: 'Streamline requests, approvals, and PO generation in a lightning-fast single workflow.',
    icon: Zap,
    iconBg: 'bg-blue-50/90',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
    color: '#2563EB',
    bg: '#DBEAFE',
    metric: '⚡ Cuts cycle time by 75%',
    miniVisual: 'pipeline',
  },
  {
    id: 'better-compliance',
    title: 'Better Compliance',
    tagline: 'Governance & Auditing',
    desc: 'Stay 100% audit-ready with automated 3-way matching and immutable activity logs.',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-50/90',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    color: '#16A34A',
    bg: '#DCFCE7',
    metric: '✓ Automated 3-Way Match',
    miniVisual: 'compliance',
  },
  {
    id: 'cost-optimization',
    title: 'Cost Optimization',
    tagline: 'Spend Intelligence',
    desc: 'Compare competing vendor quotations side-by-side to capture the highest margins.',
    icon: Coins,
    iconBg: 'bg-purple-50/90',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    color: '#7C3AED',
    bg: '#EDE9FE',
    metric: '📈 Up to 18.4% cost savings',
    miniVisual: 'savings',
  },
  {
    id: 'scalable-flexible',
    title: 'Scalable & Flexible',
    tagline: 'Enterprise Architecture',
    desc: 'Engineered for high growth with customizable approval hierarchies and multi-branch support.',
    icon: Cloud,
    iconBg: 'bg-amber-50/90',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
    color: '#D97706',
    bg: '#FEF3C7',
    metric: '🏢 Multi-entity ready',
    miniVisual: 'scale',
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    tagline: 'Connected Stakeholders',
    desc: 'Unite requesters, managers, finance, and external vendors in real time on one platform.',
    icon: Users,
    iconBg: 'bg-teal-50/90',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
    color: '#0D9488',
    bg: '#CCFBF1',
    metric: '👥 Real-time multi-role sync',
    miniVisual: 'collaboration',
  },
  {
    id: 'secure-reliable',
    title: 'Secure & Reliable',
    tagline: 'Zero Trust Security',
    desc: 'Protect corporate spend data with encrypted storage, granular RBAC, and high availability.',
    icon: Lock,
    iconBg: 'bg-rose-50/90',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    color: '#DB2777',
    bg: '#FCE7F3',
    metric: '🔒 SOC 2 & AES-256 Bit',
    miniVisual: 'security',
  },
]

const featureDetailsMap: Record<string, { subtitle: string; description: string; capabilities: string[]; benefits: string[] }> = {
  'Faster Procurement': {
    subtitle: 'Workflow Automation',
    description: 'Streamline purchase requisitions, approval matrices, and vendor fulfillment into one fast, seamless end-to-end workflow.',
    capabilities: [
      'Single-click purchase requests with auto-budget checks',
      'Automated routing to designated department approvers',
      'Real-time status notifications and SLA alerts',
      'Instant PO generation and dispatch upon approval',
    ],
    benefits: [
      'Cuts procurement cycle time by up to 75%',
      'Eliminates approval delays and email follow-ups',
      'Accelerates product and asset delivery',
    ],
  },
  'Better Compliance': {
    subtitle: 'Governance & Auditing',
    description: 'Enforce organization-wide fiscal policies, multi-tier approvals, and immutable audit trails for complete compliance readiness.',
    capabilities: [
      'Multi-level threshold approvals (Team Lead → Finance → Admin)',
      'Immutable audit logging of every edit, approval, and comment',
      'Automated 3-way matching between PO, delivery note, and invoice',
      'Statutory tax validation and GST compliance checks',
    ],
    benefits: [
      '100% audit readiness with zero missing paperwork',
      'Eliminates unauthorized or rogue spending',
      'Ensures strict adherence to corporate fiscal delegations',
    ],
  },
  'Cost Optimization': {
    subtitle: 'Spend Intelligence',
    description: 'Compare competing vendor quotations side-by-side, analyze spend patterns, and negotiate the best commercial terms.',
    capabilities: [
      'Side-by-side vendor quotation comparison matrix',
      'Historical unit pricing and vendor discount tracking',
      'Automated budget threshold warnings before commitment',
      'Spend forecasting and category cost breakdown analytics',
    ],
    benefits: [
      'Saves up to 18% on recurring IT hardware and software spend',
      'Identifies duplicate subscriptions and unallocated assets',
      'Drives competitive bidding among certified vendors',
    ],
  },
  'Scalable & Flexible': {
    subtitle: 'Enterprise Architecture',
    description: 'Engineered to support fast-growing startups, mid-market organizations, and multi-entity global enterprises seamlessly.',
    capabilities: [
      'Customizable procurement approval workflows & spend limits',
      'Multi-department and multi-branch support',
      'Custom procurement categories and asset classification',
      'Flexible role-based access for hundreds of users',
    ],
    benefits: [
      'Easily adapts as your organization expands',
      'Configurable rules without custom engineering code',
      'Zero performance degradation under heavy transaction volume',
    ],
  },
  'Collaboration': {
    subtitle: 'Unified Communication',
    description: 'Unite internal requisitioners, finance teams, managers, and external vendors in real time on a single shared platform.',
    capabilities: [
      'Dedicated role-tailored portals for every stakeholder',
      'Real-time stage tracking and delivery milestone updates',
      'Direct in-context messaging and ticket resolution',
      'Automated email and in-app status synchronizations',
    ],
    benefits: [
      'Replaces messy email chains and chat groups',
      'Clear visibility for team members on request statuses',
      'Fosters trusted, transparent vendor partnerships',
    ],
  },
  'Secure & Reliable': {
    subtitle: 'Enterprise Security',
    description: 'Protect sensitive corporate spend data, financial records, and commercial vendor agreements with enterprise-grade security.',
    capabilities: [
      'Role-Based Access Control (RBAC) with granular permissions',
      'End-to-end encryption in transit (TLS 1.3) and at rest (AES-256)',
      'Protected digital document vault for invoices, NDAs & contracts',
      'Secure tokenized sessions and audit log immutability',
    ],
    benefits: [
      'Zero unauthorized data exposure between vendors and departments',
      'SOC 2 and ISO 27001 compliance standards',
      'High-availability cloud infrastructure with 99.99% uptime',
    ],
  },
  'IT Hardware': {
    subtitle: 'Hardware Assets & Devices',
    description: 'Procure, manage, and track physical IT hardware assets from employee workstations to enterprise server racks.',
    capabilities: [
      'Standardized OEM hardware catalog profiles (Laptops, Servers, Monitors)',
      'Volume discount negotiation with certified vendors (Dell, HP, Apple, Lenovo)',
      'Automated asset registration & serial number barcode logging upon delivery',
      '3-year warranty, AMC support and hardware lifecycle refresh tracking',
    ],
    benefits: [
      'Cuts hardware procurement lead time from 2 weeks to 48 hours',
      'Secures 12-25% volume price discounts via master purchasing agreements',
      '100% hardware asset traceability from PO issuance to employee offboarding',
    ],
  },
  'Software & SaaS': {
    subtitle: 'Software Licences & Cloud Apps',
    description: 'Centralize SaaS tools, software licences, developer subscriptions, and corporate app renewals across all teams.',
    capabilities: [
      'SaaS seat allocation & employee assignment engine',
      '90-day automated contract renewal countdowns & alerts',
      'Shadow IT discovery & credit card expense consolidation',
      'Tiered annual vs monthly billing optimization & discount negotiation',
    ],
    benefits: [
      'Eliminates duplicate software licences across departments',
      'Prevents expensive unwanted auto-renewals with advance notice alerts',
      'Maximizes software seat utilization to 95%+ before purchasing new seats',
    ],
  },
  'Cloud & Infrastructure': {
    subtitle: 'Cloud Spend & Hosting',
    description: 'Manage multi-cloud infrastructure budgets, server instances, storage arrays, CDN, and domain hosting.',
    capabilities: [
      'Multi-cloud budget caps (AWS, Azure, Google Cloud Platform)',
      'Reserved Instance & Savings Plan commitment tracking (up to 60% savings)',
      'Tag-based squad and project cost allocation',
      'Automated 3-way invoice matching against monthly cloud spending caps',
    ],
    benefits: [
      'Stops unexpected cloud cost spikes with real-time budget threshold limits',
      'Maximizes commitment discounts on compute and database infrastructure',
      'Provides transparent departmental cost attribution',
    ],
  },
  'Cybersecurity': {
    subtitle: 'Security & Compliance',
    description: 'Procure enterprise endpoint security, firewalls, threat intelligence, and compliance audit tools.',
    capabilities: [
      'Standardized InfoSec approved security software catalog',
      'Vendor security compliance, SLA, and SOC 2 verification',
      'Centralized SSL certificate & identity management tool vault',
      'Periodic license security reviews & vulnerability management',
    ],
    benefits: [
      'Ensures 100% adherence to corporate cybersecurity and compliance standards',
      'Accelerates deployment of mission-critical security tooling',
      'Complete audit-ready security logs',
    ],
  },
  'IT Services': {
    subtitle: 'Managed Support & Consulting',
    description: 'Source managed IT support services, cloud migration experts, and SLA-backed maintenance contracts.',
    capabilities: [
      'Vendor SLA & deliverables milestone tracking',
      'Time & materials vs fixed-price quotation comparison matrix',
      'Automated service acceptance sign-off workflow',
      'Contract performance ratings & supplier scorecard',
    ],
    benefits: [
      'Guarantees enterprise SLA compliance on mission-critical IT services',
      'Prevents billing discrepancies for consulting and developer hours',
      'Establishes transparent, high-performance vendor partnerships',
    ],
  },
  'Office Accessories': {
    subtitle: 'Ergonomic & Workplace Essentials',
    description: 'Streamline bulk procurement of ergonomic chairs, desks, monitor arms, and office supplies.',
    capabilities: [
      'Catalog-based ordering with pre-approved department budgets',
      'Multi-location delivery address and branch dispatch management',
      'Recurring office supplies auto-reorder thresholds',
      'Centralized expense reporting & automated reconciliation',
    ],
    benefits: [
      'Simplifies hybrid & remote employee onboarding equipment fulfillment',
      'Reduces per-unit costs through negotiated bulk corporate orders',
      'Eliminates requisition chaos and decentralized reimbursements',
    ],
  },
  'Office Technology': {
    subtitle: 'Smart Displays & AV Gear',
    description: 'Equip conference rooms, smart boards, video conferencing bars, and digital display systems.',
    capabilities: [
      'Room-by-room AV specification templates',
      'Turnkey installation vendor quote comparisons',
      'Asset tagging, serial tracking and maintenance schedules',
      'Remote warranty & RMA support integration',
    ],
    benefits: [
      'Standardizes hybrid meeting rooms across all office locations',
      'Ensures high-reliability video conferencing hardware',
      'Direct access to vendor technical support and warranty replacements',
    ],
  },
  'Networking & Telecom': {
    subtitle: 'Network Infrastructure & ISP',
    description: 'Procure enterprise switches, routers, fiber internet lines, VoIP systems, and structured cabling.',
    capabilities: [
      'Bandwidth SLA and uptime monitoring integration',
      'Multi-branch ISP lease agreement and contract management',
      'Hardware lifecycle and firmware update tracking',
      'Consolidated telecom billing review & automated matching',
    ],
    benefits: [
      'Maintains 99.99% branch network connectivity and uptime',
      'Optimizes recurring telecom expenditures across office locations',
      'Prevents single-point-of-failure outages with redundant link tracking',
    ],
  },
  'Training & Certifications': {
    subtitle: 'Professional Development & Upskilling',
    description: 'Manage corporate technical training courses, cloud certification vouchers, and team learning subscriptions.',
    capabilities: [
      'Team training budget allocation & approval hierarchy',
      'Certification exam voucher distribution & expiry alerts',
      'Post-completion verification & score logging into HR system',
      'Group enterprise training discounts with certified education providers',
    ],
    benefits: [
      'Accelerates engineering skill development and technical excellence',
      'Maximizes ROI on corporate training and certification budgets',
      'Tracks organization-wide technical competency and certifications',
    ],
  },
}

export default function HomePage() {
  const [selectedCard, setSelectedCard] = useState<CardDetailItem | null>(null)

  const openCardModal = (title: string, desc: string, icon: any, bg: string, color: string) => {
    const details = featureDetailsMap[title] || {
      subtitle: 'Feature Module',
      description: desc,
      capabilities: ['Real-time tracking and workflow integration', 'Automated portal status updates', 'Role-based security controls'],
      benefits: ['Streamlined procurement process', 'Complete operational visibility'],
    }

    setSelectedCard({
      title,
      subtitle: details.subtitle,
      icon,
      bg,
      color,
      description: details.description,
      capabilities: details.capabilities,
      benefits: details.benefits,
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION (High-End Enterprise SaaS Background)
           ══════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION (High-End Enterprise SaaS Background)
           ══════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden bg-white py-12 sm:py-16 lg:py-20 select-none border-b border-blue-50/80"
          aria-labelledby="hero-heading"
        >
          {/* ── Atmospheric Gradients & Modern Fluid Wave Vector ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Base atmospheric sky-to-white radial / linear gradient backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_80%_at_12%_15%,#cce4fd_0%,#e1f0fe_35%,#f3f8fe_65%,#ffffff_100%)]" />

            {/* Soft top-left ambient illumination orb */}
            <div className="absolute -top-20 -left-20 w-[560px] h-[560px] bg-gradient-to-br from-[#bfe0fd]/50 via-[#dbeafe]/30 to-transparent rounded-full blur-[100px] transform-gpu" />

            {/* Soft ambient glow behind laptop mockup */}
            <div className="absolute top-1/2 -translate-y-1/2 right-0 lg:right-[-2%] w-[680px] h-[520px] bg-gradient-to-tl from-[#bfdbfe]/30 via-[#dbeafe]/20 to-transparent rounded-full blur-[120px] transform-gpu" />

            {/* Fluid Curved Vector Wave Ribbons */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1440 640"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="refWaveGrad1" x1="0%" y1="30%" x2="100%" y2="85%">
                  <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.55" />
                  <stop offset="25%" stopColor="#CBE8FD" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="refWaveGrad2" x1="0%" y1="45%" x2="90%" y2="95%">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.38" />
                  <stop offset="30%" stopColor="#BAE6FD" stopOpacity="0.32" />
                  <stop offset="70%" stopColor="#E0F2FE" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="refWaveGrad3" x1="0%" y1="60%" x2="75%" y2="100%">
                  <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.35" />
                  <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="refWaveGradUpper" x1="0%" y1="20%" x2="80%" y2="70%">
                  <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.6" />
                  <stop offset="35%" stopColor="#EFF6FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="waveStroke1" x1="0%" y1="30%" x2="100%" y2="80%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="30%" stopColor="#BAE6FD" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#E0F2FE" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="waveStroke2" x1="0%" y1="45%" x2="100%" y2="90%">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M 0,210 C 130,270 230,350 370,410 C 580,500 860,530 1440,490 L 1440,640 L 0,640 Z"
                fill="url(#refWaveGradUpper)"
              />
              <path
                d="M 0,275 C 150,345 270,440 440,495 C 680,570 1020,575 1440,545 L 1440,640 L 0,640 Z"
                fill="url(#refWaveGrad1)"
              />
              <path
                d="M 0,275 C 150,345 270,440 440,495 C 680,570 1020,575 1440,545"
                stroke="url(#waveStroke1)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 0,360 C 140,415 250,500 410,545 C 630,605 950,610 1440,580 L 1440,640 L 0,640 Z"
                fill="url(#refWaveGrad2)"
              />
              <path
                d="M 0,360 C 140,415 250,500 410,545 C 630,605 950,610 1440,580"
                stroke="url(#waveStroke2)"
                strokeWidth="1.2"
                fill="none"
              />
              <path
                d="M 0,445 C 130,480 230,555 370,585 C 560,625 860,635 1440,610 L 1440,640 L 0,640 Z"
                fill="url(#refWaveGrad3)"
              />
            </svg>

            {/* Clean bottom border transition */}
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-100/50 to-transparent" />
          </div>

          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">

              {/* ── Left Column: Hero Copy & CTA (6 cols, shifted gracefully to RHS) ── */}
              <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start text-left z-10 lg:pl-6 xl:pl-10 2xl:pl-14">
                {/* Eyebrow Pill Badge with live pulse */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/90 text-blue-700 text-xs font-semibold mb-5 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                  </span>
                  <span className="tracking-wide">Enterprise IT Procurement Platform</span>
                </div>

                {/* H1 Main Heading: Perfectly balanced typography without clipping or overlap */}
                <h1
                  id="hero-heading"
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[52px] font-black tracking-tight text-[#0F172A] leading-[1.18] sm:leading-[1.15] mb-5 w-full"
                >
                  <span className="block text-slate-900">Smarter Procurement.</span>
                  <span className="block mt-1 sm:mt-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent pb-1">
                    Stronger Business.
                  </span>
                </h1>

                {/* Subtitle description */}
                <p className="text-slate-600 text-sm sm:text-base lg:text-[17px] leading-relaxed max-w-xl mb-7 font-normal">
                  Procurement OS empowers modern IT enterprises to automate requisitions, compare vendor quotes, enforce 3-way matching, and manage disbursements — in one unified platform.
                </p>

                {/* CTA Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 mb-7">
                  {/* Primary Login Button */}
                  <Link
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-full inline-flex items-center gap-2.5 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <User size={16} strokeWidth={2.2} />
                    <span>Login</span>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </Link>

                  {/* View All Categories Button */}
                  <button
                    onClick={() => {
                      document.getElementById('procurement-categories')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-800 hover:text-blue-600 border border-slate-300 hover:border-blue-300 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-full inline-flex items-center gap-2 shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                    aria-label="View all procurement categories"
                  >
                    <LayoutGrid size={16} strokeWidth={2.2} className="text-blue-600" />
                    <span>View All Categories</span>
                  </button>
                </div>

                {/* Live Social Proof / Trust Strip */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                  <div className="flex items-center -space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs">TL</div>
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs">MG</div>
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs">FN</div>
                    <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-xs">VN</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500 text-sm leading-none">★★★★★</span>
                    <span className="font-bold text-slate-800">4.9/5</span>
                    <span>• Trusted by 500+ IT teams</span>
                  </div>
                </div>
              </div>

              {/* ── Right Column: Dashboard Illustration (6 cols) ── */}
              <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center lg:justify-end w-full">
                <DashboardIllustration />
              </div>

            </div>
          </div>
        </section>



        {/* ══════════════════════════════════════════════════════════════
            ENTERPRISE IMPACT & TRUST STATS STRIP
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
                  <span className="text-xs text-slate-400 truncate mt-0.5">Requisition to PO dispatch</span>
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
                  <span className="text-xs text-slate-400 truncate mt-0.5">Zero audit discrepancies</span>
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
                  <span className="text-xs text-slate-400 truncate mt-0.5">Enterprise-grade cloud</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            "WHY CHOOSE PROCUREMENT OS" SECTION (Compact & Attractive SaaS Grid)
           ══════════════════════════════════════════════════════════════ */}
        <section
          className="relative pt-12 pb-14 sm:pt-14 sm:pb-16 bg-[#F8FAFC] overflow-hidden"
          aria-labelledby="why-choose-heading"
        >
          {/* Subtle Ambient Background Mesh & Low-Opacity Dot Matrix */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.14]"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="whyChooseDotPattern" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#64748B" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#whyChooseDotPattern)" />
            </svg>
          </div>

          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">

            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-600 text-xs font-semibold tracking-wider uppercase mb-3 shadow-2xs">
                <Sparkles size={12} className="text-blue-600" />
                <span>WHY CHOOSE PROCUREMENT OS</span>
              </div>

              {/* Section Main Title */}
              <h2
                id="why-choose-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-3"
              >
                Everything You Need in <span className="text-blue-600">One Platform</span>
              </h2>

              {/* Section Subtitle */}
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                Simplify procurement, eliminate rogue spending, and empower your teams with complete real-time visibility across your supply chain.
              </p>
            </div>

            {/* 6 Feature Cards Grid: Balanced across desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyChooseCards.map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    onClick={() => openCardModal(card.title, card.desc, Icon, card.bg, card.color)}
                    className="group relative bg-white border border-slate-200/80 hover:border-blue-400/80 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_-4px_rgba(37,99,235,0.08),0_4px_6px_-2px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1 overflow-hidden"
                  >
                    {/* Top Accent Gradient Line on hover */}
                    <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div>
                      {/* Top Row: Icon Badge & Category Tagline */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} border border-slate-100/80 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-2xs shrink-0`}
                        >
                          <Icon size={19} strokeWidth={2.2} />
                        </div>
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${card.badgeBg} tracking-tight`}>
                          {card.tagline}
                        </span>
                      </div>

                      {/* Card Title */}
                      <h3 className="text-base sm:text-[17px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5 leading-snug">
                        {card.title}
                      </h3>

                      {/* Card Description */}
                      <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed mb-4">
                        {card.desc}
                      </p>

                      {/* Miniature Workflow / Metric Preview Widget */}
                      <div className="mb-4">
                        {card.miniVisual === 'pipeline' && (
                          <div className="h-11 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-blue-50/30 group-hover:border-blue-200/60 flex items-center justify-between text-[11px] font-mono select-none transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              <span className="font-semibold text-slate-800">PR #1084</span>
                            </div>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className="text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md font-sans font-semibold text-[10px]">
                              Approved
                            </span>
                            <ArrowRight size={11} className="text-slate-400" />
                            <span className="text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md font-sans font-semibold text-[10px]">
                              PO Issued
                            </span>
                          </div>
                        )}

                        {card.miniVisual === 'compliance' && (
                          <div className="h-11 px-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-emerald-50/30 group-hover:border-emerald-200/60 flex items-center justify-between text-[10px] font-medium text-slate-700 select-none transition-colors">
                            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 font-semibold text-[10px]">
                              <CheckCircle2 size={11} className="text-emerald-600" /> PO Match
                            </span>
                            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 font-semibold text-[10px]">
                              <CheckCircle2 size={11} className="text-emerald-600" /> Receipt
                            </span>
                            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 font-semibold text-[10px]">
                              <CheckCircle2 size={11} className="text-emerald-600" /> Invoice
                            </span>
                          </div>
                        )}

                        {card.miniVisual === 'savings' && (
                          <div className="h-11 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-purple-50/30 group-hover:border-purple-200/60 flex items-center justify-between text-[11px] select-none transition-colors">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/90 px-1.5 py-0.5 rounded font-mono">3 Bids</span>
                              <span className="text-slate-600 font-medium text-[11px]">Smart Ranking</span>
                            </div>
                            <span className="font-bold text-purple-700 text-[11px] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/70">
                              -18.4% cost
                            </span>
                          </div>
                        )}

                        {card.miniVisual === 'scale' && (
                          <div className="h-11 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-amber-50/30 group-hover:border-amber-200/60 flex items-center justify-between text-[11px] select-none transition-colors">
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>99.99% Uptime SLA</span>
                            </div>
                            <span className="text-amber-800 text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 font-mono font-bold">
                              Tiered Matrix
                            </span>
                          </div>
                        )}

                        {card.miniVisual === 'collaboration' && (
                          <div className="h-11 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-teal-50/30 group-hover:border-teal-200/60 flex items-center justify-between text-[10px] font-medium select-none transition-colors">
                            <div className="flex items-center -space-x-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">TL</span>
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">MG</span>
                              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">FN</span>
                              <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">VN</span>
                            </div>
                            <span className="text-teal-800 font-semibold text-[10px] bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200/70">
                              4 Portals Live Sync
                            </span>
                          </div>
                        )}

                        {card.miniVisual === 'security' && (
                          <div className="h-11 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 group-hover:bg-rose-50/30 group-hover:border-rose-200/60 flex items-center justify-between text-[10px] font-medium select-none transition-colors">
                            <span className="flex items-center gap-1 text-slate-700 bg-rose-50/90 px-2 py-0.5 rounded border border-rose-200/70 text-[10px] font-semibold">
                              <ShieldCheck size={11} className="text-rose-600" /> SOC 2 Type II
                            </span>
                            <span className="text-rose-800 font-mono text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200/70 font-bold">
                              AES-256 Bit
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: "Explore feature" with neat button */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                      <span>Explore feature</span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-600 border border-slate-200/60 group-hover:border-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all duration-200 shadow-2xs group-hover:shadow-xs">
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            4-STEP END-TO-END PROCUREMENT WORKFLOW SECTION (ANIMATED PIPELINE)
           ══════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-white via-slate-50/50 to-white border-t border-slate-200/80 select-none relative overflow-hidden" aria-label="How Procurement OS Works">
          {/* Ambient Subtle Background Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />

          <div className="max-w-[1440px] 2xl:max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold tracking-wider uppercase mb-3 shadow-2xs">
                <Sparkles size={12} className="text-blue-600" />
                <span>Orchestration Lifecycle</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                How <span className="text-blue-600">Procurement OS</span> Works
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
                From initial request to final invoice settlement — an automated, audit-proof workflow for modern enterprise organizations.
              </p>
            </div>

            {/* 4-Step Interactive Animated Cards Grid */}
            <div className="relative">
              {/* Desktop Connecting Flow Beam */}
              <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-blue-300 via-indigo-300 to-emerald-300 z-0 opacity-40" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {/* Step 1 */}
                <div
                  onClick={() => openCardModal('Raise & Approve', 'Employees submit requisitions with auto-budget checks, policy rules, and instant multi-tier manager routing.', FileText, '#DBEAFE', '#2563EB')}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-400/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform">
                        01
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200/80">
                        Requisition
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:rotate-6 transition-transform">
                        <FileText size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors tracking-tight">
                      Raise & Approve
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      Employees submit requisitions with auto-budget checks and instant multi-tier routing.
                    </p>
                  </div>
                  {/* Micro Live Preview Widget */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-[11px] group-hover:bg-blue-50/50 transition-colors">
                    <span className="font-mono font-bold text-slate-700">REQ-2026-081</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Approved ✓
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() => openCardModal('RFQ & Quotations', 'Publish competitive bidding requests to verified vendors and compare line-item prices side-by-side.', Tag, '#EDE9FE', '#7C3AED')}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-400/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                        02
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200/80">
                        Bidding
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs group-hover:rotate-6 transition-transform">
                        <Tag size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors tracking-tight">
                      RFQ & Quotations
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      Publish bidding requests to verified vendors and compare line-item prices side-by-side.
                    </p>
                  </div>
                  {/* Micro Live Preview Widget */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-[11px] group-hover:bg-indigo-50/50 transition-colors">
                    <span className="text-slate-600 font-medium">3 Vendor Quotes</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 text-[10px]">
                      -14.2% Best Rate
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() => openCardModal('PO & Delivery', 'Automatically issue digitally signed Purchase Orders, manage dispatch timelines, and track shipment delivery status.', Package, '#CCFBF1', '#0D9488')}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-400/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-teal-500/25 group-hover:scale-110 transition-transform">
                        03
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200/80">
                        Logistics
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs group-hover:rotate-6 transition-transform">
                        <Package size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors tracking-tight">
                      PO & Delivery
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      Automatically issue digitally signed Purchase Orders and track shipment delivery status.
                    </p>
                  </div>
                  {/* Micro Live Preview Widget */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-[11px] group-hover:bg-teal-50/50 transition-colors">
                    <span className="font-mono text-slate-600 font-bold">PO-4589 Issued</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200/80 text-[10px] flex items-center gap-1">
                      In Transit 🚚
                    </span>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  onClick={() => openCardModal('3-Way Match & Pay', 'Reconcile Purchase Order, Goods Receipt Note, and vendor invoice automatically for secure disbursement.', ShieldCheck, '#DCFCE7', '#16A34A')}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-400/80 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                        04
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                        Settlement
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:rotate-6 transition-transform">
                        <ShieldCheck size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors tracking-tight">
                      3-Way Match & Pay
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                      Reconcile PO, delivery note, and vendor invoice automatically for secure disbursement.
                    </p>
                  </div>
                  {/* Micro Live Preview Widget */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-[11px] group-hover:bg-emerald-50/50 transition-colors">
                    <span className="text-slate-600 font-medium">3-Way Match</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 text-[10px] flex items-center gap-1">
                      Settled ⚡
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            PROCUREMENT CATEGORIES SECTION
           ══════════════════════════════════════════════════════════════ */}
        <ProcurementCategoriesSection
          onSelectCategory={(cat) => openCardModal(cat.title, cat.desc, cat.icon, '#DBEAFE', '#2563EB')}
        />

        {/* ══════════════════════════════════════════════════════════════
            BOTTOM CALL-TO-ACTION (CTA) BANNER (FULL-WIDTH PROFESSIONAL LIGHT UI)
           ══════════════════════════════════════════════════════════════ */}
        <section className="w-full py-16 sm:py-20 bg-gradient-to-b from-slate-50/80 via-white to-blue-50/25 border-t border-slate-200/80 relative overflow-hidden select-none" aria-label="Get Started">
          {/* Subtle Ambient Background Mesh Across Full Width */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(59,130,246,0.07),transparent_70%)] pointer-events-none" />

          {/* Decorative Corner Accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4 shadow-2xs">
              <Sparkles size={13} className="text-blue-600" />
              <span>Transform Your Procurement Operations</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-3.5 leading-tight">
              Ready to Upgrade to <span className="text-blue-600">Procurement OS</span>?
            </h2>

            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-7">
              Join leading IT organizations managing their purchase requests, supplier quotations, and 3-way invoice matching in one unified platform.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base px-7 py-3 rounded-full inline-flex items-center gap-2 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
              >
                <span>Login</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
              <Link
                to="/contact"
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 font-semibold text-sm sm:text-base px-6 py-3 rounded-full inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
              >
                Contact Sales
              </Link>
            </div>

            {/* Trust & Guarantee Micro-Pills */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 border-t border-slate-200/70 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Instant Deployment</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Multi-Tier Approval Hierarchy</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>100% Audit & Tax Compliance</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Interactive Detail Modal */}
      <CardDetailModal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        item={selectedCard}
      />

      <Footer />
    </div>
  )
}
