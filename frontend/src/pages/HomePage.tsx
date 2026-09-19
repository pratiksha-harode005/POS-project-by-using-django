import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Tag,
  Package,
  Laptop,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DashboardIllustration from '../components/common/DashboardIllustration'
import ProcurementCategoriesSection from '../components/common/ProcurementCategoriesSection'
import CardDetailModal, { CardDetailItem } from '../components/common/CardDetailModal'

/* ─── Feature icon row ─── */
const featureIcons = [
  { icon: FileText,    label: 'Purchase\nRequests',               color: '#2563EB', bg: '#DBEAFE' },
  { icon: CheckCircle2,label: 'Approvals\nWorkflow',              color: '#16A34A', bg: '#DCFCE7' },
  { icon: Tag,         label: 'Vendors &\nQuotations',            color: '#7C3AED', bg: '#EDE9FE' },
  { icon: Package,     label: 'PO & Invoices\nManagement',        color: '#D97706', bg: '#FFEDD5' },
  { icon: Laptop,      label: 'Assets & Subscriptions\nTracking', color: '#DB2777', bg: '#FCE7F3' },
  { icon: BarChart3,   label: 'Analytics\n& Reports',             color: '#0D9488', bg: '#CCFBF1' },
]

/* ─── Stats Cards ─── */
const statsCards = [
  {
    value: '5',
    title: 'Portals',
    desc: 'Access dedicated portals for different roles and functions.',
    icon: ShieldCheck,
    bg: 'bg-blue-50/70',
    border: 'border-blue-200/80',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    arrowBg: 'bg-blue-100/80 group-hover:bg-blue-200',
    arrowColor: 'text-blue-600',
    cornerAccent: 'bg-blue-100/60',
  },
  {
    value: '9',
    title: 'Procurement Categories',
    desc: 'Covering all your business needs and requirements.',
    icon: Tag,
    bg: 'bg-purple-50/70',
    border: 'border-purple-200/80',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    arrowBg: 'bg-purple-100/80 group-hover:bg-purple-200',
    arrowColor: 'text-purple-600',
    cornerAccent: 'bg-purple-100/60',
  },
  {
    value: '100%',
    title: 'Secure & Role-based Access',
    desc: 'Your data, our priority.',
    icon: ShieldCheck,
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200/80',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    arrowBg: 'bg-emerald-100/80 group-hover:bg-emerald-200',
    arrowColor: 'text-emerald-600',
    cornerAccent: 'bg-emerald-100/60',
  },
  {
    value: 'Real-time',
    title: 'Tracking & Analytics',
    desc: 'Stay informed, make smarter decisions.',
    icon: BarChart3,
    bg: 'bg-amber-50/70',
    border: 'border-amber-200/80',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    arrowBg: 'bg-amber-100/80 group-hover:bg-amber-200',
    arrowColor: 'text-amber-600',
    cornerAccent: 'bg-amber-100/60',
  },
]

const featureDetailsMap: Record<string, { subtitle: string; description: string; capabilities: string[]; benefits: string[] }> = {
  'Purchase Requests': {
    subtitle: 'Core Feature Workflow',
    description: 'Empower employees and team leads to submit structured purchase requisitions with customizable fields, automated budget checks, and department routing.',
    capabilities: [
      'Custom request forms with mandatory attachments & line items',
      'Automated budget pre-validation before submission',
      'Real-time status tracking from Draft → Submitted → Approved',
      'Immutable audit trail of all changes and comments',
    ],
    benefits: [
      'Reduces requisition processing lead time by up to 70%',
      'Eliminates unauthorized paper/email requests',
      'Enforces corporate spending policies upfront',
    ],
  },
  'Approvals Workflow': {
    subtitle: 'Governance & Compliance',
    description: 'Dynamic multi-level approval routing based on spend thresholds, department hierarchy, and custom company business rules.',
    capabilities: [
      'Multi-tier approval paths (Team Lead → Finance → Admin)',
      'One-click approve/reject actions with mandatory audit comments',
      'Real-time email and in-app notification alerts',
      'Complete historical approval logs for compliance audits',
    ],
    benefits: [
      'Eliminates approval bottlenecks across remote teams',
      '100% policy enforcement on high-value purchases',
      'Full transparency for finance and auditing teams',
    ],
  },
  'Budget & Spend Control': {
    subtitle: 'Financial Governance',
    description: 'Proactive budget management that tracks committed and available spend in real time to prevent budget overruns before orders are placed.',
    capabilities: [
      'Departmental and category budget allocation tracking',
      'Real-time remaining budget calculations',
      'Automated warning alerts when approaching threshold limits',
      'Spend forecasting and historical trend reports',
    ],
    benefits: [
      'Prevents unexpected budget overruns',
      'Improves cash flow predictability for finance',
      'Identifies cost optimization and savings opportunities',
    ],
  },
  'Vendor Management': {
    subtitle: 'Supplier Relations',
    description: 'Centralized vendor portal for catalog management, digital RFQ dispatch, quotation comparison, and vendor compliance record tracking.',
    capabilities: [
      'Central vendor directory with compliance ratings',
      'Digital RFQ creation and structured quote submissions',
      'Side-by-side quotation comparison & evaluation matrix',
      'Document vault for tax certificates, NDAs, and SLAs',
    ],
    benefits: [
      'Drives competitive bidding and price reduction',
      'Simplifies vendor compliance and SLA monitoring',
      'Accelerates vendor onboarding and PO issuance',
    ],
  },
  'Purchase Orders': {
    subtitle: 'Order Fulfillment',
    description: 'Automate PO generation from approved requisitions and monitor vendor order fulfillment stage-by-stage through delivery and invoice matching.',
    capabilities: [
      'Instant PO generation upon requisition approval',
      'Real-time stage tracking (Processing → Transit → Delivered)',
      'Digital Goods Receipt Notes (GRN) & delivery confirmation',
      'Automated 3-way matching between PO, receipt, and tax invoice',
    ],
    benefits: [
      'Eliminates rogue and unauthorized purchasing',
      'Enforces post-delivery payment confirmation',
      'Complete order-to-delivery audit trail',
    ],
  },
  'Complete Lifecycle': {
    subtitle: 'End-to-End Platform',
    description: 'Connect every stage of procurement — from employee requisition to final post-delivery payment clearance — in one integrated OS.',
    capabilities: [
      '5 specialized, role-tailored portals (Employee, Lead, Vendor, Finance, Admin)',
      'Automated real-time status synchronization across all portals',
      'Post-delivery payment sequence enforcement',
      'Asset and subscription lifecycle tracking',
    ],
    benefits: [
      'Single source of truth for all corporate procurement',
      'Zero manual data re-entry or email chasing',
      'End-to-end operational efficiency',
    ],
  },
  'Portals': {
    subtitle: 'System Architecture',
    description: 'Procurement OS provides 5 role-tailored portals designed for complete end-to-end alignment across your organisation.',
    capabilities: [
      'Employee Portal: Submit & track purchase requisitions',
      'Team Lead Portal: Departmental approvals & budget checks',
      'Vendor Portal: Stage updates, delivery receipts & invoice submission',
      'Finance Portal: 3-way matching & post-delivery payment processing',
      'Admin Portal: System configuration, governance & analytics',
    ],
    benefits: [
      'Role-tailored interfaces for maximum usability',
      'Strict security and permission boundaries',
      'Seamless inter-portal workflow automation',
    ],
  },
  'Procurement Categories': {
    subtitle: 'Category Management',
    description: 'Comprehensive coverage of all IT, technology, and corporate procurement categories under unified management.',
    capabilities: [
      'IT Hardware (Laptops, Desktops, Servers, Displays)',
      'Software & SaaS (Licences, Subscriptions, Dev Tools)',
      'Cloud & Infrastructure (AWS, Azure, GCP, Hosting)',
      'Cybersecurity, IT Services, AV Gear, Telecom & Learning',
    ],
    benefits: [
      'Unified spend tracking across all tech assets',
      'Category-specific approval routing rules',
      'Standardized procurement taxonomy',
    ],
  },
  'Secure & Role-based Access': {
    subtitle: 'Security & Compliance',
    description: 'Enterprise-grade security controls, role-based authorization, and strict compliance enforcement.',
    capabilities: [
      'Granular RBAC permissions for every user and portal',
      'Immutable audit trails for all request modifications',
      'Encrypted document vault for NDAs, contracts & tax invoices',
      'Post-delivery payment clearance verification',
    ],
    benefits: [
      'Prevents unauthorized spending and rogue purchases',
      'SOC2 and audit compliance readiness',
      'Full data integrity and operational security',
    ],
  },
  'Tracking & Analytics': {
    subtitle: 'Analytics & Reporting',
    description: 'Live visibility into procurement workflows, budget utilization, vendor delivery SLAs, and cost savings.',
    capabilities: [
      'Real-time spend dashboards with YTD budget tracking',
      'Vendor delivery SLA metrics and payment status sync',
      'Customizable report exports for accounting and auditing',
      'Automated renewal alerts for software & cloud spend',
    ],
    benefits: [
      'Instant executive visibility into corporate spend',
      'Proactive cost reduction and contract optimization',
      'Data-driven procurement decision making',
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
    <>
      <Navbar />

      <main>
        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#EFF6FF' }}
          className="py-10 md:py-14 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-8 items-center">

              {/* Left: copy (5 cols) */}
              <div className="lg:col-span-5">
                {/* Eyebrow pill */}
                <div className="eyebrow mb-2">
                  <span>IT Procurement Platform</span>
                </div>

                {/* H1 */}
                <h1
                  id="hero-heading"
                  className="font-bold text-[#0F172A] mb-3"
                  style={{
                    fontSize: 'clamp(30px, 4vw, 42px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                  }}
                >
                  Smarter Procurement.
                  <br />
                  Stronger Business.
                </h1>

                {/* Sub-text */}
                <p
                  className="mb-5 max-w-lg"
                  style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.6 }}
                >
                  Procurement OS helps IT companies manage everything they purchase, subscribe, renew, receive and pay for — all in one place.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link to="/login" className="btn-primary">
                    Login <ArrowRight size={16} />
                  </Link>
                  <Link to="/features" className="btn-outline">
                    Learn More
                  </Link>
                </div>

                {/* Feature icon row */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {featureIcons.map(({ icon: Icon, label, color, bg }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5 text-center"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={17} color={color} strokeWidth={2} />
                      </div>
                      <span
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: '#64748B', whiteSpace: 'pre-line' }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: dashboard illustration (7 cols - wider & high resolution) */}
              <div className="lg:col-span-7 flex items-center justify-center lg:justify-end w-full">
                <DashboardIllustration />
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            OUR IMPACT / KEY STATS AT A GLANCE
        ══════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-[#F4F8FE] relative overflow-hidden" aria-label="Platform statistics">
          {/* Top-Right Decorative Blue Grid Dots */}
          <div className="absolute top-8 right-12 opacity-40 pointer-events-none hidden md:block">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            {/* Header section */}
            <div className="mb-10">
              {/* Eyebrow with Dash */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-[2px] bg-blue-600 inline-block rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  OUR IMPACT
                </span>
              </div>

              {/* Title */}
              <h2
                className="font-extrabold text-[#0F172A] mb-2"
                style={{ fontSize: 'clamp(28px, 4vw, 36px)', letterSpacing: '-0.02em' }}
              >
                Key Stats <span className="text-blue-600">at a Glance</span>
              </h2>

              {/* Subtitle */}
              <p className="text-[#64748B] text-base">
                Driving efficiency, transparency and growth in procurement.
              </p>
            </div>

            {/* Grid of 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    className={`relative rounded-3xl p-6 border ${card.bg} ${card.border} transition-all duration-300 hover:shadow-md group overflow-hidden flex flex-col justify-between`}
                  >
                    {/* Top Row: Icon + Value/Title */}
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                            <Icon className={card.iconColor} size={22} strokeWidth={2.2} />
                          </div>
                          <div>
                            <span className="text-2xl font-black text-[#0F172A] tracking-tight block leading-none mb-1">
                              {card.value}
                            </span>
                            <span className="text-sm font-bold text-[#0F172A] block leading-tight">
                              {card.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#64748B] font-medium leading-relaxed mt-3 relative z-10">
                        {card.desc}
                      </p>
                    </div>

                    {/* Bottom-Right Corner Decorative Quarter-Circle */}
                    <div
                      className={`w-20 h-20 rounded-tl-full ${card.cornerAccent} absolute -bottom-2 -right-2 pointer-events-none transition-transform duration-300 group-hover:scale-110 opacity-70`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES PREVIEW (teaser)
        ══════════════════════════════════════ */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="eyebrow mx-auto w-fit">Key features</div>
            <h2
              className="font-bold text-[#0F172A] mb-4"
              style={{ fontSize: 'clamp(26px, 4vw, 32px)', letterSpacing: '-0.02em' }}
            >
              Built for Modern IT Procurement
            </h2>
            <p className="text-[#64748B] max-w-xl mx-auto mb-10" style={{ fontSize: '16px' }}>
              From purchase requests to invoice matching — every workflow in one connected platform.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {[
                {
                  icon: FileText,   title: 'Purchase Requests',
                  desc: 'Create & track purchase requests with custom approval fields.',
                  bg: '#DBEAFE', color: '#2563EB',
                },
                {
                  icon: CheckCircle2, title: 'Approvals Workflow',
                  desc: 'Dynamic multi-level approval workflow with full audit trail.',
                  bg: '#DCFCE7', color: '#16A34A',
                },
                {
                  icon: Wallet, title: 'Budget & Spend Control',
                  desc: 'Track budgets, reduce costs, and get real-time insights.',
                  bg: '#FFEDD5', color: '#D97706',
                },
                {
                  icon: Tag, title: 'Vendor Management',
                  desc: 'Manage vendors, RFQs & quotations in one place.',
                  bg: '#EDE9FE', color: '#7C3AED',
                },
                {
                  icon: Package, title: 'Purchase Orders',
                  desc: 'Track POs end-to-end with real-time status updates.',
                  bg: '#FCE7F3', color: '#DB2777',
                },
                {
                  icon: RefreshCw, title: 'Complete Lifecycle',
                  desc: 'From request to payment and beyond — fully connected.',
                  bg: '#CCFBF1', color: '#0D9488',
                },
              ].map(({ icon: Icon, title, desc, bg, color }, index) => (
                <div
                  key={title}
                  className="group relative bg-white border border-[#E5E7EB] rounded-2xl p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 flex flex-col justify-between overflow-hidden"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Top accent colored bar on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: color }}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 shadow-xs"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={20} color={color} strokeWidth={2} />
                      </div>
                    </div>
                    <h3
                      className="font-bold mb-2 transition-colors duration-200 group-hover:text-blue-600"
                      style={{ fontSize: '16px', color: '#0F172A' }}
                    >
                      {title}
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link to="/features" className="btn-primary inline-flex">
                See All Features <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            PROCUREMENT CATEGORIES SECTION
        ══════════════════════════════════════ */}
        <ProcurementCategoriesSection />
      </main>

      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        item={selectedCard}
      />

      <Footer />
    </>
  )
}
