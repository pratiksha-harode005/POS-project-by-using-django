/** Inline SVG hero illustration: laptop with dashboard UI, floating badges, and a small plant */
export default function DashboardIllustration() {
  return (
    <svg
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dashboard illustration showing procurement analytics"
      role="img"
      className="w-full max-w-lg mx-auto"
    >
      {/* ── Laptop base / keyboard ── */}
      <rect x="70" y="310" width="360" height="22" rx="6" fill="#CBD5E1" />
      <rect x="80" y="310" width="340" height="4" rx="2" fill="#94A3B8" />
      {/* trackpad */}
      <rect x="215" y="316" width="70" height="12" rx="4" fill="#94A3B8" opacity="0.5" />

      {/* ── Laptop lid / screen bezel ── */}
      <rect x="90" y="70" width="320" height="242" rx="14" fill="#1E293B" />
      {/* screen inner */}
      <rect x="100" y="80" width="300" height="222" rx="8" fill="#F8FAFF" />

      {/* ── Dashboard header bar ── */}
      <rect x="100" y="80" width="300" height="36" rx="8" fill="#2563EB" />
      {/* header dots */}
      <circle cx="116" cy="98" r="4" fill="rgba(255,255,255,0.4)" />
      <circle cx="128" cy="98" r="4" fill="rgba(255,255,255,0.4)" />
      <circle cx="140" cy="98" r="4" fill="rgba(255,255,255,0.4)" />
      {/* header title */}
      <rect x="200" y="92" width="80" height="10" rx="3" fill="rgba(255,255,255,0.6)" />

      {/* ── Left panel: bar chart ── */}
      <text x="110" y="132" fontSize="8" fontWeight="600" fill="#64748B" fontFamily="Inter, sans-serif">Spend Overview</text>
      {/* bars */}
      {[
        { x: 110, y: 200, h: 50, label: 'Jan', color: '#2563EB' },
        { x: 128, y: 185, h: 65, label: 'Feb', color: '#60A5FA' },
        { x: 146, y: 210, h: 40, label: 'Mar', color: '#2563EB' },
        { x: 164, y: 175, h: 75, label: 'Apr', color: '#3B82F6' },
        { x: 182, y: 195, h: 55, label: 'May', color: '#60A5FA' },
        { x: 200, y: 165, h: 85, label: 'Jun', color: '#2563EB' },
      ].map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width="14" height={b.h} rx="3" fill={b.color} opacity="0.85" />
          <text x={b.x + 7} y={252} fontSize="6" fill="#94A3B8" textAnchor="middle" fontFamily="Inter, sans-serif">{b.label}</text>
        </g>
      ))}
      {/* baseline */}
      <line x1="108" y1="250" x2="218" y2="250" stroke="#E5E7EB" strokeWidth="1" />

      {/* Horizontal separator between left and right panels */}
      <line x1="230" y1="120" x2="230" y2="295" stroke="#E5E7EB" strokeWidth="1" />

      {/* ── Right panel: Donut chart ── */}
      <text x="240" y="132" fontSize="8" fontWeight="600" fill="#64748B" fontFamily="Inter, sans-serif">Category Split</text>

      {/* Donut - drawn as arc paths */}
      <g transform="translate(282, 185)">
        {/* outer ring segments */}
        <circle cx="0" cy="0" r="42" fill="none" stroke="#E5E7EB" strokeWidth="16" />
        {/* segment 1 - 40% blue */}
        <circle cx="0" cy="0" r="42" fill="none" stroke="#2563EB" strokeWidth="16"
          strokeDasharray="105 159" strokeDashoffset="0" />
        {/* segment 2 - 30% light blue */}
        <circle cx="0" cy="0" r="42" fill="none" stroke="#60A5FA" strokeWidth="16"
          strokeDasharray="79 185" strokeDashoffset="-105" />
        {/* segment 3 - 20% purple */}
        <circle cx="0" cy="0" r="42" fill="none" stroke="#7C3AED" strokeWidth="16"
          strokeDasharray="53 211" strokeDashoffset="-184" />
        {/* segment 4 - 10% teal */}
        <circle cx="0" cy="0" r="42" fill="none" stroke="#0D9488" strokeWidth="16"
          strokeDasharray="26 238" strokeDashoffset="-237" />
        {/* center hole */}
        <circle cx="0" cy="0" r="28" fill="#F8FAFF" />
        {/* center label */}
        <text x="0" y="-4" fontSize="9" fontWeight="700" fill="#0F172A" textAnchor="middle" fontFamily="Inter, sans-serif">$4.2M</text>
        <text x="0" y="8" fontSize="6" fill="#64748B" textAnchor="middle" fontFamily="Inter, sans-serif">Total Spend</text>
      </g>

      {/* Donut legend */}
      {[
        { color: '#2563EB', label: 'IT Hardware', pct: '40%' },
        { color: '#60A5FA', label: 'Software',   pct: '30%' },
        { color: '#7C3AED', label: 'Services',   pct: '20%' },
        { color: '#0D9488', label: 'Other',       pct: '10%' },
      ].map((item, i) => (
        <g key={item.label} transform={`translate(238, ${260 + i * 10})`}>
          <rect width="6" height="6" rx="2" fill={item.color} />
          <text x="10" y="6" fontSize="6" fill="#64748B" fontFamily="Inter, sans-serif">{item.label}</text>
          <text x="90" y="6" fontSize="6" fill="#0F172A" fontWeight="600" fontFamily="Inter, sans-serif">{item.pct}</text>
        </g>
      ))}

      {/* ── Mini stat cards (bottom strip) ── */}
      {[
        { x: 104, label: 'Open POs', val: '128', color: '#DBEAFE', text: '#2563EB' },
        { x: 178, label: 'Pending', val: '34',  color: '#FEF3C7', text: '#D97706' },
        { x: 252, label: 'Approved', val: '94', color: '#DCFCE7', text: '#16A34A' },
      ].map((s) => (
        <g key={s.label}>
          <rect x={s.x} y={264} width="68" height="30" rx="5" fill={s.color} />
          <text x={s.x + 34} y={274} fontSize="6" fill={s.text} textAnchor="middle" fontFamily="Inter, sans-serif">{s.label}</text>
          <text x={s.x + 34} y={286} fontSize="9" fontWeight="700" fill={s.text} textAnchor="middle" fontFamily="Inter, sans-serif">{s.val}</text>
        </g>
      ))}

      {/* ── Floating badge: Shopping Cart (orange) ── */}
      <g transform="translate(56, 90)">
        <rect width="40" height="40" rx="12" fill="#FFEDD5" filter="url(#shadow)" />
        {/* cart icon */}
        <circle cx="14" cy="29" r="2.2" fill="#D97706" />
        <circle cx="24" cy="29" r="2.2" fill="#D97706" />
        <path d="M9 13h3l2 8h10l2.5-6H13" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M9 13H7" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>

      {/* ── Floating badge: Shield (blue) ── */}
      <g transform="translate(418, 110)">
        <rect width="40" height="40" rx="12" fill="#DBEAFE" />
        <path d="M20 10 L10 14 L10 21 C10 26 15 30 20 32 C25 30 30 26 30 21 L30 14 Z" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15 21 L18 24 L25 17" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* ── Floating badge: Bell (purple) ── */}
      <g transform="translate(430, 200)">
        <rect width="36" height="36" rx="10" fill="#EDE9FE" />
        {/* bell */}
        <path d="M18 8 C14 8 11 11 11 15 L11 22 L8 24 L28 24 L25 22 L25 15 C25 11 22 8 18 8 Z" fill="none" stroke="#7C3AED" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M15 24 C15 25.7 16.3 27 18 27 C19.7 27 21 25.7 21 24" fill="none" stroke="#7C3AED" strokeWidth="1.6" />
        <circle cx="22" cy="10" r="3.5" fill="#7C3AED" />
      </g>

      {/* ── Plant illustration (right of laptop) ── */}
      {/* pot */}
      <ellipse cx="460" cy="330" rx="22" ry="8" fill="#D97706" opacity="0.3" />
      <path d="M440 310 Q442 325 448 330 L472 330 Q478 325 480 310 Z" fill="#B45309" opacity="0.7" />
      {/* stem */}
      <path d="M460 310 Q460 270 460 250" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* leaves */}
      <path d="M460 280 Q480 265 478 245 Q462 255 460 280" fill="#16A34A" opacity="0.85" />
      <path d="M460 270 Q440 255 442 235 Q458 245 460 270" fill="#22C55E" opacity="0.8" />
      <path d="M460 258 Q475 243 473 228 Q459 238 460 258" fill="#16A34A" opacity="0.7" />
      <path d="M460 250 Q448 238 448 222 Q462 232 460 250" fill="#22C55E" opacity="0.65" />
      {/* soil top */}
      <ellipse cx="460" cy="310" rx="22" ry="6" fill="#92400E" opacity="0.4" />

      {/* ── Drop shadow filter ── */}
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
      </defs>
    </svg>
  )
}
