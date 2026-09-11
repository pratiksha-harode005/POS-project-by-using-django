import { useState, FormEvent } from 'react'
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

/* ── Contact info ── */
const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'support@procurementos.com',
    bg: '#DBEAFE',
    color: '#2563EB',
    href: 'mailto:support@procurementos.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+91 98765 43210',
    bg: '#DCFCE7',
    color: '#16A34A',
    href: 'tel:+919876543210',
  },
  {
    icon: MapPin,
    label: 'Our Address',
    value: 'Fulperas Software Solutions Pvt. Ltd., D/3, Business Park, Pune, Maharashtra – 411057',
    bg: '#EDE9FE',
    color: '#7C3AED',
    href: 'https://maps.google.com',
  },
]

/* ── SVG contact illustration (envelope + paper airplane + plant) ── */
function ContactIllustration() {
  return (
    <svg
      viewBox="0 0 260 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Send us a message illustration"
      role="img"
      className="w-full max-w-[260px] mx-auto"
    >
      {/* Envelope body */}
      <rect x="20" y="70" width="160" height="110" rx="12" fill="#CCFBF1" stroke="#0D9488" strokeWidth="2" />
      {/* Envelope flap */}
      <path d="M20 82 L100 128 L180 82" fill="#A7F3D0" stroke="#0D9488" strokeWidth="2" strokeLinejoin="round" />
      {/* Envelope crease */}
      <path d="M20 180 L80 130" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M180 180 L120 130" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Paper airplane */}
      <g transform="translate(150, 30) rotate(-35)">
        <path d="M0 0 L40 14 L0 28 L8 14 Z" fill="#2563EB" opacity="0.9" />
        <path d="M8 14 L26 20" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Motion lines behind airplane */}
      <line x1="148" y1="42" x2="130" y2="48" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="144" y1="52" x2="122" y2="56" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Small plant (right) */}
      {/* pot */}
      <path d="M210 195 Q212 175 218 170 L238 170 Q244 175 246 195 Z" fill="#B45309" opacity="0.6" />
      <ellipse cx="228" cy="195" rx="18" ry="5" fill="#92400E" opacity="0.4" />
      {/* soil */}
      <ellipse cx="228" cy="170" rx="14" ry="4" fill="#78350F" opacity="0.5" />
      {/* stem */}
      <path d="M228 170 Q228 148 228 135" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
      {/* leaves */}
      <path d="M228 152 Q244 140 242 124 Q228 132 228 152" fill="#16A34A" opacity="0.85" />
      <path d="M228 144 Q212 132 214 116 Q228 124 228 144" fill="#22C55E" opacity="0.8" />
      <path d="M228 136 Q238 124 236 112 Q226 120 228 136" fill="#16A34A" opacity="0.7" />

      {/* Decorative dots */}
      <circle cx="15" cy="60" r="4" fill="#0D9488" opacity="0.3" />
      <circle cx="195" cy="65" r="3" fill="#2563EB" opacity="0.3" />
      <circle cx="10" cy="155" r="3" fill="#0D9488" opacity="0.2" />
    </svg>
  )
}

type FormState = {
  name: string
  email: string
  message: string
}

type FormErrors = Partial<FormState>

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) {
      errs.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address.'
    }
    if (!form.message.trim()) errs.message = 'Message is required.'
    else if (form.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      setForm({ name: '', email: '', message: '' })
      setErrors({})
    }, 1200)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <>
      <Navbar />

      <main>
        {/* ══════════════════════════════════════
            CONTACT HEADER
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#EFF6FF' }}
          className="py-14 text-center"
          aria-labelledby="contact-heading"
        >
          <div className="max-w-2xl mx-auto px-6">
            <div className="eyebrow mx-auto w-fit">Get in touch</div>
            <h1
              id="contact-heading"
              className="font-bold text-[#0F172A] mb-3"
              style={{ fontSize: 'clamp(26px, 4vw, 36px)', letterSpacing: '-0.02em' }}
            >
              Contact Us
            </h1>
            <p style={{ color: '#64748B', fontSize: '16px', lineHeight: 1.7 }}>
              We'd love to hear from you. Whether you have a question, feedback or need support — our team is here to help.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════
            TWO-COLUMN: INFO + FORM
        ══════════════════════════════════════ */}
        <section className="bg-white py-16" aria-label="Contact information and form">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-start">

              {/* Left: contact info cards + illustration */}
              <div className="space-y-4">
                {contactInfo.map(({ icon: Icon, label, value, bg, color, href }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="contact-info-card hover:border-blue-200 hover:shadow-sm transition-all focus-ring block"
                    style={{ textDecoration: 'none' }}
                    aria-label={`${label}: ${value}`}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={20} color={color} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm mb-0.5">{label}</p>
                      <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.5 }}>{value}</p>
                    </div>
                  </a>
                ))}

                {/* Illustration */}
                <div className="pt-4">
                  <ContactIllustration />
                </div>
              </div>

              {/* Right: contact form */}
              <div>
                <div
                  className="rounded-2xl p-8"
                  style={{ border: '1.5px solid #E5E7EB', boxShadow: '0 4px 24px -4px rgba(15,23,42,0.08)' }}
                >
                  <h2
                    className="font-bold text-[#0F172A] mb-6"
                    style={{ fontSize: '20px', letterSpacing: '-0.02em' }}
                  >
                    Send us a message
                  </h2>

                  {submitted ? (
                    <div
                      className="flex flex-col items-center justify-center py-12 text-center gap-4"
                      role="status"
                      aria-live="polite"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#DCFCE7' }}
                      >
                        <CheckCircle2 size={28} color="#16A34A" strokeWidth={2} />
                      </div>
                      <h3 className="font-bold text-[#0F172A] text-lg">Message Sent!</h3>
                      <p style={{ color: '#64748B', fontSize: '14px' }}>
                        Thanks for reaching out. We'll get back to you within 24 hours.
                      </p>
                      <button
                        className="btn-outline mt-2"
                        onClick={() => setSubmitted(false)}
                        style={{ fontSize: '14px', padding: '8px 20px' }}
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
                      {/* Name */}
                      <div className="mb-5">
                        <label
                          htmlFor="contact-name"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Name <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={handleChange}
                          className={`form-input ${errors.name ? 'error' : ''}`}
                          style={{ paddingLeft: '12px' }}
                          aria-describedby={errors.name ? 'name-error' : undefined}
                          aria-invalid={!!errors.name}
                          aria-required="true"
                        />
                        {errors.name && (
                          <p
                            id="name-error"
                            className="flex items-center gap-1.5 mt-1.5 text-red-600"
                            style={{ fontSize: '13px' }}
                            role="alert"
                          >
                            <AlertCircle size={13} /> {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="mb-5">
                        <label
                          htmlFor="contact-email"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Email <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                            <Mail size={16} color="#94A3B8" />
                          </span>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={handleChange}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            aria-invalid={!!errors.email}
                            aria-required="true"
                          />
                        </div>
                        {errors.email && (
                          <p
                            id="email-error"
                            className="flex items-center gap-1.5 mt-1.5 text-red-600"
                            style={{ fontSize: '13px' }}
                            role="alert"
                          >
                            <AlertCircle size={13} /> {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Message */}
                      <div className="mb-6">
                        <label
                          htmlFor="contact-message"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Message <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          rows={5}
                          placeholder="Your message..."
                          value={form.message}
                          onChange={handleChange}
                          className={`form-input resize-none ${errors.message ? 'error' : ''}`}
                          style={{ paddingLeft: '12px', paddingTop: '10px' }}
                          aria-describedby={errors.message ? 'message-error' : undefined}
                          aria-invalid={!!errors.message}
                          aria-required="true"
                        />
                        {errors.message && (
                          <p
                            id="message-error"
                            className="flex items-center gap-1.5 mt-1.5 text-red-600"
                            style={{ fontSize: '13px' }}
                            role="alert"
                          >
                            <AlertCircle size={13} /> {errors.message}
                          </p>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        className="btn-primary w-full justify-center"
                        disabled={loading}
                        aria-busy={loading}
                      >
                        {loading ? (
                          <>
                            <svg
                              className="animate-spin"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                              <path d="M12 2 A10 10 0 0 1 22 12" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            Sending…
                          </>
                        ) : (
                          <>
                            Send Message <Send size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
