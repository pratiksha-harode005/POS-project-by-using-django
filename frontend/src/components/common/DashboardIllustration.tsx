/**
 * Ultra-wide, low-profile (short height) SVG hero illustration:
 * - Widescreen aspect ratio: 940px wide × 380px high
 * - Expands across horizontal width without taking up excessive vertical screen height
 */
export default function DashboardIllustration() {
  return (
    <svg
      viewBox="0 0 940 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Procurement OS dashboard hero illustration"
      role="img"
      className="w-full max-w-4xl mx-auto drop-shadow-xl"
    >
      <defs>
        {/* Ambient radial background glow */}
        <radialGradient id="heroBgGlowWide" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#93C5FD" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0" />
        </radialGradient>

        {/* Laptop metal base gradient */}
        <linearGradient id="metalBaseWide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Bar chart bar gradients */}
        <linearGradient id="barGrad1Wide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="barGrad2Wide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="barGradActiveWide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        {/* Plant leaf gradient */}
        <linearGradient id="leafGrad1Wide" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id="leafGrad2Wide" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>

        {/* Card shadow */}
        <filter id="heroCardShadowWide" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.05" />
        </filter>

        {/* Laptop Shadow */}
        <filter id="laptopShadowWide" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* ── Background soft blue ambient glow ── */}
      <ellipse cx="470" cy="190" rx="420" ry="160" fill="url(#heroBgGlowWide)" />

      {/* ── 1. HANDWRITTEN ANNOTATION & ARROW (Top-Left) ── */}
      <g transform="translate(85, 22) rotate(-5)">
        <text
          x="0"
          y="0"
          fill="#2563EB"
          fontSize="14"
          fontWeight="700"
          fontFamily="Comic Sans MS, Caveat, cursive, sans-serif"
        >
          Complete control
        </text>
        <text
          x="-12"
          y="16"
          fill="#2563EB"
          fontSize="14"
          fontWeight="700"
          fontFamily="Comic Sans MS, Caveat, cursive, sans-serif"
        >
          from request to delivery
        </text>
        {/* Curved arrow pointing down-right toward laptop */}
        <path
          d="M 65 24 Q 90 48 125 44"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrowhead */}
        <path
          d="M 117 38 L 125 44 L 120 52"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* ── 2. POTTED PLANT (Left Side) ── */}
      <g transform="translate(95, 150)">
        {/* Floor Shadow */}
        <ellipse cx="40" cy="180" rx="35" ry="7" fill="#0F172A" opacity="0.08" />

        {/* Ceramic Pot */}
        <path d="M 18 135 L 25 175 Q 40 182 55 175 L 62 135 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
        <ellipse cx="40" cy="135" rx="22" ry="5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="40" cy="135" rx="18" ry="3.5" fill="#78350F" opacity="0.8" />

        {/* Leaves */}
        <path d="M 40 135 Q 15 95 -10 98 Q 5 118 40 135" fill="url(#leafGrad1Wide)" />
        <path d="M 40 135 Q 10 65 -30 60 Q -5 88 40 135" fill="url(#leafGrad2Wide)" />
        <path d="M 40 135 Q 28 35 8 15 Q 24 50 40 135" fill="url(#leafGrad1Wide)" />
        <path d="M 40 135 Q 52 30 44 8 Q 50 45 40 135" fill="url(#leafGrad2Wide)" />
        <path d="M 40 135 Q 70 55 82 35 Q 70 78 40 135" fill="url(#leafGrad1Wide)" />
        <path d="M 40 135 Q 82 88 102 94 Q 78 116 40 135" fill="url(#leafGrad2Wide)" />
      </g>

      {/* ── 3. ULTRA-WIDE LAPTOP MOCKUP (Center) ── */}
      <g filter="url(#laptopShadowWide)">

        {/* Outer Screen Bezel */}
        <rect x="200" y="32" width="560" height="320" rx="16" fill="#0F172A" />
        {/* Camera Lens */}
        <circle cx="480" cy="41" r="2.5" fill="#334155" />
        <circle cx="480" cy="41" r="1" fill="#60A5FA" />

        {/* Inner Display Screen */}
        <rect x="208" y="50" width="544" height="292" rx="4" fill="#F8FAFC" />

        {/* ── INSIDE SCREEN: PROCUREMENT OS DASHBOARD ── */}

        {/* A. Top Navigation Header */}
        <rect x="208" y="50" width="544" height="38" fill="#FFFFFF" />
        <line x1="208" y1="88" x2="752" y2="88" stroke="#E2E8F0" strokeWidth="1" />

        {/* Logo Icon & Title */}
        <rect x="220" y="59" width="20" height="20" rx="5" fill="#2563EB" />
        <path d="M 224 64 H 228 L 230 72 H 235 L 237 68 H 229" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="231" cy="75" r="1.1" fill="#FFFFFF" />
        <circle cx="234" cy="75" r="1.1" fill="#FFFFFF" />
        <text x="246" y="73" fill="#0F172A" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">
          Procurement OS
        </text>

        {/* Search Bar Input */}
        <rect x="390" y="58" width="160" height="20" rx="10" fill="#F1F5F9" />
        <circle cx="402" cy="68" r="3" stroke="#94A3B8" strokeWidth="1" fill="none" />
        <line x1="404" y1="70" x2="407" y2="73" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
        <text x="412" y="71" fill="#94A3B8" fontSize="7.5" fontFamily="Inter, sans-serif">Search requests, purchase orders...</text>

        {/* Header Right Icons */}
        <circle cx="704" cy="69" r="10" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="708" cy="64" r="2" fill="#EF4444" />

        {/* Profile Avatar */}
        <circle cx="730" cy="69" r="10" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="1" />
        <circle cx="730" cy="66" r="3.5" fill="#2563EB" />
        <path d="M 724 76 Q 730 72 736 76" stroke="#2563EB" strokeWidth="1.2" fill="none" />

        {/* B. Left Navigation Sidebar */}
        <rect x="208" y="89" width="110" height="253" fill="#FFFFFF" />
        <line x1="318" y1="89" x2="318" y2="342" stroke="#E2E8F0" strokeWidth="1" />

        {/* Active Item: Dashboard */}
        <rect x="214" y="97" width="98" height="22" rx="6" fill="#EFF6FF" />
        <rect x="214" y="97" width="3" height="22" rx="1.5" fill="#2563EB" />
        <path d="M 223 108 L 227 104 L 231 108 V 112 H 223 Z" fill="#2563EB" />
        <text x="236" y="111" fill="#2563EB" fontSize="8.5" fontWeight="700" fontFamily="Inter, sans-serif">
          Dashboard
        </text>

        {/* Other Sidebar Items */}
        {[
          { y: 125, label: 'Requests' },
          { y: 147, label: 'Approvals' },
          { y: 169, label: 'Purchase Orders' },
          { y: 191, label: 'Vendors' },
          { y: 213, label: 'Inventory' },
          { y: 235, label: 'Analytics' },
          { y: 257, label: 'Settings' },
        ].map((item) => (
          <g key={item.label}>
            <circle cx="227" cy={item.y + 4} r="2.5" fill="#64748B" />
            <text x="236" y={item.y + 7} fill="#64748B" fontSize="8" fontWeight="500" fontFamily="Inter, sans-serif">
              {item.label}
            </text>
          </g>
        ))}

        {/* C. Main Dashboard Area */}

        {/* 1. Metrics Cards Row Across Top */}
        {[
          { x: 328, width: 98, bg: '#EFF6FF', border: '#BFDBFE', title: 'Total Requests', val: '128', tag: '+14%', tagBg: '#DCFCE7', tagColor: '#16A34A', valColor: '#2563EB' },
          { x: 432, width: 98, bg: '#FFF7ED', border: '#FED7AA', title: 'In Progress',    val: '34',  tag: 'Active', tagBg: '#FFEDD5', tagColor: '#D97706', valColor: '#EA580C' },
          { x: 536, width: 98, bg: '#F0FDF4', border: '#BBF7D0', title: 'Approved',       val: '94',  tag: '98.2%', tagBg: '#DCFCE7', tagColor: '#16A34A', valColor: '#16A34A' },
          { x: 640, width: 98, bg: '#FAF5FF', border: '#E9D5FF', title: 'Pending',        val: '12',  tag: 'Review', tagBg: '#F3E8FF', tagColor: '#7C3AED', valColor: '#9333EA' },
        ].map((m) => (
          <g key={m.title} filter="url(#heroCardShadowWide)">
            <rect x={m.x} y={97} width={m.width} height="40" rx="7" fill={m.bg} stroke={m.border} strokeWidth="1" />
            <text x={m.x + 8} y={110} fill="#64748B" fontSize="6.8" fontWeight="600" fontFamily="Inter, sans-serif">
              {m.title}
            </text>
            <rect x={m.x + 64} y={103} width="26" height="10" rx="4" fill={m.tagBg} />
            <text x={m.x + 77} y={110} fill={m.tagColor} fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">{m.tag}</text>

            <text x={m.x + 8} y={129} fill={m.valColor} fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">
              {m.val}
            </text>
          </g>
        ))}

        {/* 2. Middle Row Left: Spend Overview Bar Chart Card */}
        <g filter="url(#heroCardShadowWide)">
          <rect x="328" y="145" width="204" height="188" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          <text x="340" y="163" fill="#0F172A" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
            Spend Overview
          </text>
          <text x="495" y="163" fill="#2563EB" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">
            2026 Q3
          </text>

          {/* Grid lines */}
          <line x1="340" y1="182" x2="520" y2="182" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="340" y1="210" x2="520" y2="210" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="340" y1="238" x2="520" y2="238" stroke="#F1F5F9" strokeWidth="1" />

          {/* Glowing Gradient Bar Columns */}
          {[
            { x: 345, h: 36, fill: 'url(#barGrad1Wide)' },
            { x: 370, h: 56, fill: 'url(#barGrad2Wide)' },
            { x: 395, h: 42, fill: 'url(#barGrad1Wide)' },
            { x: 420, h: 72, fill: 'url(#barGradActiveWide)' },
            { x: 445, h: 48, fill: 'url(#barGrad2Wide)' },
            { x: 470, h: 80, fill: 'url(#barGrad1Wide)' },
            { x: 495, h: 90, fill: 'url(#barGradActiveWide)' },
          ].map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={260 - bar.h}
              width="16"
              height={bar.h}
              rx="3"
              fill={bar.fill}
            />
          ))}

          {/* Card Footer: Total Spend Pill */}
          <rect x="340" y="270" width="180" height="52" rx="7" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <text x="350" y="291" fill="#0F172A" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">
            ₹ 4.2M
          </text>
          <text x="350" y="306" fill="#64748B" fontSize="7" fontWeight="500" fontFamily="Inter, sans-serif">
            Total Spend (YTD)
          </text>
          <rect x="462" y="284" width="50" height="15" rx="7" fill="#DCFCE7" />
          <text x="487" y="294" fill="#16A34A" fontSize="6.5" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">On Budget</text>
        </g>

        {/* 3. Middle Row Right: Recent Activity Feed Card */}
        <g filter="url(#heroCardShadowWide)">
          <rect x="542" y="145" width="196" height="188" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          <text x="554" y="163" fill="#0F172A" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
            Recent Activity
          </text>

          {/* Activity items */}
          {[
            { y: 186, color: '#2563EB', text: 'PO #PO-2026-045 created', time: '2 hours ago' },
            { y: 220, color: '#16A34A', text: 'Invoice received from Dell', time: '4 hours ago' },
            { y: 254, color: '#EA580C', text: 'GRN #GRN-0032 approved', time: '6 hours ago' },
            { y: 288, color: '#9333EA', text: 'New vendor added: Lenovo', time: '1 day ago' },
          ].map((act) => (
            <g key={act.text}>
              <circle cx="564" cy={act.y - 2} r="5" fill={act.color} opacity="0.15" />
              <circle cx="564" cy={act.y - 2} r="2.5" fill={act.color} />
              <text x="576" y={act.y - 3} fill="#0F172A" fontSize="7.8" fontWeight="600" fontFamily="Inter, sans-serif">
                {act.text}
              </text>
              <text x="576" y={act.y + 6} fill="#94A3B8" fontSize="6.8" fontWeight="400" fontFamily="Inter, sans-serif">
                {act.time}
              </text>
            </g>
          ))}
        </g>

        {/* Laptop Metal Hinge & Base Stand */}
        <path d="M 200 352 L 760 352 L 778 365 Q 782 368 772 368 L 188 368 Q 178 368 182 365 Z" fill="url(#metalBaseWide)" />
        <path d="M 200 352 L 760 352 L 764 354 H 196 Z" fill="#64748B" />
        {/* Trackpad notch cutout */}
        <path d="M 440 353 H 520 Q 518 358 510 358 H 450 Q 442 358 440 353 Z" fill="#64748B" opacity="0.5" />
      </g>

      {/* ── 4. STACKED CARDBOARD DELIVERY BOXES (Right Side) ── */}
      <g transform="translate(760, 240)">
        {/* Floor Shadow */}
        <ellipse cx="45" cy="112" rx="42" ry="8" fill="#0F172A" opacity="0.1" />

        {/* Bottom Large Box */}
        <rect x="5" y="58" width="85" height="52" rx="3" fill="#D4B886" stroke="#B89762" strokeWidth="1" />
        {/* Tape vertical */}
        <rect x="42" y="58" width="12" height="52" fill="#E5D0AC" opacity="0.85" />
        {/* Barcode Shipping Label */}
        <rect x="62" y="78" width="20" height="24" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
        <line x1="66" y1="82" x2="66" y2="96" stroke="#0F172A" strokeWidth="1.5" />
        <line x1="69" y1="82" x2="69" y2="96" stroke="#0F172A" strokeWidth="1" />
        <line x1="72" y1="82" x2="72" y2="96" stroke="#0F172A" strokeWidth="2" />
        <line x1="76" y1="82" x2="76" y2="96" stroke="#0F172A" strokeWidth="1" />

        {/* Top Smaller Box */}
        <rect x="15" y="16" width="62" height="42" rx="3" fill="#E5D0AC" stroke="#C4A484" strokeWidth="1" />
        {/* Tape vertical */}
        <rect x="41" y="16" width="10" height="42" fill="#D4B886" opacity="0.85" />
        {/* Top flap crease */}
        <line x1="15" y1="28" x2="77" y2="28" stroke="#C4A484" strokeWidth="1" />
      </g>
    </svg>
  )
}
