import { useParams, Link, useNavigate } from 'react-router-dom'
import React from 'react'
import {
  Laptop,
  Code,
  Cloud,
  ShieldCheck,
  Headphones,
  Box,
  Tv,
  Network,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Layers,
  Sparkles,
  Zap,
  Building2,
  Tag,
  IndianRupee,
  FileSpreadsheet,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

interface CategoryDetailData {
  slug: string
  title: string
  badge: string
  tagline: string
  description: string
  icon: any
  bg: string
  color: string
  subCategories: { name: string; specs: string; avgCost: string; popularVendors: string }[]
  procurementSteps: { step: string; title: string; desc: string }[]
  capabilities: { title: string; desc: string }[]
  benefits: string[]
  sampleItems: { code: string; name: string; category: string; estPrice: string; status: string; statusBg: string }[]
}

const categoriesDatabase: Record<string, CategoryDetailData> = {
  'it-hardware': {
    slug: 'it-hardware',
    title: 'IT Hardware Procurement',
    badge: 'HARDWARE ASSETS',
    tagline: 'Procure, manage, and track physical IT hardware assets from workstation to enterprise server racks.',
    description:
      'The IT Hardware category covers all physical computer equipment required for employee onboarding, data center operations, and remote office infrastructure. Enterprise controls ensure standard hardware specs, volume OEM discounts, and automated asset registration upon receipt.',
    icon: Laptop,
    bg: '#DBEAFE',
    color: '#2563EB',
    subCategories: [
      {
        name: 'Laptops & Workstations',
        specs: 'Intel i7/i9, Apple M3/M4, 16-64GB RAM, NVMe SSDs',
        avgCost: '₹1,200 - ₹3,500 / unit',
        popularVendors: 'Dell Technologies, Lenovo, Apple, HP Inc.',
      },
      {
        name: 'Servers & Storage (SAN/NAS)',
        specs: '1U/2U Rack Servers, RAID Arrays, Fibre Channel Switches',
        avgCost: '₹5,000 - ₹45,000 / node',
        popularVendors: 'Dell PowerEdge, HPE ProLiant, NetApp, Synology',
      },
      {
        name: 'Monitors & Peripherals',
        specs: '4K USB-C Displays, Ergonomic Arms, Thunderbolt Docks',
        avgCost: '₹250 - ₹950 / unit',
        popularVendors: 'Dell UltraSharp, LG Business, Logitech, Anker',
      },
      {
        name: 'Rack Components & UPS',
        specs: 'Online Double-Conversion UPS, Smart PDUs, Server Racks',
        avgCost: '₹800 - ₹6,000 / unit',
        popularVendors: 'APC Schneider, Tripp Lite, CyberPower',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Requirement & Specs Selection',
        desc: 'Employee or IT manager selects pre-approved hardware bundles (Developer, Designer, Executive) with configured CPU/RAM/SSD options.',
      },
      {
        step: '02',
        title: 'Budget & Approval Routing',
        desc: 'Requisition is automatically checked against the department IT budget and routed to Team Leads and IT Administrators.',
      },
      {
        step: '03',
        title: 'RFQ & Vendor Ordering',
        desc: 'Procurement team issues digital RFQs to OEM distributors (Dell, HP, Apple) to secure corporate volume discounts.',
      },
      {
        step: '04',
        title: 'Delivery & Asset Tagging',
        desc: 'Upon receipt, hardware serial numbers are logged into the IT Asset register, auto-tagged with QR codes, and assigned to employees.',
      },
    ],
    capabilities: [
      {
        title: 'Pre-defined Hardware Catalogs',
        desc: 'Establish standardized device profiles by job role (e.g. Software Engineer, Sales Exec) to speed up requisitions.',
      },
      {
        title: 'OEM Contract & Warranty Tracking',
        desc: 'Track 3-year ProSupport / Care Pack warranties, AMC renewals, and serial numbers directly linked to POs.',
      },
      {
        title: 'Serial Number Barcode Logging',
        desc: 'Scan device barcodes upon delivery to immediately update IT Asset inventory and assign serial numbers.',
      },
      {
        title: 'Asset Lifecycle & Refresh Alerts',
        desc: 'Receive automated notifications when hardware reaches 3-year end-of-life cycle for planned hardware refreshes.',
      },
    ],
    benefits: [
      'Reduces procurement lead time for employee laptops from 2 weeks to 48 hours',
      'Secures 12-25% volume price discounts through negotiated OEM master purchase agreements',
      'Provides 100% hardware asset traceability from purchase order to employee offboarding',
      'Eliminates unauthorized or non-standard hardware purchases across remote teams',
    ],
    sampleItems: [
      { code: 'HW-LAP-001', name: 'Dell XPS 15 (i9 / 32GB / 1TB SSD)', category: 'Laptops', estPrice: '₹2,450', status: 'Approved Specs', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'HW-SRV-004', name: 'Dell PowerEdge R760 2U Rack Server', category: 'Servers', estPrice: '₹14,200', status: 'RFQ Open', statusBg: 'bg-amber-500/20 text-amber-300' },
      { code: 'HW-MON-012', name: 'Dell UltraSharp 27" 4K USB-C Monitor', category: 'Monitors', estPrice: '₹480', status: 'In Stock', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'HW-DCK-009', name: 'Thunderbolt 4 Quad-Display Docking Station', category: 'Peripherals', estPrice: '₹290', status: 'In Stock', statusBg: 'bg-blue-500/20 text-blue-300' },
    ],
  },

  'software-saas': {
    slug: 'software-saas',
    title: 'Software & SaaS Procurement',
    badge: 'SOFTWARE LICENCES',
    tagline: 'Centralize SaaS tools, software licences, developer subscriptions, and corporate app renewals.',
    description:
      'The Software & SaaS category manages all enterprise software purchases, cloud subscriptions, developer tool seats, and specialized desktop software. Gain complete control over recurring software spend, eliminate shadow IT apps, and automate renewal alerts before contract deadlines.',
    icon: Code,
    bg: '#DCFCE7',
    color: '#16A34A',
    subCategories: [
      {
        name: 'Developer & Engineering Tools',
        specs: 'GitHub Enterprise, JetBrains All Products, Jira Cloud, Postman',
        avgCost: '₹19 - ₹60 / seat / mo',
        popularVendors: 'Atlassian, JetBrains, GitHub, Figma',
      },
      {
        name: 'Enterprise SaaS Suites',
        specs: 'Google Workspace Enterprise, Microsoft 365 E5, Slack Enterprise',
        avgCost: '₹20 - ₹57 / user / mo',
        popularVendors: 'Google Cloud, Microsoft, Salesforce, Slack',
      },
      {
        name: 'Creative & Design Software',
        specs: 'Adobe Creative Cloud All Apps, Figma Organization, Canva Pro',
        avgCost: '₹45 - ₹85 / seat / mo',
        popularVendors: 'Adobe Systems, Figma Inc., Canva',
      },
      {
        name: 'Analytics & BI Platforms',
        specs: 'Tableau Server, PowerBI Pro, Datadog Enterprise, Amplitude',
        avgCost: '₹1,200 - ₹15,000 / yr',
        popularVendors: 'Salesforce Tableau, Microsoft, Datadog',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Licence Requisition',
        desc: 'Team lead requests new SaaS subscription or additional seat allocations with justification and cost center tag.',
      },
      {
        step: '02',
        title: 'Compliance & Shadow IT Check',
        desc: 'IT Admin checks existing license utilization to determine if existing unused seats can be reassigned.',
      },
      {
        step: '03',
        title: 'Vendor Contract Review',
        desc: 'Review SLA terms, data protection addendums (GDPR/SOC2), and billing frequency (annual vs monthly).',
      },
      {
        step: '04',
        title: 'PO Generation & Provisioning',
        desc: 'Approved PO issued to software reseller/vendor and licence keys registered into SaaS inventory.',
      },
    ],
    capabilities: [
      {
        title: 'SaaS Seat Assignment Engine',
        desc: 'Assign software licenses directly to employee profiles and automatically reclaim seats upon employee offboarding.',
      },
      {
        title: 'Renewal Countdowns & Escalation',
        desc: 'Configure 90, 60, and 30-day automated email alerts for upcoming SaaS contract auto-renewals.',
      },
      {
        title: 'Shadow IT Discovery & Audit',
        desc: 'Consolidate software subscriptions purchased across different credit cards into single enterprise accounts.',
      },
      {
        title: 'Tiered Pricing Negotiator',
        desc: 'Compare monthly vs annual billing tiers to capture 15-20% discounts on software commitments.',
      },
    ],
    benefits: [
      'Eliminates duplicate SaaS subscriptions across different regional departments',
      'Prevents expensive unwanted auto-renewals with 90-day advance notice alerts',
      'Maximizes software seat utilization to 95%+ before purchasing new license blocks',
      'Enforces corporate data security standards across all approved cloud software applications',
    ],
    sampleItems: [
      { code: 'SW-IDE-002', name: 'JetBrains All Products Pack (50 Seats)', category: 'Dev Tools', estPrice: '₹14,500 / yr', status: 'Active Licence', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SW-CRM-005', name: 'Salesforce Enterprise CRM (25 Seats)', category: 'SaaS Suite', estPrice: '₹45,000 / yr', status: 'Renewal Pending', statusBg: 'bg-amber-500/20 text-amber-300' },
      { code: 'SW-FIG-008', name: 'Figma Organization Plan (15 Seats)', category: 'Design', estPrice: '₹8,100 / yr', status: 'Active Licence', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SW-SLK-011', name: 'Slack Enterprise Grid (150 Seats)', category: 'SaaS Suite', estPrice: '₹21,600 / yr', status: 'Active Licence', statusBg: 'bg-emerald-500/20 text-emerald-300' },
    ],
  },

  'cloud-infrastructure': {
    slug: 'cloud-infrastructure',
    title: 'Cloud & Infrastructure Procurement',
    badge: 'CLOUD SPEND & HOSTING',
    tagline: 'Manage multi-cloud infrastructure budgets, server instances, storage arrays, and DNS hosting.',
    description:
      'The Cloud & Infrastructure category handles public cloud commitments (AWS, Microsoft Azure, Google Cloud Platform), CDN services, dedicated bare-metal hosting, and domain registrations. Prevent cloud cost spikes with automated budget alerts and team-based cost allocation.',
    icon: Cloud,
    bg: '#FFEDD5',
    color: '#D97706',
    subCategories: [
      {
        name: 'Public Cloud Compute & DB',
        specs: 'AWS EC2 / RDS, Azure VMs, GCP Compute Engine / Cloud SQL',
        avgCost: 'Usage Based (₹2,000 - ₹50,000 / mo)',
        popularVendors: 'Amazon Web Services, Microsoft Azure, Google Cloud',
      },
      {
        name: 'Cloud Storage & Backups',
        specs: 'AWS S3 Glacier, Azure Blob, Wasabi Hot Cloud Storage',
        avgCost: '₹0.004 - ₹0.023 / GB / mo',
        popularVendors: 'AWS S3, Wasabi, Backblaze B2, NetApp',
      },
      {
        name: 'Content Delivery (CDN) & Security',
        specs: 'Cloudflare Enterprise, Fastly, AWS CloudFront',
        avgCost: '₹500 - ₹4,500 / mo',
        popularVendors: 'Cloudflare, Fastly, Akamai, AWS',
      },
      {
        name: 'Bare-Metal Hosting & Colocation',
        specs: 'Dedicated Servers, Colocation Cabinets, 10Gbps Links',
        avgCost: '₹300 - ₹3,500 / server / mo',
        popularVendors: 'Equinix, DigitalOcean, Hetzner, OVHcloud',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Infrastructure Sizing',
        desc: 'DevOps/Cloud Architect defines required cloud compute, memory, database IOPS, and storage specs for new workloads.',
      },
      {
        step: '02',
        title: 'Reserved Instance / Savings Plan PO',
        desc: 'Finance evaluates 1-year vs 3-year cloud commitment savings (up to 60% discount) and approves cloud PO.',
      },
      {
        step: '03',
        title: 'Cloud Provider Account Allocation',
        desc: 'Allocate cloud spending limits and attach cost center tags to AWS Organizations / Azure Management Groups.',
      },
      {
        step: '04',
        title: 'Continuous Cost Monitoring',
        desc: 'Automated 3-way matching of monthly cloud usage invoices against purchase order spending caps.',
      },
    ],
    capabilities: [
      {
        title: 'Multi-Cloud Budget Caps',
        desc: 'Set hard or soft spending limits across AWS, Azure, and GCP accounts to stop unexpected cloud bill surges.',
      },
      {
        title: 'Reserved Instance Commitment Tracking',
        desc: 'Track expiring cloud Savings Plans and Reserved Instances to ensure continuous discounted rates.',
      },
      {
        title: 'Tag-Based Cost Allocation',
        desc: 'Attribute cloud infrastructure spend to specific engineering squads, environments (Dev/Staging/Prod), or projects.',
      },
      {
        title: 'Domain & SSL Certificate Auto-Renew',
        desc: 'Centralize corporate domain name registrations and SSL certificates with auto-renewal locks.',
      },
    ],
    benefits: [
      'Saves up to 45% on cloud compute through structured 1-year and 3-year Reserved Instance PO commitments',
      'Eliminates end-of-month cloud billing surprises with automated spend threshold alerts',
      'Enables granular cost attribution for accurate project margin and unit economics calculation',
      'Centralizes DNS, SSL, and domain renewals under corporate finance governance',
    ],
    sampleItems: [
      { code: 'CLD-AWS-001', name: 'AWS Savings Plan Commitment (3-Year)', category: 'Public Cloud', estPrice: '₹12,000 / mo', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'CLD-AZR-003', name: 'Microsoft Azure Enterprise Agreement', category: 'Public Cloud', estPrice: '₹18,500 / mo', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'CLD-CFL-006', name: 'Cloudflare Enterprise WAF & CDN Plan', category: 'CDN & WAF', estPrice: '₹2,400 / mo', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'CLD-EQX-010', name: 'Equinix Data Center Colocation Rack', category: 'Colocation', estPrice: '₹3,800 / mo', status: 'In Review', statusBg: 'bg-blue-500/20 text-blue-300' },
    ],
  },

  'cybersecurity': {
    slug: 'cybersecurity',
    title: 'Cybersecurity & Compliance Procurement',
    badge: 'SECURITY & COMPLIANCE',
    tagline: 'Procure firewalls, endpoint security, SOC2 audit platforms, and penetration testing services.',
    description:
      'The Cybersecurity category encompasses all hardware and software tools required to safeguard enterprise assets, networks, and customer data. From EDR endpoint software and Next-Gen Firewalls to third-party SOC2 security audits and penetration testing.',
    icon: ShieldCheck,
    bg: '#EDE9FE',
    color: '#7C3AED',
    subCategories: [
      {
        name: 'Endpoint Protection (EDR/XDR)',
        specs: 'CrowdStrike Falcon, SentinelOne Singularity, Microsoft Defender',
        avgCost: '₹35 - ₹95 / endpoint / yr',
        popularVendors: 'CrowdStrike, SentinelOne, Palo Alto Networks',
      },
      {
        name: 'Next-Gen Firewalls & Network Security',
        specs: 'Palo Alto PA-Series, Fortinet FortiGate, Cisco Secure Firewall',
        avgCost: '₹2,500 - ₹35,000 / appliance',
        popularVendors: 'Palo Alto, Fortinet, Cisco Systems, Check Point',
      },
      {
        name: 'Identity & Access Management (IAM)',
        specs: 'Okta Workforce Identity, Ping Identity, CyberArk PAM',
        avgCost: '₹3 - ₹12 / user / mo',
        popularVendors: 'Okta Inc., Ping Identity, CyberArk, Duo Security',
      },
      {
        name: 'Compliance Audit & Pen Testing',
        specs: 'SOC2 Type II Audit, ISO 27001 Certification, External Pen Tests',
        avgCost: '₹12,000 - ₹45,000 / audit',
        popularVendors: 'Vanta, Drata, Bishop Fox, HackerOne',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Security Requirement Assessment',
        desc: 'CISO / Security Director identifies compliance gap or endpoint protection expansion requirement.',
      },
      {
        step: '02',
        title: 'Vendor Security Screening',
        desc: 'Review vendor security questionnaire, SOC2 report, and data encryption standards before approval.',
      },
      {
        step: '03',
        title: 'RFQ & Price Negotiation',
        desc: 'Request competitive proposals for endpoint node licensing and multi-year security subscriptions.',
      },
      {
        step: '04',
        title: 'Deployment & SLA Verification',
        desc: 'Issue purchase order, deploy agent licences, and log renewal dates into compliance register.',
      },
    ],
    capabilities: [
      {
        title: 'CISO Compliance Checklists',
        desc: 'Enforce mandatory vendor security reviews (SOC2, ISO27001, GDPR) before PO authorization.',
      },
      {
        title: 'Endpoint Licence Seat Scaler',
        desc: 'Dynamically add or decrease endpoint security seat count based on active headcount.',
      },
      {
        title: 'Penetration Testing Scope Manager',
        desc: 'Manage recurring annual penetration testing contracts and vulnerability remediation SLAs.',
      },
      {
        title: 'Emergency Incident Security Budget',
        desc: 'Pre-configure emergency procurement approval paths for zero-day threat patches or forensics.',
      },
    ],
    benefits: [
      'Strengthens enterprise defense posture with top-tier EDR, IAM, and Firewall hardware',
      'Assures uninterrupted SOC2 Type II compliance through automated audit tool renewals',
      'Enforces mandatory CISO security vetting on all third-party software vendors',
      'Mitigates security threat risks across remote workstations and cloud networks',
    ],
    sampleItems: [
      { code: 'SEC-CRD-001', name: 'CrowdStrike Falcon Complete (200 Endpoints)', category: 'EDR / XDR', estPrice: '₹18,000 / yr', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SEC-OKT-004', name: 'Okta Enterprise Identity (150 Users)', category: 'IAM', estPrice: '₹10,800 / yr', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SEC-PAL-007', name: 'Palo Alto PA-1410 Next-Gen Firewall', category: 'Hardware FW', estPrice: '₹12,500', status: 'Approved', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'SEC-VNT-009', name: 'Vanta Automated SOC2 & ISO Compliance', category: 'Compliance', estPrice: '₹15,000 / yr', status: 'Renewal Pending', statusBg: 'bg-amber-500/20 text-amber-300' },
    ],
  },

  'it-services': {
    slug: 'it-services',
    title: 'IT Services & Technical Consulting',
    badge: 'MANAGED SERVICES',
    tagline: 'Manage external IT consulting contracts, MSP retainers, technical support SLAs, and development services.',
    description:
      'The IT Services category simplifies the procurement of specialized technical manpower, Managed Service Providers (MSPs), annual maintenance contracts (AMCs), and custom software engineering services. Manage contracts, milestone deliverables, and hourly billing caps.',
    icon: Headphones,
    bg: '#CCFBF1',
    color: '#0D9488',
    subCategories: [
      {
        name: 'Managed IT Support (MSP)',
        specs: '24/7 Service Desk, Helpdesk Tier 1-3, Onsite Tech Support',
        avgCost: '₹80 - ₹160 / user / mo',
        popularVendors: 'Accenture, Wipro, Regional Managed IT Providers',
      },
      {
        name: 'Software Development & Consulting',
        specs: 'Senior Full-Stack, Cloud Architect, DevOps Contracting',
        avgCost: '₹65 - ₹180 / hour',
        popularVendors: 'Thoughtworks, EPAM, Toptal, Custom Agencies',
      },
      {
        name: 'Annual Maintenance Contracts (AMC)',
        specs: 'Data Center Maintenance, UPS AMC, Fiber Link Maintenance',
        avgCost: '₹3,500 - ₹25,000 / yr',
        popularVendors: 'IBM Global Services, Cisco Smart Net, OEM Partners',
      },
      {
        name: 'System Integration & Migration',
        specs: 'Cloud Migration Projects, ERP Implementation, Active Directory Sync',
        avgCost: '₹15,000 - ₹120,000 / project',
        popularVendors: 'Deloitte Tech, Slalom Consulting, Infosys',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Statement of Work (SOW) Creation',
        desc: 'Define scope, milestones, deliverables, service level metrics (SLA), and payment schedule.',
      },
      {
        step: '02',
        title: 'RFP / Vendor Bidding',
        desc: 'Dispatch Request for Proposals to vetted technical service agencies and compare rate cards.',
      },
      {
        step: '03',
        title: 'Contract & Milestone Approval',
        desc: 'Approve milestone breakdown (e.g. 20% Initial, 40% Delivery, 40% Acceptance testing).',
      },
      {
        step: '04',
        title: 'Milestone Sign-Off & Invoice Match',
        desc: 'Verify completed deliverables against SOW criteria before releasing milestone payments.',
      },
    ],
    capabilities: [
      {
        title: 'Milestone Payment Release Gate',
        desc: 'Require signed Goods & Services Acceptance Notes before finance can process contractor invoices.',
      },
      {
        title: 'Time & Material (T&M) Spend Tracker',
        desc: 'Set max hourly caps on consulting POs to prevent budget overruns on hourly contracting engagements.',
      },
      {
        title: 'SLA Performance Scorecard',
        desc: 'Evaluate IT service vendor response times and resolution SLAs before contract renewal.',
      },
      {
        title: 'Contractor Onboarding Vault',
        desc: 'Store NDAs, Master Services Agreements (MSAs), and worker compliance documents in one place.',
      },
    ],
    benefits: [
      'Eliminates scope creep and unexpected contractor overbilling with capped SOW milestone purchase orders',
      'Ensures IT service providers meet agreed 99.9% uptime and response time SLAs',
      'Provides full visibility into external IT consulting spend across all business departments',
      'Accelerates vendor onboarding for urgent technical migration projects',
    ],
    sampleItems: [
      { code: 'SRV-MSP-001', name: '24/7 Managed IT Helpdesk Support (150 Users)', category: 'Managed Services', estPrice: '₹14,000 / mo', status: 'Active SOW', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SRV-DEV-005', name: 'Cloud Migration & Kubernetes SOW Project', category: 'Consulting', estPrice: '₹48,000 Total', status: 'Milestone 2', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'SRV-AMC-008', name: 'Cisco Smart Net Total Care AMC (Data Center)', category: 'AMC Support', estPrice: '₹9,500 / yr', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'SRV-ERP-012', name: 'ERP Procurement Integration Consulting', category: 'Integration', estPrice: '₹28,000 Total', status: 'In Bidding', statusBg: 'bg-amber-500/20 text-amber-300' },
    ],
  },

  'office-accessories': {
    slug: 'office-accessories',
    title: 'Office Accessories & Workspace Supplies',
    badge: 'WORKSPACE SUPPLIES',
    tagline: 'Source ergonomic furniture, office stationery, supplies, and facility essentials.',
    description:
      'The Office Accessories category manages corporate workplace supplies, ergonomic office furniture, printing paper, facilities essentials, and employee work-from-home (WFH) equipment allowances. Enable bulk ordering discounts while empowering department admins.',
    icon: Box,
    bg: '#FCE7F3',
    color: '#DB2777',
    subCategories: [
      {
        name: 'Ergonomic Furniture & Desks',
        specs: 'Electric Height-Adjustable Standing Desks, Mesh Ergonomic Chairs',
        avgCost: '₹280 - ₹950 / workstation',
        popularVendors: 'Herman Miller, Steelcase, Autonomous, Fully',
      },
      {
        name: 'Stationery & Printing Consumables',
        specs: 'Recycled Copy Paper A4/A3, OEM Toner Cartridges, Notebooks',
        avgCost: 'Bulk Monthly Orders (₹500 - ₹3,000)',
        popularVendors: 'Staples Advantage, Office Depot, HP Supplies',
      },
      {
        name: 'Work-from-Home (WFH) Bundles',
        specs: 'Ergonomic Chair, Monitor Arm, Laptop Stand, Cable Management',
        avgCost: '₹450 - ₹750 / employee',
        popularVendors: 'Logitech, Ergotron, Branch Furniture',
      },
      {
        name: 'Facility & Workplace Sanitation',
        specs: 'Touchless Sanitizer Dispensers, Air Purifiers, Breakroom Supplies',
        avgCost: '₹300 - ₹1,500 / mo',
        popularVendors: 'Cintas, Rubbermaid Commercial, Fellowes',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Department Requisition',
        desc: 'Facility manager or department admin submits recurring monthly supply order or new office setup requisition.',
      },
      {
        step: '02',
        title: 'Bulk Discount Aggregation',
        desc: 'Procurement engine aggregates small requisitions across departments into single high-volume supplier RFQs.',
      },
      {
        step: '03',
        title: 'Supplier Dispatch',
        desc: 'Dispatch purchase order to primary corporate office supply vendor with scheduled delivery dates.',
      },
      {
        step: '04',
        title: 'Receipt Confirmation',
        desc: 'Office manager inspects physical delivery, marks goods receipt note (GRN), and releases payment invoice.',
      },
    ],
    capabilities: [
      {
        title: 'Recurring Supply Replenishment',
        desc: 'Automate monthly re-ordering of office stationery, paper, and printing consumables based on stock thresholds.',
      },
      {
        title: 'WFH Allowance Portal',
        desc: 'Provide employees with fixed budget stipends to select ergonomic furniture from approved catalogs.',
      },
      {
        title: 'Department Expense Tagging',
        desc: 'Automatically allocate office supply expenses to department cost centers (HR, Sales, Engineering).',
      },
      {
        title: 'Bulk Volume Pricing Engine',
        desc: 'Combine multi-branch office orders to qualify for top-tier corporate volume discounts.',
      },
    ],
    benefits: [
      'Cuts annual office supply spending by up to 22% through consolidated bulk purchasing',
      'Provides employees with standardized ergonomic furniture to enhance productivity and comfort',
      'Eliminates petty cash reimbursement hassles for small stationery items',
      'Streamlines multi-location facility purchasing into a single management portal',
    ],
    sampleItems: [
      { code: 'ACC-CHR-001', name: 'Herman Miller Sayl Ergonomic Mesh Chair', category: 'Furniture', estPrice: '₹795', status: 'Approved Specs', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'ACC-DSK-003', name: 'Dual-Motor Electric Standing Desk 60x30"', category: 'Furniture', estPrice: '₹550', status: 'In Stock', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'ACC-PPR-010', name: 'A4 Premium Multipurpose Copy Paper (50 Reams)', category: 'Stationery', estPrice: '₹260', status: 'Delivered', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'ACC-TNR-015', name: 'HP LaserJet Enterprise Black Toner Pack', category: 'Supplies', estPrice: '₹420', status: 'Delivered', statusBg: 'bg-emerald-500/20 text-emerald-300' },
    ],
  },

  'office-technology': {
    slug: 'office-technology',
    title: 'Office Technology & Smart AV Equipment',
    badge: 'AV & SMART OFFICE',
    tagline: 'Equip conference rooms with interactive displays, smart AV bars, and attendance systems.',
    description:
      'The Office Technology category covers conference room audio-visual (AV) setups, smart displays, video conferencing bars, digital signage, and biometric access control systems. Transform meeting rooms into seamless hybrid collaboration spaces.',
    icon: Tv,
    bg: '#DBEAFE',
    color: '#2563EB',
    subCategories: [
      {
        name: 'Conference Room AV & Video Bars',
        specs: 'Logitech Rally Bar, Neat Bar, Poly Studio, 4K AI Cameras',
        avgCost: '₹1,800 - ₹6,500 / room',
        popularVendors: 'Logitech, Neat, Poly (HP), Cisco Webex Room',
      },
      {
        name: 'Smart Displays & Interactive Boards',
        specs: 'Samsung Flip, LG Commercial Displays, ViewSonic ViewBoard 75"',
        avgCost: '₹1,200 - ₹4,800 / display',
        popularVendors: 'Samsung Commercial, LG, Sony, ViewSonic',
      },
      {
        name: 'Biometric Access Control & Attendance',
        specs: 'Face Recognition Terminals, RFID Door Controllers, Smart Locks',
        avgCost: '₹450 - ₹2,200 / door',
        popularVendors: 'Hikvision, ZKTeco, Suprema, Kisi Access',
      },
      {
        name: 'Digital Signage & Room Schedulers',
        specs: '10" Touch Meeting Room Schedulers, Central Signage Players',
        avgCost: '₹350 - ₹950 / panel',
        popularVendors: 'Crestron, Neat Pad, BrightSign, Appspace',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Meeting Room Blueprint & Specs',
        desc: 'IT & Facilities team selects AV bundle scaled to room size (Huddle Room, Boardroom, All-Hands Arena).',
      },
      {
        step: '02',
        title: 'Site Survey & Installer Quotes',
        desc: 'Request turnkey quotes including hardware delivery, wall mounting, ceiling mics, and cabling labor.',
      },
      {
        step: '03',
        title: 'PO Generation & Dispatch',
        desc: 'Issue PO to certified AV system integrator with installation target completion date.',
      },
      {
        step: '04',
        title: 'Testing & Handover',
        desc: 'Perform Zoom Rooms / Teams Rooms call testing, verify 4K video input, and sign off installation GRN.',
      },
    ],
    capabilities: [
      {
        title: 'Room-Size AV Bundles',
        desc: 'Standardized AV equipment packages tailored for small 4-person huddle spaces or 20-person boardrooms.',
      },
      {
        title: 'Turnkey Installation SOW',
        desc: 'Combine equipment purchases with certified installation services in a unified purchase order.',
      },
      {
        title: 'Conference Platform Compatibility',
        desc: 'Pre-vetted hardware certified for native Microsoft Teams Rooms and Zoom Rooms operation.',
      },
      {
        title: 'AV Asset Maintenance Alerts',
        desc: 'Track firmware update cycles, projector lamp usage, and hardware support contracts.',
      },
    ],
    benefits: [
      'Eliminates meeting start delays caused by faulty or incompatible conference room cables',
      'Provides a consistent, high-quality hybrid meeting experience across all corporate offices',
      'Secures turnkey warranty and rapid hardware replacement guarantees from certified AV partners',
      'Centralizes office technology assets under one unified maintenance schedule',
    ],
    sampleItems: [
      { code: 'AV-RAL-001', name: 'Logitech Rally Bar Appliance + Tap Touch Controller', category: 'AV Video Bar', estPrice: '₹3,990', status: 'Approved', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'AV-DSP-004', name: 'LG 75" Commercial 4K UHD Meeting Room Display', category: 'Displays', estPrice: '₹1,650', status: 'Delivered', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'AV-BIO-007', name: 'ZKTeco Facial Recognition & Access Controller', category: 'Access Control', estPrice: '₹850', status: 'In Transit', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'AV-PAD-010', name: 'Logitech Tap Scheduler 10" Touch Panel', category: 'Room Scheduler', estPrice: '₹680', status: 'Delivered', statusBg: 'bg-emerald-500/20 text-emerald-300' },
    ],
  },

  'networking-telecom': {
    slug: 'networking-telecom',
    title: 'Networking & Telecom Procurement',
    badge: 'NETWORKING & TELECOM',
    tagline: 'Procure enterprise routers, switches, Wi-Fi 6E access points, leased lines, and VoIP systems.',
    description:
      'The Networking & Telecom category manages all core infrastructure required to keep corporate offices connected to high-speed internet, secure local area networks (LAN), and global communications. Oversee hardware POs alongside monthly ISP leased line contracts.',
    icon: Network,
    bg: '#DCFCE7',
    color: '#16A34A',
    subCategories: [
      {
        name: 'Enterprise Switches & Routers',
        specs: 'Cisco Catalyst 9300, Aruba CX 6300, Ubiquiti UniFi Enterprise',
        avgCost: '₹1,200 - ₹14,000 / switch',
        popularVendors: 'Cisco Systems, HPE Aruba, Ubiquiti, Juniper',
      },
      {
        name: 'Wi-Fi 6E / Wi-Fi 7 Access Points',
        specs: 'Tri-Band Wi-Fi 6E, 4x4 MU-MIMO, PoE+ Powered APs',
        avgCost: '₹350 - ₹1,100 / AP',
        popularVendors: 'Cisco Meraki, Aruba, Ubiquiti UniFi, Ruckus',
      },
      {
        name: 'Enterprise Leased Lines & Fiber',
        specs: '1Gbps / 10Gbps Dedicated Fiber, 99.99% SLA Uptime',
        avgCost: '₹650 - ₹4,500 / mo',
        popularVendors: 'AT&T Business, Verizon, Comcast Business, Airtel',
      },
      {
        name: 'VoIP Telephony & SIP Trunks',
        specs: 'Cloud PBX, SIP Trunks, Yealink IP Phones, RingCentral',
        avgCost: '₹15 - ₹35 / user / mo',
        popularVendors: 'RingCentral, 8x8, Cisco Webex Calling, Yealink',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Network Topology & Bandwidth Sizing',
        desc: 'Network Engineer calculates required PoE+ port density, Wi-Fi coverage map, and WAN bandwidth SLA.',
      },
      {
        step: '02',
        title: 'Hardware & Carrier Quotations',
        desc: 'Request hardware quotes from network VARs and carrier contract proposals for internet leased lines.',
      },
      {
        step: '03',
        title: 'PO Generation & SLA Tagging',
        desc: 'Issue PO for networking hardware and execute carrier bandwidth agreement with guaranteed 99.99% SLA.',
      },
      {
        step: '04',
        title: 'Commissioning & Billing Audit',
        desc: 'Verify network switch configuration, test internet speed, and match monthly telecom invoices against PO rate cards.',
      },
    ],
    capabilities: [
      {
        title: 'PoE+ Port Density Calculator',
        desc: 'Calculate exact power and switch port requirements for IP phones, APs, and security cameras before ordering.',
      },
      {
        title: 'Carrier Uptime SLA Tracker',
        desc: 'Monitor ISP service level agreements and log outage credit claims directly through the vendor portal.',
      },
      {
        title: 'Cloud-Managed Hardware Licensing',
        desc: 'Synchronize Meraki / Aruba cloud management subscription licences with hardware warranty dates.',
      },
      {
        title: 'Structured Cabling SOW Bundles',
        desc: 'Combine Cat6A Ethernet cabling labor, patch panels, and server rack installation in single purchase orders.',
      },
    ],
    benefits: [
      'Guarantees 99.99% network uptime across offices through SLAs with top-tier internet carriers',
      'Lowers networking hardware costs through competitive bidding between Cisco, Aruba, and Ubiquiti',
      'Consolidates multi-office telecom and mobile bills into single manageable monthly invoices',
      'Provides seamless Wi-Fi coverage for high-density employee and guest devices',
    ],
    sampleItems: [
      { code: 'NET-SWT-001', name: 'Cisco Catalyst 9300 48-Port PoE+ Switch', category: 'Switches', estPrice: '₹5,800', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'NET-WAP-004', name: 'Cisco Meraki MR57 Wi-Fi 6E Indoor AP (5 Pack)', category: 'Wi-Fi APs', estPrice: '₹4,250', status: 'Delivered', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'NET-FBR-008', name: '1Gbps Dedicated Fiber Internet Leased Line', category: 'Carrier WAN', estPrice: '₹1,200 / mo', status: 'Active SLA', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'NET-PHN-012', name: 'Yealink T54W Touchscreen IP Phone (25 Units)', category: 'VoIP Hardware', estPrice: '₹3,750', status: 'Approved', statusBg: 'bg-blue-500/20 text-blue-300' },
    ],
  },

  'training-certifications': {
    slug: 'training-certifications',
    title: 'IT Training & Professional Certifications',
    badge: 'LEARNING & SKILLS',
    tagline: 'Empower technical teams with AWS, Azure, Cisco, PMP certification vouchers and e-learning.',
    description:
      'The Training & Certifications category manages technical upskilling for engineering, DevOps, IT operations, and security personnel. Procure official certification exam vouchers, enterprise e-learning platform seats, and specialized hands-on bootcamps.',
    icon: GraduationCap,
    bg: '#EDE9FE',
    color: '#7C3AED',
    subCategories: [
      {
        name: 'Cloud & Tech Certification Vouchers',
        specs: 'AWS Certified Solutions Architect, Azure Administrator, CKA Kubernetes',
        avgCost: '₹150 - ₹500 / exam voucher',
        popularVendors: 'Amazon Web Services, Microsoft, Pearson VUE, Linux Foundation',
      },
      {
        name: 'Enterprise E-Learning Platforms',
        specs: 'Pluralsight Enterprise, Udemy Business, Coursera for Business',
        avgCost: '₹240 - ₹400 / user / yr',
        popularVendors: 'Pluralsight, Udemy, Coursera, O\'Reilly Learning',
      },
      {
        name: 'Specialized Engineering Bootcamps',
        specs: 'Custom 3-Day Microservices Architecture, AI Prompt Engineering, Cyber Defense',
        avgCost: '₹2,500 - ₹12,000 / workshop',
        popularVendors: 'Global Knowledge, QA Training, Specialized Trainers',
      },
      {
        name: 'Project Management & Governance',
        specs: 'PMP Certification, ITIL 4 Foundation, Scrum Master (CSM)',
        avgCost: '₹400 - ₹1,500 / candidate',
        popularVendors: 'PMI, AXELOS, Scrum Alliance',
      },
    ],
    procurementSteps: [
      {
        step: '01',
        title: 'Skills Gap & Course Requisition',
        desc: 'Engineering Manager or HR submits upskilling request for team members with course details and career paths.',
      },
      {
        step: '02',
        title: 'Learning Budget Approval',
        desc: 'Requisition is automatically checked against the department annual training & development allowance.',
      },
      {
        step: '03',
        title: 'Bulk Voucher Procurement',
        desc: 'Procurement team secures volume discounts on certification exam voucher packs or platform licenses.',
      },
      {
        step: '04',
        title: 'Voucher Distribution & Tracking',
        desc: 'Distribute voucher codes to candidates and track exam pass completion records in employee profiles.',
      },
    ],
    capabilities: [
      {
        title: 'Employee Upskilling Allowance',
        desc: 'Set annual per-employee learning budgets (₹1,000 - ₹3,000/yr) with automated approval routing.',
      },
      {
        title: 'Certification Pass Rate Tracker',
        desc: 'Maintain internal database of employee IT certifications to demonstrate enterprise partner competencies.',
      },
      {
        title: 'Enterprise E-Learning Seat Pool',
        desc: 'Reassign e-learning license seats (Pluralsight/Udemy) dynamically as employees complete courses.',
      },
      {
        title: 'OEM Partner Competency Builder',
        desc: 'Track required certified engineer headcount needed to maintain AWS / Microsoft Gold Partner status.',
      },
    ],
    benefits: [
      'Increases engineering team retention by investing in continuous technical career growth',
      'Secures 15-30% price discounts on bulk certification exam voucher packages',
      'Ensures company retains high-tier OEM partner status (AWS Premier, Microsoft Solutions Partner)',
      'Provides HR and IT leadership with clear ROI reports on corporate training investments',
    ],
    sampleItems: [
      { code: 'TRN-AWS-001', name: 'AWS Solutions Architect Associate Voucher Pack (10)', category: 'Cert Vouchers', estPrice: '₹1,500', status: 'Active Pack', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'TRN-PLR-004', name: 'Pluralsight Enterprise Plan (30 User Seats)', category: 'E-Learning', estPrice: '₹11,970 / yr', status: 'Active PO', statusBg: 'bg-emerald-500/20 text-emerald-300' },
      { code: 'TRN-K8S-007', name: 'CKA (Certified Kubernetes Admin) Voucher Pack (5)', category: 'Cert Vouchers', estPrice: '₹1,900', status: 'Vouchers Issued', statusBg: 'bg-blue-500/20 text-blue-300' },
      { code: 'TRN-PMP-010', name: 'PMP Exam Prep & Certification Bootcamp (5 Candidates)', category: 'Bootcamp', estPrice: '₹6,500', status: 'Approved', statusBg: 'bg-emerald-500/20 text-emerald-300' },
    ],
  },
}

export default function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()

  const category = categoryId ? categoriesDatabase[categoryId] : null

  if (!category) {
    return (
      <>
        <Navbar />
        <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-[#F8FAFC]">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-4">Category Not Found</h1>
          <p className="text-[#64748B] mb-8 max-w-md">
            The procurement category you are looking for does not exist or has been renamed.
          </p>
          <Link
            to="/features"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} /> View All Categories
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  const Icon = category.icon

  return (
    <>
      <Navbar />

      <main className="bg-[#F8FAFC] min-h-screen pb-20">
        {/* ══════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════ */}
        <section
          style={{ backgroundColor: '#0F172A' }}
          className="relative text-white py-16 md:py-20 overflow-hidden border-b border-slate-800"
        >
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#38BDF8 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link to="/features" className="hover:text-white transition-colors">
                Procurement Categories
              </Link>
              <span>/</span>
              <span className="text-blue-400">{category.title}</span>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-3xl">
                {/* Category Icon & Badge Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: category.bg }}
                  >
                    <Icon size={28} color={category.color} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {category.badge}
                    </span>
                    <h1
                      className="text-3xl md:text-4xl font-extrabold text-white mt-1"
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {category.title}
                    </h1>
                  </div>
                </div>

                <p className="text-lg text-slate-300 font-medium mb-4 leading-relaxed">
                  {category.tagline}
                </p>

                <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                  {category.description}
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <Link
                    to="/contact"
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                  >
                    Procure in this Category <ArrowRight size={16} />
                  </Link>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors flex items-center gap-2 border border-slate-700"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                </div>
              </div>

              {/* Category Quick Stats Widget */}
              <div className="w-full lg:w-80 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-blue-400" /> Category Overview
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Sub-categories</span>
                    <span className="text-sm font-bold text-white">{category.subCategories.length} Core Types</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Approval Workflow</span>
                    <span className="text-sm font-bold text-emerald-400">Automated Routing</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">3-Way Matching</span>
                    <span className="text-sm font-bold text-blue-400">Supported</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Vendor Network</span>
                    <span className="text-sm font-bold text-amber-400">Verified Vendors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            LIVE INTERACTIVE MOCKUP SHOWCASE
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Building2 size={13} className="text-blue-400" />
                  KSS Procurement OS — {category.title} Catalog View
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live System Preview
              </span>
            </div>

            {/* Catalog Items Table Mockup */}
            <div className="p-6 overflow-x-auto">
              <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-blue-400" /> Standardized Item Specifications & Catalog Pricing
              </div>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">SKU / ITEM CODE</th>
                    <th className="pb-3 font-semibold">ITEM DESCRIPTION</th>
                    <th className="pb-3 font-semibold">SUB-CATEGORY</th>
                    <th className="pb-3 font-semibold text-right">EST. PRICE</th>
                    <th className="pb-3 font-semibold text-center">SYSTEM STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {category.sampleItems.map((item) => (
                    <tr key={item.code} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 text-blue-400 font-bold">{item.code}</td>
                      <td className="py-3.5 font-medium">{item.name}</td>
                      <td className="py-3.5 text-slate-400">{item.category}</td>
                      <td className="py-3.5 text-right font-bold text-amber-300">{item.estPrice}</td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${item.statusBg}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            SUB-CATEGORIES BREAKDOWN GRID
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 mt-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="eyebrow mx-auto w-fit mb-2">Scope Breakdown</div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">
              Key Sub-Categories & Supported Items
            </h2>
            <p className="text-[#64748B] text-sm mt-2">
              Standardized procurement specifications and trusted industry vendors in this category.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {category.subCategories.map((sub, i) => (
              <div
                key={sub.name}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs font-mono group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    0{i + 1}
                  </div>
                  <h3 className="font-bold text-[#0F172A] text-base group-hover:text-blue-600 transition-colors">
                    {sub.name}
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Technical Specs & Scope:
                    </span>
                    <span className="text-slate-700 font-medium">{sub.specs}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Average Unit Price:</span>
                      <span className="font-bold text-emerald-600 text-xs">{sub.avgCost}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">Popular OEMs / Vendors:</span>
                      <span className="font-semibold text-slate-700 text-xs">{sub.popularVendors}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            PROCUREMENT WORKFLOW (HOW IT WORKS)
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 mt-20">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="eyebrow mx-auto w-fit mb-2">Category Workflow</div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">
                End-to-End Procurement Lifecycle
              </h2>
              <p className="text-[#64748B] text-sm mt-2">
                How requisitions, approvals, and order fulfillment operate for {category.title}.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {category.procurementSteps.map((step, idx) => (
                <div
                  key={step.step}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-blue-600 font-mono">{step.step}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    <h3 className="font-bold text-[#0F172A] text-base mb-2">{step.title}</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">{step.desc}</p>
                  </div>
                  {idx < 3 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 border border-slate-200 text-slate-400">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CAPABILITIES & BENEFITS
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 mt-20">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Key System Capabilities */}
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">System Capabilities</h3>
                  <p className="text-xs text-[#64748B]">Built-in features for this category</p>
                </div>
              </div>

              <div className="space-y-6">
                {category.capabilities.map((cap) => (
                  <div key={cap.title} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0F172A] text-sm mb-1">{cap.title}</h4>
                      <p className="text-xs text-[#64748B] leading-relaxed">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Value & Organizational Impact */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 shadow-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Value & Organizational Impact</h3>
                  <p className="text-xs text-slate-400">Measurable benefits for your organization</p>
                </div>
              </div>

              <div className="space-y-4">
                {category.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-slate-200 font-medium leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-400" /> Procurement Governance
                </span>
                <span className="flex items-center gap-1.5">
                  <IndianRupee size={14} className="text-emerald-400" /> ROI Guaranteed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            BOTTOM CTA BANNER
        ══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-6 mt-20">
          <div
            style={{ backgroundColor: '#0F172A' }}
            className="rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden shadow-2xl border border-slate-800"
          >
            <div className="max-w-2xl mx-auto relative z-10">
              <span className="text-xs font-bold font-mono uppercase tracking-widest px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4 inline-block">
                Start Managing {category.title}
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
                Ready to Streamline Your {category.title}?
              </h2>
              <p className="text-slate-300 text-sm md:text-base mb-8 leading-relaxed">
                Connect purchase requests, approvals, vendor RFQs, purchase orders, and 3-way invoice matching in one unified platform.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/contact"
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center gap-2"
                >
                  Request Category Demo <ArrowRight size={16} />
                </Link>
                <Link
                  to="/features"
                  className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700"
                >
                  Explore All Categories
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
