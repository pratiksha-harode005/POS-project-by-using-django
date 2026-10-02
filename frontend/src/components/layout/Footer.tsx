import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, Mail, Phone, MapPin, Linkedin, Twitter,
  Facebook, Github, Shield, FileText, CheckCircle2,
  ExternalLink, ArrowRight, X, Lock, Globe, Sparkles
} from 'lucide-react'

// ── 1. Navigation Links ──
const navigateLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Features', to: '/features' },
  { label: 'Contact', to: '/contact' },
]

// ── 2. Categories ──
const categoryLinks = [
  { label: 'IT Hardware', to: '/categories/it-hardware' },
  { label: 'Software & SaaS', to: '/categories/software-saas' },
  { label: 'Cloud & Infrastructure', to: '/categories/cloud-infrastructure' },
  { label: 'Cybersecurity', to: '/categories/cybersecurity' },
  { label: 'Office Accessories', to: '/categories/office-accessories' },
]

// ── 3. Social Links ──
const socialLinks = [
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: Linkedin,
    hoverBg: 'hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50',
  },
  {
    name: 'Twitter / X',
    href: 'https://twitter.com',
    icon: Twitter,
    hoverBg: 'hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50',
  },
  {
    name: 'GitHub',
    href: 'https://github.com',
    icon: Github,
    hoverBg: 'hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50',
  },
  {
    name: 'Facebook',
    href: 'https://facebook.com',
    icon: Facebook,
    hoverBg: 'hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50',
  },
]

export default function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null)

  return (
    <footer
      className="bg-[#070D1E] text-slate-300 border-t border-slate-800/80 relative z-10 select-none"
      aria-label="Site footer"
    >
      {/* Top subtle ambient highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        {/* ══════════════════════════════════════════════════════════════
            BALANCED 4-COLUMN RESPONSIVE GRID (PERFECT EQUAL GAPS)
           ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-8 xl:gap-12 items-start">
          
          {/* ── 1. Procurement OS (Brand & Identity) ── */}
          <div className="flex flex-col gap-3.5">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl w-fit"
              aria-label="Procurement OS home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <ShoppingCart size={18} className="text-white" strokeWidth={2.4} />
              </div>
              <div>
                <span className="text-white font-extrabold text-lg tracking-tight leading-none block">
                  Procurement OS
                </span>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mt-0.5">
                  Enterprise Platform
                </span>
              </div>
            </Link>

            {/* Tagline */}
            <p className="text-xs font-semibold text-blue-200/90 leading-snug">
              Smarter Procurement. Stronger Business.
            </p>

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise spend orchestration platform streamlining requisition workflows, multi-tier approvals, vendor RFQs, automated 3-way matching, and corporate treasury disbursements.
            </p>
          </div>

          {/* ── 2. Navigation (Shifted slightly to RHS) ── */}
          <div className="flex flex-col gap-3.5 sm:pl-6 lg:pl-10 xl:pl-14">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-xs bg-blue-500" />
              Navigation
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-col gap-2.5" role="list">
                {navigateLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
                    >
                      <span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all text-sm leading-none">›</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* ── 3. Categories ── */}
          <div className="flex flex-col gap-3.5 sm:pl-2 lg:pl-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-xs bg-blue-500" />
              Categories
            </h3>
            <ul className="flex flex-col gap-2.5" role="list">
              {categoryLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="group text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
                  >
                    <span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all text-sm leading-none">›</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── 4. Contact Us ── */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-xs bg-blue-500" />
              Contact Us
            </h3>
            
            <div className="flex flex-col gap-3 text-xs text-slate-300">
              {/* Email */}
              <a
                href="mailto:support@procurementos.com"
                className="group flex items-start gap-2.5 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 group-hover:border-blue-500/60 group-hover:bg-blue-950/60 transition-colors mt-0.5">
                  <Mail size={13} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Email</span>
                  <span className="truncate block font-medium text-slate-300 group-hover:text-white transition-colors">support@procurementos.com</span>
                </div>
              </a>

              {/* Office Location */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={13} className="text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">HQ Office</span>
                  <span className="text-slate-300 font-medium leading-relaxed block text-[11px]">
                    Tech Park One, Tower B, Airport Road, Pune, Maharashtra 411006, India
                  </span>
                </div>
              </div>

              {/* Contact Number */}
              <a
                href="tel:+919876543210"
                className="group flex items-start gap-2.5 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 group-hover:border-blue-500/60 group-hover:bg-blue-950/60 transition-colors mt-0.5">
                  <Phone size={13} className="text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Direct Line</span>
                  <span className="font-medium text-slate-300 group-hover:text-white transition-colors">+91 98765 43210</span>
                </div>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="pt-2 border-t border-slate-800/80 mt-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
                Connect With Us
              </span>
              <div className="flex items-center gap-2">
                {socialLinks.map((s) => {
                  const Icon = s.icon
                  return (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className={`w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-slate-400 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${s.hoverBg}`}
                    >
                      <Icon size={14} />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            BOTTOM SECTION: Perfectly Centered Copyright & Legal Links
           ══════════════════════════════════════════════════════════════ */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Copyright Text */}
          <p className="text-xs text-slate-500 text-center sm:text-left">
            © 2026 Procurement OS. All rights reserved. Enterprise Spend Governance & Procurement Ecosystem.
          </p>

          {/* Legal Links */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500 text-[11px] font-mono">India (IST)</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          INTERACTIVE LEGAL MODAL (Privacy Policy & Terms & Conditions)
         ══════════════════════════════════════════════════════════════ */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  {legalModal === 'privacy' ? <Lock size={16} /> : <FileText size={16} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions of Service'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Procurement OS Enterprise Governance • Version 2026.1
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed bg-slate-950/50">
              {legalModal === 'privacy' ? (
                <>
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-200">
                    <p className="font-semibold mb-1">Data Privacy Commitment:</p>
                    <p className="text-[11px] text-indigo-300/90">
                      Procurement OS enforces strict data privacy, enterprise access isolation, and zero unauthorized sharing of proprietary vendor bids or transactional logs.
                    </p>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-3">1. Information We Collect</h4>
                  <p>
                    We collect organizational account details, corporate procurement requisitions, RFQ communications, vendor quotations, goods delivery logs, and payment settlement references solely to execute authorized procurement processes.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">2. Data Security & Encryption</h4>
                  <p>
                    All procurement data in transit and at rest is secured using TLS 1.3 and AES-256 encryption. Role-Based Access Control (RBAC) ensures strict confidentiality between Team Leads, Managers, Finance Officers, Admins, and Vendors.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">3. Statutory Compliance</h4>
                  <p>
                    Our data processing practices adhere to national and international statutory regulations, including ISO 27001 data protection standards, SOC 2 Type II governance, and applicable tax ledger audit requirements.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">4. Contact Privacy Officer</h4>
                  <p>
                    For inquiries regarding data retention, audits, or rights, please contact our Data Protection Office at <span className="font-mono text-indigo-400">privacy@procurementos.com</span>.
                  </p>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200">
                    <p className="font-semibold mb-1">Enterprise Service Terms:</p>
                    <p className="text-[11px] text-purple-300/90">
                      By accessing or utilizing Procurement OS, corporate users agree to comply with organizational delegation limits, authorized approval workflows, and fair vendor bidding guidelines.
                    </p>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-3">1. Authorization & Role Delegations</h4>
                  <p>
                    Procurement requisitions and budgetary releases created on this platform represent formal corporate authorizations. Users must maintain account security and ensure that approvals align with departmental fiscal delegations.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">2. Vendor & Quotation Integrity</h4>
                  <p>
                    All vendor submissions, price quotations, and RFQ responses must reflect binding commercial agreements. Falsification of delivery records, invoices, or compliance documents is strictly prohibited.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">3. Audit Trails & Ledger Immutability</h4>
                  <p>
                    All purchase orders, Goods Receipt Notes (GRN), and Treasury UTR disbursements generate permanent, auditable logs for statutory tax compliance and annual fiscal audits.
                  </p>

                  <h4 className="text-sm font-bold text-white mt-3">4. Limitation of Liability</h4>
                  <p>
                    Procurement OS operates as an enterprise spend orchestration platform. Commercial disputes between client entities and third-party vendors are governed by respective Master Service Agreements (MSAs).
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Effective Date: September 2026
              </span>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
