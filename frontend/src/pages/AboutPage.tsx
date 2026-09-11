import { CheckCircle2, Shield, Wallet, RefreshCw } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const visionItems = [
  'Better visibility',
  'Smarter decisions',
  'Stronger vendor relationships',
  'Long-term cost savings',
]

const cards = [
  {
    icon: Shield,
    title: 'Role-based & Secure',
    desc: 'Granular permissions and secure access for every team member.',
    bg: '#DBEAFE',
    color: '#2563EB',
  },
  {
    icon: Wallet,
    title: 'Budget & Spend Control',
    desc: 'Track budgets, reduce costs, get real insights.',
    bg: '#DCFCE7',
    color: '#16A34A',
  },
  {
    icon: RefreshCw,
    title: 'Complete Lifecycle',
    desc: 'From request to payment and beyond.',
    bg: '#EDE9FE',
    color: '#7C3AED',
  },
]

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ══════════════════════════════════════
            ABOUT HERO
        ══════════════════════════════════════ */}
        <section className="bg-white py-16 md:py-24" aria-labelledby="about-heading">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left: text */}
              <div>
                <div className="eyebrow">About us</div>
                <h1
                  id="about-heading"
                  className="font-bold text-[#0F172A] mb-6"
                  style={{ fontSize: 'clamp(26px, 4vw, 36px)', letterSpacing: '-0.02em' }}
                >
                  About Procurement OS
                </h1>
                <p
                  className="mb-4"
                  style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.7 }}
                >
                  Procurement OS is a centralized procurement platform for IT companies to manage purchasing, approvals, vendors, budgets, subscriptions, invoices and payments in one place.
                </p>
                <p style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.7 }}>
                  We built Procurement OS because we saw firsthand how fragmented tools, manual approvals, and scattered vendor relationships were costing IT teams time, money, and control. Our platform puts everything in one connected, role-aware workspace.
                </p>
              </div>

              {/* Right: desk photo */}
              <div className="flex justify-center lg:justify-end">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
                  alt="Minimal desk workspace with laptop, coffee cup, and a small plant — representing the modern IT procurement environment"
                  className="rounded-2xl object-cover w-full max-w-md"
                  style={{
                    boxShadow: '0 20px 60px -12px rgba(15,23,42,0.15)',
                    height: '340px',
                  }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            OUR VISION — checklist
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#EFF6FF' }}
          className="py-16"
          aria-label="Our vision"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left filler space (visual balance) */}
              <div className="hidden lg:flex items-center justify-start">
                <div
                  className="rounded-2xl p-10"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', maxWidth: 340 }}
                >
                  <p className="text-white text-2xl font-bold leading-snug" style={{ letterSpacing: '-0.02em' }}>
                    "Simplify. Connect. Empower."
                  </p>
                  <p className="text-blue-200 text-sm mt-4" style={{ lineHeight: 1.7 }}>
                    We aim to make procurement easy, transparent and efficient for every IT team — from request to renewal.
                  </p>
                </div>
              </div>

              {/* Right: vision content */}
              <div>
                <div className="eyebrow">Our vision</div>
                <h2
                  className="font-bold text-[#0F172A] mb-6"
                  style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', letterSpacing: '-0.02em' }}
                >
                  Simplify. Connect. Empower.
                </h2>
                <p className="text-[#64748B] mb-8" style={{ fontSize: '16px', lineHeight: 1.7 }}>
                  We aim to make procurement easy, transparent and efficient for every IT team — from request to renewal.
                </p>

                {/* Checklist */}
                <ul className="space-y-4" role="list" aria-label="Vision goals">
                  {visionItems.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#2563EB' }}
                        aria-hidden="true"
                      >
                        <CheckCircle2 size={14} color="#ffffff" strokeWidth={2.5} />
                      </div>
                      <span
                        className="font-medium"
                        style={{ color: '#0F172A', fontSize: '15px' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            3-COLUMN FEATURE CARDS
        ══════════════════════════════════════ */}
        <section className="bg-white py-16" aria-label="Core capabilities">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid sm:grid-cols-3 gap-6">
              {cards.map(({ icon: Icon, title, desc, bg, color }) => (
                <article
                  key={title}
                  className="feature-card border border-[#E5E7EB] rounded-2xl p-6 text-center"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={22} color={color} strokeWidth={2} />
                  </div>
                  <h3
                    className="font-semibold mb-2"
                    style={{ fontSize: '16px', color: '#0F172A' }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            QUOTE BANNER
        ══════════════════════════════════════ */}
        <section className="py-12 px-6" aria-label="Company quote">
          <div className="max-w-5xl mx-auto">
            <blockquote className="quote-banner text-center">
              <p
                className="text-white font-medium italic leading-relaxed"
                style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', lineHeight: 1.6 }}
              >
                "Smarter procurement isn't just about buying. It's about building a stronger, more connected business."
              </p>
            </blockquote>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
