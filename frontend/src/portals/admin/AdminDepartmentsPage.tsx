import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  Laptop,
  Disc,
  Tag,
  Trash2
} from 'lucide-react';

export interface ProcurementCategory {
  id: string;
  name: string;
  type: 'HARDWARE' | 'SOFTWARE';
  tagline: string;
  description: string;
  examples: string[];
  budgetPool: 'Capex' | 'Opex';
  leadDepartments: string[];
  sampleSpecifications: string;
  status: 'ACTIVE' | 'RESTRICTED';
}

export const PROCUREMENT_CATEGORIES: ProcurementCategory[] = [
  // 1. IT Hardware (💻 Hardware)
  {
    id: 'CAT-HW-001',
    name: 'IT Hardware',
    type: 'HARDWARE',
    tagline: 'End-user computing and enterprise infrastructure hardware',
    description: 'Physical computing machines, end-user systems, and enterprise storage arrays.',
    examples: ['laptops', 'desktops', 'monitors', 'servers', 'storage arrays'],
    budgetPool: 'Capex',
    leadDepartments: ['Engineering & IT Infrastructure', 'Quality Assurance & Laboratory'],
    sampleSpecifications: 'Dell XPS, ThinkPad T-Series, Supermicro Dual Xeon, PowerVault SAN',
    status: 'ACTIVE'
  },
  // 2. Software & SaaS (💿 Software)
  {
    id: 'CAT-SW-005',
    name: 'Software & SaaS',
    type: 'SOFTWARE',
    tagline: 'Commercial SaaS subscriptions, productivity and CRM seats',
    description: 'Multi-seat cloud applications, enterprise CRM licenses, and collaboration suites.',
    examples: ['CRM licenses', 'ERP modules', 'productivity suites'],
    budgetPool: 'Opex',
    leadDepartments: ['Corporate Finance & Accounts', 'Engineering & IT Infrastructure', 'Human Resources & Workplace Experience'],
    sampleSpecifications: 'Salesforce Enterprise CRM, Google Workspace Business Plus, Jira Enterprise',
    status: 'ACTIVE'
  },
  // 3. Cloud & Infrastructure (💿 Software)
  {
    id: 'CAT-SW-004',
    name: 'Cloud & Infrastructure',
    type: 'SOFTWARE',
    tagline: 'Elastic compute platforms, cloud databases and scalable storage',
    description: 'Scalable cloud compute instances, object storage, and managed cloud databases.',
    examples: ['cloud compute', 'managed databases', 'object storage'],
    budgetPool: 'Opex',
    leadDepartments: ['Engineering & IT Infrastructure'],
    sampleSpecifications: 'AWS EC2 Reserved Instances, Azure SQL Managed Clusters, CloudFlare CDN',
    status: 'ACTIVE'
  },
  // 4. Cybersecurity (💿 Software)
  {
    id: 'CAT-SW-001',
    name: 'Cybersecurity',
    type: 'SOFTWARE',
    tagline: 'Defensive threat prevention, firewall security and identity controls',
    description: 'Endpoint security shields, firewall subscriptions, and identity/access management systems.',
    examples: ['endpoint protection', 'firewall software', 'identity/access systems'],
    budgetPool: 'Opex',
    leadDepartments: ['Engineering & IT Infrastructure'],
    sampleSpecifications: 'CrowdStrike Falcon EDR, Palo Alto Networks NGFW license, Okta Workforce IAM',
    status: 'ACTIVE'
  },
  // 5. IT Services (💿 Software)
  {
    id: 'CAT-SW-002',
    name: 'IT Services',
    type: 'SOFTWARE',
    tagline: 'Specialist systems advisory, engineering integration and bespoke dev',
    description: 'External technology advisory, system integration, and software development services.',
    examples: ['consulting', 'system integration', 'software development'],
    budgetPool: 'Opex',
    leadDepartments: ['Engineering & IT Infrastructure', 'Quality Assurance & Laboratory'],
    sampleSpecifications: 'Cloud migration consulting retainers, CI/CD pipeline integration, dev hours',
    status: 'ACTIVE'
  },
  // 6. Office Accessories (💻 Hardware)
  {
    id: 'CAT-HW-002',
    name: 'Office Accessories',
    type: 'HARDWARE',
    tagline: 'Ergonomic workplace furnishings and staff physical equipment',
    description: 'Physical workplace ergonomic furniture, utility items, and staff personal gear.',
    examples: ['tables', 'chairs', 'fans', 'cable management', 'ID card holders'],
    budgetPool: 'Opex',
    leadDepartments: ['Operations & Facilities', 'Human Resources & Workplace Experience'],
    sampleSpecifications: 'Featherlite motorized standing desks, Herman Miller Aeron, cable spines',
    status: 'ACTIVE'
  },
  // 7. Office Technology (💻 Hardware)
  {
    id: 'CAT-HW-003',
    name: 'Office Technology',
    type: 'HARDWARE',
    tagline: 'Presentation systems and physical meeting room hardware',
    description: 'Workplace collaboration devices, presentation screens, and multifunction printers.',
    examples: ['printers', 'projectors', 'video-conferencing systems'],
    budgetPool: 'Capex',
    leadDepartments: ['Operations & Facilities', 'Engineering & IT Infrastructure'],
    sampleSpecifications: 'Polycom Room Kit, Epson 4K Laser Projectors, HP Enterprise LaserJet',
    status: 'ACTIVE'
  },
  // 8. Networking & Telecom (💻 Hardware)
  {
    id: 'CAT-HW-004',
    name: 'Networking & Telecom',
    type: 'HARDWARE',
    tagline: 'High-speed routing, switching and dedicated transmission hardware',
    description: 'Enterprise data communication hardware, switches, and high-bandwidth circuits.',
    examples: ['switches', 'routers', 'access points', 'fiber circuits'],
    budgetPool: 'Capex',
    leadDepartments: ['Engineering & IT Infrastructure'],
    sampleSpecifications: 'Cisco Catalyst 9300, Juniper MX204, Aruba Wi-Fi 6E APs, 10G SFP+ Fiber',
    status: 'ACTIVE'
  },
  // 9. Training & Certifications (💿 Software)
  {
    id: 'CAT-SW-006',
    name: 'Training & Certifications',
    type: 'SOFTWARE',
    tagline: 'Employee upskilling, professional accreditation and learning LMS',
    description: 'Professional development portals, technical examination vouchers, and LMS seats.',
    examples: ['technical certification vouchers', 'learning portals', 'compliance training'],
    budgetPool: 'Opex',
    leadDepartments: ['Human Resources & Workplace Experience', 'Quality Assurance & Laboratory'],
    sampleSpecifications: 'AWS Solutions Architect exam vouchers, Coursera Enterprise, LinkedIn Learning',
    status: 'ACTIVE'
  }
];

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  headName: string;
  headEmail: string;
  memberCount: number;
  activeRequests: number;
  completedRequests: number;
  annualBudget: number; // in INR
  spentBudget: number; // in INR
  status: 'ACTIVE' | 'INACTIVE';
  authorizedCategories: string[];
}

export const ENTERPRISE_DEPARTMENTS: string[] = [
  'Engineering & IT Infrastructure',
  'Corporate Finance & Accounts',
  'Operations & Facilities',
  'Quality Assurance & Laboratory',
  'Supply Chain & Logistics',
  'Human Resources & Workplace Experience'
];

export const AdminDepartmentsPage: React.FC = () => {
  // Categories State with localStorage persistence & auto-purging
  const [categories, setCategories] = useState<ProcurementCategory[]>(() => {
    try {
      const saved = localStorage.getItem('procurement_categories_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((c: any) => 
          c.id !== 'CAT-HW-006' && 
          c.id !== 'CAT-HW-005' && 
          c.id !== 'CAT-SW-003' && 
          c.name !== 'Print & Consumables' && 
          c.name !== 'Data Center/Colocation' && 
          c.name !== 'Contracts & Compliance'
        );
      }
    } catch (e) {}
    return PROCUREMENT_CATEGORIES;
  });

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<ProcurementCategory>>({
    type: 'HARDWARE',
    budgetPool: 'Capex',
    status: 'ACTIVE',
    leadDepartments: ['Operations & Facilities']
  });

  const handleDeleteCategory = (id: string, name: string) => {
    if (window.confirm(`Delete procurement category "${name}"?`)) {
      setCategories(prev => {
        const updated = prev.filter(c => c.id !== id);
        try {
          localStorage.setItem('procurement_categories_v2', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
  };

  // Category Filtering State
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'ALL' | 'HARDWARE' | 'SOFTWARE'>('ALL');

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchesType = categoryTypeFilter === 'ALL' || c.type === categoryTypeFilter;
      const term = categorySearch.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(term) ||
        c.tagline.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.sampleSpecifications.toLowerCase().includes(term) ||
        c.leadDepartments.some(d => d.toLowerCase().includes(term));
      return matchesType && matchesSearch;
    });
  }, [categories, categorySearch, categoryTypeFilter]);

  const hardwareCategories = useMemo(() => filteredCategories.filter(c => c.type === 'HARDWARE'), [filteredCategories]);
  const softwareCategories = useMemo(() => filteredCategories.filter(c => c.type === 'SOFTWARE'), [filteredCategories]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.description) return;

    const isHardware = newCategory.type === 'HARDWARE';
    const prefix = isHardware ? 'CAT-HW' : 'CAT-SW';
    const randomNum = Math.floor(100 + Math.random() * 900);

    const created: ProcurementCategory = {
      id: `${prefix}-${randomNum}`,
      name: newCategory.name,
      type: newCategory.type || 'HARDWARE',
      tagline: newCategory.tagline || `${newCategory.name} procurement specifications`,
      description: newCategory.description,
      examples: [],
      budgetPool: newCategory.budgetPool || (isHardware ? 'Capex' : 'Opex'),
      leadDepartments: newCategory.leadDepartments && newCategory.leadDepartments.length > 0 ? newCategory.leadDepartments : ['Operations & Facilities'],
      sampleSpecifications: newCategory.sampleSpecifications || 'Standard enterprise configuration',
      status: 'ACTIVE'
    };

    setCategories(prev => {
      const updated = [...prev, created];
      try {
        localStorage.setItem('procurement_categories_v2', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    setIsAddCategoryModalOpen(false);
    setNewCategory({
      type: 'HARDWARE',
      budgetPool: 'Capex',
      status: 'ACTIVE',
      leadDepartments: ['Operations & Facilities']
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-7 h-7 text-purple-600" />
            Procurement Categories Master ({categories.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise classification of Physical Hardware (Capex/Opex tangible assets) and Software / Digital services.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Aggregate Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Categories</span>
                <Tag className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{categories.length}</p>
              <span className="text-xs text-slate-500">Active procurement domains</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">💻 Hardware Categories</span>
                <Laptop className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">6 Physical Types</p>
              <span className="text-xs text-purple-600 font-medium">Physical items you can touch/use</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">💿 Software / Digital</span>
                <Disc className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">6 Digital Types</p>
              <span className="text-xs text-blue-600 font-medium">Licenses, SaaS &amp; digital services</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Catalog Governance</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">100% Policy</p>
              <span className="text-xs text-emerald-600 font-medium">Cross-mapped to cost centers</span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories, items (e.g. laptops, switches, firewalls, e-signatures)..."
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setCategoryTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  categoryTypeFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All ({categories.length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('HARDWARE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  categoryTypeFilter === 'HARDWARE'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                }`}
              >
                💻 Hardware ({categories.filter(c => c.type === 'HARDWARE').length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('SOFTWARE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  categoryTypeFilter === 'SOFTWARE'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                💿 Software / Digital ({categories.filter(c => c.type === 'SOFTWARE').length})
              </button>
            </div>
          </div>

          {/* Unified View: All Categories */}
          {categoryTypeFilter === 'ALL' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <h2 className="text-base font-black tracking-tight text-white">Procurement Categories Master Catalog</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      Standard Requisition Classification
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Master catalog of active procurement categories across Physical Hardware and Software / Digital services, mapped to departmental permissions and budget pools.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-300 shrink-0">
                  {filteredCategories.length} Categories
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map(cat => {
                  const isHw = cat.type === 'HARDWARE';
                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2.5 rounded-xl border ${isHw ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {isHw ? <Laptop size={18} /> : <Disc size={18} />}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">{cat.id}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHw ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {isHw ? '💻 Hardware' : '💿 Software'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isHw ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {cat.budgetPool}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Delete ${cat.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {cat.description}
                        </p>

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                          <p>
                            <b className="text-slate-700">Sample Specs:</b> {cat.sampleSpecifications}
                          </p>
                          <p>
                            <b className="text-slate-700">Authorized Units:</b> {cat.leadDepartments.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active Policy
                        </span>
                        <span className="text-indigo-600 font-bold hover:underline cursor-pointer">
                          {isHw ? 'View Linked POs →' : 'View Linked Contracts →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtered View: 💻 Hardware Categories */}
          {categoryTypeFilter === 'HARDWARE' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💻</span>
                    <h2 className="text-base font-black tracking-tight text-white">Hardware Categories</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                      Physical Inventory
                    </span>
                  </div>
                  <p className="text-xs text-purple-200 mt-0.5">
                    <b>Hardware = physical items you can touch/use.</b> Tangible equipment requiring asset tagging, serial indexing, and warehouse GRN inward inspection.
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-300 shrink-0">
                  {hardwareCategories.length} Categories
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hardwareCategories.map(cat => {
                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                              <Laptop size={18} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                              <span className="text-[10px] text-slate-400 font-mono">{cat.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              {cat.budgetPool}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Delete ${cat.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {cat.description}
                        </p>

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                          <p>
                            <b className="text-slate-700">Sample Specs:</b> {cat.sampleSpecifications}
                          </p>
                          <p>
                            <b className="text-slate-700">Authorized Units:</b> {cat.leadDepartments.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active Policy
                        </span>
                        <span className="text-indigo-600 font-bold hover:underline cursor-pointer">
                          View Linked POs →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtered View: 💿 Software / Digital Categories (Matches Image 1) */}
          {categoryTypeFilter === 'SOFTWARE' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💿</span>
                    <h2 className="text-base font-black tracking-tight text-white">Software / Digital Categories</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      Digital Services &amp; Subscriptions
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    <b>Software = applications, licenses, subscriptions, or digital services.</b> Governed under recurrent OPEX with seat provisioning and contract renewals.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-300 shrink-0">
                  {softwareCategories.length} Categories
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {softwareCategories.map(cat => {
                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                              <Disc size={18} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                              <span className="text-[10px] text-slate-400 font-mono">{cat.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {cat.budgetPool}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Delete ${cat.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {cat.description}
                        </p>

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                          <p>
                            <b className="text-slate-700">Sample Specs:</b> {cat.sampleSpecifications}
                          </p>
                          <p>
                            <b className="text-slate-700">Authorized Units:</b> {cat.leadDepartments.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active Policy
                        </span>
                        <span className="text-indigo-600 font-bold hover:underline cursor-pointer">
                          View Linked Contracts →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                Register New Procurement Category
              </h3>
              <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="py-4 space-y-4 text-sm overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Computing & Tablets"
                  value={newCategory.name || ''}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classification Type *</label>
                  <select
                    value={newCategory.type}
                    onChange={e => {
                      const val = e.target.value as 'HARDWARE' | 'SOFTWARE';
                      setNewCategory({
                        ...newCategory,
                        type: val,
                        budgetPool: val === 'HARDWARE' ? 'Capex' : 'Opex'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="HARDWARE">💻 Physical Hardware</option>
                    <option value="SOFTWARE">💿 Software / Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Accounting Pool *</label>
                  <select
                    value={newCategory.budgetPool}
                    onChange={e => setNewCategory({ ...newCategory, budgetPool: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Capex">Capex (Capital Expenditure)</option>
                    <option value="Opex">Opex (Operating Expense)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Short Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise tablets and mobile communications gear"
                  value={newCategory.tagline || ''}
                  onChange={e => setNewCategory({ ...newCategory, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed explanation of category items, equipment, and lifecycle policy..."
                  value={newCategory.description || ''}
                  onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Specifications</label>
                <input
                  type="text"
                  placeholder="e.g. Apple iPad Pro 11-inch, Samsung Galaxy Tab S9, OEM stylus"
                  value={newCategory.sampleSpecifications || ''}
                  onChange={e => setNewCategory({ ...newCategory, sampleSpecifications: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Authorized Department</label>
                <select
                  onChange={e => setNewCategory({ ...newCategory, leadDepartments: [e.target.value] })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {ENTERPRISE_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
