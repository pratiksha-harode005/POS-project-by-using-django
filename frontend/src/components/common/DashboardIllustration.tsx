import React from 'react'

/**
 * High-Fidelity Laptop Mockup displaying the Procurement OS Dashboard
 * Perfectly proportioned with zero wasted whitespace padding:
 * - Sleek MacBook bezel & metallic base with realistic desk surface shadow
 * - Navy sidebar with Procurement OS logo & navigation
 * - Header with search bar and user profile
 * - 4 Metric cards: Total Requests, In Progress, Approved, Pending with icons
 * - Spend Overview chart with 2026 Q3 bars, YTD spend & On Budget badge
 * - Recent Activity list with View All and colorful user activity dots
 */
export default function DashboardIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center lg:justify-end">
      <svg
        viewBox="50 50 740 375"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Procurement OS dashboard hero illustration"
        role="img"
        className="w-full h-auto max-h-[440px] drop-shadow-xl select-none"
      >
        <defs>
          {/* Ambient radial background glow behind laptop */}
          <radialGradient id="heroBgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#BFDBFE" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0" />
          </radialGradient>

          {/* Laptop metal base gradient */}
          <linearGradient id="laptopBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="30%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Floor surface soft contact shadow */}
          <radialGradient id="deskShadowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#0F172A" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>

          {/* Bar chart bar gradients */}
          <linearGradient id="chartBar1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="chartBar2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="chartBarPurple" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          {/* Inner card shadow */}
          <filter id="dashCardShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.04" />
          </filter>

          {/* Global Laptop Shadow */}
          <filter id="mainLaptopShadow" x="-8%" y="-8%" width="116%" height="118%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#0F172A" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* ── Background soft blue ambient glow ── */}
        <ellipse cx="420" cy="215" rx="360" ry="160" fill="url(#heroBgGlow)" />

        {/* ── Realistic Floor Desk Shadow under Base ── */}
        <ellipse cx="420" cy="416" rx="360" ry="12" fill="url(#deskShadowGrad)" />

        {/* ── LAPTOP FRAME & SCREEN ── */}
        <g filter="url(#mainLaptopShadow)">
          {/* Outer Screen Bezel (Dark Slate) */}
          <rect x="110" y="55" width="620" height="345" rx="14" fill="#0F172A" />
          
          {/* Camera Dot */}
          <circle cx="420" cy="63" r="2.5" fill="#334155" />
          <circle cx="420" cy="63" r="1" fill="#60A5FA" />

          {/* Inner Display Screen Area */}
          <rect x="118" y="73" width="604" height="318" rx="4" fill="#F8FAFC" />

          {/* ═══════════════════════════════════════════
              DASHBOARD INSIDE SCREEN
             ═══════════════════════════════════════════ */}

          {/* A. Dark Navy Sidebar (Left) */}
          <rect x="118" y="73" width="124" height="318" fill="#0D1936" />

          {/* Sidebar Logo */}
          <rect x="128" y="83" width="18" height="18" rx="4" fill="#2563EB" />
          <path d="M 131 88 H 134 L 136 96 H 141 L 142 92 H 135" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
          <circle cx="137" cy="98" r="1" fill="#FFFFFF" />
          <text x="151" y="96" fill="#FFFFFF" fontSize="9" fontWeight="800" fontFamily="Inter, sans-serif">
            Procurement OS
          </text>

          {/* Sidebar Menu Items */}
          {/* Active: Dashboard */}
          <rect x="124" y="110" width="112" height="22" rx="5" fill="#2563EB" />
          <path d="M 132 121 L 135.5 117.5 L 139 121 V 124.5 H 132 Z" fill="#FFFFFF" />
          <text x="144" y="124" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">
            Dashboard
          </text>

          {/* Inactive Menu Items */}
          {[
            { y: 144, label: 'Requests' },
            { y: 166, label: 'Approvals' },
            { y: 188, label: 'Purchase Orders' },
            { y: 210, label: 'Vendors' },
            { y: 232, label: 'Inventory' },
            { y: 254, label: 'Analytics' },
            { y: 276, label: 'Settings' },
          ].map((item) => (
            <g key={item.label}>
              <circle cx="135" cy={item.y - 2.5} r="2" fill="#64748B" />
              <text x="144" y={item.y} fill="#94A3B8" fontSize="7.5" fontWeight="500" fontFamily="Inter, sans-serif">
                {item.label}
              </text>
            </g>
          ))}

          {/* B. Main Header Bar */}
          <rect x="242" y="73" width="480" height="36" fill="#FFFFFF" />
          <line x1="242" y1="109" x2="722" y2="109" stroke="#E2E8F0" strokeWidth="1" />

          {/* Search Input */}
          <rect x="254" y="80" width="180" height="22" rx="11" fill="#F1F5F9" />
          <circle cx="266" cy="91" r="3.2" stroke="#94A3B8" strokeWidth="1" fill="none" />
          <line x1="268.5" y1="93.5" x2="272" y2="97" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
          <text x="278" y="94" fill="#94A3B8" fontSize="7.5" fontFamily="Inter, sans-serif">
            Search anything...
          </text>

          {/* User Profile Avatar */}
          <circle cx="698" cy="91" r="9" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
          <circle cx="698" cy="88" r="3.2" fill="#2563EB" />
          <path d="M 692 97 Q 698 93 704 97" stroke="#2563EB" strokeWidth="1.1" fill="none" />

          {/* C. 4 Top Metric Cards */}
          {/* Card 1: Total Requests */}
          <g filter="url(#dashCardShadow)">
            <rect x="252" y="117" width="108" height="42" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
            <text x="260" y="130" fill="#64748B" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
              Total Requests
            </text>
            <text x="260" y="151" fill="#0F172A" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">
              128
            </text>
            <rect x="286" y="141" width="22" height="11" rx="3" fill="#DCFCE7" />
            <text x="297" y="149" fill="#16A34A" fontSize="6.5" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">
              +12%
            </text>
            {/* Document Icon Box on right */}
            <rect x="332" y="126" width="20" height="24" rx="4" fill="#DBEAFE" />
            <path d="M 338 132 H 346 M 338 136 H 346 M 338 140 H 343" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Card 2: In Progress */}
          <g filter="url(#dashCardShadow)">
            <rect x="368" y="117" width="108" height="42" rx="6" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1" />
            <text x="376" y="130" fill="#64748B" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
              In Progress
            </text>
            <text x="376" y="151" fill="#EA580C" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
              34
            </text>
            {/* Clock Icon on right */}
            <circle cx="458" cy="138" r="9" fill="#FFEDD5" />
            <circle cx="458" cy="138" r="6" stroke="#EA580C" strokeWidth="1" fill="none" />
            <path d="M 458 135 V 138 H 461" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* Card 3: Approved */}
          <g filter="url(#dashCardShadow)">
            <rect x="484" y="117" width="108" height="42" rx="6" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
            <text x="492" y="130" fill="#64748B" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
              Approved
            </text>
            <text x="492" y="151" fill="#0F172A" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
              94
            </text>
            {/* Checkmark Icon on right */}
            <circle cx="574" cy="138" r="9" fill="#DCFCE7" />
            <path d="M 570 138 L 573 141 L 578 135" stroke="#16A34A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>

          {/* Card 4: Pending */}
          <g filter="url(#dashCardShadow)">
            <rect x="600" y="117" width="108" height="42" rx="6" fill="#FAF5FF" stroke="#E9D5FF" strokeWidth="1" />
            <text x="608" y="130" fill="#64748B" fontSize="7" fontWeight="600" fontFamily="Inter, sans-serif">
              Pending
            </text>
            <text x="608" y="151" fill="#7E22CE" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
              12
            </text>
            {/* Purple Icon on right */}
            <rect x="680" y="126" width="20" height="24" rx="4" fill="#F3E8FF" />
            <path d="M 686 132 H 694 M 686 136 H 694 M 686 140 H 691" stroke="#9333EA" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* D. Spend Overview Card (Left Middle) */}
          <g filter="url(#dashCardShadow)">
            <rect x="252" y="167" width="224" height="217" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <text x="264" y="186" fill="#0F172A" fontSize="9.5" fontWeight="700" fontFamily="Inter, sans-serif">
              Spend Overview
            </text>
            <rect x="416" y="176" width="50" height="15" rx="4" fill="#F1F5F9" />
            <text x="441" y="186.5" fill="#475569" fontSize="7.5" fontWeight="600" textAnchor="middle" fontFamily="Inter, sans-serif">
              2026 Q3 ▾
            </text>

            {/* Grid lines */}
            <line x1="264" y1="207" x2="464" y2="207" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="264" y1="239" x2="464" y2="239" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="264" y1="271" x2="464" y2="271" stroke="#F1F5F9" strokeWidth="1" />

            {/* Glowing vertical chart bars */}
            {[
              { x: 270, h: 36, fill: 'url(#chartBar1)' },
              { x: 298, h: 62, fill: 'url(#chartBar2)' },
              { x: 326, h: 44, fill: 'url(#chartBar1)' },
              { x: 354, h: 78, fill: 'url(#chartBarPurple)' },
              { x: 382, h: 52, fill: 'url(#chartBar2)' },
              { x: 410, h: 86, fill: 'url(#chartBar1)' },
              { x: 438, h: 98, fill: 'url(#chartBarPurple)' },
            ].map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={295 - bar.h}
                width="16"
                height={bar.h}
                rx="3.5"
                fill={bar.fill}
              />
            ))}

            {/* Bottom Total Spend Card */}
            <rect x="264" y="313" width="200" height="54" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            <text x="276" y="335" fill="#0F172A" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">
              ₹ 4.2M
            </text>
            <text x="276" y="352" fill="#64748B" fontSize="7.5" fontWeight="500" fontFamily="Inter, sans-serif">
              Total Spend (YTD)
            </text>
            <rect x="398" y="328" width="54" height="16" rx="8" fill="#DCFCE7" />
            <text x="425" y="339" fill="#16A34A" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">
              On Budget
            </text>
          </g>

          {/* E. Recent Activity Card (Right Middle) */}
          <g filter="url(#dashCardShadow)">
            <rect x="484" y="167" width="224" height="217" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <text x="496" y="186" fill="#0F172A" fontSize="9.5" fontWeight="700" fontFamily="Inter, sans-serif">
              Recent Activity
            </text>
            <text x="696" y="186" fill="#2563EB" fontSize="8" fontWeight="600" textAnchor="end" fontFamily="Inter, sans-serif">
              View All
            </text>

            {[
              { y: 215, color: '#2563EB', text: 'PO #PO-2026-045 created', time: '2 hours ago' },
              { y: 251, color: '#16A34A', text: 'Invoice received from Dell', time: '5 hours ago' },
              { y: 287, color: '#EA580C', text: 'GRN #GRN-00122 approved', time: '6 hours ago' },
              { y: 323, color: '#9333EA', text: 'New vendor added: Lenovo', time: '1 day ago' },
            ].map((act) => (
              <g key={act.text}>
                <circle cx="508" cy={act.y - 3} r="6.5" fill={act.color} opacity="0.15" />
                <circle cx="508" cy={act.y - 3} r="3" fill={act.color} />
                <text x="522" y={act.y - 4} fill="#0F172A" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
                  {act.text}
                </text>
                <text x="522" y={act.y + 7} fill="#94A3B8" fontSize="7" fontWeight="400" fontFamily="Inter, sans-serif">
                  {act.time}
                </text>
              </g>
            ))}
          </g>

          {/* Laptop Base Stand / Hinge */}
          <path
            d="M 70 400 L 770 400 L 788 415 Q 792 418 780 418 L 52 418 Q 40 418 48 415 Z"
            fill="url(#laptopBaseGrad)"
          />
          <path d="M 70 400 L 770 400 L 774 402 H 66 Z" fill="#64748B" />
          {/* Notch for thumb opening */}
          <path d="M 370 402 H 470 Q 466 409 456 409 H 384 Q 374 409 370 402 Z" fill="#64748B" opacity="0.5" />
        </g>
      </svg>
    </div>
  )
}
