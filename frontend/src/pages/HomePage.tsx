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

/* ─── Feature icon row ─── */
const featureIcons = [
  { icon: FileText,    label: 'Purchase\nRequests',               color: '#2563EB', bg: '#DBEAFE' },
  { icon: CheckCircle2,label: 'Approvals\nWorkflow',              color: '#16A34A', bg: '#DCFCE7' },
  { icon: Tag,         label: 'Vendors &\nQuotations',            color: '#7C3AED', bg: '#EDE9FE' },
  { icon: Package,     label: 'PO & Invoices\nManagement',        color: '#D97706', bg: '#FFEDD5' },
  { icon: Laptop,      label: 'Assets & Subscriptions\nTracking', color: '#DB2777', bg: '#FCE7F3' },
  { icon: BarChart3,   label: 'Analytics\n& Reports',             color: '#0D9488', bg: '#CCFBF1' },
]

/* ─── Stats ─── */
const stats = [
  { value: '5',        label: 'Portals',                      icon: ShieldCheck  },
  { value: '11+',      label: 'Procurement Categories',       icon: Tag          },
  { value: '100%',     label: 'Secure & role-based access',   icon: ShieldCheck  },
  { value: 'Real-time',label: 'Tracking & Analytics',         icon: BarChart3    },
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#EFF6FF' }}
          className="py-16 md:py-24"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left: copy */}
              <div>
                {/* Eyebrow pill */}
                <div className="eyebrow">
                  <span>IT Procurement Platform</span>
                </div>

                {/* H1 */}
                <h1
                  id="hero-heading"
                  className="font-bold text-[#0F172A] mb-5"
                  style={{
                    fontSize: 'clamp(32px, 5vw, 44px)',
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
                  className="mb-8 max-w-lg"
                  style={{ color: '#64748B', fontSize: '17px', lineHeight: 1.7 }}
                >
                  Procurement OS helps IT companies manage everything they purchase, subscribe, renew, receive and pay for — all in one place.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-3 mb-12">
                  <Link to="/login" className="btn-primary">
                    Login <ArrowRight size={16} />
                  </Link>
                  <Link to="/features" className="btn-outline">
                    Learn More
                  </Link>
                </div>

                {/* Feature icon row */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {featureIcons.map(({ icon: Icon, label, color, bg }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={18} color={color} strokeWidth={2} />
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

              {/* Right: dashboard illustration */}
              <div className="flex items-center justify-center">
                <DashboardIllustration />
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════ */}
        <section
          className="bg-white"
          style={{
            borderTop: '1.5px solid #E5E7EB',
            borderBottom: '1.5px solid #E5E7EB',
          }}
          aria-label="Platform statistics"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#E5E7EB]">
              {stats.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="stat-item py-8"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 mx-auto"
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    <Icon size={18} color="#2563EB" strokeWidth={2} />
                  </div>
                  <p
                    className="font-bold"
                    style={{ fontSize: '26px', color: '#0F172A', letterSpacing: '-0.02em' }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: '#64748B' }}
                  >
                    {label}
                  </p>
                </div>
              ))}
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
              ].map(({ icon: Icon, title, desc, bg, color }) => (
                <article
                  key={title}
                  className="feature-card bg-white border border-[#E5E7EB] rounded-2xl p-6"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={20} color={color} strokeWidth={2} />
                  </div>
                  <h3
                    className="font-semibold mb-2"
                    style={{ fontSize: '15px', color: '#0F172A' }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
                </article>
              ))}
            </div>
            <div className="mt-10">
              <Link to="/features" className="btn-primary inline-flex">
                See All Features <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
